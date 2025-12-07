// noinspection UnnecessaryLocalVariableJS

import { Client, Attribute } from 'ldapts';
import async from 'async';
import { bg, black, rs } from 'af-color';
import { RangeAttributesParser } from './RangeAttributesParser';
import { IAdOptions, ISearchOptionsEx, SearchEntryEx, SearcherConstructorOptions, TSearchCallback } from '../../@type/i-searcher';
import { Control, Entry, SearchReference } from '../../@type/i-ldap';
import { LdapSearchResult } from './LdapSearchResult';
import { trace, toJson } from '../../lib/logger';
import { defaultPreEntryParser, defaultPostEntryParser } from './default-entry-parser';
import { EControl, getControl } from './get-control';

/**
 * An interface for performing searches against an Active Directory database.
 * It handles ranged results, finding deleted items, and following referrals.
 */
export class Searcher {
  public readonly options: SearcherConstructorOptions;

  public readonly baseDN: string;

  private readonly callback: TSearchCallback;

  public readonly searchOptions: ISearchOptionsEx;

  private results: Map<string, SearchEntryEx>;

  // eslint-disable-next-line no-use-before-define
  private pendingReferrals: Set<Searcher>;

  private searchComplete: boolean;

  private rangeProcessing: boolean;

  private client: Client;

  private readonly controls: Control[];

  private bindCredentials?: { bindDN: string; bindCredentials: string };

  private bound = false;

  constructor (options: SearcherConstructorOptions) {
    this.options = options;
    this.baseDN = options.baseDN;

    const { searchOptions, clientOptions, callback } = options;
    if (!clientOptions.url) {
      throw new Error('No url specified for ActiveDirectory client.');
    }
    this.callback = callback;
    this.searchOptions = searchOptions;
    this.searchOptions.f = searchOptions.filter;

    this.results = new Map();
    this.pendingReferrals = new Set<Searcher>();
    this.searchComplete = false;
    this.rangeProcessing = false;

    // Extracting the credentials for bind
    const { bindDN, bindCredentials, ...clientOptionsWithoutAuth } = clientOptions;

    // @ts-ignore
    clientOptionsWithoutAuth.paged = false;
    this.client = new Client(clientOptionsWithoutAuth);

    // In ldapts, you need to do bind explicitly, unlike ldapjs
    if (bindDN && bindCredentials) {
      this.bindCredentials = { bindDN, bindCredentials };
    }
    // In ldapts, error handling happens through try/catch in the async methods

    this.controls = options.controls || [];

    if (options.includeDeleted) {
      const deletedType = '1.2.840.113556.1.4.417';
      const deletedControls = this.controls.filter((control) => control.type === deletedType);
      if (deletedControls.length === 0) {
        this.traceAttributes(`Adding ShowDeletedOidControl(${deletedType}) to search (%dn)`);
        // @ts-ignore
        this.controls.push(getControl(EControl.DELETED));
      }
    }
  }

  traceAttributes (messageTemplate: string, searchOptions = this.searchOptions) {
    messageTemplate = messageTemplate.replace('%dn', this.baseDN);
    trace(`${messageTemplate} with filter \n${toJson(searchOptions.f)}\n for: \n${toJson(searchOptions.attributes || ['*'])}`);
  }

  /**
   * Converts Entry (ldapts format) to SearchEntryEx (legacy format)
   */
  private static _entryToSearchEntryEx (entry: Entry): SearchEntryEx {
    const searchEntry: SearchEntryEx = {
      ...entry,
      ao: Searcher._entryToAttributesObject(entry),
      idn: entry.dn,
      attributes: Searcher._entryToLegacyAttributes(entry),
    } as SearchEntryEx;
    return searchEntry;
  }

  /**
   * Converts an Entry to an attribute object
   */
  private static _entryToAttributesObject (entry: Entry): { [key: string]: string | string[] } {
    const result: { [key: string]: string | string[] } = {};
    Object.entries(entry).forEach(([key, value]) => {
      if (key !== 'dn') {
        result[key] = value as string | string[];
      }
    });
    return result;
  }

  /**
   * Converts an Entry to an Attribute array for legacy compatibility
   */
  private static _entryToLegacyAttributes (entry: Entry): Attribute[] {
    const attributes: Attribute[] = [];
    Object.entries(entry).forEach(([key, value]) => {
      if (key !== 'dn') {
        const values = Array.isArray(value) ? value as string[] : [value as string];
        attributes.push(new Attribute({ type: key, values }));
      }
    });
    return attributes;
  }

  /**
   * Invoked when the main search has completed, including any referrals.
   */
  onSearchEnd () {
    if (this.rangeProcessing || this.pendingReferrals.size) {
      return;
    }
    trace(`Active directory search [${this.baseDN}] returned ${this.results.size} entries for filter \n${toJson(this.searchOptions.f)}\n`);
    this.client.unbind();
    this.callback(null, [...this.results.values()]);
  }

  /**
   * Invoked when the ldap.js client is returning a search entry result.
   */
  onSearchEntry (searchEntry_: SearchEntryEx) {
    const preEntryParser = this.options.preEntryParser || defaultPreEntryParser;
    const searchEntry: SearchEntryEx = preEntryParser(searchEntry_);

    trace(`onSearchEntry() attributes: \n${toJson(searchEntry.ao)}`);

    // Some attributes can have range attributes (paging). Execute the query
    // again to get additional items.
    this.rangeProcessing = true;

    const postEntryParser = this.options.postEntryParser || defaultPostEntryParser;

    const rangeProcessor = new RangeAttributesParser(this);
    rangeProcessor.on('error', this.callback);
    rangeProcessor.on('done', (ldapSearchResults: LdapSearchResult[]) => {
      async.each(
        ldapSearchResults,
        (ldapSearchResult: LdapSearchResult, acb: Function) => {
          postEntryParser(ldapSearchResult.originalSearchEntry, (se: SearchEntryEx) => {
            this.results.set(ldapSearchResult.name(), se);
            this.rangeProcessing = false;
            acb();
          });
        },
        () => {
          if (this.searchComplete) {
            this.onSearchEnd();
          }
        },
      );
    });

    rangeProcessor.parseResult(searchEntry);
  }

  isReferralAllowed (referralUri: string): boolean {
    const { enabled, exclude = [] } = this.options.defaultReferrals || {};
    if (!referralUri || !enabled) {
      return false;
    }
    return !exclude.some((excludePattern) => (new RegExp(excludePattern, 'i')).test(referralUri));
  }

  /**
   * Dequeues a referral chase client.
   *
   * @param referral - An instance of {@link Searcher} being used to chase a referral.
   */
  removeReferral (referral: Searcher) {
    if (!referral) {
      return;
    }
    referral.client.unbind();
    this.pendingReferrals.delete(referral);
  }

  /**
   * Used to handle referrals, if they are enabled.
   *
   * @param referralUri A referral URI string.
   */
  onReferralChase (referralUri: SearchReference) {
    if (!this.isReferralAllowed(referralUri)) {
      return;
    }

    trace(`Following LDAP referral chase at ${referralUri}`);
    const ref = new URL(referralUri);
    const referralBaseDn = (ref.pathname || '/').substring(1);
    const refSearcher = new Searcher({
      ...this.options,
      baseDN: referralBaseDn,
      callback: (err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.log(err);
          trace(`[${err.errno}] An error occurred chasing the LDAP referral on ${referralBaseDn} options: (${toJson(this.options)})`);
        }
        this.removeReferral(refSearcher);
      },
    });
    this.pendingReferrals.add(refSearcher);

    refSearcher.search();
  }

  /**
   * The only method you should need to invoke. It uses the information parsed
   * during construction to construct the query and submit it to the server. Once
   * the query has completed, or an error occurs, the callback you specified
   * during construction will be invoked.
   */
  private async ensureBound () {
    if (!this.bound && this.bindCredentials) {
      trace(`Binding to LDAP as ${this.bindCredentials.bindDN}`);
      await this.client.bind(this.bindCredentials.bindDN, this.bindCredentials.bindCredentials);
      this.bound = true;
      trace('Successfully bound to LDAP');
    }
  }

  async search () {
    this.traceAttributes('Querying active directory (%dn)');

    trace(`Search by filter ${black}${bg.lYellow}${this.searchOptions.f}${rs}`);

    try {
      // Run bind before searching
      await this.ensureBound();

      // ldapts uses Promise-based API instead of callbacks
      const { searchEntries, searchReferences } = await this.client.search(
        this.baseDN,
        this.searchOptions,
        this.controls,
      );

      trace(`Search by [prepared] filter ${black}${bg.lGreen}${this.searchOptions.filter?.toString()}${rs}`);

      // Process search entries
      searchEntries.forEach((entry) => {
        const searchEntry = Searcher._entryToSearchEntryEx(entry);
        this.onSearchEntry(searchEntry);
      });

      // Process search references (referrals)
      searchReferences.forEach((reference) => {
        this.onReferralChase(reference);
      });

      // Mark search as complete
      this.searchComplete = true;
      this.onSearchEnd();
    } catch (err: any) {
      if (err.name === 'SizeLimitExceededError') {
        this.onSearchEnd();
        return;
      }

      this.client.unbind();
      // eslint-disable-next-line no-console
      console.log(err);
      trace(`[${err.errno || 'UNKNOWN'}] An error occurred performing the requested LDAP search on ${
        this.baseDN} options: (${toJson(this.options)})`);
      this.callback(err);
    }
  }

  async rangeSearch (searchOptions: ISearchOptionsEx, rangeCB: (err: any, se?: SearchEntryEx) => void) {
    this.traceAttributes('Quering (%dn) for range search', searchOptions);

    try {
      // Make sure bind is done
      await this.ensureBound();

      const { searchEntries, searchReferences } = await this.client.search(
        this.baseDN,
        searchOptions,
        this.controls,
      );

      // Process each entry and call the callback
      searchEntries.forEach((entry) => {
        const searchEntry = Searcher._entryToSearchEntryEx(entry);
        rangeCB(null, searchEntry);
      });

      // Process search references (referrals)
      searchReferences.forEach((reference) => {
        this.onReferralChase(reference);
      });

      this.rangeProcessing = false;
    } catch (err: any) {
      rangeCB(err);
    }
  }
}

export const asyncSearcher = async (adOptions: IAdOptions) => new Promise<SearchEntryEx[]>((resolve, reject) => {
  const callback = (err: any, results?: SearchEntryEx[]) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(results || []);
  };
  const searcher = new Searcher({ ...adOptions, callback });
  searcher.search().catch(reject);
});

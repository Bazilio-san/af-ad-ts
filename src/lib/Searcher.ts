import url from 'url';
import ldap, { Client, SearchCallbackResponse, SearchOptions, SearchReference } from 'ldapjs';
import async from 'async';
import { RangeAttributesParser } from './RangeAttributesParser';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { IAdOptions, SearchEntryEx, SearcherConstructorOptions, TSearchCallback } from '../@type/i-searcher';
import { PagedResultsControl } from '../@type/i-ldap';
import { LdapSearchResult } from './LdapSearchResult';
import { trace, toJson } from '../logger';
import { defaultEntryParser } from './default-enry-parser';
import { attributesToObject } from '../attributes';

/**
 * An interface for performing searches against an Active Directory database.
 * It handles ranged results, finding deleted items, and following referrals.
 */
export class Searcher {
  public readonly options: SearcherConstructorOptions;

  public readonly baseDN: string;

  private readonly callback: TSearchCallback;

  public readonly searchOptions: SearchOptions;

  private results: Map<string, SearchEntryEx>;

  // eslint-disable-next-line no-use-before-define
  private pendingReferrals: Set<Searcher>;

  private searchComplete: boolean;

  private rangeProcessing: boolean;

  private client: Client;

  private readonly controls: PagedResultsControl[];

  constructor (options: SearcherConstructorOptions) {
    this.options = options;
    this.baseDN = options.baseDN;

    const { searchOptions, clientOptions, callback } = options;
    if (!clientOptions.url) {
      throw new Error('No url specified for ActiveDirectory client.');
    }
    this.callback = callback;
    this.searchOptions = searchOptions;

    this.results = new Map();
    this.pendingReferrals = new Set<Searcher>();
    this.searchComplete = false;
    this.rangeProcessing = false;

    // @ts-ignore
    clientOptions.paged = false;
    this.client = ldap.createClient(clientOptions);
    // to handle connection errors
    this.client.on('connectTimeout', callback);
    this.client.on('error', callback);

    this.controls = options.controls || [];

    // Add paging results control by default if not already added.
    // @ts-ignore
    const pagedControls = this.controls.filter((control) => control instanceof ldap.PagedResultsControl);

    if (!searchOptions.paged && pagedControls.length === 0) {
      this.traceAttributes('Adding PagedResultControl to search (%dn)');
      // @ts-ignore
      const size = searchOptions.paged?.pageSize || DEFAULT_PAGE_SIZE;
      // @ts-ignore
      this.controls.push(new ldap.PagedResultsControl({ value: { size } }));
    }

    if (options.includeDeleted) {
      const deletedType = '1.2.840.113556.1.4.417';
      const deletedControls = this.controls.filter((control) => control.type === deletedType);
      if (deletedControls.length === 0) {
        this.traceAttributes(`Adding ShowDeletedOidControl(${deletedType}) to search (%dn)`);
        // @ts-ignore
        this.controls.push(new ldap.Control({ type: deletedType, criticality: true }));
        // VVQ ldap.Control ?
      }
    }
  }

  traceAttributes (messageTemplate: string, searchOptions = this.searchOptions) {
    messageTemplate = messageTemplate.replace('%dn', this.baseDN);
    trace(`${messageTemplate} with filter \n${toJson(searchOptions.filter)}\n for: \n${toJson(searchOptions.attributes || ['*'])}`);
  }

  /**
   * If set via the options of the query run the entry through the function.
   * Otherwise, just feed it to the parser callback.
   *
   * @param entry - The search entry object. // VVQ
   * @param callback - The callback to execute when complete.
   */
  entryParser (entry: SearchEntryEx, callback: Function) {
    const { entryParser = defaultEntryParser } = this.options;
    entryParser(entry, callback);
  }

  /**
   * Invoked when the main search has completed, including any referrals.
   */
  onSearchEnd () {
    if (this.rangeProcessing || this.pendingReferrals.size) {
      return;
    }
    trace(`Active directory search (${this.baseDN} returned ${this.results.size} entries for filter \n${toJson(this.searchOptions.filter)}\n`);
    this.client.unbind(undefined);
    this.callback(null, Array.from(this.results.values()));
  }

  /**
   * Invoked when the ldap.js client is returning a search entry result.
   */
  onSearchEntry (searchEntry: SearchEntryEx) {
    searchEntry.ao = attributesToObject(searchEntry);

    trace(`onSearchEntry() attributes: \n${toJson(searchEntry.ao)}`);

    // Some attributes can have range attributes (paging). Execute the query
    // again to get additional items.
    this.rangeProcessing = true;

    const rangeProcessor = new RangeAttributesParser(this);
    rangeProcessor.on('error', this.callback);
    rangeProcessor.on('done', (ldapSearchResults: LdapSearchResult[]) => {
      async.each(
        ldapSearchResults,
        (ldapSearchResult: LdapSearchResult, acb: Function) => {
          // @ts-ignore
          this.entryParser(ldapSearchResult.originalSearchEntry, (se: SearchEntryEx) => {
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
    referral.client.unbind(undefined);
    this.pendingReferrals.delete(referral);
  }

  /**
   * Used to handle referrals, if they are enabled.
   *
   * @param referral A referral object that has a `uris` property.
   */
  onReferralChase (referral: SearchReference) {
    referral.uris.forEach((uri: string) => {
      if (!this.isReferralAllowed(uri)) {
        return;
      }

      trace(`Following LDAP referral chase at ${uri}`);
      // TODO: use non-deprecated url parsing var URL = require('url').URL;
      // TODO:  var myURL = new URL('http://www.example.com/foo?bar=1#main');
      const ref = url.parse(uri);
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
      this.pendingReferrals.add(refSearcher); // VVQ pendingReferrals

      refSearcher.search();
    });
  }

  /**
   * The only method you should need to invoke. It uses the information parsed
   * during construction to construct the query and submit it to the server. Once
   * the query has completed, or an error occurs, the callback you specified
   * during construction will be invoked.
   */
  search () {
    this.traceAttributes('Querying active directory (%dn)');

    this.client.search(this.baseDN, this.searchOptions, this.controls, (err, searchCallbackResponse: SearchCallbackResponse) => {
      if (err) {
        this.callback(err);
        return;
      }
      const errCallback = (err2: Error | any) => {
        if (err2.name === 'SizeLimitExceededError') {
          this.onSearchEnd();
          return;
        }

        this.client.unbind(undefined);
        // eslint-disable-next-line no-console
        console.log(err2);
        trace(`[${err2.errno || 'UNKNOWN'}] An error occurred performing the requested LDAP search on ${this.baseDN} options: (${toJson(this.options)})`);
        this.callback(err2);
      };

      searchCallbackResponse.on('searchEntry', this.onSearchEntry.bind(this));
      searchCallbackResponse.on('searchReference', this.onReferralChase.bind(this));
      searchCallbackResponse.on('error', errCallback);
      searchCallbackResponse.on('end', () => {
        this.searchComplete = true;
        this.onSearchEnd();
      });
    });
  }

  rangeSearch (searchOptions: SearchOptions, rangeCB: (err: any, se?: SearchEntryEx) => void) {
    this.traceAttributes('Quering (%dn) for range search', searchOptions);
    this.client.search(this.baseDN, searchOptions, this.controls, (err, res) => {
      if (err) {
        return rangeCB(err);
      }
      res.on('searchEntry', (searchEntry: SearchEntryEx) => {
        searchEntry.ao = attributesToObject(searchEntry);
        rangeCB(null, searchEntry);
      });
      res.on('searchReference', this.onReferralChase.bind(this));
      res.on('end', () => {
        this.rangeProcessing = false;
      });
      res.on('error', rangeCB);
    });
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
  searcher.search();
});

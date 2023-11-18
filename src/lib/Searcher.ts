import url from 'url';
import ldap, { Client, SearchCallbackResponse, SearchEntry, SearchOptions, SearchReference } from 'ldapjs';
import async from 'async';
import { RangeAttributesParser } from './RangeAttributesParser';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { IAdOptions, ISearcherResult, SearcherConstructorOptions } from '../@type/i-searcher';
import { PagedResultsControl } from '../@type/i-ldap';
import { LdapSearchResult } from './LdapSearchResult';
import { getLogger } from '../logger';
import { IAbstractLogger } from '../@type/i-abstract-logger';

/**
 * An interface for performing searches against an Active Directory database.
 * It handles ranged results, finding deleted items, and following referrals.
 */
export class Searcher {
  public logger: IAbstractLogger;

  public readonly options: SearcherConstructorOptions;

  public readonly baseDN: string;

  private readonly callback: (...args: any[]) => void;

  public readonly searchOptions: SearchOptions;

  private results: Map<string, any>;

  // eslint-disable-next-line no-use-before-define
  private pendingReferrals: Set<Searcher>;

  private searchComplete: boolean;

  private rangeProcessing: boolean;

  private client: Client;

  private readonly controls: PagedResultsControl[];

  constructor (options: SearcherConstructorOptions) {
    this.logger = getLogger();
    this.options = options;
    this.baseDN = options.baseDN;

    const { searchOptions, clientOptions, callback } = options;
    if (!clientOptions.url) {
      throw new Error('No url specified for ActiveDirectory client.');
    }
    this.callback = callback;
    this.searchOptions = searchOptions;

    this.results = new Map<string, any>();
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
      this.traceAttributes('Adding PagedResultControl to search (%s) with filter "%s" for %j');
      // @ts-ignore
      const size = searchOptions.paged?.pageSize || DEFAULT_PAGE_SIZE;
      // @ts-ignore
      this.controls.push(new ldap.PagedResultsControl({ value: { size } }));
    }

    if (options.includeDeleted) {
      const deletedControls = this.controls.filter((control) => control.type === '1.2.840.113556.1.4.417');
      if (deletedControls.length === 0) {
        this.traceAttributes('Adding ShowDeletedOidControl(1.2.840.113556.1.4.417) to search (%s) with filter "%s" for %j');
        // @ts-ignore
        this.controls.push(new ldap.Control({ type: '1.2.840.113556.1.4.417', criticality: true }));
        // VVQ ldap.Control ?
      }
    }
  }

  traceAttributes (messageTemplate: string, searchOptions = this.searchOptions) {
    this.logger.trace(
      messageTemplate,
      this.baseDN,
      searchOptions.filter,
      searchOptions.attributes || '[*]',
    );
  }

  /**
   * If set via the options of the query run the entry through the function.
   * Otherwise, just feed it to the parser callback.
   *
   * @param entry - The search entry object. // VVQ
   * @param raw - The raw search entry object as returned from ldap.js. // VVQ
   * @param callback - The callback to execute when complete.
   */
  entryParser (entry: LdapSearchResult, raw: any, callback: Function) {
    return this.options.entryParser ? this.options.entryParser(entry, raw, callback) : callback(entry);
  }

  /**
   * Invoked when the main search has completed, including any referrals.
   */
  onSearchEnd () {
    if (this.rangeProcessing || this.pendingReferrals.size) {
      return;
    }
    this.logger.trace('Active directory search (%s) for "%s" returned %d entries.', this.baseDN, this.searchOptions.filter, this.results.size);
    this.client.unbind(undefined);
    this.callback(null, Array.from(this.results.values()));
  }

  /**
   * Invoked when the ldap.js client is returning a search entry result.
   *
   * @param entry The search entry as returned by ldap.js.
   */
  onSearchEntry (entry: SearchEntry) {
    this.logger.trace('onSearchEntry(entry)');
    // @ts-ignore
    const result = entry.object; // VVQ json, pojo
    delete result.controls;

    // Some attributes can have range attributes (paging). Execute the query
    // again to get additional items.
    this.rangeProcessing = true;

    const rangeProcessor = new RangeAttributesParser(this);
    rangeProcessor.on('error', this.callback);
    rangeProcessor.on('done', (ldapSearchResults: LdapSearchResult[]) => {
      async.each(
        ldapSearchResults,
        (entry2: LdapSearchResult, acb: Function) => {
          // @ts-ignore
          this.entryParser(entry2, entry.raw, (r) => { // VVA entry.raw?
            // @ts-ignore
            this.results.set(entry2.dn, r); // VVQ r?  entry2.dn ? неь свойства
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

    rangeProcessor.parseResult(result);
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

      this.logger.trace('Following LDAP referral chase at %s', uri);
      // TODO: use non-deprecated url parsing var URL = require('url').URL;
      // TODO:  var myURL = new URL('http://www.example.com/foo?bar=1#main');
      const ref = url.parse(uri);
      const referralBaseDn = (ref.pathname || '/').substring(1);
      const refSearcher = new Searcher({
        ...this.options,
        baseDN: referralBaseDn,
        callback: (err) => {
          if (err) {
            this.logger.trace(err, '[%s] An error occurred chasing the LDAP referral on %s (%j)', err.errno, referralBaseDn, this.options);
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
    this.traceAttributes('Querying active directory (%s) with filter "%s" for %j');

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
        this.logger.trace(err2, '[%s] An error occurred performing the requested LDAP search on %s (%j)', err2.errno || 'UNKNOWN', this.baseDN, this.options);
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

  rangeSearch (searchOptions: SearchOptions, rangeCB: (...args: any[]) => void) {
    this.traceAttributes('Quering (%s) for range search with filter "%s" for: %j', searchOptions);
    this.client.search(this.baseDN, searchOptions, this.controls, (err, res) => {
      if (err) {
        return rangeCB(err);
      }
      res.on('searchEntry', (entry) => {
        // @ts-ignore
        const obj = entry.object; // VVA
        rangeCB(null, obj);
      });
      res.on('searchReference', this.onReferralChase.bind(this));
      res.on('end', () => {
        this.rangeProcessing = false;
      });
      res.on('error', rangeCB);
    });
  }
}

export const asyncSearcher = async (adOptions: IAdOptions) => new Promise<ISearcherResult[]>((resolve, reject) => {
  const callback = (err: Error | any, results: ISearcherResult[]) => { // VVQ result ?
    if (err) {
      reject(err);
      return;
    }
    resolve(results);
  };
  const searcher = new Searcher({ ...adOptions, callback });
  searcher.search();
});

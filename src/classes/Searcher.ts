import url from 'url';
import ldap from 'ldapjs';
import async from 'async';
import cache from 'memory-cache';
const RangeAttributesParser = require('../cls/RangeAttributesParser');
const { DEFAULT_PAGE_SIZE } = require('../constants');

/**
 * An interface for performing searches against an Active Directory database.
 * It handles ranged results, finding deleted items, and following referrals.
 */
class Searcher {
  /**
   * @param {SearcherConstructorOptions} options
   */
  constructor (options) {
    this.logger = cache.get('logger');
    this.options = options;
    this.baseDN = options.baseDN;

    const { searchOptions, clientOptions, callback } = options;
    if (!clientOptions.url) {
      throw new Error('No url specified for ActiveDirectory client.');
    }
    this.callback = callback;
    this.searchOptions = searchOptions;

    this.results = new Map();
    this.pendingReferrals = new Set();
    this.searchComplete = false;
    this.rangeProcessing = false;

    this.client = ldap.createClient(clientOptions);
    // to handle connection errors
    this.client.on('connectTimeout', callback);
    this.client.on('error', callback);

    this.controls = options.controls || [];

    // Add paging results control by default if not already added.
    const pagedControls = this.controls.filter((control) => control instanceof ldap.PagedResultsControl);

    if (!searchOptions.paged && pagedControls.length === 0) {
      this.traceAttributes('Adding PagedResultControl to search (%s) with filter "%s" for %j');
      const size = searchOptions.paged.pageSize || DEFAULT_PAGE_SIZE;
      this.controls.push(new ldap.PagedResultsControl({ value: { size } }));
    }

    if (options.includeDeleted) {
      const deletedControls = this.controls.filter((control) => control.type === '1.2.840.113556.1.4.417');
      if (deletedControls.length === 0) {
        this.traceAttributes('Adding ShowDeletedOidControl(1.2.840.113556.1.4.417) to search (%s) with filter "%s" for %j');
        this.controls.push(new ldap.Control({ type: '1.2.840.113556.1.4.417', criticality: true }));
      }
    }
  }

  traceAttributes (messageTemplate, searchOptions = this.searchOptions) {
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
   * @param {object} entry The search entry object.
   * @param {object} raw The raw search entry object as returned from ldap.js.
   * @param {function} callback The callback to execute when complete.
   */
  entryParser (entry, raw, callback) {
    return this.options.entryParser ? this.options.entryParser(entry, raw, callback) : callback(entry);
  }

  /**
   * Invoked when the main search has completed, including any referrals.
   */
  onSearchEnd () {
    if (this.rangeProcessing || this.pendingReferrals.size) {
      return;
    }
    this.logger.trace('Active directory search (%s) for "%s" returned %d entries.', this.baseDN, this.searchOptions.filter, this.results.length);
    this.client.unbind(undefined);
    this.callback(null, Array.from(this.results.values()));
  }

  /**
   * Invoked when the ldap.js client is returning a search entry result.
   *
   * @param {ldap.SearchEntry} entry The search entry as returned by ldap.js.
   */
  onSearchEntry (entry) {
    this.logger.trace('onSearchEntry(entry)');
    const result = entry.object;
    delete result.controls;

    // Some attributes can have range attributes (paging). Execute the query
    // again to get additional items.
    this.rangeProcessing = true;

    const rangeProcessor = new RangeAttributesParser(this);
    rangeProcessor.on('error', this.callback);
    rangeProcessor.on('done', (results) => {
      async.each(
        results,
        (result, acb) => {
          this.entryParser(result, entry.raw, (r) => {
            this.results.set(result.dn, r);
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

  isReferralAllowed (referralUri) {
    const { enabled, exclude = [] } = this.options.defaultReferrals || {};
    if (!referralUri || !enabled) {
      return false;
    }
    return !exclude.some((excludePattern) => (new RegExp(excludePattern, 'i')).test(referralUri));
  }

  /**
   * Dequeues a referral chase client.
   *
   * @param {Searcher} referral An instance of {@link Searcher} being used to chase a referral.
   */
  removeReferral (referral) {
    if (!referral) {
      return;
    }
    referral.client.unbind(undefined);
    this.pendingReferrals.delete(referral);
  }

  /**
   * Used to handle referrals, if they are enabled.
   *
   * @param {ldap.SearchReference} referral A referral object that has a `uris` property.
   */
  onReferralChase (referral) {
    referral.uris.forEach((uri) => {
      if (!this.isReferralAllowed(uri)) {
        return;
      }

      this.logger.trace('Following LDAP referral chase at %s', uri);
      // TODO: use non-deprecated url parsing
      const referral = url.parse(uri);
      const referralBaseDn = (referral.pathname || '/').substring(1);
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

    this.client.search(this.baseDN, this.searchOptions, this.controls, (err, res) => {
      if (err) {
        this.callback(err);
        return;
      }

      const errCallback = (err) => {
        if (err.name === 'SizeLimitExceededError') {
          this.onSearchEnd(res);
          return;
        }

        this.client.unbind(undefined);
        this.logger.trace(err, '[%s] An error occurred performing the requested LDAP search on %s (%j)', err.errno || 'UNKNOWN', this.baseDN, this.options);
        this.callback(err);
      };

      res.on('searchEntry', this.onSearchEntry.bind(this));
      res.on('searchReference', this.onReferralChase.bind(this));
      res.on('error', errCallback);
      res.on('end', (err) => {
        this.searchComplete = true;
        this.onSearchEnd(err);
      });
    }, undefined);
  }

  /**
   * @param {ldap.SearchOptions} searchOptions
   * @param {Function} rangeCB
   */
  rangeSearch (searchOptions, rangeCB) {
    this.traceAttributes('Quering (%s) for range search with filter "%s" for: %j', searchOptions);
    this.client.search(this.baseDN, searchOptions, this.controls, (err, res) => {
      if (err) {
        return rangeCB(err);
      }
      res.on('searchEntry', (entry) => {
        const obj = entry.object;
        rangeCB(null, obj);
      });
      res.on('searchReference', this.onReferralChase.bind(this));
      res.on('end', () => {
        this.rangeProcessing = false;
      });
      res.on('error', rangeCB);
    }, undefined);
  }
}

/**
 * @param {IAsyncSearcherOptions} searchOptions
 */
const asyncSearcher = async (searchOptions) => new Promise((resolve, reject) => {
  const callback = (err, result) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(result);
  };
  const searcher = new Searcher({ ...searchOptions, callback });
  searcher.search();
});

module.exports = { Searcher, asyncSearcher };

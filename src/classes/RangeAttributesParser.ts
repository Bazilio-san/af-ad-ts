import { EventEmitter } from 'events';
import cache from 'memory-cache';
import { SearchOptions } from 'ldapjs';
import { RangeAttribute } from './RangeAttribute';
import { LdapSearchResult } from './LdapSearchResult';
import { Searcher } from './Searcher';

/**
 * Parses the distinguishedName (dn) to remove any invalid characters or to
 * properly escape the request.
 */
const parseDistinguishedName = (dn: string): string => {
  const logger = cache.get('logger');
  logger.trace('parseDistinguishedName(%s)', dn);
  if (!dn) {
    return (dn);
  }
  dn = dn.replace(/"/g, '\\"');
  return dn.replace('\\,', '\\\\,');
};

/**
 * Handles any attributes that might have been returned with a range= specifier.
 * It has a single "public" method -- {@link RangeAttributesParser#parseResult}.
 * It exposes two events: "error" and "done". The *done* event will be fired
 * when **all** pages of a paged search result have been retrieved.
 */
export class RangeAttributesParser extends EventEmitter {
  private searcher: Searcher;

  private results: Map<string, LdapSearchResult>;

  /**
   * @param searcher An instance of Searcher that is performing the queries.
   */
  constructor (searcher: Searcher) {
    super();
    this.searcher = searcher;
    this.results = new Map();
  }

  /**
   * Give it a search result that *might* have some attributes with ranges and
   * it'll recursively retrieve **all** of the values for said attributes. It
   * fires the `done` and `error` events appropriately.
   *
   * @param result - An LDAP search result.
   */
  parseResult (result: any) { // VVQ result ?
    const logger = cache.get('logger');
    logger.trace('parsing result for range attributes: %j', result);

    const _result: LdapSearchResult = this.results.has(result.dn)
      ? this.results.get(result.dn) as LdapSearchResult
      : new LdapSearchResult(result);
    this.results.set(result.dn, _result);
    if (!RangeAttribute.hasRangeAttributes(result)) {
      this.emit('done', this.getResults());
      return;
    }

    const rangeAttributes: RangeAttribute[] = RangeAttribute.getRangeAttributes(result);
    if (rangeAttributes.length === 0) {
      this.emit('done', this.getResults());
      return;
    }

    let queryAttributes: string[] = [];
    rangeAttributes.forEach((attr: RangeAttribute) => {
      const attrName: string = attr.attributeName || '';
      if (!_result.rangeAttributes.has(attrName)) {
        _result.rangeAttributes.set(attrName, attr);
      }
      if (!_result.rangeAttributeResults.has(attrName)) {
        _result.rangeAttributeResults.set(attrName, []);
      }

      // update the attribute result accumulator with the new page of values
      const currRangeName = attr.toString();
      const attrResults = _result.rangeAttributeResults.get(attrName);
      const newResults = [].concat(attrResults, result[currRangeName]);
      _result.rangeAttributeResults.set(attrName, newResults);

      // advance the query
      const nextAttr = attr.next();
      if (nextAttr) {
        _result.rangeAttributes.set(attrName, nextAttr);
        delete _result.originalResult[currRangeName]; // VVQ originalResult ?
        const nextRangeName = _result.rangeAttributes.get(attrName)?.toString();
        if (nextRangeName && nextRangeName !== currRangeName) {
          queryAttributes.push(nextRangeName);
        }
      }
    });

    if (queryAttributes.length === 0) {
      // we have reached then end of the pages and have queried the last page
      this.emit('done', this.getResults());
      return;
    }

    const rangeKeysSet = new Set(Array.from(_result.rangeAttributes.keys())); // keys ? -> Set
    let { attributes = [] } = this.searcher.searchOptions;
    if (!Array.isArray(attributes)) {
      attributes = [attributes];
    }
    const qa = attributes.filter((a) => !rangeKeysSet.has(a));
    queryAttributes = [...queryAttributes, ...qa];
    const filter = `(distinguishedName=${parseDistinguishedName(result.dn)})`;

    const searchOptions: SearchOptions = {
      filter,
      attributes: queryAttributes,
      scope: this.searcher.searchOptions.scope,
    };

    this.searcher.rangeSearch(searchOptions, (err, result2) => {
      if (err) {
        this.emit('error', err);
        return;
      }
      this.parseResult(result2);
    });
  }

  getResults (): LdapSearchResult[] {
    const results: LdapSearchResult[] = [];
    Array.from(this.results.values()).forEach((v) => results.push(v.value()));
    return results;
  }
}

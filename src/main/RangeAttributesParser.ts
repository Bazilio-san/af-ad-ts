import { EventEmitter } from 'events';
import { RangeAttribute } from './RangeAttribute';
import { LdapSearchResult } from './LdapSearchResult';
import { Searcher } from './Searcher';
import { trace, toJson } from '../lib/logger';
import { getAttributeValues, getSearchEntryKey } from '../lib/attributes';
import { ISearchOptionsEx, SearchEntryEx } from '../@type/i-searcher';

/**
 * Parses the distinguishedName (dn) to remove any invalid characters or to
 * properly escape the request.
 */
const parseDistinguishedName = (dn: string): string => {
  trace(`parseDistinguishedName(${dn})`);
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
   * Give it a search result that *might* have some attributes with ranges, and
   * it'll recursively retrieve **all** of the values for said attributes. It
   * fires the `done` and `error` events appropriately.
   *
   * @param se - An LDAP search result.
   */
  parseResult (se?: SearchEntryEx) {
    if (!se) {
      return;
    }
    const dnCn = getSearchEntryKey(se);
    const lsr: LdapSearchResult = this.results.has(dnCn)
      ? this.results.get(dnCn) as LdapSearchResult
      : new LdapSearchResult(se);

    this.results.set(dnCn, lsr);
    if (!RangeAttribute.hasRangeAttributes(se)) {
      this.emit('done', this.getResults());
      return;
    }

    const rangeAttributes: RangeAttribute[] = RangeAttribute.getRangeAttributes(se);
    trace(`Parsing result for range attributes:\n${toJson(rangeAttributes)}`);
    if (rangeAttributes.length === 0) {
      this.emit('done', this.getResults());
      return;
    }

    let queryAttributes: string[] = [];
    rangeAttributes.forEach((rangeAttribute: RangeAttribute) => {
      const { attributeName } = rangeAttribute;
      if (!lsr.rangeAttributes.has(attributeName)) {
        lsr.rangeAttributes.set(attributeName, rangeAttribute);
      }
      // update the attribute result accumulator with the new page of values
      const currRangeName = rangeAttribute.toString();
      const rangeAttributeResults = lsr.rangeAttributeResults.get(attributeName) || [];
      const newResults = [...rangeAttributeResults, ...getAttributeValues(se, currRangeName)]; // VVQ
      lsr.rangeAttributeResults.set(attributeName, newResults);

      // advance the query
      const nextAttr = rangeAttribute.next();
      if (nextAttr) {
        lsr.rangeAttributes.set(attributeName, nextAttr);
        const nextRangeName = lsr.rangeAttributes.get(attributeName)?.toString();
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

    let { attributes = [] } = this.searcher.searchOptions;
    if (!Array.isArray(attributes)) {
      attributes = [attributes];
    }
    const qa = attributes.filter((a) => !lsr.rangeAttributes.has(a));
    queryAttributes = [...new Set([...queryAttributes, ...qa])];
    const filter = `(distinguishedName=${parseDistinguishedName(dnCn)})`;

    const searchOptions: ISearchOptionsEx = {
      filter,
      attributes: queryAttributes,
      scope: this.searcher.searchOptions.scope,
    };

    this.searcher.rangeSearch(searchOptions, (err, rangeSearchEntry) => {
      if (err) {
        this.emit('error', err);
        return;
      }
      this.parseResult(rangeSearchEntry);
    });
  }

  getResults (): LdapSearchResult[] {
    return [...this.results.values()];
  }
}

import { IAttributesObject, SearchEntryEx } from '../../@type/i-searcher';
import { getAttributeSingleValue } from '../../lib/attributes';

import { RangeAttribute } from './RangeAttribute';

/**
 * Represents a paged search result.
 */
export class LdapSearchResult {
  public readonly originalSearchEntry: SearchEntryEx;

  public rangeAttributes: Map<string, RangeAttribute>;

  public rangeAttributeResults: Map<string, string[]>;

  constructor (se: SearchEntryEx) {
    this.originalSearchEntry = se;
    this.rangeAttributes = new Map();
    this.rangeAttributeResults = new Map();
  }

  public name (): string {
    const se = this.originalSearchEntry;
    return se.idn
      || getAttributeSingleValue(se, 'dn')
      || getAttributeSingleValue(se, 'distinguishedName')
      || '';
  }

  /**
   * Populates the original search result's range valued attributes with the
   * retrieved values and returns the new search result.
   */
  public value (): IAttributesObject {
    const result = this.originalSearchEntry.ao;
    [...this.rangeAttributes.keys()].forEach((k) => {
      const v = this.rangeAttributeResults.get(k);
      if (v) {
        result[k] = v;
      }
    });
    return result;
  }
}

import { SearchEntry } from 'ldapjs';
import { RangeAttribute } from './RangeAttribute';
import { getAttributeSingleValue, getLastValue } from '../attributes';

/**
 * Represents a paged search result.
 */
export class LdapSearchResult {
  public readonly originalSearchEntry: SearchEntry;

  public rangeAttributes: Map<string, RangeAttribute>;

  public rangeAttributeResults: Map<string, string[]>;

  constructor (se: SearchEntry) {
    this.originalSearchEntry = se;
    this.rangeAttributes = new Map();
    this.rangeAttributeResults = new Map();
  }

  public name (): string {
    return getAttributeSingleValue(this.originalSearchEntry, 'dn') || '';
  }

  /**
   * Populates the original search result's range valued attributes with the
   * retrieved values and returns the new search result.
   */
  public value (): any {
    const result = {};
    this.originalSearchEntry.attributes.forEach((attribute) => {
      result[attribute.type] = getLastValue(attribute.values);
    });
    [...this.rangeAttributes.keys()].forEach((k) => {
      if (this.rangeAttributeResults.get(k)) {
        result[k] = this.rangeAttributeResults.get(k);
      }
    });
    return result;
  }
}

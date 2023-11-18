import { RangeAttribute } from './RangeAttribute';

/**
 * Represents a paged search result.
 */
export class LdapSearchResult {
  public readonly originalResult: any; // VVQ

  public rangeAttributes: Map<string, RangeAttribute>;

  public rangeAttributeResults: Map<string, any>;

  /**
   * @param result - An LDAP search entry result.
   */
  constructor (result: any) { // VVQ
    this.originalResult = result;
    this.rangeAttributes = new Map<string, RangeAttribute>();
    this.rangeAttributeResults = new Map<string, any>(); // VVQ
  }

  name () {
    return this.originalResult.dn;
  }

  /**
   * Populates the original search result's range valued attributes with the
   * retrieved values and returns the new search result.
   */
  value (): any {
    const result = {};
    Object.getOwnPropertyNames(this.originalResult).forEach(
      (k) => {
        result[k] = this.originalResult[k];
      },
    );
    Array.from(this.rangeAttributes.keys()).forEach((k) => {
      result[k] = this.rangeAttributeResults.get(k);
    });
    return result;
  }
}

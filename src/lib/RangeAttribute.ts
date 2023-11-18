// https://msdn.microsoft.com/en-us/library/cc223242.aspx
// [attribute];range=[low]-[high]
// matching: 1 = name, 2 = low, 3 = high
const rangeRegex = /^([^;]+);range=(\d+)-([\d*]+)$/i;

/**
 * Represents an attribute wherein a query has been limited to a specific range.
 */
export class RangeAttribute {
  public readonly attributeName: string | null;

  private low: number | null;

  private high: number | null;

  /**
   * @param attribute The actual attribute name. May also
   * contain a full range retrieval specifier for parsing
   * (i.e. [attribute];range=[low]-[high]). Optionally an object can be specified.
   */
  constructor (attribute?: string | object | null) {
    if (typeof attribute === 'string') {
      const [, attributeName, low, high] = rangeRegex.exec(attribute) || [];
      this.attributeName = attributeName;
      this.low = parseInt(low, 10);
      this.high = parseInt(high, 10) || null;
    } else {
      this.attributeName = null;
      this.low = null;
      this.high = null;
    }
  }

  /**
   * Gets the next range retrieval specifier for a query.
   */
  public next (): RangeAttribute | null {
    const { high, low } = this;
    if (high == null || high === low) {
      return null;
    }
    this.low = high + 1;
    if (low === 0) {
      this.high = high + 1;
    } else {
      this.high = high + 1 + (high - (low || 0));
    }
    return this;
  }

  /**
   * Checks to see if the range specifier has been exhausted or completed.
   */
  private isComplete (): boolean {
    return ((this.high == null) || ((typeof this.high) === 'undefined'));
  }

  /**
   * Gets the string representation of the range retrieval specifier.
   */
  public toString (): string {
    return `${this.attributeName};range=${this.low}-${this.high ? this.high : '*'}`;
  }

  /**
   * Retrieves all the attributes which have range attributes specified.
   * @param entry - SearchEntry to extract the range retrieval attributes from.
   */
  static getRangeAttributes (entry: object): RangeAttribute[] {
    const attributes: RangeAttribute[] = [];
    Object.keys(entry).forEach((attribute) => {
      if (RangeAttribute.isRangeAttribute(attribute)) {
        attributes.push(new RangeAttribute(attribute));
      }
    });
    return attributes;
    // return  Object.keys(entry)
    //   .filter((attribute) => RangeAttribute.isRangeAttribute(attribute))
    //   .map((attribute) => new RangeAttribute(attribute)); // VVQ
  }

  /**
   * Checks to see if the specified attribute is a range retrieval attribute.
   */
  static isRangeAttribute (attribute: string): boolean {
    return rangeRegex.test(attribute);
  }

  /**
   * Checks to see if the specified object has any range retrieval attributes.
   *
   * @param entry - SearchEntry to check for range retrieval specifiers.
   */
  static hasRangeAttributes (entry: object): boolean {
    return Object.keys(entry).some((v) => RangeAttribute.isRangeAttribute(v));
  }
}

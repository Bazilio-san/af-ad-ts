// https://msdn.microsoft.com/en-us/library/cc223242.aspx
// [attribute];range=[low]-[high]
// matching: 1 = name, 2 = low, 3 = high
import { Attribute } from 'ldapts';

import { SearchEntryEx } from '../../@type/i-searcher';

// Simple interface for attribute objects with type property
interface AttributeLike {
  type: string;
}

const rangeRegex = /^([^;]+);range=(\d+)-([\d*]+)$/i;

/**
 * Represents an attribute wherein a query has been limited to a specific range.
 */
export class RangeAttribute {
  public readonly attributeName: string;

  private low: number;

  private high: number | null;

  /**
   * @param attributeType The actual attribute name. May also
   * contain a full range retrieval specifier for parsing
   * (i.e. [attribute];range=[low]-[high]). Optionally an object can be specified.
   */
  constructor (attributeType: string) {
    const [, attributeName, low, high] = rangeRegex.exec(attributeType) || [];
    this.attributeName = attributeName;
    this.low = parseInt(low, 10);
    this.high = parseInt(high, 10) || null;
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
   */
  static getRangeAttributes (se: SearchEntryEx): RangeAttribute[] {
    return se.attributes
      .filter((attribute: Attribute) => RangeAttribute.isRangeAttribute(attribute))
      .map((attribute: Attribute) => new RangeAttribute(attribute.type));
  }

  /**
   * Checks to see if the specified attribute is a range retrieval attribute.
   */
  static isRangeAttribute (attribute: AttributeLike | Attribute): boolean {
    const { type } = attribute;
    return rangeRegex.test(type);
  }

  /**
   * Checks to see if the specified object has any range retrieval attributes.
   */
  static hasRangeAttributes (se: SearchEntryEx): boolean {
    return se.attributes.some((attribute: Attribute) => RangeAttribute.isRangeAttribute(attribute));
  }
}

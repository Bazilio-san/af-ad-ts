/**
 * Represents an ActiveDirectory group
 */
export class Group {
  public dn: string = '';

  public cn: string = '';

  /**
   * @param properties The properties to assign to the newly created item.
   */
  constructor (properties: any) {
    Object.getOwnPropertyNames(properties || {}).forEach((prop) => {
      Object.defineProperty(this, prop, {
        value: properties[prop],
        enumerable: true,
        writable: true,
      });
    });
  }
}

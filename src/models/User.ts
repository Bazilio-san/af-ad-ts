/**
 * Represents an ActiveDirectory user account.
 */
export class User {
  public groups: any[] = [];

  public dn: string = '';

  /**
   * @param properties - The properties to assign to the newly created item.
   */
  constructor (properties?: any) {
    Object.getOwnPropertyNames(properties || {}).forEach((prop) => {
      Object.defineProperty(this, prop, {
        value: properties[prop],
        enumerable: true,
        writable: true,
      });
    });
  }

  /**
   * Checks to see if the user is the member of the specified group.
   *
   * @param group - The name of the group to check for membership.
   */
  isMemberOf (group: string): boolean {
    if (!group) {
      return false;
    }
    const groupLc = group.toLowerCase();
    return this.groups.some((g) => g.toLowerCase() === groupLc);
  }
}

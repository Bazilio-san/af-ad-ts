export interface IUser {
  groups: any[],
  dn: string,
  isMemberOf: (group: string) => boolean,

  [propName: string]: string | any[] | ((group: string) => boolean),
}

/**
 * Represents an ActiveDirectory user account.
 * @param properties - The properties to assign to the newly created item.
 */
export const newUser = (properties: any): IUser => {
  const user: IUser = Object.create(
    {
      isMemberOf (group: string): boolean {
        if (!group) {
          return false;
        }
        const groupLc = group.toLowerCase();
        // @ts-ignore
        return this.groups?.some((g) => g.toLowerCase() === groupLc) || false;
      },
    },
  );
  Object.getOwnPropertyNames(properties || {}).forEach((prop) => {
    user[prop] = properties[prop];
  });
  return user;
};

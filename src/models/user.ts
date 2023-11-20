import { SearchEntryEx } from '../@type/i-searcher';
import { pickAttributes } from '../attributes';

export interface IUser {
  groups: any[],
  idn: string,
  isMemberOf: (group: string) => boolean,

  [propName: string]: string | any[] | ((group: string) => boolean),
}

/**
 * Represents an ActiveDirectory user account.
 */
export const newUser = (searchEntry: SearchEntryEx, askedAttributes: string[]): IUser => {
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
      idn: searchEntry.idn,
    },
  );

  const properties = pickAttributes(searchEntry, askedAttributes);
  Object.assign(user, properties);
  return user;
};

import { SearchEntryEx } from '../@type/i-searcher';

export interface IGroup {
  idn: string,
  cn?: string,
  distinguishedName?: string,

  [propName: string]: string | undefined,
}

export const newGroup = (searchEntry: SearchEntryEx): IGroup => {
  const group: IGroup = Object.create(
    { idn: searchEntry.idn },
  );

  Object.assign(group, searchEntry.ao);
  return group;
};

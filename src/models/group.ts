import { SearchEntryEx } from '../@type/i-searcher';

export interface IGroup {
  idn: string,

  [propName: string]: string,
}

export const newGroup = (searchEntry: SearchEntryEx): IGroup => {
  const group: IGroup = Object.create(
    { idn: searchEntry.idn },
  );

  Object.assign(group, searchEntry.ao);
  return group;
};

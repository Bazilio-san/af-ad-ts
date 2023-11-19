import { SearchEntry } from 'ldapjs';
import { attributesToObject } from '../attributes';

export interface IGroup {
  cn: string,
  dn: string,

  [propName: string]: string,
}

/**
 * Represents an ActiveDirectory group.
 */
export const newGroup = (searchEntry: SearchEntry): IGroup => attributesToObject(searchEntry) as IGroup;

import { pick, cloneDeep } from 'af-tools-ts';
import { Attribute } from 'ldapts';

import { Entry } from '../@type/i-ldap';
import { IAttributesObject, SearchEntryEx } from '../@type/i-searcher';

import { ensureArray } from './core-utilities';

type TLegacyEntry = { attributes: Attribute[] };
type TAnySEO = Entry | TLegacyEntry;

export const hasAttribute = (seo: TAnySEO, attrName: string): boolean => {
  // Legacy format with attributes array
  if ('attributes' in seo && Array.isArray(seo.attributes)) {
    return (seo.attributes as Attribute[]).some((a: Attribute) => a.type === attrName);
  }
  // New Entry format with direct properties
  return attrName in seo;
};

export const getAttribute = <T = Attribute> (
  seo: TAnySEO,
  attrName: string,
): T | undefined => {
  // Legacy format with attributes array
  if ('attributes' in seo && Array.isArray(seo.attributes)) {
    return (seo.attributes as Attribute[]).find((a: Attribute) => a.type === attrName) as T | undefined;
  }
  // New Entry format with direct properties
  return (seo as any)[attrName] as T | undefined;
};

export const getAttributeValues = (seo: TAnySEO, attributeName: string): string[] => {
  // Legacy format with attributes array
  if ('attributes' in seo && Array.isArray(seo.attributes)) {
    const attr = getAttribute(seo, attributeName) as Attribute;
    const { values } = attr || {};
    return (Array.isArray(values) ? values : [values]).filter((v) => v != null) as string[];
  }
  // New Entry format with direct properties
  const value = (seo as any)[attributeName];
  return (Array.isArray(value) ? value : [value]).filter((v) => v != null) as string[];
};

export const getLastValue = (values: string | string[]): string => {
  if (Array.isArray(values)) {
    return values[values.length - 1];
  }
  return values;
};

export const getAttributeSingleValue = <T = string | undefined> (seo: TAnySEO, attributeName: string): T => {
  // VVQ Is it used correctly everywhere?
  // Legacy format with attributes array
  if ('attributes' in seo && Array.isArray(seo.attributes)) {
    const attr = getAttribute(seo, attributeName) as Attribute;
    if (attr == null) {
      return undefined as T;
    }
    return getLastValue(attr.values as string | string[]) as T;
  }
  // New Entry format with direct properties
  const value = (seo as any)[attributeName];
  if (value == null) {
    return undefined as T;
  }
  return getLastValue(value) as T;
};

/**
 * Checks to see if any of the specified attributes are the wildcard
 * 'all' or '*' attribute or if the attributes array is empty.
 */
export const shouldIncludeAllAttributes = (attributes: string | string[] | undefined): boolean => ensureArray(attributes).some((a) => a === 'all' || a === '*');

export const attributesToObject = (attributes: Attribute[]): IAttributesObject => attributes
  .reduce((accum, attribute) => {
    let v: string | string[] = attribute.values as string | string[];
    if (Array.isArray(v) && v.length === 1) {
       
      v = v[0] as string;
    }
    // @ts-ignore
    accum[attribute.type] = v;
    return accum;
  }, {});

/**
 * Picks only the requested attributes from the ldap result. If a wildcard or
 * empty result is specified, then all attributes are returned.
 *
 * @params searchEntry - The LDAP result.
 * @params desiredAttributes - The desired or wanted attributes.
 * @returns object with only the requested attributes.
 */
export const pickAttributes = (searchEntry: SearchEntryEx, desiredAttributes: string[]): IAttributesObject => {
  if (shouldIncludeAllAttributes(desiredAttributes)) {
    return cloneDeep(searchEntry.ao);
  }
  return cloneDeep(pick(searchEntry.ao, desiredAttributes));
};

export const getSearchEntryKey = (se: Entry): string => { // VVQ
  const key = getAttributeSingleValue(se, 'dn') || getAttributeSingleValue(se, 'cn');
  return key || '';
};

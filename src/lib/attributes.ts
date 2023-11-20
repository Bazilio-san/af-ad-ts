import { Attribute, AttributeJson, SearchEntry, SearchEntryObject } from 'ldapjs';
import { pick, cloneDeep } from 'af-tools-ts';
import { IAttributesObject, SearchEntryEx } from '../@type/i-searcher';
import { ensureArray } from './core-utilities';

type TAnySEO = SearchEntry | SearchEntryObject;
type TAnyAttr = Attribute | AttributeJson;

export const hasAttribute = (seo: TAnySEO, attrName: string): boolean => seo.attributes.some((a) => a.type === attrName);

export const getAttribute = <T = TAnyAttr> (
  seo: TAnySEO,
  attrName: string,
): T | undefined => seo.attributes.find((a) => a.type === attrName) as T | undefined;

export const getAttributeValues = (seo: TAnySEO, attributeName: string): string[] => {
  const attr = getAttribute(seo, attributeName);
  const { values } = attr || {};
  return (Array.isArray(values) ? values : [values]).filter((v) => v != null) as string[];
};

export const getLastValue = (values: string | string[]): string => {
  if (Array.isArray(values)) {
    return values[values.length - 1];
  }
  return values;
};

export const getAttributeSingleValue = <T = string | undefined> (seo: TAnySEO, attributeName: string): T => {
  // VVQ везде ли верно используется?
  const attr = getAttribute(seo, attributeName);
  if (attr == null) {
    return undefined as T;
  }
  return getLastValue(attr.values) as T;
};

/**
 * Checks to see if any of the specified attributes are the wildcard
 * 'all' or '*' attribute or if the attributes array is empty.
 */
export const shouldIncludeAllAttributes = (attributes: string | string[] | undefined): boolean => ensureArray(attributes).some((a) => a === 'all' || a === '*');

export const attributesToObject = (attributes: Attribute[]): IAttributesObject => attributes
  .reduce((accum, attribute) => {
    let v = attribute.values;
    if (Array.isArray(v) && v.length === 1) {
      v = v[0];
    }
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

export const getSearchEntryKey = (se: SearchEntry): string => { // VVQ
  const key = getAttributeSingleValue(se, 'dn') || getAttributeSingleValue(se, 'cn');
  return key || '';
};

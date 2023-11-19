import { Attribute, AttributeJson, SearchEntry, SearchEntryObject } from 'ldapjs';
import { ISearchLDAPResult } from './@type/i-searcher';

export const hasAttribute = (seo: SearchEntry | SearchEntryObject, attrName: string): boolean => seo.attributes.some((a) => a.type === attrName);

export const getAttribute = <T = Attribute | AttributeJson> (seo: SearchEntry | SearchEntryObject, attrName: string): T | undefined => seo.attributes
  .find((a) => a.type === attrName) as T | undefined;

export const getAttributeValues = (seo: SearchEntry | SearchEntryObject, attributeName: string): string[] => {
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

export const getAttributeSingleValue = <T = string | undefined> (seo: SearchEntry | SearchEntryObject, attributeName: string): T => {
  const attr = getAttribute(seo, attributeName);
  if (attr == null) {
    return undefined as T;
  }
  return getLastValue(attr.values) as T;
};

export const attributesToObject = (searchEntry: SearchEntry): ISearchLDAPResult => searchEntry.attributes
  .reduce((accum, attribute) => {
    let v = attribute.values;
    if (Array.isArray(v) && v.length === 1) {
      v = v[0];
    }
    accum[attribute.type] = v;
    return accum;
  }, {});

export const getSearchEntryKey = (se: SearchEntry): string => {
  const key = getAttributeSingleValue(se, 'dn') || getAttributeSingleValue(se, 'cn');
  return key || '';
};

import { Attribute, AttributeJson, SearchEntry, SearchEntryObject } from 'ldapjs';
import { IAttributesObject } from './@type/i-searcher';

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
  const attr = getAttribute(seo, attributeName);
  if (attr == null) {
    return undefined as T;
  }
  return getLastValue(attr.values) as T;
};

export const attributesToObject = (searchEntry: SearchEntry): IAttributesObject => searchEntry.attributes
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

import { Attribute } from 'ldapjs';
import { IAttributesObject, SearchEntryEx, TEntryParser } from '../@type/i-searcher';
import { attributesToObject } from '../lib/attributes';
import { binarySidToStringSid, getDN } from '../lib/utilities';

export const defaultPreEntryParser = (searchEntry: SearchEntryEx): SearchEntryEx => {
  const { attributes } = searchEntry;
  [
    'objectSid',
    'objectGUID',
    'msExchMailboxSecurityDescriptor',
    'msExchMailboxGuid',
    'msExchArchiveGUID',
  ].forEach((type) => {
    const index = attributes.findIndex((a) => a.type === type);
    if (index > -1) {
      const attribute = attributes[index];
      const buf = attribute.buffers[attribute.buffers.length - 1];
      attributes[index] = new Attribute({ type, values: [binarySidToStringSid(buf)] });
    }
  });
  searchEntry.attributes = attributes;

  searchEntry.idn = getDN(searchEntry);
  Object.defineProperty(searchEntry, 'ao', {
    get (): IAttributesObject {
      return attributesToObject(this.attributes);
    },
  });
  return searchEntry;
};

export const defaultPostEntryParser: TEntryParser = (searchEntry: SearchEntryEx, callback) => {
  callback(searchEntry);
};

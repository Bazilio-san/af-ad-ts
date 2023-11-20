import { Attribute } from 'ldapjs';
import { SearchEntryEx, TEntryParser } from '../@type/i-searcher';
import { getAttribute } from '../attributes';
import { binarySidToStringSid } from '../utilities';

export const defaultEntryParser: TEntryParser = (searchEntry: SearchEntryEx, callback) => {
  ['objectSid', 'objectGUID'].forEach((type) => {
    const attribute = getAttribute<Attribute>(searchEntry, type);
    if (attribute) {
      const buf = attribute.buffers[attribute.buffers.length - 1];
      attribute.values = [binarySidToStringSid(buf)];
    }
  });
  callback(searchEntry);
};

import { Attribute, SearchEntry } from 'ldapjs';
import { TEntryParser } from '../@type/i-searcher';
import { getAttribute } from '../attributes';
import { binarySidToStringSid } from '../utilities';

export const defaultEntryParser: TEntryParser = (searchEntry: SearchEntry, callback) => {
  ['objectSid', 'objectGUID'].forEach((type) => {
    const attribute = getAttribute<Attribute>(searchEntry, type);
    if (attribute) {
      const buf = attribute.buffers[attribute.buffers.length - 1];
      const values = [binarySidToStringSid(buf)];
      attribute.values = values;
    }
  });
  callback(searchEntry);
};

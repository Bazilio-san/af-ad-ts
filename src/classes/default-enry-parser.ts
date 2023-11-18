import { EntryParser } from '../@type/i-searcher';
import * as utils from '../utilities';

export const defaultEntryParser: EntryParser = (entry: any, raw: any, callback) => {
  if (Object.prototype.hasOwnProperty.call(raw, 'objectSid')) {
    entry.objectSid = utils.binarySidToStringSid(raw.objectSid);
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'objectGUID')) {
    entry.objectGUID = utils.binarySidToStringSid(raw.objectGUID);
  }
  callback(entry);
};

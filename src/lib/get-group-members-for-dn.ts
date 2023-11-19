import * as utils from '../utilities';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { IAdOptions, SearchEntryEx } from '../@type/i-searcher';
import { trace } from '../logger';
import { getAttributeSingleValue } from '../attributes';
import { IGroup } from '../@type/i-group';

/**
 * An interface for querying a specific group for its members and its subgroups.
 *
 * dn - The DN of the group to query.
 */
export const asyncGetGroupMembersForDN = async (dn: string, adOptions: IAdOptions, hash: Map<string, IGroup> = new Map()) => {
  trace(`getGroupMembershipForDN(${dn})`);

  // Ensure that a valid DN was provided. Otherwise, abort the search.
  if (!dn) {
    throw new Error('No distinguishedName (dn) specified for group membership retrieval.');
  }
  const attributes = adOptions.searchOptions.attributes || DEFAULT_ATTRIBUTES.user;

  //  Note: Microsoft provides a 'Transitive Filter' for querying nested groups.
  //        i.e. (member:1.2.840.113556.1.4.1941:=<userDistinguishedName>)
  //        However this filter is EXTREMELY slow. Recursively querying ActiveDirectory
  //        is typically 10x faster.
  const searchAdOptions: IAdOptions = {
    ...adOptions,
    searchOptions: {
      filter: `(member=${utils.parseDistinguishedName(dn)})`,
      scope: 'sub',
      attributes: utils.joinAttributes(
        attributes,
        ['groupType'],
      ),
    },
  };

  const searcherResults: SearchEntryEx[] = await asyncSearcher(searchAdOptions);

  if (!searcherResults?.length) {
    return []; // VVQ
  }

  const fn = async (searchEntry: SearchEntryEx) => {
    const key = getAttributeSingleValue(searchEntry, 'cn') || getAttributeSingleValue(searchEntry, 'dn');
    if (!key || hash.has(key) || !utils.isGroupResult(searchEntry)) {
      return;
    }
    trace(`Adding group "${key}" to "${dn}"`);
    const g = searchEntry.ao as IGroup;
    hash.set(g.cn || g.dn, g);
    const nestedGroups = await asyncGetGroupMembersForDN(g.dn, adOptions, hash);
    nestedGroups.forEach((ng) => {
      const newKey = ng.cn || ng.dn;
      if (!hash.has(newKey)) {
        hash.set(newKey, ng);
      }
    });
  };
  await Promise.all(searcherResults.map(fn));

  const groups = Array.from(hash.values());
  trace(`Group "${dn}" has ${groups.length} group(s)`);
  return groups;
};

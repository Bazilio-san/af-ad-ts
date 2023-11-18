import { newGroup, IGroup } from '../models/group';
import * as utils from '../utilities';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { IAdOptions } from '../@type/i-searcher';
import { getLogger } from '../logger';

/**
 * An interface for querying a specific group for its members and its subgroups.
 *
 * dn - The DN of the group to query.
 */
export const asyncGetGroupMembersForDN = async (adOptions: IAdOptions, dn: string, hash: Map<string, IGroup> = new Map()) => {
  const logger = getLogger();
  logger.trace('getGroupMembershipForDN(%j,%s)', adOptions, dn);

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

  const results = await asyncSearcher(searchAdOptions);

  if (!results?.length) {
    return []; // VVQ
  }

  const asyncIterator = async (group: any) => {
    if (hash.has(group.cn || group.dn) || !utils.isGroupResult(group)) {
      return;
    }
    logger.trace('Adding group "%s" to %s"', group.dn, dn);
    const g = newGroup(group);
    hash.set(g.cn || g.dn, g);
    const nestedGroups = await asyncGetGroupMembersForDN(adOptions, g.dn, hash);
    nestedGroups.forEach((ng) => {
      if (!hash.has(ng.cn || ng.dn)) {
        hash.set(ng.cn || ng.dn, ng);
      }
    });
  };
  await Promise.all(results.map(asyncIterator));

  const groups = Array.from(hash.values());
  logger.trace('Group "%s" has %d group(s). Groups: %j', dn, groups.length, groups.map((g) => g.dn));
  return groups;
};

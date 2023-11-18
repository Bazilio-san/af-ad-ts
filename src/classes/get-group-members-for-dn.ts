import cache from 'memory-cache';
import { Group } from '../models/Group';
import * as utils from '../utilities';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { IAsyncSearcherOptions } from '../@type/i-searcher';

/**
 * An interface for querying a specific group for its members and its subgroups.
 *
 * dn - The DN of the group to query.
 */
export const asyncGetGroupMembersForDN = async (fOptions: IAsyncSearcherOptions, dn: string, hash: Map<string, Group> = new Map()) => {
  const logger = cache.get('logger');
  logger.trace('getGroupMembershipForDN(%j,%s)', fOptions, dn);

  // Ensure that a valid DN was provided. Otherwise, abort the search.
  if (!dn) {
    throw new Error('No distinguishedName (dn) specified for group membership retrieval.');
  }
  const attributes = fOptions.searchOptions.attributes || DEFAULT_ATTRIBUTES.user;

  //  Note: Microsoft provides a 'Transitive Filter' for querying nested groups.
  //        i.e. (member:1.2.840.113556.1.4.1941:=<userDistinguishedName>)
  //        However this filter is EXTREMELY slow. Recursively querying ActiveDirectory
  //        is typically 10x faster.
  const asyncSearcherOptions: IAsyncSearcherOptions = {
    ...fOptions,
    searchOptions: {
      filter: `(member=${utils.parseDistinguishedName(dn)})`,
      scope: 'sub',
      attributes: utils.joinAttributes(
        attributes,
        ['groupType'],
      ),
    },
  };

  const results = await asyncSearcher(asyncSearcherOptions);

  if (!results?.length) {
    return []; // VVQ
  }

  const asyncIterator = async (group: any) => {
    if (hash.has(group.cn || group.dn) || !utils.isGroupResult(group)) {
      return;
    }
    logger.trace('Adding group "%s" to %s"', group.dn, dn);
    const g = new Group(group);
    hash.set(g.cn || g.dn, g);
    const nestedGroups = await asyncGetGroupMembersForDN(fOptions, g.dn, hash);
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

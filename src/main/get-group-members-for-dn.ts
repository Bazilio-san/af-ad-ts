import { green } from 'af-color';
import * as utils from '../lib/utilities';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { IAdOptions, SearchEntryEx } from '../@type/i-searcher';
import { toJson, trace } from '../lib/logger';
import { newGroup, IGroup } from '../models/group';
import { shouldIncludeAllAttributes } from '../lib/attributes';
import { ensureArray } from '../lib/core-utilities';

/**
 * An interface for querying a specific group for its members and its subgroups.
 *
 * dn - The DN of the group to query.
 */
export const getGroupMembersForDN = async (
  dn: string,
  adOptions: IAdOptions,
  hash: Map<string, IGroup> = new Map(),
) => {
  trace(`getGroupMembershipForDN(${dn})`, green);

  // Ensure that a valid DN was provided. Otherwise, abort the search.
  if (!dn) {
    throw new Error('No distinguishedName (dn) specified for group membership retrieval.');
  }

  let attributes: string[] | undefined;
  let askedAttributes: string[];
  const cfgAttr = adOptions.searchOptions.attributes;
  if (shouldIncludeAllAttributes(cfgAttr)) {
    askedAttributes = ['all'];
  } else {
    askedAttributes = ensureArray(cfgAttr || DEFAULT_ATTRIBUTES.user);
    attributes = utils.joinAttributes(
      askedAttributes,
      ['groupType'],
    );
  }

  /*
  Note:
  Microsoft provides a 'Transitive Filter' for querying nested groups.
  i.e. (member:1.2.840.113556.1.4.1941:=<userDistinguishedName>)
  However this filter is EXTREMELY slow. Recursively querying ActiveDirectory
  is typically 10x faster.
  */
  const searchAdOptions: IAdOptions = {
    ...adOptions,
    searchOptions: {
      // filter: `(member=CN=Макаров Вячеслав Владимирович \\28vvmakarov\\29)`,
      filter: `(member=${utils.parseDistinguishedName(dn)})`,
      scope: 'sub',
      attributes,
    },
  };

  trace(`Search group members by searchOptions\n(${toJson(searchAdOptions.searchOptions)})`);

  const searcherResults: SearchEntryEx[] = await asyncSearcher(searchAdOptions);

  if (!searcherResults?.length) {
    return [];
  }

  const fn = async (searchEntry: SearchEntryEx) => {
    const key = searchEntry.idn;
    if (!key || hash.has(key) || !utils.isGroupResult(searchEntry)) {
      return;
    }
    trace(`Adding group "${key}" to "${dn}"`);
    const g = newGroup(searchEntry);
    hash.set(key, g);
    const nestedGroups = await getGroupMembersForDN(key, adOptions, hash);
    nestedGroups.forEach((ng) => {
      const newKey = ng.idn;
      if (!hash.has(newKey)) {
        hash.set(newKey, ng);
      }
    });
  };
  await Promise.all(searcherResults.map(fn));

  const groups = [...hash.values()];
  trace(`Group "${dn}" has ${groups.length} group(s)`);
  return groups;
};

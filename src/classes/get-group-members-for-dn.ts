const cache = require('memory-cache');
const Group = require('../models/Group');
const utils = require('../utilities');
const { asyncSearcher } = require('./Searcher');
const { DEFAULT_ATTRIBUTES } = require('../constants');

/**
 * An interface for querying a specific group for its members and its subgroups.
 *
 * @param {ISearchOptionsEx} fOptions
 * @param {string} dn The DN of the group to query.
 * @param {Map} hash
 */
const asyncGetGroupMembersForDN = async (fOptions, dn, hash = new Map()) => {
  const logger = cache.get('logger');
  logger.trace('getGroupMembershipForDN(%j,%s)', fOptions, dn);

  // Ensure that a valid DN was provided. Otherwise, abort the search.
  if (!dn) {
    throw new Error('No distinguishedName (dn) specified for group membership retrieval.');
  }
  const attributes = fOptions.attributes || DEFAULT_ATTRIBUTES.user;

  //  Note: Microsoft provides a 'Transitive Filter' for querying nested groups.
  //        i.e. (member:1.2.840.113556.1.4.1941:=<userDistinguishedName>)
  //        However this filter is EXTREMELY slow. Recursively querying ActiveDirectory
  //        is typically 10x faster.
  const asyncSearcherOptions = {
    ...fOptions,
    filter: `(member=${utils.parseDistinguishedName(dn)})`,
    scope: 'sub',
    attributes: utils.joinAttributes(
      attributes,
      ['groupType'],
    ),
  };

  const results = await asyncSearcher(asyncSearcherOptions);

  if (!results?.length) {
    return []; // VVQ
  }

  const asyncIterator = async (group) => {
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

module.exports = asyncGetGroupMembersForDN;

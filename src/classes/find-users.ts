const cache = require('memory-cache');
const merge = require('merge-options');
const utils = require('../utilities');
const User = require('../models/User');
const { asyncSearcher } = require('./Searcher');
const { DEFAULT_ATTRIBUTES } = require('../constants');
const ee = require('../ee');
const asyncGetGroupMembersForDN = require('./get-group-members-for-dn');

const DEFAULT_USER_FILTER = '(|(objectClass=user)(objectClass=person))(!(objectClass=computer))(!(objectClass=group))';

/**
 * Finding users within the LDAP tree.
 *
 * @param {IAsyncSearcherOptions} opts
 */
const findUsers = async (opts) => {
  const logger = cache.get('logger');

  const attributes = utils.joinAttributes(
    opts.searchOptions.attributes || DEFAULT_ATTRIBUTES.user,
    utils.getRequiredLdapAttributesForUser(opts), // VVQ Сократить количество атрибутов
    ['objectCategory'],
  );
  const searchOptions = { attributes, filter: opts.searchOptions?.filter || `(&${DEFAULT_USER_FILTER})`, scope: 'sub' };

  /** @type {IAsyncSearcherOptions} */
  const asyncSearcherOptions = merge({}, opts, { searchOptions });
  const results = await asyncSearcher(asyncSearcherOptions);
  if (!results?.length) {
    logger.trace('No users found matching query "%s"', utils.truncateLogOutput(searchOptions.filter));
    return [];
  }
  const fn = async (result) => {
    if (!utils.isUserResult(result)) {
      return;
    }
    const user = new User(utils.pickAttributes(result, attributes));
    if (utils.isIncludeGroupMembershipFor(opts.searchOptions, 'user')) {
      user.groups = await asyncGetGroupMembersForDN(opts, user.dn);
    }
    return user;
  };
  let users = await Promise.all(results.map(fn));
  users = users.filter(Boolean);
  logger.trace('%d user(s) found for query "%s"', users.length, utils.truncateLogOutput(opts.filter));
  ee.emit('users', users);
  users.forEach((user) => {
    ee.emit('user', user);
  });
  return users;
};

module.exports = findUsers;

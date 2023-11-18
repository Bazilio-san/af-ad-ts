import cache from 'memory-cache';
import merge from 'merge-options';
import * as utils from '../utilities';
import { User } from '../models/User';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { asyncGetGroupMembersForDN } from './get-group-members-for-dn';
import { IAsyncSearcherOptions, ISearcherResult, ISearcherResults } from '../@type/i-searcher';

const DEFAULT_USER_FILTER = '(|(objectClass=user)(objectClass=person))(!(objectClass=computer))(!(objectClass=group))';

/**
 * Finding users within the LDAP tree.
 */
export const findUsers = async (opts: IAsyncSearcherOptions) => {
  const logger = cache.get('logger');

  const attributes = utils.joinAttributes(
    opts.searchOptions.attributes || DEFAULT_ATTRIBUTES.user,
    utils.getRequiredLdapAttributesForUser(opts.searchOptions), // VVQ Сократить количество атрибутов для быстрого поиска
    ['objectCategory'],
  );
  const filter = opts.searchOptions?.filter || `(&${DEFAULT_USER_FILTER})`;
  const searchOptions = { attributes, filter, scope: 'sub' };

  const asyncSearcherOptions: IAsyncSearcherOptions = merge({}, opts, { searchOptions });
  const searcherResults: ISearcherResults = await asyncSearcher(asyncSearcherOptions);
  if (!searcherResults?.length) {
    logger.trace('No users found matching query "%s"', utils.truncateLogOutput(filter));
    return [];
  }
  const fn = async (result: ISearcherResult) => {
    if (!utils.isUserResult(result)) {
      return;
    }
    const user = new User(utils.pickAttributes(result, attributes));
    if (utils.isIncludeGroupMembershipFor(opts.searchOptions, 'user')) {
      user.groups = await asyncGetGroupMembersForDN(opts, user.dn);
    }
    return user;
  };
  let users = await Promise.all(searcherResults.map(fn));
  users = users.filter(Boolean);
  logger.trace('%d user(s) found for query "%s"', users.length, utils.truncateLogOutput(filter));
  return users;
};

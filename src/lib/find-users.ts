import merge from 'merge-options';
import * as utils from '../utilities';
import { IUser, newUser } from '../models/user';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { asyncGetGroupMembersForDN } from './get-group-members-for-dn';
import { IAdOptions, ISearcherResult } from '../@type/i-searcher';
import { getLogger } from '../logger';

const DEFAULT_USER_FILTER = '(|(objectClass=user)(objectClass=person))(!(objectClass=computer))(!(objectClass=group))';

/**
 * Finding users within the LDAP tree.
 */
export const findUsers = async (adOptions: IAdOptions): Promise<IUser[]> => {
  const logger = getLogger();

  const askedAttributes = utils.ensureArray(adOptions.searchOptions.attributes || DEFAULT_ATTRIBUTES.user);
  const attributes = utils.joinAttributes(
    askedAttributes,
    utils.getRequiredLdapAttributesForUser(adOptions.searchOptions),
    ['objectCategory'],
  );
  const filter = adOptions.searchOptions?.filter || `(&${DEFAULT_USER_FILTER})`;
  const searchOptions = { attributes, filter, scope: 'sub' };

  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions });
  const searcherResults: ISearcherResult[] = await asyncSearcher(searchAdOptions);
  if (!searcherResults?.length) {
    logger.trace('No users found matching query "%s"', utils.truncateLogOutput(filter));
    return [];
  }
  const fn = async (result: ISearcherResult): Promise<IUser | undefined> => {
    if (!utils.isUserResult(result)) {
      return;
    }
    const user = newUser(utils.pickAttributes(result, askedAttributes)); // VVQ Сократить количество атрибутов для быстрого поиска
    if (utils.isIncludeGroupMembershipFor(adOptions.searchOptions, 'user')) {
      user.groups = await asyncGetGroupMembersForDN(adOptions, user.dn);
    }
    return user;
  };
  let users = await Promise.all<IUser | undefined>(searcherResults.map(fn));
  users = users.filter(Boolean);
  logger.trace('%d user(s) found for query "%s"', users.length, utils.truncateLogOutput(filter));
  return users as IUser[];
};

export const findUser = async (username: string, adOptions: IAdOptions): Promise<IUser | undefined> => {
  const logger = getLogger(adOptions.logger);
  const filter = adOptions.searchOptions.filter || utils.getUserQueryFilter(username);
  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions: { filter } });
  logger.trace('findUser(%j,%s,%s)', searchAdOptions, username);
  const users = await findUsers(searchAdOptions);
  return users?.[0];
};

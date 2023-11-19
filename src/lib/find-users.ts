import merge from 'merge-options';
import { SearchEntry } from 'ldapjs';
import * as utils from '../utilities';
import { IUser, newUser } from '../models/user';
import { asyncSearcher } from './Searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { asyncGetGroupMembersForDN } from './get-group-members-for-dn';
import { IAdOptions } from '../@type/i-searcher';
import { trace, toJson } from '../logger';

const DEFAULT_USER_FILTER = '(|(objectClass=user)(objectClass=person))(!(objectClass=computer))(!(objectClass=group))';

/**
 * Finding users within the LDAP tree.
 */
export const findUsers = async (adOptions: IAdOptions): Promise<IUser[]> => {
  const askedAttributes = utils.ensureArray(adOptions.searchOptions.attributes || DEFAULT_ATTRIBUTES.user);
  const attributes = utils.joinAttributes(
    askedAttributes,
    utils.getRequiredLdapAttributesForUser(adOptions.searchOptions),
    ['objectCategory'],
  );
  const filter = adOptions.searchOptions?.filter || `(&${DEFAULT_USER_FILTER})`;
  const searchOptions = { attributes, filter, scope: 'sub' };

  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions });
  const searcherResults: SearchEntry[] = await asyncSearcher(searchAdOptions);

  const strFilter = `filter:\n${toJson(filter)}`;
  if (!searcherResults?.length) {
    trace(`No users found matching ${strFilter}`);
    return [];
  }
  const fn = async (searchEntry: SearchEntry): Promise<IUser | undefined> => {
    if (!utils.isUserResult(searchEntry)) {
      return;
    }
    const user = newUser(utils.pickAttributes(searchEntry, askedAttributes)); // VVQ Сократить количество атрибутов для быстрого поиска
    if (utils.isIncludeGroupMembershipFor(adOptions.searchOptions, 'user')) {
      user.groups = await asyncGetGroupMembersForDN(user.dn, adOptions);
    }
    return user;
  };
  let users = await Promise.all<IUser | undefined>(searcherResults.map(fn));
  users = users.filter(Boolean);
  trace(`${users.length} user(s) found for by ${strFilter}`);
  return users as IUser[];
};

export const findUser = async (username: string, adOptions: IAdOptions): Promise<IUser | undefined> => {
  const filter = adOptions.searchOptions.filter || utils.getUserQueryFilter(username);
  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions: { filter } });
  trace(`findUser(${username}, \n${toJson(filter)})`);
  const users = await findUsers(searchAdOptions);
  return users?.[0];
};

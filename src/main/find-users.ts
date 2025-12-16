import merge from 'merge-options';

import { IAdOptions, SearchEntryEx } from '../@type/i-searcher';
import { DEFAULT_ATTRIBUTES } from '../constants';
import { shouldIncludeAllAttributes } from '../lib/attributes';
import { ensureArray } from '../lib/core-utilities';
import { trace, toJson } from '../lib/logger';
import * as utils from '../lib/utilities';
import { getWildcardsUserFilter } from '../lib/utilities';
import { IUser, newUser } from '../models/user';

import { getGroupMembersForDN } from './group/get-group-members-for-dn';
import { asyncSearcher } from './lib/Searcher';

/**
 * Finding users within the LDAP tree.
 */
export const findUsers = async (adOptions: IAdOptions): Promise<IUser[]> => {
  let attributes: string[] | undefined;
  let askedAttributes: string[];
  const cfgAttr = adOptions.searchOptions.attributes;
  if (shouldIncludeAllAttributes(cfgAttr)) {
    askedAttributes = ['all'];
    // In ldapts, to get all the attributes, you need to pass an empty array [] according to the documentation
    attributes = [];
  } else {
    askedAttributes = ensureArray(cfgAttr || DEFAULT_ATTRIBUTES.user);
    attributes = utils.joinAttributes(
      askedAttributes,
      utils.getRequiredLdapAttributesForUser(adOptions.searchOptions),
      ['objectCategory'],
    );
  }
  const filter = getWildcardsUserFilter(adOptions.searchOptions.filter);

  // Make sure to copy all the necessary options from adOptions.searchOptions
  const searchOptions: any = {
    attributes,
    filter,
    scope: 'sub',
    ...((adOptions.searchOptions as any).paged && { paged: (adOptions.searchOptions as any).paged }),
    ...(adOptions.searchOptions.includeMembership && { includeMembership: adOptions.searchOptions.includeMembership }),
    ...((adOptions.searchOptions as any).timeLimit && { timeLimit: (adOptions.searchOptions as any).timeLimit }),
    ...((adOptions.searchOptions as any).sizeLimit && { sizeLimit: (adOptions.searchOptions as any).sizeLimit }),
  };

  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions });
  const searcherResults: SearchEntryEx[] = await asyncSearcher(searchAdOptions);

  const optionToTrace = `searchOptions:\n${toJson(searchOptions)}`;
  if (!searcherResults?.length) {
    trace(`No users found matching ${optionToTrace}`);
    return [];
  }
  const fn = async (searchEntry: SearchEntryEx): Promise<IUser | undefined> => {
    if (!utils.isUserResult(searchEntry)) {
      return;
    }
    const user = newUser(searchEntry, askedAttributes); // VVQ Reduce the number of attributes for quick search
    if (utils.isIncludeGroupMembershipFor(adOptions.searchOptions, 'user')) {
      user.groups = await getGroupMembersForDN(user.idn, adOptions);
    }
    return user;
  };
  let users = await Promise.all<IUser | undefined>(searcherResults.map(fn));
  users = users.filter(Boolean);
  trace(`${users.length} user(s) found by ${optionToTrace}`);
  return users as IUser[];
};

export const findUser = async (username: string, adOptions: IAdOptions): Promise<IUser | undefined> => {
  const filter = username ? utils.getUserQueryFilter(username) : getWildcardsUserFilter(adOptions.searchOptions.filter);
  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions: { filter } });
  trace(`findUser(${username}, \n${toJson(filter)})`);
  const users = await findUsers(searchAdOptions);
  return users?.[0];
};

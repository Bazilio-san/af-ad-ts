import { SearchOptions } from 'ldapts';

import { IAdOptions } from '../../@type/i-searcher';
import { GROUP_BASE_ATTRIBUTES } from '../../lib/ad-constants';
import { withLdapClient } from '../../lib/ldap-client';
import { trace } from '../../lib/logger';
import { asError, escLdapString, getStringValue } from '../../lib/utilities';

// getStringValue moved to ../../lib/utilities for reuse

export interface IGroupInfo {
  /** Group common name */
  cn: string;
  /** Group distinguished name */
  distinguishedName: string;
  /** Group description */
  description?: string;
  /** Group SAM account name */
  sAMAccountName?: string;
  /** Group type */
  groupType?: string;
  /** Is nested group */
  isNested?: boolean;
}

export interface IGetGroupsParams {
  /** User login (without domain) */
  login: string;
  /** AD configuration options */
  options: IAdOptions;
  /** Include nested groups (default: true) */
  includeNested?: boolean;
  /** Optional: user domain */
  domain?: string;
}

/**
 * Gets all groups that a user belongs to (direct and nested)
 *
 * @param params - Parameters for getting user groups
 * @returns Promise<IGroupInfo[]> - Array of group information
 */
export const getGroupsByLogin = async (params: IGetGroupsParams): Promise<IGroupInfo[]> => {
  const { login, options, includeNested = true, domain } = params;
  const groups: IGroupInfo[] = [];

  try {
    trace(`Getting groups for user ${login}${domain ? ` in domain ${domain}` : ''}`);
    // Use lifecycle helper for all ldap operations
    await withLdapClient(options, async (client) => {
      // 1) Find the user DN first
      const userSearchOptions: SearchOptions = {
        scope: 'sub',
        filter: `(&(objectCategory=User)(|(sAMAccountName=${login})(userPrincipalName=${login})))`,
        attributes: ['distinguishedName', 'userPrincipalName'],
        sizeLimit: 1,
      };
      const { searchEntries: userEntries } = await client.search(options.baseDN, userSearchOptions);
      if (userEntries.length === 0) {
        trace(`User ${login} not found`);
        return; // empty groups
      }
      const userDN = getStringValue(userEntries[0].distinguishedName) as string;
      trace(`Found user DN: ${userDN}`);

      // 2) Search for groups where user is a member
      const escapedDN = escLdapString(userDN);
      const memberFilter = includeNested
        ? `(member:1.2.840.113556.1.4.1941:=${escapedDN})`
        : `(member=${escapedDN})`;
      const groupSearchOptions: SearchOptions = {
        scope: 'sub',
        filter: `(&(objectCategory=Group)${memberFilter})`,
        attributes: [...GROUP_BASE_ATTRIBUTES],
      };
      const { searchEntries } = await client.search(options.baseDN, groupSearchOptions);
      for (const entry of searchEntries) {
        groups.push({
          cn: getStringValue((entry as any).cn) || '',
          distinguishedName: getStringValue((entry as any).distinguishedName) || '',
          description: getStringValue((entry as any).description),
          sAMAccountName: getStringValue((entry as any).sAMAccountName),
          groupType: getStringValue((entry as any).groupType),
          isNested: includeNested,
        });
      }
      trace(`Found ${groups.length} groups for user ${login}`);
    });

    return groups;
  } catch (error) {
    const e = asError(error);
    trace(`Error getting groups for user ${login}: ${e.message}`);
    throw e;
  }
};

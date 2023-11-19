import { SearchOptions, ClientOptions, SearchEntry } from 'ldapjs';
import { PagedResultsControl } from './i-ldap';
import { IAbstractLogger } from './i-abstract-logger';

export interface ISearchOptionsEx extends SearchOptions {
  includeMembership?: string[] | null
}

export interface DefaultReferrals {
  /** Whether the to chase referrals. Default: false. */
  enabled?: boolean,
  /** An array of regular expressions to match for referral exclusion even when enabled. */
  exclude?: string[],
}

/**
 Determines which attributes are returned for LDAP queries for each type of LDAP object.

 Default `user` attributes:
 + cn
 + comment
 + description
 + displayName
 + distinquishedName
 + dn
 + employeeID
 + givenName
 + initials
 + lockoutTime
 + mail
 + pwdLastSet
 + sAMAccountName
 + sn
 + userAccountControl
 + userPrincipalName
 + whenCreated

 Default `group` attributes:
 + cn
 + description
 + distinguishedName
 + dn
 + objectCategory
 */
export interface DefaultAttributes {
  user: string[],
  group: string[],
}

export type TEntryParser = (entry: SearchEntry, callback: Function) => void

/**
 * @example
 * {
 *    url: 'ldap://domain.com',
 *    baseDN: 'dc=domain,dc=com',
 *    username: 'admin@domain.com',
 *    password: 'supersecret',
 *    pageSize: 1000,
 *    referrals: {
 *      enabled: true
 *    },
 *    attributes: {
 *      user: ['sAMAccountName', 'givenName', 'sn', 'mail'],
 *      group: ['cn', 'description', 'dn']
 *    }
 *  }
 *
 */
export interface IAdOptions {
  /** The root DN for all operations */
  baseDN: string,
  /**
   clientOptions.url // Full LDAP URL to the target Active Directory server.
   clientOptions.bindDN // username - Any Active Directory acceptable username: 'user', 'user@domain.com', 'domain\user', 'cn=user,ou=users,dc=root'.
   clientOptions.bindCredentials // password - The password for the given `username`
   */
  clientOptions: ClientOptions & {
    bindDN: string,
    bindCredentials: string
    log?: IAbstractLogger,
  }
  searchOptions: ISearchOptionsEx,
  controls?: PagedResultsControl[],

  includeDeleted?: boolean,
  defaultReferrals?: DefaultReferrals,
  defaultAttributes?: DefaultAttributes,

  entryParser?: TEntryParser,
}

export type TSearchCallback = (err: any, results?: SearchEntry[]) => void

export interface SearcherConstructorOptions extends IAdOptions {
  /**
   A function to invoke when the search has completed.
   This method must accept an error and a result, in that order.
   */
  callback: TSearchCallback,
}

export type IFoundAttributes = {
  dn: string,
  cn?: string,
  sn?: string,
  description?: string,
  givenName?: string,
  initials?: string,
  distinguishedName?: string,
  whenCreated?: string,
  displayName?: string,
  userAccountControl?: string,
  employeeID?: string,
  pwdLastSet?: string,
  sAMAccountName?: string,
  userPrincipalName?: string,
  lockoutTime?: string,
  objectCategory?: string,
  objectClass?: string[],
  mail?: string
  objectSID?: string,
  comment?: string,

  [propName: string]: string | string[] | undefined,
};

export type ISearchLDAPResult = {
  [propName: string]: string | string[],
};

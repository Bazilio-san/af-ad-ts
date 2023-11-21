import { SearchOptions, ClientOptions, SearchEntry, Filter } from 'ldapjs';
import { Control } from './i-ldap';
import { IAbstractLogger } from './i-abstract-logger';

export interface ISearchOptionsEx extends SearchOptions {
  /**
   If the array is empty or undefined - use the default set of attributes
   If one of the attributes is 'all' or '*' - all attributes
   */
  attributes?: string | string[] | undefined;
  includeMembership?: string[] | null,
  f?: string | Filter,
}

export type IAttributesObject = {
  [propName: string]: string | string[],
};

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

export interface SearchEntryEx extends SearchEntry {
  ao: IAttributesObject,
  idn: string,
}

export type TEntryParser = (entry: SearchEntryEx, callback: Function) => void

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
  controls?: Control[],

  includeDeleted?: boolean,
  defaultReferrals?: DefaultReferrals,

  preEntryParser?: (searchEntry: SearchEntryEx) => SearchEntryEx,
  postEntryParser?: TEntryParser,
}

export type TSearchCallback = (err: any, results?: SearchEntryEx[]) => void

export interface SearcherConstructorOptions extends IAdOptions {
  /**
   A function to invoke when the search has completed.
   This method must accept an error and a result, in that order.
   */
  callback: TSearchCallback,
}

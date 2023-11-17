import { SearchOptions, ClientOptions } from 'ldapjs';
import { PagedResultsControl } from './i-ldap';

export interface ISearchOptionsEx extends SearchOptions {
  includeMembership?: string[] | null
}

export type ISearchOptionsExPartial = Partial<ISearchOptionsEx>;

export interface DefaultReferrals {
  /** Whether the to chase referrals. Default: false. */
  enabled?: boolean,
  /** An array of regular expressions to match for referral exclusion even when enabled. */
  exclude?: string[],
}

export interface SearcherConstructorOptions {
  /** Where in the tree to start searches. */
  baseDN: string,
  /**
   All the options relevant to an {@link ActiveDirectory} instance.
   It must include an `opts` property that represents that is an {@link ISearchOptionsEx}
   */
  clientOptions: ClientOptions,
  searchOptions: SearchOptions,
  controls: PagedResultsControl[],
  /**
   A function to invoke when the search has completed.
   This method must accept an error and a result, in that order.
   */
  callback: Function,

  includeDeleted?: boolean,
  defaultReferrals?: DefaultReferrals,
  entryParser?: (_entry: object, _raw: object, _callback: Function) => void,
}

export interface SearcherOptionsPartial {
  baseDN?: string,
  opts?: object,
  callback: Function,
}

export type IAsyncSearcherOptions = Omit<SearcherConstructorOptions, 'callback'>;

/**
 * Determines which attributes are returned for LDAP queries for each type
 * of LDAP object.
 *
 * Default `user` attributes:
 * + cn
 * + comment
 * + description
 * + displayName
 * + distinquishedName
 * + dn
 * + employeeID
 * + givenName
 * + initials
 * + lockoutTime
 * + mail
 * + pwdLastSet
 * + sAMAccountName
 * + sn
 * + userAccountControl
 * + userPrincipalName
 * + whenCreated
 *
 * Default `group` attributes:
 * + cn
 * + description
 * + distinguishedName
 * + dn
 * + objectCategory
 */
export interface DefaultAttributes {
  user?: string[],
  group?: string[],
}

/**
 * Allows for a custom function to be specified for parsing of the resulting
 * LDAP object. Examples include augmenting LDAP data with external data from an
 * RDBMs. If `null` is returned, the result is excluded.
 *
 * @example
 * function(entry, raw, callback) {
 *   // returning null to exclude result
 *   if (entry.ignore) return(null);
 *
 *   entry.retrievedAt = new Date();
 *   entry.preferredServer = getPreferredServerFromDatabase(entry.userPrincipalName);
 *
 *   callback(entry);
 * }
 * @param {object} entry The search entry object.
 * @param {object} raw The raw search entry object as returned from ldap.js.
 * @param {function} callback The callback to execute when complete.
 */
// eslint-disable-next-line no-unused-vars
export type EntryParser = (entry: object, raw: object, callback: Function) => void

/**
 * When supplying multiple arguments to the {@link ActiveDirectory} constructor,
 * the `defaults` parameter can be used to override some configuration properties.
 */
export interface DefaultsParam {
  attributes?: DefaultAttributes,
  referrals?: DefaultReferrals,
  entryParser?: EntryParser,
}

export interface IAbstractLogger {
  fatal: Function,
  error: Function,
  warn: Function,
  info: Function,
  debug: Function,
  trace: Function,
  silly: Function,
}

/**
 * Base configuration object for {@link ActiveDirectory}.
 *
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
export interface ADOptions {
  /** The root DN for all operations */
  baseDN: string,
  /**
   All the options relevant to an {@link ActiveDirectory} instance.
   It must include an `opts` property that represents that is an {@link ISearchOptionsEx}
   url: string -> clientOptions.url // Full LDAP URL to the target Active Directory server.
   username: string -> clientOptions.bindDN // Any Active Directory acceptable username: 'user', 'user@domain.com', 'domain\user', 'cn=user,ou=users,dc=root'.
   password: string -> clientOptions.bindCredentials // The password for the given `username`
   */
  clientOptions: ClientOptions & { bindDN: string, bindCredentials: string }
  searchOptions: SearchOptions,

  // defaultReferrals?: DefaultReferrals,
  defaultAttributes?: DefaultAttributes,

  entryParser?: (_entry: object, _raw: object, _callback: Function) => void,
  logger?: IAbstractLogger,
}

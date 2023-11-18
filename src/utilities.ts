// this module consists of various utility functions that are used
// throughout the ActiveDirectory code

import { SearchOptions } from 'ldapjs';
import { ISearcherResult, ISearchOptionsEx } from './@type/i-searcher';

export const escLdapString = (s: string): string => {
  if (s == null) return '';
  let sb = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 92) {
      sb += '\\5c';
    } else if (c === 42) {
      sb += '\\2a';
    } else if (c === 40) {
      sb += '\\28';
    } else if (c === 41) {
      sb += '\\29';
    } else if (c === 0) {
      sb += '\\00';
      // } else if ((c & 0xff) > 127) {
      //   sb += `\\${to2CharHexString(c)}`;
    } else {
      sb += String.fromCharCode(c);
    }
  }
  return sb;
};

export const ensureArray = (arg?: string | string[]): string[] => {
  if (!arg) {
    return [];
  }
  return Array.isArray(arg) ? arg : [arg];
};

/**
 * Gets a properly formatted LDAP compound filter. This is a very simple
 * approach to ensure that the LDAP compound filter is wrapped with an enclosing
 * *()* if necessary. It does not handle parsing of an existing
 * compound ldap filter.
 */
export const getCompoundFilter = (filter: string): string | boolean => {
  if (!filter) {
    return false;
  }
  if (filter.charAt(0) === '(' && filter.charAt(filter.length - 1) === ')') {
    return filter;
  }
  return `(${filter})`;
};

/**
 * Checks to see if the value is a distinguished name.
 */
export const isDistinguishedName = (value: string): boolean => /(([^=]+=.+),?)+/gi.test(String(value));

/**
 * Parses the distinguishedName (dn) to remove any invalid characters or to
 * properly escape the request.
 */
export const parseDistinguishedName = (dn: string): string => {
  if (!dn || Array.isArray(dn)) {
    return dn;
  }

  // implement escape rules described in https://social.technet.microsoft.com/wiki/contents/articles/5312.active-directory-characters-to-escape.aspx
  const tmp = dn.split(',');
  const component: string[] = [];
  for (let i = 0; i < tmp.length; i++) {
    if (i && !tmp[i].match(/^(CN|OU|DC)=/i)) {
      // comma was not a component separator but was embedded in a component value e.g. 'CN=Doe\, John'
      component.push(`${component.pop()}\\,${tmp[i]}`);
    } else {
      component.push(tmp[i]);
    }
  }

  for (let i = 0; i < component.length; i++) {
    const compValue = component[i].substr(3);
    let newValue = '';
    for (let j = 0; j < compValue.length; j++) {
      let char = compValue.substr(j, 1);
      switch (char) {
        /*  backslash should be escaped, but doing it breaks the unittest
                case '\\':
                  char = '\\\\'
                  break
                 */
        case '*':
          char = '\\\\2A';
          break;
        case '(':
          char = '\\\\28';
          break;
        case ')':
          char = '\\\\29';
          break;
        /* pound (or hash) should be escaped, but doing it breaks the unittest
              case '#':
                char = '\\#'
                break
               */
        case '+':
          char = '\\+';
          break;
        case '<':
          char = '\\<';
          break;
        case '>':
          char = '\\>';
          break;
        case ';':
          char = '\\;';
          break;
        case '"':
          char = '\\"';
          break;
        case '=':
          char = '\\=';
          break;
        case ' ':
          if (j === 0 || j === compValue.length - 1) {
            char = '\\ ';
          }
          break;
      }
      newValue += char;
    }
    component[i] = component[i].substr(0, 3) + newValue;
  }
  return component.join(',');
};

/**
 * Gets the ActiveDirectory LDAP query string for a group search.
 * groupName - The name of the group to find. Defaults to finding the whole category 'group'.
 */
export const getGroupQueryFilter = (groupName?: string): string => {
  if (!groupName) {
    return '(objectCategory=Group)';
  }
  if (isDistinguishedName(groupName)) {
    return `(&(objectCategory=Group)(distinguishedName=${parseDistinguishedName(groupName)}))`;
  }
  return `(&(objectCategory=Group)(cn=${groupName}))`;
};

/**
 * Checks to see if any of the specified attributes are the wildcard
 * '*' attribute or if the attributes array is empty.
 */
export const shouldIncludeAllAttributes = (attributes: string | string[] | undefined): boolean => ensureArray(attributes).some((a) => a === '*');

/**
 * Checks to see if group membership for the specified type is enabled.
 *
 * @param opts - The options to inspect.
 * @param name - The name of the membership value to inspect. Values: (all|user|group)
 * @returns True if the specified membership is enabled.
 */
export const isIncludeGroupMembershipFor = (opts: ISearchOptionsEx, name: string): boolean => {
  const { includeMembership } = opts;
  if (!Array.isArray(includeMembership)) {
    return false;
  }
  const s = new Set(includeMembership.map((n) => n.toLowerCase()));
  return s.has(name.toLowerCase()) || s.has('all');
};

/**
 * Gets the required ldap attributes for group related queries in order to
 * do recursive queries, etc.
 *
 * @params opts - LDAP query string parameters to execute.
 */
export const getRequiredLdapAttributesForGroup = (opts: SearchOptions = {}): string[] => {
  if (shouldIncludeAllAttributes(opts.attributes)) {
    return [];
  }
  const a = ['dn', 'objectCategory', 'groupType', 'cn'];
  if (isIncludeGroupMembershipFor(opts, 'group')) {
    a.push('member');
  }
  return a;
};

/**
 * Gets the required ldap attributes for user related queries in order to
 * do recursive queries, etc.
 *
 * @params opts - LDAP query string parameters to execute.
 */
export const getRequiredLdapAttributesForUser = (opts: SearchOptions = {}): string[] => {
  const a: string[] = ['dn', 'cn'];
  if (isIncludeGroupMembershipFor(opts, 'user')) {
    a.push('member');
  }
  return a;
};

/**
 * Gets the ActiveDirectory LDAP query string for a user search.
 *
 * @param username - The samAccountName or userPrincipalName (email) of the user.
 */
export const getUserQueryFilter = (username: string): string => {
  if (!username) {
    return '(objectCategory=User)';
  }
  // username = escLdapString(username);
  if (isDistinguishedName(username)) {
    return `(&(objectCategory=User)(distinguishedName=${parseDistinguishedName(username)}))`;
  }
  let emailSearch = '';
  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(username)) {
    emailSearch = `(mail=${username})`;
  }
  return `(&(objectCategory=User)(|(sAMAccountName=${username})${emailSearch}(userPrincipalName=${username})))`;
};

/**
 * Checks to see if the LDAP result describes a group entry.
 *
 * @param item - The LDAP result to inspect.
 */
export const isGroupResult = (item: any): boolean => { // VVQ
  if (!item) {
    return false;
  }
  if (item.groupType) {
    return true;
  }
  if (item.objectCategory) {
    return /CN=Group,CN=Schema,CN=Configuration,.*/i.test(item.objectCategory);
  }
  if (item.objectClass?.length) {
    return item.objectClass.some((c: string) => c.toLowerCase() === 'group');
  }
  return false;
};

/**
 * Checks to see if the LDAP result describes a user entry.
 *
 * @param item - The LDAP result to inspect.
 */
export const isUserResult = (item: ISearcherResult): boolean => {
  if (!item) {
    return false;
  }
  if (item.userPrincipalName) {
    return true;
  }
  if (item.objectCategory) {
    return /CN=Person,CN=Schema,CN=Configuration,.*/i.test(item.objectCategory);
  }
  if (item.objectClass?.length) {
    return item.objectClass.some((c: string) => c.toLowerCase() === 'user');
  }
  return false;
};

/**
 * Retrieves / merges the attributes for the query.
 * @return An array of attributes
 */
export const joinAttributes = (...args: (string | string[])[]): string[] => {
  const attrSet = new Set<string>();
  args.forEach((arr: string | string[]) => {
    if (typeof arr === 'string') {
      attrSet.add(arr);
    } else {
      arr.forEach((i) => attrSet.add(i));
    }
  });
  return [...attrSet].sort();
};

/**
 * Picks only the requested attributes from the ldap result. If a wildcard or
 * empty result is specified, then all attributes are returned.
 *
 * @params result - The LDAP result.
 * @params attributes - The desired or wanted attributes.
 * @returns A copy of the object with only the requested attributes.
 */
export const pickAttributes = (result: object, attributes: string[]): object => {
  const arr = shouldIncludeAllAttributes(attributes) ? Object.getOwnPropertyNames(result) : attributes;
  return arr.reduce((accum, attrName) => {
    if (Object.prototype.hasOwnProperty.call(result, attrName)) {
      const value = result[attrName];
      if (value != null && typeof value !== 'function') {
        accum[attrName] = value;
      }
    }
    return accum;
  }, {});
};

export const MAX_OUTPUT_LENGTH = 256;

/**
 * Truncates the specified output to the specified length if exceeded.
 *
 * @param {string} output The output to truncate if too long
 * @param {number} [maxLength] The maximum length. If not specified, then the global value MAX_OUTPUT_LENGTH is used.
 */
export const truncateLogOutput = (output: any, maxLength = MAX_OUTPUT_LENGTH): string => {
  if (!output) {
    return output;
  }

  let _output = output;
  if (typeof output !== 'string') {
    _output = String(output);
  }
  const { length } = _output;
  if (length < (maxLength + 3)) {
    return _output;
  }

  const prefix = Math.ceil((maxLength - 3) / 2);
  const suffix = Math.floor((maxLength - 3) / 2);
  return `${_output.slice(0, prefix)}...${_output.slice(length - suffix)}`;
};

/**
 * Converts SIDs from hex buffers (returned by AD) to human-readable strings
 *
 * @private
 * @param {buffer} sid
 * @returns {string}
 */
export const binarySidToStringSid = (sid: Buffer): string => {
  const _32bit = 0x100000000;
  // const _48bit = 0x1000000000000
  // const _64bitLow = 0xffffffff
  // const _64bitHigh = 0xffffffff00000000
  const revision = sid.readUInt8(0);
  const authority = _32bit * sid.readUInt16BE(2) + sid.readUInt32BE(4);
  const parts = ['S', revision, authority];
  for (let i = 8; i < sid.length; i += 4) {
    parts.push(sid.readUInt32LE(i)); // subauthorities
  }
  return parts.join('-');
};

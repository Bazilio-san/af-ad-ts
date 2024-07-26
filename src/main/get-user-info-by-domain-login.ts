/* eslint-disable no-bitwise,no-useless-catch */
import { Client, SearchOptions } from 'ldapts';
import { IUserInfoFull, IUserInfoShort } from '../@type/i-ldap-api';
import { ldapTsToJS } from '../lib/utilities';

const fullAttributes = [
  'sAMAccountName',
  'enabled',
  'homeDrive',
  'profilePath',
  'givenName',
  'sn',
  'middleName',
  'employeeId',
  'lastLogon',
  'userPrincipalName',
  'workPhone',
  'telephoneNumber',
  'company',
  'mobile',
  'domain',
  'name',
  'samAccountName',
  'displayName',
  'description',
  'mail',
  'thumbnailPhoto',
  'photo',
  'jpegPhoto',
];

const shortAttributes = [
  'sAMAccountName',
  'displayName',
  'userPrincipalName',
  'mail',
  'enabled',
];

export const getUserInfoByDomainLogin = async <T extends IUserInfoShort = IUserInfoFull> (arg: {
  username: string,
  requestType?: 'full' | 'short',
  withMembers?: boolean,
  ldap: {
    username: string,
    password: string,
    url: string,
    baseDN: string,
  }
})
  : Promise<T | undefined> => {
  const { username, requestType = 'short', ldap, withMembers } = arg || {};
  const isFull = requestType === 'full';

  const client = new Client({ url: ldap.url });
  const attributes: string[] = [...(isFull ? fullAttributes : shortAttributes)];
  attributes.push('userAccountControl');
  let user: IUserInfoFull;
  try {
    await client.bind(ldap.username, ldap.password);
    const options: SearchOptions = {
      scope: 'sub',
      filter: `(&(objectCategory=person)(sAMAccountName=${username.toLowerCase().trim()}))`,
      attributes,
      sizeLimit: 1,
    };
    if (isFull) {
      options.explicitBufferAttributes = [
        'thumbnailPhoto',
        'photo',
        'jpegPhoto',
      ];
      if (withMembers) {
        attributes.push('memberOf');
      }
    }
    const { searchEntries } = await client.search(ldap.baseDN, options);
    user = searchEntries[0] as unknown as IUserInfoFull;
    if (!user) {
      return undefined;
    }
  } catch (err) {
    throw err;
  } finally {
    await client.unbind();
  }
  user.enabled = ((Number(user.userAccountControl) || 0) & 2) !== 2;
  if (user.sAMAccountName?.toLowerCase() !== username.toLowerCase()) {
    throw new Error('Username does not match');
  }
  user.mail = user.mail || user.userPrincipalName;
  if (!isFull) {
    delete (user as any).userPrincipalName;
    delete (user as any).dn;
  }
  delete user.userAccountControl;

  if (typeof user.lastLogon === 'string') {
    user.lastLogon = ldapTsToJS(user.lastLogon);
  }
  return user as unknown as T;
};

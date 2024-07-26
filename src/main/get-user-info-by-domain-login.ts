/* eslint-disable no-bitwise,no-useless-catch */
import { Client, SearchOptions } from 'ldapts';
import { IUserInfoFull, IUserInfoShort } from '../@type/i-ldap-api';

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
  'memberOf',
  'workPhone',
  'telephoneNumber',
  'distinguishedName',
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
  ldap: {
    username: string,
    password: string,
    url: string,
    baseDN: string,
  }
})
  : Promise<T | undefined> => {
  const { username, requestType = 'short', ldap } = arg || {};
  const isFull = requestType === 'full';

  const client = new Client({ url: ldap.url });
  const attributes = [...(isFull ? fullAttributes : shortAttributes)];
  attributes.push('userAccountControl');
  let user: T;
  try {
    await client.bind(ldap.username, ldap.password);
    const options: SearchOptions = {
      scope: 'sub',
      filter: `(&(objectCategory=person)(sAMAccountName=${username.toLowerCase().trim()}))`,
      attributes,
      sizeLimit: 1,
    };
    const { searchEntries } = await client.search(ldap.baseDN, options);
    user = searchEntries[0] as unknown as T;
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
  return user;
};

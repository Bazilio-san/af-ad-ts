 
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

/**
 * Getting user information by domain login:
 *   dn: string, // CN=Pupkin John Batone (jpupkin),OU=Boston,OU=Regions,OU=Users,OU=FMS,DC=office,DC=company,DC=com
 *   userPrincipalName: string, // jpupkin@company.com
 *   homeDrive?: string, // O:
 *   profilePath?: string, // \\office.company.com\root\HomeDir\jpupkin
 *   givenName: string, // John
 *   sn: string, // Pupkin
 *   middleName: string, // Batone
 *   employeeId: string, // "12345"
 *   lastLogon: string | number | null, // 2003-11-03T04:00:31.2994826Z
 *   memberOf: any[],
 *   workPhone: string, // "1122"
 *   telephoneNumber: string, // "1122"
 *   company: string, // JSC "Bulben"
 *   mobile: string, //
 *   domain: string,
 *   name: string, // Pupkin John Batone (jpupkin)
 *   description: string, // Regional user. Boston office.
 *   thumbnailPhoto: string,
 *   photo: string,
 *   jpegPhoto: string,
 */
export const getUserInfoByDomainLogin = async <T extends IUserInfoShort = IUserInfoFull> (arg: {
  username: string,
  requestType?: 'full' | 'short',
  withMembers?: boolean,
  ldap: {
    username: string,
    password: string,
    url: string,
    baseDN: string,
    timeoutMillis?: number
  }
})
  : Promise<T | undefined> => {
  const { username, requestType = 'short', ldap, withMembers } = arg || {};
  const isFull = requestType === 'full';

  const client = new Client({ url: ldap.url, timeout: ldap.timeoutMillis });
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

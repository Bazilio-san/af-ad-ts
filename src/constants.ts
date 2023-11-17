import { DefaultAttributes, DefaultReferrals } from './@type/i-searcher';

export const DEFAULT_ATTRIBUTES: DefaultAttributes = {
  user: [
    'dn', 'distinguishedName',
    'userPrincipalName', 'sAMAccountName', /* 'objectSID', */ 'mail',
    'lockoutTime', 'whenCreated', 'pwdLastSet', 'userAccountControl',
    'employeeID', 'sn', 'givenName', 'initials', 'cn', 'displayName',
    'comment', 'description',
  ],
  group: [
    'dn', 'cn', 'description', 'distinguishedName', 'objectCategory',
  ],
};

export const DEFAULT_REFERRALS: DefaultReferrals = {
  enabled: false,
  // Active directory returns the following partitions as default referrals which we don't want to follow
  exclude: [
    'ldaps?://ForestDnsZones\\..*/.*',
    'ldaps?://DomainDnsZones\\..*/.*',
    'ldaps?://.*/CN=Configuration,.*',
  ],
};

export const DEFAULT_PAGE_SIZE = 1000; // The maximum number of results that AD will return in a single call. Default=1000

export interface IUserInfoShort {
  sAMAccountName: string, // jpupkin
  displayName: string, // Pupkin John Batone
  mail: string | undefined, // jpupkin@company.com
  enabled: boolean, // true
  userPrincipalName?: string, // jpupkin@company.com
  userAccountControl?: string,
  domain: string,
}

export interface IUserInfoFull extends IUserInfoShort {
  dn: string, // CN=Pupkin John Batone (jpupkin),OU=Boston,OU=Regions,OU=Users,OU=FMS,DC=office,DC=company,DC=com
  userPrincipalName: string, // jpupkin@company.com
  homeDrive?: string, // O:
  profilePath?: string, // \\office.company.com\root\HomeDir\jpupkin
  givenName: string, // John
  sn: string, // Pupkin
  middleName: string, // Batone
  employeeId: string, // "12345"
  lastLogon: string | number | null, // 2003-11-03T04:00:31.2994826Z
  memberOf: any[],
  workPhone: string, // "1122"
  telephoneNumber: string, // "1122"
  company: string, // JSC "Bulben"
  mobile: string, //
  domain: string,
  name: string, // Pupkin John Batone (jpupkin)
  description: string, // Regional user. Boston office.
  thumbnailPhoto: string,
  photo: string,
  jpegPhoto: string,
}

export interface IGroupMembershipCheck {
  userLogin: string;
  groupName: string;
  domain?: string;
  isMember: boolean;
  checkedAt: Date;
}

export interface IGroupMembershipOptions {
  /** Check nested groups */
  checkNested?: boolean;
  /** Cache results */
  cache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

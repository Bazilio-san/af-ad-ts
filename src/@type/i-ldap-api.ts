export interface IUserInfoShort {
  sAMAccountName: string, // gubaridzen
  displayName: string, // Губаридзен Екатерина Владимировна
  mail: string | undefined, // gubaridzen@company.com
  enabled: boolean, // true
  userPrincipalName?: string, // gubaridzen@company.com
  userAccountControl?: string,
  domain: string,
}

export interface IUserInfoFull extends IUserInfoShort {
  dn: string, // CN=Губаридзен Екатерина Владимировна (gubaridzen),OU=Gornoverevsk,OU=Regions,OU=Users,OU=FMS,DC=office,DC=company,DC=com
  userPrincipalName: string, // gubaridzen@company.com
  homeDrive?: string, // O:
  profilePath?: string, // \\office.company.com\root\HomeDir\gubaridzen
  givenName: string, // Екатерина
  sn: string, // Губаридзен
  middleName: string, // Владимировна
  employeeId: string, // "12345"
  lastLogon: string | number | null, // 2003-11-03T04:00:31.2994826Z
  memberOf: any[],
  workPhone: string, // "1122"
  telephoneNumber: string, // "1122"
  company: string, // OOO "бульбень"
  mobile: string, //
  domain: string,
  name: string, // Губаридзен Екатерина Владимировна (gubaridzen)
  description: string, // Региональный пользователь. Магнитогорск.
  thumbnailPhoto: string,
  photo: string,
  jpegPhoto: string,
}

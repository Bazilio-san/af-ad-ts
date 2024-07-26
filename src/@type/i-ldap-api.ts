export interface IUserInfoShort {
  sAMAccountName: string, // gubaridzen
  displayName: string, // Губаридзен Екатерина Владимировна
  userPrincipalName: string, // gubaridzen@company.com
  mail: string, // gubaridzen@company.com
  enabled: boolean, // true
  userAccountControl: string,
}

export interface IUserInfoFull extends IUserInfoShort {
  homeDrive?: string, // O:
  profilePath?: string, // \\office.company.com\root\HomeDir\gubaridzen
  givenName: string, // Екатерина
  sn: string, // Губаридзен
  middleName: string, // Владимировна
  employeeId: string, // "12345"
  lastLogon: string, // 2003-11-03T04:00:31.2994826Z
  memberOf: any[],
  workPhone: string, // "1122"
  telephoneNumber: string, // "1122"
  distinguishedName: string, // CN=Губаридзен Екатерина Владимировна (gubaridzen),OU=Gornoverevsk,OU=Regions,OU=Users,OU=FMS,DC=office,DC=company,DC=com
  company: string, // OOO "бульбень"
  mobile: string, //
  domain: string,
  name: string, // Губаридзен Екатерина Владимировна (gubaridzen)
  samAccountName: string, // gubaridzen
  description: string, // Региональный пользователь. Магнитогорск.
  thumbnailPhoto: string,
  photo: string,
  jpegPhoto: string,
}

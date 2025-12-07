module.exports = {
  ldapApi: {
    access: {
      user: 'user-to-access-ldap',
      password: '***',
      domain: 'MY_DOMAIN',
    },
  },
  domainControllers: {
    MY_DOMAIN: ['ldap://dc1.company1.com', 'ldap://dc2.company1.com'],
    MY_DOMAIN2: ['ldap://dc1.company2.com', 'ldap://dc2.company2.com'],
  },
  usersInGroups: [
    {
      domain: 'MY_DOMAIN',
      user: 'user1',
      group: 'Jira-Service',
      isMember: false,
    },
    {
      domain: 'MY_DOMAIN',
      user: 'user2',
      group: 'Jira-Service',
      isMember: true,
    },
  ],
};

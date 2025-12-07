const config = require('./config.local.js');

const { ldapApi, domainControllers, usersInGroups } = config;

const dcArray = domainControllers[Object.keys(domainControllers)[0]];
const firstDC3segments = [...dcArray[0].split('.').reverse()].splice(0, 3).reverse();

const connectionOptions = {
  baseDN: firstDC3segments.map((v) => `DC=${v}`).join(','),
  clientOptions: {
    url: dcArray[0],
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
    timeout: 15000,
  },
};

module.exports = { connectionOptions, ldapApi, domainControllers, usersInGroups };

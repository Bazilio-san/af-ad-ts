const pino = require('pino');

const config = (port = 1389) => ({
  url: `ldap://127.0.0.1:${port}`,
  baseDN: 'dc=domain,dc=com',
  username: 'auth@domain.com',
  // username: 'CN=Authenticator,OU=Special Uesrs,DC=domain,DC=com',
  password: 'password',
  reconnect: false,
  logging: pino({ level: 'silent' }),
});
module.exports = config;

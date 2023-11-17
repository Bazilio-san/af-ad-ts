/* eslint-disable no-console */
const ldap = require('ldapjs');

// This is a simple authentication method so that we can catch the various
// username types used during testing and return the appropriate responses.
const authentication = (server, settings) => {
  const baseDN = 'dc=domain,dc=com';

  function trueResponse (req, res, _next) {
    return res.end();
  }

  server.bind('auth@domain.com', trueResponse);
  server.bind(settings.authenticate.username.userPrincipalName, trueResponse);
  server.bind(settings.authenticate.username.domainUsername, trueResponse);

  server.bind(
    baseDN,
    (req, res, next) => {
      if (req.dn.equals(`cn=auth,${baseDN}`)) {
        console.log('authorizing "auth" user');
        return trueResponse(req, res, next);
      }

      if (req.dn.equals(settings.authenticate.username.dn)
        && req.credentials === settings.authenticate.password) {
        return trueResponse(req, res, next);
      }

      if (req.dn.equals(`cn=invalid,${baseDN}`)) {
        return next(new ldap.InvalidCredentialsError());
      }
    },
  );
};

module.exports = authentication;

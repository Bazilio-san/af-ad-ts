/* eslint-disable no-console */
const ActiveDirectory = require('../index');
const settings = require('./settings.local.js').findUser;
const { DEFAULT_ATTRIBUTES } = require('../lib/constants');

const config = require('./config.local.js');

const { ldapApi, domainControllers } = config;

const firstDC = domainControllers[Object.keys(domainControllers)[0]][0];
const firstDC3segments = ([...firstDC.split('.').reverse()].splice(0, 3)).reverse();
const baseDN = firstDC3segments.map((v) => `DC=${v}`).join(','); // : `DC=subDomen,DC=domen,DC=com`
/** @type {ADOptions} */
const adoOptions = {
  baseDN,
  clientOptions: {
    url: firstDC,
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
  },
  searchOptions: { paged: { pageSize: 100000 } },
  // entryParser: (entry: any, raw: any, callback: Function) => { return callback(raw)},
  // defaultAttributes: { user: [] },
  logger: undefined,
};

// const query = 'CN=*';
// const query = { filter: 'CN=*vvm*', paged: false };

const ad = new ActiveDirectory(adoOptions);

describe('findUser()', () => {
  describe('#findUser()', () => {
    ['dn', 'userPrincipalName', 'sAMAccountName', 'mail'].forEach((userAttribute) => {
      const username = settings.username[userAttribute];
      test(`should return user for (${userAttribute}) ${username}`, async () => {
        /** @type {ISearchOptionsEx} */
        const opts = { paged: false };
        try {
          const user = await ad.findUser({ username, opts });
          expect(user).toBeTruthy();
        } catch (err) {
          console.log(err);
          expect(err).toBeFalsy();
        }
      });
    });

    test('should return undefined if the username doesn\'t exist', async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { paged: false };
      try {
        const user = await ad.findUser({ username: '!!!NON-EXISTENT USER!!!', opts });
        expect(user).toBeUndefined();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return default user attributes when not specified', async () => {
      const defaultAttributes = new Set([...DEFAULT_ATTRIBUTES.user, 'groups']);
      /** @type {ISearchOptionsEx} */
      const opts = { paged: false };
      try {
        const user = await ad.findUser({ username: settings.username.userPrincipalName, opts });
        expect(user).toBeTruthy();
        const attributes = Object.keys(user).sort();
        const notFound = attributes.find((a) => !defaultAttributes.has(a));
        expect(notFound).toBeUndefined();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });
  });

  describe('#findUser(opts)', () => {
    test('should use the custom opts.filter if provided', async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { filter: settings.opts.custom };
      const username = settings.username.userPrincipalName;
      try {
        const user = await ad.findUser({ username, opts });
        expect(user.userPrincipalName).not.toBe(username);
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test(`should include groups/membership if includeMembership = ['all']`, async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { includeMembership: ['all'] };
      const username = settings.username.userPrincipalName;
      try {
        const user = await ad.findUser({ username, opts });
        expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
        const cns = user.groups.map((g) => g.cn);
        settings.groups.forEach((group) => {
          expect(cns.includes(group)).toBeTruthy();
        });
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test(`should include groups/membership if includeMembership = ['user']`, async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { includeMembership: ['user'] };
      const username = settings.username.userPrincipalName;
      try {
        const user = await ad.findUser({ username, opts });
        expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
        const cns = user.groups.map((g) => g.cn);
        settings.groups.forEach((group) => {
          expect(cns.includes(group)).toBeTruthy();
        });
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return only the first user if more than one result returned', async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { filter: settings.opts.multipleFilter };
      const username = ''; // ignored since we're setting our own filter
      try {
        const user = await ad.findUser({ username, opts });
        expect(user).toBeTruthy();
        expect(Array.isArray(user)).toBeFalsy();
        expect(Array.isArray(user)).toBeFalsy();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return only requested attributes', async () => {
      /** @type {ISearchOptionsEx} */
      const opts = { attributes: ['cn'] };
      const username = settings.username.userPrincipalName;
      try {
        const user = await ad.findUser({ username, opts });
        const keys = Object.keys(user).filter((k) => k !== 'groups');
        expect(opts.attributes.length).toBeGreaterThanOrEqual(keys.length);
        keys.forEach((key) => {
          expect(opts.attributes.includes(key)).toBeTruthy();
        });
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return unique users', async () => {
      let count = 0;
      // The bug was triggered by using a common options object. The method
      // was creating a pointer to this object and then not updating its
      // internal reference on subsequent calls (because it was already defined).
      /** @type {ISearchOptionsEx} */
      const opts = {};

      const fu = async (username) => {
        const user = await ad.findUser({ username, opts });
        count += 1;
        return user;
      };
      for (let i = 0; i < settings.userNames.length; i++) {
        const n = settings.userNames[i];
        // eslint-disable-next-line no-await-in-loop
        const user = await fu(n);
        expect(user.sAMAccountName).toBe(n);
        expect(count).toBe(i + 1);
      }
    });
  });
});

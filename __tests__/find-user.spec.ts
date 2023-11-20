/* eslint-disable no-console */
import merge from 'merge-options';
// import pino from 'pino';
import { IAbstractLogger } from '../src/@type/i-abstract-logger';
import { setLogger } from '../src/logger';
import { DEFAULT_ATTRIBUTES } from '../src/constants';
import { findUser } from '../src/lib/find-users';
import { IAdOptions } from '../src/@type/i-searcher';
import { IUser } from '../src/models/user';

setLogger({ trace: console.log.bind(console) } as unknown as IAbstractLogger);

const settings = require('./local/settings.local.js').findUser;
const config = require('./local/config.local.js');

const { ldapApi, domainControllers } = config;

const dcArray: string = domainControllers[Object.keys(domainControllers)[0]];
const firstDC3segments: string[] = ([...dcArray[0].split('.').reverse()].splice(0, 3)).reverse();
const baseDN: string = firstDC3segments.map((v) => `DC=${v}`).join(','); // : `DC=subDomen,DC=domen,DC=com`
const adOptions: IAdOptions = {
  baseDN,
  clientOptions: {
    url: dcArray,
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
    // log: pino({ level: 'trace' }) as unknown as IAbstractLogger,
    reconnect: true,
  },
  searchOptions: { paged: { pageSize: 100000 } },
  includeDeleted: false,
};

// const query = 'CN=*';
// const query = { filter: 'CN=*vvm*', paged: false };

describe('findUser()', () => {
  describe('#findUser()', () => {
    ['dn', 'userPrincipalName', 'sAMAccountName', 'mail'].forEach((userAttribute) => {
      const username = settings.username[userAttribute];
      test(`should return user for (${userAttribute}) ${username}`, async () => {
        let user;
        try {
          user = await findUser(username, adOptions);
        } catch (err) {
          console.log(err);
          return expect(false).toBeTruthy();
        }
        expect(user).toBeTruthy();
      });
    });

    test('should return undefined if the username doesn\'t exist', async () => {
      let user;
      try {
        user = await findUser('!!!NON-EXISTENT USER!!!', adOptions);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user).toBeUndefined();
    });

    test('should return default user attributes when not specified', async () => {
      const defaultAttributes = new Set([...DEFAULT_ATTRIBUTES.user, 'groups']);
      let user;
      try {
        user = await findUser(settings.username.userPrincipalName, adOptions) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user).toBeTruthy();
      const userAttributes = Object.keys(user).sort();
      const foundExtraAttribute = userAttributes.some((userAttr) => !defaultAttributes.has(userAttr));
      expect(foundExtraAttribute).toBeFalsy();
    });
  });

  describe('#findUser() all attributes', () => {
    ['*', 'all', ['*'], ['all']].forEach((attributes) => {
      test(`should return all attributes (${attributes})`, async () => {
        const opts: IAdOptions = merge({}, adOptions, { searchOptions: { attributes } });
        const username = settings.username.userPrincipalName;
        let user;
        try {
          user = await findUser(username, opts) as IUser;
        } catch (err) {
          console.log(err);
          return expect(err).toBeFalsy();
        }
        const keys = Object.keys(user).filter((k) => k !== 'groups');
        expect(keys.length).toBeGreaterThanOrEqual(settings.minAttributesCount);
      });
    });
  });

  describe('#findUser(opts)', () => {
    test('should use the custom opts.filter if provided', async () => {
      const opts: IAdOptions = merge({}, adOptions, { searchOptions: { filter: settings.opts.custom } });
      const username = settings.username.userPrincipalName;
      let user;
      try {
        user = await findUser(username, opts) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user.userPrincipalName).not.toBe(username);
    });

    test(`should include groups/membership if includeMembership = ['all']`, async () => {
      const opts: IAdOptions = merge({}, adOptions, { searchOptions: { includeMembership: ['all'] } });
      const username = settings.username.userPrincipalName;
      let user;
      try {
        user = await findUser(username, opts) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
      const cns = user.groups.map((g) => g.cn);
      settings.groups.forEach((group: string) => {
        expect(cns.includes(group)).toBeTruthy();
      });
    });

    test(`should include groups/membership if includeMembership = ['user']`, async () => {
      const opts: IAdOptions = merge({}, adOptions, { searchOptions: { includeMembership: ['user'] } });
      const username = settings.username.userPrincipalName;
      let user;
      try {
        user = await findUser(username, opts) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
      const cns = user.groups.map((g) => g.cn);
      settings.groups.forEach((group: string) => {
        expect(cns.includes(group)).toBeTruthy();
      });
    });

    test('should return only the first user if more than one result returned', async () => {
      const opts: IAdOptions = merge({}, adOptions, { searchOptions: { filter: settings.opts.multipleFilter } });
      const username = ''; // ignored since we're setting our own filter
      let user;
      try {
        user = await findUser(username, opts) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(user).toBeTruthy();
      expect(Array.isArray(user)).toBeFalsy();
      expect(Array.isArray(user)).toBeFalsy();
    });

    test('should return only requested attributes', async () => {
      const opts: IAdOptions = merge({}, adOptions, { searchOptions: { attributes: ['cn'] } });
      const username = settings.username.userPrincipalName;
      let user;
      try {
        user = await findUser(username, opts) as IUser;
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      const keys = Object.keys(user).filter((k) => k !== 'groups');
      expect(opts.searchOptions.attributes?.length).toBeGreaterThanOrEqual(keys.length);
      keys.forEach((key) => {
        expect(opts.searchOptions.attributes?.includes(key)).toBeTruthy();
      });
    });

    test('should return unique users', async () => {
      let count = 0;
      // The bug was triggered by using a common options object. The method
      // was creating a pointer to this object and then not updating its
      // internal reference on subsequent calls (because it was already defined).
      const opts: IAdOptions = merge({}, adOptions);

      const fu = async (username: string) => {
        const user = await findUser(username, opts) as IUser;
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

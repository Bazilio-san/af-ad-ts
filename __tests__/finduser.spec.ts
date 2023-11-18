/* eslint-disable no-console */
import merge from 'merge-options';
import pino from 'pino';
import { DEFAULT_ATTRIBUTES } from '../src/constants';
import { findUser } from '../src/lib/find-users';
import { IAdOptions } from '../src/@type/i-searcher';
import { IUser } from '../src/models/user';
import { IAbstractLogger } from "../src/@type/i-abstract-logger";


const settings = require('./local/settings.local.js').findUser;
const config = require('./local/config.local.js');

const { ldapApi, domainControllers } = config;

const firstDC: string = domainControllers[Object.keys(domainControllers)[0]][0];
const firstDC3segments: string[] = ([...firstDC.split('.').reverse()].splice(0, 3)).reverse();
const baseDN: string = firstDC3segments.map((v) => `DC=${v}`).join(','); // : `DC=subDomen,DC=domen,DC=com`
const adoOptions: IAdOptions = {
  baseDN,
  clientOptions: {
    url: firstDC,
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
  },
  searchOptions: { paged: { pageSize: 100000 } },
  // entryParser: (entry: any, raw: any, callback: Function) => { return callback(raw)},
  // defaultAttributes: { user: [] },
  logger: pino({ level: 'silent' }) as unknown as IAbstractLogger,
  includeDeleted: false,
  // defaultReferrals?: DefaultReferrals,
  // entryParser?: (_entry: any, _raw: any, _callback: Function) => void,
};

// const query = 'CN=*';
// const query = { filter: 'CN=*vvm*', paged: false };

describe('findUser()', () => {
  describe('#findUser()', () => {
    ['dn', 'userPrincipalName', 'sAMAccountName', 'mail'].forEach((userAttribute) => {
      const username = settings.username[userAttribute];
      test(`should return user for (${userAttribute}) ${username}`, async () => {
        try {
          const user = await findUser(username, adoOptions);
          expect(user).toBeTruthy();
        } catch (err) {
          console.log(err);
          expect(err).toBeFalsy();
        }
      });
    });

    test('should return undefined if the username doesn\'t exist', async () => {
      try {
        const user = await findUser('!!!NON-EXISTENT USER!!!', adoOptions);
        expect(user).toBeUndefined();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return default user attributes when not specified', async () => {
      const defaultAttributes = new Set([...DEFAULT_ATTRIBUTES.user, 'groups']);
      try {
        const user = await findUser(settings.username.userPrincipalName, adoOptions) as IUser;
        expect(user).toBeTruthy();
        const userAttributes = Object.keys(user).sort();
        const foundExtraAttribute = userAttributes.some((userAttr) => !defaultAttributes.has(userAttr));
        expect(foundExtraAttribute).toBeFalsy();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });
  });

  describe('#findUser(opts)', () => {
    test('should use the custom opts.filter if provided', async () => {
      const opts: IAdOptions = merge({}, adoOptions, { searchOptions: { filter: settings.opts.custom } });
      const username = settings.username.userPrincipalName;
      try {
        const user = await findUser(username, opts) as IUser;
        expect(user.userPrincipalName).not.toBe(username);
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test(`should include groups/membership if includeMembership = ['all']`, async () => {
      const opts: IAdOptions = merge({}, adoOptions, { searchOptions: { includeMembership: ['all'] } });
      const username = settings.username.userPrincipalName;
      try {
        const user = await findUser(username, opts) as IUser;
        expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
        const cns = user.groups.map((g) => g.cn);
        settings.groups.forEach((group: string) => {
          expect(cns.includes(group)).toBeTruthy();
        });
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test(`should include groups/membership if includeMembership = ['user']`, async () => {
      const opts: IAdOptions = merge({}, adoOptions, { searchOptions: { includeMembership: ['user'] } });
      const username = settings.username.userPrincipalName;
      try {
        const user = await findUser(username, opts) as IUser;
        expect(user.groups.length).toBeGreaterThanOrEqual(settings.groups.length);
        const cns = user.groups.map((g) => g.cn);
        settings.groups.forEach((group: string) => {
          expect(cns.includes(group)).toBeTruthy();
        });
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return only the first user if more than one result returned', async () => {
      const opts: IAdOptions = merge({}, adoOptions, { searchOptions: { filter: settings.opts.multipleFilter } });
      const username = ''; // ignored since we're setting our own filter
      try {
        const user = await findUser(username, opts) as IUser;
        expect(user).toBeTruthy();
        expect(Array.isArray(user)).toBeFalsy();
        expect(Array.isArray(user)).toBeFalsy();
      } catch (err) {
        console.log(err);
        expect(err).toBeFalsy();
      }
    });

    test('should return only requested attributes', async () => {
      const opts: IAdOptions = merge({}, adoOptions, { searchOptions: { attributes: ['cn'] } });
      const username = settings.username.userPrincipalName;
      try {
        const user = await findUser(username, opts) as IUser;
        const keys = Object.keys(user).filter((k) => k !== 'groups');
        expect(opts.searchOptions.attributes?.length).toBeGreaterThanOrEqual(keys.length);
        keys.forEach((key) => {
          expect(opts.searchOptions.attributes?.includes(key)).toBeTruthy();
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
      const opts: IAdOptions = merge({}, adoOptions);

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

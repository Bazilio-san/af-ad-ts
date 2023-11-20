/* eslint-disable no-console */
import merge from 'merge-options';
import { IAdOptions, ISearchOptionsEx } from '../src/@type/i-searcher';
// import { setLogger } from '../src/logger';
import { findUsers } from '../src/lib/find-users';

// setLogger({ trace: console.log.bind(console) } as unknown as IAbstractLogger);

const settings = require('./local/settings.local.js').findUsers;
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
const getAdOptions = (searchOptionsPartial: ISearchOptionsEx) => merge({}, adOptions, { searchOptions: searchOptionsPartial });

describe('findUsers()', () => {
  describe('#findUsers()', () => {
    test.only('The correct number of users must be found', async () => {
      let users;
      const opts = getAdOptions({
        filter: settings[1].filter,
        paged: { pageSize: 100000 },
        attributes: ['cn'],
      });
      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(users.length).toBe(settings[1].count);
    });

    test('The correct number of users must be found', async () => {
      let users;
      const opts = getAdOptions({
        filter: settings[2].filter,
        paged: { pageSize: 100000 },
        attributes: ['cn'],
      });

      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      console.log(users.length);
      expect(users.length).toBeGreaterThanOrEqual(settings[2].minCount);
    });

    test(`should find user by objectGUID`, async () => {
      const opts = getAdOptions({
        filter: '(&(objectClass=*)(objectGUID=S-4-27847629191745-735892645-2805794159))',
        attributes: ['*'],
      });
      let users;
      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      expect(users.length).toBe(1);
    });
  });
});

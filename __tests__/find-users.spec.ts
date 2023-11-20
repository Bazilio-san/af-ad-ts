/* eslint-disable no-console */
import merge from 'merge-options';
import { DateTime } from 'luxon';
import { IAdOptions, ISearchOptionsEx } from '../src/@type/i-searcher';
import { findUsers } from '../src/lib/find-users';
import { setLogger } from '../src/logger';
import { IAbstractLogger } from '../src/@type/i-abstract-logger';

if (1) {
  setLogger({ trace: console.log.bind(console) } as unknown as IAbstractLogger);
}

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

const getAdOptions = (searchOptionsPartial: ISearchOptionsEx) => merge({}, adOptions, { searchOptions: searchOptionsPartial });

describe('findUsers()', () => {
  describe('#findUsers()', () => {
    [1, 2, 3].forEach((x) => {
      test(`(${x}) The correct number of users must be found`, async () => {
        let users;
        const unitSettings = settings.exactCount[x - 1];
        const opts = getAdOptions({
          filter: unitSettings.filter,
          paged: { pageSize: 100000 },
          attributes: ['cn'],
        });
        try {
          users = await findUsers(opts);
        } catch (err) {
          console.log(err);
          return expect(err).toBeFalsy();
        }
        expect(users.length).toBe(unitSettings.count);
      });
    });

    test('The correct number of users must be found', async () => {
      let users;
      const unitSettings = settings.all;
      const opts = getAdOptions({
        filter: unitSettings.filter,
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
      expect(users.length).toBeGreaterThanOrEqual(unitSettings.minCount);
    });

    test.only(`Find last changes`, async () => {
      const d = DateTime.now().minus({ hour: 2 }).setZone('UTC').toFormat('yyyyMMddHHmmss');
      // const type = 'objectClass';
      const type = 'objectCategory'
      const opts = getAdOptions({
        filter: `(&(${type}=user)(whenChanged>=${d}.0Z))`,
        // filter: `(&(${type}=person)(whenChanged>=${d}.0Z))`,
        // filter: `(&(${type}=user)(whenChanged>=${d}.0Z))`,
        // filter: `(&(${type}=person)(whenChanged>=${d}.0Z))`,
        // filter: `(&(|(${type}=user)(${type}=person))(whenChanged>=${d}.0Z))`,
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

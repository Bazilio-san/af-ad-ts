/* eslint-disable no-console */
import merge from 'merge-options';
import { DateTime } from 'luxon';
import { findUsers, IAbstractLogger, IAdOptions, ISearchOptionsEx, setLogger } from "../src";

if (0) {
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

const getAdOptions = (searchOptionsPartial: ISearchOptionsEx, extra: any = {}) => merge({}, adOptions, { searchOptions: searchOptionsPartial }, extra);

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

    test('CN=*', async () => {
      let users;
      const unitSettings = settings.all;
      const opts = getAdOptions({
        filter: 'CN=*',
        // filter: '(objectClass=*)',
        paged: { pageSize: 100000 },
        attributes: ['cn'],
      });

      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      console.log(`ALL: ${users.length} users`); // 14807
      expect(users.length).toBeGreaterThanOrEqual(unitSettings.minCount);
    });

    test('includeDeleted', async () => {
      let users;
      const unitSettings = settings.deleted;
      const opts = getAdOptions({
        filter: '(objectClass=*)',
        paged: { pageSize: 100000 },
        attributes: ['cn'],
        // scope: 'one',
      }, { includeDeleted: true });

      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      console.log(`include Deleted: ${users.length} users`); // 14807
      expect(users.length).toBeGreaterThanOrEqual(unitSettings.minCount);
    });

    test(`Find last changes`, async () => {
      const dt = DateTime.now().setZone('UTC').minus({ hour: 1 });
      const opts = getAdOptions({
        filter: `(whenChanged>=${dt.toFormat('yyyyMMddHHmmss')}.0Z)`,
        attributes: ['*'],
      });
      let users;
      try {
        users = await findUsers(opts);
      } catch (err) {
        console.log(err);
        return expect(err).toBeFalsy();
      }
      console.log(`changes from ${dt.toISO()}: ${users.length} users`);
      expect(users.length).toBeGreaterThan(10);
    });
  });
});

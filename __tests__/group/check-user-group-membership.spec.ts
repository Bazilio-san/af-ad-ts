import { GroupChecker } from '../../src';

const config = require('../local/get-connection-options');

const { ldapApi, domainControllers, usersInGroups } = config;

const dcArray = domainControllers[Object.keys(domainControllers)[0]];
const firstDC3segments = [...dcArray[0].split('.').reverse()].splice(0, 3).reverse();
const baseDN = firstDC3segments.map((v) => `DC=${v}`).join(',');

describe('checkUserGroupMembership', () => {
  describe('GroupChecker class', () => {
    let groupChecker: GroupChecker;

    beforeAll(() => {
      groupChecker = new GroupChecker({
        url: dcArray[0],
        bindDN: ldapApi.access.user,
        bindPassword: ldapApi.access.password,
        baseDn: baseDN,
        cacheTtlMs: 30000,
        dnCacheTtlMs: 30000,
      });
    });

    afterAll(() => {
      // groupChecker.destroy();
    });
    for (let i = 0; i < usersInGroups.length; i++) {
      const testUser = usersInGroups[i];
      // eslint-disable-next-line no-loop-func
      test('should check user group membership', async () => {
        const result = await groupChecker.isUserInGroup(testUser.user, testUser.group);
        expect(result).toBe(testUser.isMember);
      });
    }
  });
});

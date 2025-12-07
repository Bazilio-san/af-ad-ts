/* eslint-disable no-console */
import { createRequire } from 'module';
import { GroupChecker } from '../../dist/cjs/src/main/group/check-user-group-membership.js';
import { setLogger } from '../../dist/cjs/src/lib/logger.js';

setLogger();

const require = createRequire(import.meta.url);
const { ldapApi, domainControllers, usersInGroups } = require('../local/config.local.js');

const domain = ldapApi?.access?.domain || Object.keys(domainControllers)[0];
const dcArray = domainControllers[domain] || domainControllers[Object.keys(domainControllers)[0]];
const firstDC = dcArray[0];
const firstDC3segments = [...firstDC.split('.').reverse()].splice(0, 3).reverse();
const baseDn = firstDC3segments.map((v) => `DC=${v}`).join(',');

// GroupChecker (TS)
const tsChecker = new GroupChecker({
  url: dcArray[0],
  bindDN: ldapApi.access.user,
  bindPassword: ldapApi.access.password,
  baseDn,
  cacheTtlMs: 30000,
  dnCacheTtlMs: 30000,
});

async function runTest () {
  const { user, group } = usersInGroups[2];

  console.log('\nTesting GroupChecker (TS):');
  const tsTimes = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    try {
      await tsChecker.isUserInGroup(user, group, undefined, true, true);
      const end = performance.now();
      const time = end - start;
      tsTimes.push(time);
      console.log(`  Test ${i + 1}: ${time.toFixed(2)}ms`);
    } catch (e) {
      console.log(`  Test ${i + 1}: ERROR - ${e.message}`);
    }
  }

  const tsAvg = tsTimes.reduce((a, b) => a + b, 0) / tsTimes.length;

  console.log('\nResults:');
  console.log(`TS Average: ${tsAvg.toFixed(2)}ms`);
}

runTest().catch(console.error).then(() => {
  process.exit(0);
});

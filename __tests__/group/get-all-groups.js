/* eslint-disable no-console */

import { createRequire } from 'module';

import { setLogger } from '../../dist/cjs/src/lib/logger.js';
import { getAllGroups } from '../../dist/cjs/src/main/group/get-all-groups.js';

setLogger();

const require = createRequire(import.meta.url);
const { ldapApi, domainControllers } = require('../local/config.local.js');

// Derive baseDN from the first domain controller, exactly like in test-speed.js
const domain = ldapApi?.access?.domain || Object.keys(domainControllers)[0];
const dcArray = domainControllers[domain] || domainControllers[Object.keys(domainControllers)[0]];
const firstDC = dcArray[0];
const firstDC3segments = [...firstDC.split('.').reverse()].splice(0, 3).reverse();
const baseDn = firstDC3segments.map((v) => `DC=${v}`).join(',');

// Build IAdOptions for getAllGroups
const adOptions = {
  baseDN: baseDn,
  clientOptions: {
    url: dcArray[0],
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
    timeout: 15000,
  },
};

async function run () {
  console.log('Fetching ALL groups (plain mode)...');
  const plain = await getAllGroups(adOptions, 'plain');
  console.log(`Total groups: ${plain.length}`);
  console.log('First items:', plain.slice(0, 5));

  console.log('\nBuilding group tree (tree mode)...');
  const roots = await getAllGroups(adOptions, 'tree');
  console.log(`Root groups: ${roots.length}`);
  const sample = roots.slice(0, 3).map((g) => ({ cn: g.cn, membersCount: g.members?.length || 0 }));
  console.log('Sample roots:', sample);
}

run().catch((e) => {
  console.error('ERROR in get-all-groups test:', e?.message || e);
  process.exitCode = 1;
}).then(() => {
  // Explicit exit to end the script in CI/local runs
  process.exit();
});

/* eslint-disable no-console */
const { getGroupsByLogin } = require('../../dist/cjs/src/main/group/get-groups-by-login');
const { ldapApi, domainControllers, usersInGroups } = require('../local/config.local.js');

const dcArray = domainControllers[Object.keys(domainControllers)[0]];
const firstDC3segments = [...dcArray[0].split('.').reverse()].splice(0, 3).reverse();
const baseDN = firstDC3segments.map((v) => `DC=${v}`).join(',');

const adOptions = {
  baseDN,
  clientOptions: {
    url: dcArray[0],
    bindDN: ldapApi.access.user,
    bindCredentials: ldapApi.access.password,
  },
  searchOptions: { paged: { pageSize: 1000 } },
};

async function getUserGroups (login) {
  try {
    // eslint-disable-next-line no-console
    console.log(`Searching groups for user: ${login}`);

    // Get groups including nested ones
    const groups = await getGroupsByLogin({
      login,
      options: adOptions,
      includeNested: true, // Include nested groups
    });

    if (groups && groups.length > 0) {
      console.log(`\nFound ${groups.length} groups for user ${login}:`);
      console.log('='.repeat(50));

      groups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.cn}`);
        console.log(`   DN: ${group.distinguishedName}`);
        if (group.description) {
          console.log(`   Description: ${group.description}`);
        }
        if (group.sAMAccountName) {
          console.log(`   SAM Account: ${group.sAMAccountName}`);
        }
        if (group.isNested) {
          console.log(`   Type: ${group.isNested ? 'Potentially nested' : 'Direct'}`);
        }
        console.log('');
      });

      console.log(`\nTotal groups: ${groups.length}`);
    } else {
      console.log(`No groups found for user: ${login}`);
    }

    return groups;
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

const main = async () => {
  for (const group of usersInGroups) {
    await getUserGroups(group.user);
  }
};

main().then(() => 0).catch(() => 0).finally(() => process.exit());

/* eslint-disable no-console */
const { findUser } = require('../../dist/cjs/src/main/find-users');
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
  searchOptions: {
    paged: { pageSize: 1000 },
    includeMembership: ['all'],
  },
};

async function getUserWithGroups (login) {
  try {
    const user = await findUser(login, adOptions);

    if (user) {
      console.log(`User: ${user.displayName}`);
      console.log(`Groups (${user.groups?.length || 0}):`);
      user.groups?.forEach((group) => console.log(`- ${group.cn}`));
    } else {
      console.log('User not found');
    }

    return user;
  } catch (error) {
    console.error('Error:', error);
  }
}

const main = async () => {
  for (const group of usersInGroups) {
    await getUserWithGroups(group.user);
  }
};

main().then(() => 0).catch(() => 0).finally(() => process.exit());

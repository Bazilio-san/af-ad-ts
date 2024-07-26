import { getUserInfoByDomainLogin, suggest } from '../../src';

const cases = require('./data.local.js');

describe('Suggest', () => {
  test(cases[0].baseDN, async () => {
    const result = await suggest(cases[0]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
  test(cases[1].baseDN, async () => {
    const result = await suggest(cases[1]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
  test('getUserInfoByDomainLogin [full]', async () => {
    const result = await getUserInfoByDomainLogin(cases[2]);
    expect(result?.sAMAccountName).toBe(cases[2].username);
  });
  test('getUserInfoByDomainLogin [short]', async () => {
    const result = await getUserInfoByDomainLogin(cases[3]);
    expect(result?.sAMAccountName).toBe(cases[3].username);
  });
});

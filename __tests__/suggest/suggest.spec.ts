import { suggest } from '../../src';

const cases = require('./data.local.js');

describe('Suggest', () => {
  test('OFFICE', async () => {
    const result = await suggest(cases[0]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
  test('WTE', async () => {
    const result = await suggest(cases[1]);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

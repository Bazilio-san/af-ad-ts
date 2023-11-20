import * as utils from '../src/lib/utilities';
import { CAT_USER } from '../src/lib/utilities';

describe('Utility functions', () => {
  describe('parseDistinguishedName', () => {
    test('handling commas which are no component separators inside DNs', () => {
      const input = 'CN=Doe\\, John (Test),OU=Technicians,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom';
      const output = utils.parseDistinguishedName(input);
      expect(output).toBe('CN=Doe\\5c\\5c, John \\28Test\\29,OU=Technicians,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom');
    });

    test('characters to be escaped inside DNs', () => {
      const input = 'CN= Max Mustermann*,OU=Test (12345),OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom';
      const output = utils.parseDistinguishedName(input);
      expect(output).toBe('CN= Max Mustermann\\2a,OU=Test \\2812345\\29,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom');
    });
  });
  describe('getWildcardsUserFilter', () => {
    [
      [undefined, CAT_USER],
      [{ a: 1 }, '[object Object]'],
      ['CN=Joh*', `(&${CAT_USER}(CN=Joh*))`],
      ['Joh*', `(&${CAT_USER}(CN=Joh*))`],
      ['(|(sAMAccountName=john)(userPrincipalName=john))', `(&${CAT_USER}(|(sAMAccountName=john)(userPrincipalName=john)))`],
      ['(&(objectCategory=User)(|(cn=john)(cn=john2)))', '(&(objectCategory=User)(|(cn=john)(cn=john2)))'],
    ].forEach(([input, expected]) => {
      test(`getWildcardsUserFilter "${input}" -> "${expected}"`, () => {
        const output = utils.getWildcardsUserFilter(input);
        expect(String(output)).toBe(expected);
      });
    });
  });
});

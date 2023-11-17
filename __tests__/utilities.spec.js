const utilities = require('../lib/utilities');

describe('Utility functions', () => {
  describe('parseDistinguishedName', () => {
    test('handling commas which are no component separators inside DNs', () => {
      const input = 'CN=Doe\\, John (Test),OU=Technicians,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom';
      const output = utilities.parseDistinguishedName(input);
      expect(output).toBe('CN=Doe\\\\, John \\\\28Test\\\\29,OU=Technicians,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom');
    });

    test('characters to be escaped inside DNs', () => {
      const input = 'CN= Max Mustermann*,OU=Test (12345),OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom';
      const output = utilities.parseDistinguishedName(input);
      expect(output).toBe('CN=\\ Max Mustermann\\\\2A,OU=Test \\\\2812345\\\\29,OU=Users,OU=Local Resources,OU=DEDUS,DC=abc,DC=dom');
    });
  });
});

export { ClientOptions, SearchOptions, Control, Attribute } from 'ldapts';

// Entry - base type for LDAP records (as in ldapts)
export interface Entry {
  dn: string;
  [key: string]: string | string[] | Buffer | Buffer[];
}

// For backward compatibility, an explicit indication to avoid conflict with ldapts. SearchEntry
export type SearchEntry = Entry;

export type SearchReference = string;

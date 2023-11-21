/* eslint-disable arrow-body-style */
import ldap from 'ldapjs';
import { Control } from '../@type/i-ldap';

// https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/3c5e87db-4728-4f29-b164-01dd7d7391ea
export enum EControl {
  // LDAP_SERVER_SHOW_DELETED_OID
  // Used with an LDAP operation to specify that tombstones and deleted-objects are visible to the operation.
  'DELETED' = '1.2.840.113556.1.4.417',
  // LDAP_SERVER_SHOW_RECYCLED_OID
  // Used with an LDAP operation to specify that tombstones, deleted-objects, and recycled-objects are visible to the operation.
  'RECYCLED' = '1.2.840.113556.1.4.2064',
  // LDAP_SERVER_GET_STATS_OID
  // Used with an LDAP search request to instruct the DC to return statistical data related to how the search was performed.
  'STATS' = '1.2.840.113556.1.4.970',
  // LDAP_SERVER_EXTENDED_DN_OID
  // Used to request than an LDAP search operation return DNs in an extended format containing the values of the objectGUID and objectSid attributes.
  // 'EXTENDED_DN' = '1.2.840.113556.1.4.529',
  // LDAP_SERVER_LAZY_COMMIT_OID
  // Instructs the DC that it MAY sacrifice durability guarantees on updates to improve performance.
  'LAZY_COMMIT' = '1.2.840.113556.1.4.619',
  // LDAP_SERVER_SORT_OID
  // Request and response controls, respectively, for instructing the DC to sort the search results.
  'SORT' = '1.2.840.113556.1.4.473',
}

export const getControl = (type: EControl): Control => {
  // @ts-ignore
  return new ldap.Control({ type, criticality: true });
};

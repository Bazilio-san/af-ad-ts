export { ClientOptions, SearchOptions, SearchEntry, SearchReference } from 'ldapjs';

export interface PagedResultsControl {
  OID: string,
  parse: Function,
  type: string,
}

export interface Control {
  type: string,
  criticality: boolean,
  value: string | Buffer,
}

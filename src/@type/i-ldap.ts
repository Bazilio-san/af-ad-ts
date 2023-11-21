export { ClientOptions, SearchOptions, SearchEntry, SearchReference } from 'ldapjs';

export interface Control {
  type: string,
  criticality: boolean,
  value: string | Buffer,
}

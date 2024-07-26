/* eslint-disable no-bitwise */
import { Client, SearchOptions } from 'ldapts';

/**
 * Finding users within the LDAP.
 */
export const suggest = async (arg: {
  username: string,
  password: string,
  url: string,
  baseDN: string,
  search: string,
  attributes?: string[],
  top?: number,
  includeDisabled?: boolean,
}) => {
  const client = new Client({ url: arg.url });
  const {
    top: sizeLimit = 0,
    includeDisabled = false,
    attributes = [
      'sAMAccountName',
      'displayName',
      'mail',
    ],
  } = arg;
  attributes.push('userAccountControl');

  const search = (arg.search || '').trim().toLowerCase();
  const onlyEnabledCond = includeDisabled ? '' : '(!(useraccountcontrol:1.2.840.113556.1.4.803:=2))';

  try {
    await client.bind(arg.username, arg.password);
    const options: SearchOptions = {
      scope: 'sub',
      filter: `(&${onlyEnabledCond}(objectCategory=person)(|(sAMAccountName=${search.toLowerCase().trim()}*)(name=${search.toLowerCase().trim()}*)))`,
      attributes,
      sizeLimit,
    };
    const { searchEntries } = await client.search(arg.baseDN, options);
    searchEntries.map((item: any) => {
      item.enabled = ((Number(item.userAccountControl) || 0) & 2) !== 2;
      return item;
    });

    return searchEntries;
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    await client.unbind();
  }
};

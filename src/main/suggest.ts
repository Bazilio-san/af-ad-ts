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
}) => {
  const client = new Client({ url: arg.url });
  const {
    top: sizeLimit = 0,
    attributes = [
      'sAMAccountName',
      'displayName',
      'userPrincipalName',
    ],
  } = arg;

  const search = (arg.search || '').trim().toLowerCase();

  try {
    await client.bind(arg.username, arg.password);
    const options: SearchOptions = {
      scope: 'sub',
      filter: `(&(objectCategory=person)(|(sAMAccountName=${search.toLowerCase().trim()}*)(name=${search.toLowerCase().trim()}*)))`,
      attributes,
      sizeLimit,
    };
    const { searchEntries } = await client.search(arg.baseDN, options);
    return searchEntries;
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    await client.unbind();
  }
};



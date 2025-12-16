import { Client } from 'ldapts';

import { IAdOptions } from '../@type/i-searcher';

/**
 * Helper to manage ldapts Client lifecycle.
 * Creates client, binds, executes callback, and unbinds in finally.
 */
export const withLdapClient = async <T>(
  options: IAdOptions,
  fn: (client: Client) => Promise<T>,
): Promise<T> => {
  const client = new Client({
    url: options.clientOptions.url,
    timeout: options.clientOptions.timeout,
  });
  try {
    await client.bind(options.clientOptions.bindDN, options.clientOptions.bindCredentials);
    return await fn(client);
  } finally {
    try { await client.unbind(); } catch { /* ignore */ }
  }
};

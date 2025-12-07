/* eslint-disable class-methods-use-this */
import { Client } from 'ldapts';
import { escLdapString } from '../../lib/utilities';
import { trace } from '../../lib/logger';

interface CacheEntry {
  result: boolean;
  expires: number;
}

interface DnCacheEntry {
  dn: string;
  expires: number;
}

export interface IGroupCheckerConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  baseDn: string;
  cacheTtlMs?: number;
  dnCacheTtlMs?: number;
}

const DEFAULT_CACHE_TTL_MILLIS = 10 * 60_000;
const DEFAULT_DN_CACHE_TTL_MILLIS = 24 * 3600_000;

export class GroupChecker {
  private client: Client;

  private readonly baseDn: string;

  private readonly bindDN: string;

  private readonly bindPassword: string;

  private cache = new Map<string, CacheEntry>();

  private dnCache = new Map<string, DnCacheEntry>();

  private readonly cacheTtlMs: number;

  private readonly dnCacheTtlMs: number;

  constructor ({ url, bindDN, bindPassword, baseDn, cacheTtlMs, dnCacheTtlMs }: IGroupCheckerConfig) {
    this.client = new Client({ url });
    this.baseDn = baseDn;
    this.bindDN = bindDN;
    this.bindPassword = bindPassword;
    this.cacheTtlMs = cacheTtlMs || DEFAULT_CACHE_TTL_MILLIS;
    this.dnCacheTtlMs = dnCacheTtlMs || DEFAULT_DN_CACHE_TTL_MILLIS;
  }

  private getCacheKey (userSam: string, groupSam: string): string {
    return `${userSam}:${groupSam}`;
  }

  private getDnCacheKey (sam: string, isGroup: boolean): string {
    return (isGroup ? 'G:' : 'U:') + sam.toLowerCase();
  }

  private getDnFromCache (sam: string, isGroup: boolean): string | null {
    const key = this.getDnCacheKey(sam, isGroup);
    const entry = this.dnCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expires < Date.now()) {
      this.dnCache.delete(key);
      return null;
    }
    return entry.dn;
  }

  private async bind (): Promise<void> {
    await this.client.bind(this.bindDN, this.bindPassword);
  }

  private async unbind (): Promise<void> {
    await this.client.unbind();
  }

  private async findDnBySam (sam: string, isGroup: boolean): Promise<string | null> {
    const cached = this.getDnFromCache(sam, isGroup);
    if (cached) {
      trace(`isUserInGroup: sam: ${sam} FROM CACHE`);
      return cached;
    }

    const { searchEntries } = await this.client.search(this.baseDn, {
      scope: 'sub',
      filter: `(&(objectClass=${isGroup ? 'group' : 'user'})(sAMAccountName=${sam}))`,
      attributes: ['distinguishedName'],
    });

    if (searchEntries.length === 0) {
      return null;
    }

    const dn = searchEntries[0].distinguishedName as string;

    const key = this.getDnCacheKey(sam, isGroup);
    this.dnCache.set(key, {
      dn,
      expires: Date.now() + this.dnCacheTtlMs,
    });

    return dn;
  }

  async isUserInGroup (userSam: string, groupSam: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(userSam, groupSam);

    const cached = this.cache.get(cacheKey);
    if (cached && cached?.expires > Date.now()) {
      trace(`isUserInGroup: ${userSam} ? ${groupSam} FROM CACHE`);
      return cached.result;
    }

    await this.bind();

    try {
      const userDn = await this.findDnBySam(userSam, false);
      if (!userDn) {
        throw new Error(`User not found: sAMAccountName=${userSam}`);
      }

      const groupDn = await this.findDnBySam(groupSam, true);
      if (!groupDn) {
        throw new Error(`Group not found: sAMAccountName=${groupSam}`);
      }

      const { searchEntries } = await this.client.search(userDn, {
        scope: 'base',
        filter: `(memberOf:1.2.840.113556.1.4.1941:=${escLdapString(groupDn)})`,
        attributes: ['dn'],
      });

      const result = searchEntries.length > 0;

      this.cache.set(cacheKey, {
        result,
        expires: Date.now() + this.cacheTtlMs,
      });

      return result;
    } finally {
      await this.unbind();
    }
  }

  clearCache (): void {
    this.cache.clear();
    this.dnCache.clear();
  }
}

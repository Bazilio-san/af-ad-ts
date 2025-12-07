/* eslint-disable no-restricted-syntax */
import { Client, SearchOptions } from 'ldapts';
import { IAdOptions } from '../../@type/i-searcher';
import { trace } from '../../lib/logger';
import { getStringValue } from '../../lib/utilities';
import { DEFAULT_PAGE_SIZE } from '../../constants';

// getStringValue moved to ../../lib/utilities for reuse (DRY)

export interface IPlainGroupInfo {
  cn: string;
  distinguishedName: string;
  description?: string;
  sAMAccountName?: string;
  groupType?: string;
}

export interface ITreeGroupInfo extends IPlainGroupInfo {
  members: ITreeGroupInfo[];
}

/**
 * Get all AD groups
 *
 * mode = 'plain' → returns a flat array of groups with required attributes
 * mode = 'tree'  → returns a tree where each group also has `members` consisting of nested groups
 */
export const getAllGroups = async (
  options: IAdOptions,
  mode: 'plain' | 'tree',
): Promise<IPlainGroupInfo[] | ITreeGroupInfo[]> => {
  const client = new Client({
    url: options.clientOptions.url,
    timeout: options.clientOptions.timeout,
  });

  try {
    await client.bind(options.clientOptions.bindDN, options.clientOptions.bindCredentials);

    // base attributes always requested
    const baseAttributes = ['cn', 'distinguishedName', 'description', 'sAMAccountName', 'groupType'];
    const attributes = mode === 'tree' ? [...baseAttributes, 'member'] : baseAttributes;

    const searchOptions: SearchOptions = {
      scope: 'sub',
      filter: '(&(objectCategory=Group))',
      attributes,
    };

    // Use pagination to avoid size limit errors
    const paginator = client.searchPaginated(options.baseDN, {
      ...searchOptions,
      paged: {
        pageSize: DEFAULT_PAGE_SIZE,
      },
    });

    const allEntries: any[] = [];
    for await (const searchResult of paginator) {
      allEntries.push(...searchResult.searchEntries);
    }

    if (mode === 'plain') {
      const result: IPlainGroupInfo[] = [];
      for (const entry of allEntries) {
        result.push({
          cn: getStringValue((entry as any).cn) || '',
          distinguishedName: getStringValue((entry as any).distinguishedName) || '',
          description: getStringValue((entry as any).description),
          sAMAccountName: getStringValue((entry as any).sAMAccountName),
          groupType: getStringValue((entry as any).groupType),
        });
      }
      trace(`getAllGroups: found ${result.length} groups (plain)`);
      return result;
    }

    // Tree mode
    type AnyEntry = Record<string, any>;
    const groupsMap = new Map<string, ITreeGroupInfo>();
    const memberRefs = new Map<string, string[]>(); // groupDN -> memberDNs (raw)

    // First pass: create nodes and collect member DNs
    for (const entry of allEntries as AnyEntry[]) {
      const dn = getStringValue(entry.distinguishedName) || '';
      const node: ITreeGroupInfo = {
        cn: getStringValue(entry.cn) || '',
        distinguishedName: dn,
        description: getStringValue(entry.description),
        sAMAccountName: getStringValue(entry.sAMAccountName),
        groupType: getStringValue(entry.groupType),
        members: [],
      };
      groupsMap.set(dn, node);

      const rawMember = entry.member;
      const memberList: string[] = [];
      if (rawMember != null) {
        if (Array.isArray(rawMember)) {
          for (const v of rawMember) {
            const s = getStringValue(v) || (typeof v === 'string' ? v : undefined);
            if (s) memberList.push(s);
          }
        } else {
          const s = getStringValue(rawMember) || (typeof rawMember === 'string' ? rawMember : undefined);
          if (s) memberList.push(s);
        }
      }
      if (memberList.length) {
        memberRefs.set(dn, memberList);
      }
    }

    // Second pass: link only group->group relations
    const nonRootChildren = new Set<string>();
    for (const [parentDN, memberDNs] of memberRefs.entries()) {
      const parent = groupsMap.get(parentDN);
      if (!parent) {
        // eslint-disable-next-line no-continue
        continue;
      }
      for (const mdn of memberDNs) {
        const child = groupsMap.get(mdn);
        if (child) {
          parent.members.push(child);
          nonRootChildren.add(child.distinguishedName);
        }
      }
    }

    // Roots are groups that are not a child of any other group
    const roots: ITreeGroupInfo[] = [];
    for (const node of groupsMap.values()) {
      if (!nonRootChildren.has(node.distinguishedName)) {
        roots.push(node);
      }
    }

    trace(`getAllGroups: built tree with ${groupsMap.size} groups; roots: ${roots.length}`);
    return roots;
  } finally {
    try {
      await client.unbind();
    } catch { /* ignore */
    }
  }
};

export default getAllGroups;

export const GROUP_BASE_ATTRIBUTES = [
  'cn',
  'distinguishedName',
  'description',
  'sAMAccountName',
  'groupType',
] as const;

export const GROUP_FILTER = '(&(objectCategory=Group))';

export type GroupBaseAttribute = typeof GROUP_BASE_ATTRIBUTES[number];

export interface IGroup {
  cn: string,
  dn: string,

  [propName: string]: string,
}

/**
 * Represents an ActiveDirectory group.
 */
export const newGroup = (properties: any): IGroup => {
  const group = {} as IGroup;
  Object.getOwnPropertyNames(properties || {}).forEach((prop) => {
    group[prop] = properties[prop];
  });
  return group;
};

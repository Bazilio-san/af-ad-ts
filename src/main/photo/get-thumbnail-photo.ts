import merge from 'merge-options';
import { asyncSearcher } from '../lib/Searcher';
import { IAdOptions, SearchEntryEx } from '../../@type/i-searcher';

export const getThumbnailPhoto = async (adOptions: IAdOptions, domain: string, username: string): Promise<Buffer | undefined> => {
  const searchOptions = {
    attributes: ['thumbnailPhoto'],
    filter: `(&(objectCategory=User)(|(sAMAccountName=${username})(userPrincipalName=${username})))`,
    scope: 'sub',
  };
  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions });
  const searcherResults: SearchEntryEx[] = await asyncSearcher(searchAdOptions);
  const attr = searcherResults[0]?.attributes.find((att) => att.type === 'thumbnailPhoto');
  return attr?.values?.[0] as Buffer;
};

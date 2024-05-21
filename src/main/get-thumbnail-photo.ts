import merge from 'merge-options';
import { asyncSearcher } from './Searcher';
import { IAdOptions, SearchEntryEx } from '../@type/i-searcher';

export const getThumb = async (adOptions: IAdOptions, domain: string, username: string): Promise<Buffer | undefined> => {
  const searchOptions = {
    attributes: ['thumbnailPhoto'],
    filter: `(&(objectCategory=User)(|(sAMAccountName=${username})(userPrincipalName=${username})))`,
    scope: 'sub',
  };
  const searchAdOptions: IAdOptions = merge({}, adOptions, { searchOptions });
  const searcherResults: SearchEntryEx[] = await asyncSearcher(searchAdOptions);
  return searcherResults[0]?.attributes.find((attr) => attr.type === 'thumbnailPhoto')?.buffers?.[0];
};

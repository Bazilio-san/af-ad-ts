# af-ad-ts

TypeScript library for working with Active Directory/LDAP. Provides high-level API for searching users, groups and AD-specific features.

## Installation

```bash
npm install af-ad-ts
```

## API

### findUsers(adOptions: IAdOptions): Promise<IUser[]>

Search users in LDAP tree.

```typescript
import { findUsers, IAdOptions } from 'af-ad-ts';

const adOptions: IAdOptions = {
  baseDN: 'DC=company,DC=com',
  clientOptions: {
    url: 'ldap://dc.company.com',
    bindDN: 'CN=service,CN=Users,DC=company,DC=com',
    bindCredentials: 'password'
  },
  searchOptions: {
    filter: '(objectCategory=person)',
    attributes: ['cn', 'mail', 'sAMAccountName']
  }
};

const users = await findUsers(adOptions);

// Advanced example with optional parameters
const advancedAdOptions: IAdOptions = {
  baseDN: 'DC=company,DC=com',
  clientOptions: {
    url: 'ldap://dc1.company.com'
    bindDN: 'CN=service,CN=Users,DC=company,DC=com',
    bindCredentials: 'password',
    log: console // Custom logger
  },
  searchOptions: {
    filter: '(objectCategory=person)',
    scope: 'sub', // Search scope: 'base', 'one', or 'sub'
    attributes: ['cn', 'mail', 'sAMAccountName', 'department'],
    paged: { pageSize: 500 }, // Pagination for large result sets
    includeMembership: ['all'], // Include group membership information
    f: '(&(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))' // Alternative filter syntax
  },
  controls: [], // LDAP controls for advanced operations
  includeDeleted: false, // Search for deleted objects (requires special permissions)
  defaultReferrals: {
    enabled: true, // Follow LDAP referrals
    exclude: ['ForestDnsZones', 'DomainDnsZones'] // Exclude certain referral patterns
  },
  preEntryParser: (entry) => entry, // Modify entries before processing
  postEntryParser: (entry, callback) => callback() // Custom entry processing
};

const advancedUsers = await findUsers(advancedAdOptions);
```

### findUser(username: string, adOptions: IAdOptions): Promise<IUser | undefined>

Search single user by name.

```typescript
const user = await findUser('john.doe', adOptions);
if (user) {
  console.log(user.displayName);
}

// Example with wildcard search
const userWithWildcard = await findUser('john*', adOptions);
```

### getUserInfoByDomainLogin<T>(arg): Promise<T | undefined>

Get user information by domain login.

```typescript
import { getUserInfoByDomainLogin, IUserInfoShort, IUserInfoFull } from 'af-ad-ts';

// Short user info
const user = await getUserInfoByDomainLogin<IUserInfoShort>({
  username: 'john.doe',
  requestType: 'short',
  ldap: {
    username: 'service@company.com',
    password: 'password123',
    url: 'ldap://dc.company.com',
    baseDN: 'DC=company,DC=com',
    timeoutMillis: 30000 // Optional timeout
  }
});

// Full user info with groups
const fullUser = await getUserInfoByDomainLogin<IUserInfoFull>({
  username: 'john.doe',
  requestType: 'full',
  withMembers: true, // Include group membership
  ldap: {
    username: 'service@company.com',
    password: 'password123',
    url: 'ldap://dc.company.com',
    baseDN: 'DC=company,DC=com'
  }
});
```

### suggest(arg): Promise<any[]>

Fast user search for autocomplete.

```typescript
const suggestions = await suggest({
  username: 'service@company.com',
  password: 'password123',
  url: 'ldap://dc.company.com',
  baseDN: 'DC=company,DC=com',
  search: 'john', // Search string for filtering
  attributes: ['sAMAccountName', 'displayName', 'mail'], // Optional
  top: 10, // Optional - Maximum number of results
  includeDisabled: false // Optional - Exclude disabled user accounts
});
```

### getGroupMembersForDN(dn: string, adOptions: IAdOptions, hash?: Map<string, IGroup>): Promise<IGroup[]>

Get group members by Distinguished Name with recursive search.

```typescript
const groups = await getGroupMembersForDN(
  'CN=Developers,OU=Groups,DC=company,DC=com',
  adOptions
);

// Example with nested groups search
const nestedGroups = await getGroupMembersForDN(
  'CN=AllUsers,OU=Groups,DC=company,DC=com',
  {
    ...adOptions,
    searchOptions: {
      ...adOptions.searchOptions,
      includeMembership: ['all'] // Include all membership levels
    }
  }
);
```

### getGroupsByLogin(params): Promise<IGroupInfo[]>

Get user groups by login.

```typescript
import { getGroupsByLogin, IGroupInfo, IGetGroupsParams } from 'af-ad-ts';

const params: IGetGroupsParams = {
  login: 'john.doe',
  options: {
    baseDN: 'DC=company,DC=com',
    clientOptions: {
      url: 'ldap://dc.company.com',
      bindDN: 'service@company.com',
      bindCredentials: 'password'
    }
  },
  includeNested: true, // Include nested groups (default: true)
  domain: 'company.com' // Optional user domain
};

const groups: IGroupInfo[] = await getGroupsByLogin(params);
```

### getAllGroups(options, mode): Promise<IPlainGroupInfo[] | ITreeGroupInfo[]>

Get all Active Directory groups.

```typescript
import { getAllGroups, IPlainGroupInfo, ITreeGroupInfo } from 'af-ad-ts';

// Get flat list of groups
const plainGroups: IPlainGroupInfo[] = await getAllGroups(adOptions, 'plain');

// Get hierarchical tree of groups with nested membership
const treeGroups: ITreeGroupInfo[] = await getAllGroups(adOptions, 'tree');

// Example with plain mode
const groups = await getAllGroups({
  baseDN: 'DC=company,DC=com',
  clientOptions: {
    url: 'ldap://dc.company.com',
    bindDN: 'service@company.com',
    bindCredentials: 'password'
  }
}, 'plain');

console.log(`Found ${groups.length} groups`);
```

### GroupChecker

Class for checking user group membership.

```typescript
import { GroupChecker, IGroupCheckerConfig } from 'af-ad-ts';

const config: IGroupCheckerConfig = {
  url: 'ldap://dc.company.com',
  bindDN: 'service@company.com',
  bindPassword: 'password',
  baseDn: 'DC=company,DC=com',
  cacheTtlMs: 600000, // Cache TTL in milliseconds (10 minutes)
  dnCacheTtlMs: 86400000 // DN cache TTL in milliseconds (24 hours)
};

const checker = new GroupChecker(config);

// Check single group membership
const isMember = await checker.isUserInGroup('john.doe', 'Developers');

// Check multiple groups
const adminMember = await checker.isUserInGroup('john.doe', 'Admins');
const devMember = await checker.isUserInGroup('john.doe', 'Developers');

// Clear cache
checker.clearCache();
```

### getThumbnailPhoto(adOptions: IAdOptions, domain: string, username: string): Promise<Buffer | undefined>

Get user photo from thumbnailPhoto attribute.

```typescript
const photoBuffer = await getThumbnailPhoto(adOptions, 'company.com', 'john.doe');
if (photoBuffer) {
  require('fs').writeFileSync('photo.jpg', photoBuffer);

  // Convert to base64 for web usage
  const base64Photo = photoBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Photo}`;
}
```

### Searcher

Main class for executing LDAP search operations.

```typescript
import { Searcher, TSearchCallback } from 'af-ad-ts';

const callback: TSearchCallback = (err, results) => {
  if (err) {
    console.error('Search error:', err);
    return;
  }

  console.log(`Found ${results?.length} entries`);
  results?.forEach(entry => {
    console.log(`DN: ${entry.idn}`);
    console.log('Attributes:', entry.ao); // Access attributes as object
  });
};

const searcher = new Searcher({
  baseDN: 'DC=company,DC=com',
  clientOptions: {
    url: 'ldap://dc.company.com',
    bindDN: 'service@company.com',
    bindCredentials: 'password',
  },
  searchOptions: {
    filter: '(objectCategory=person)',
    scope: 'sub',
    attributes: ['cn', 'mail', 'department'],
    paged: { pageSize: 1000 }
  },
  controls: [], // Optional LDAP controls
  includeDeleted: false,
  defaultReferrals: {
    enabled: false, // Disabled by default for performance
    exclude: ['ForestDnsZones', 'DomainDnsZones', 'Configuration']
  },
  callback
});

searcher.search();
```

### asyncSearcher(options): Promise<SearchEntryEx[]>

Promise-based wrapper for Searcher.

```typescript
const results = await asyncSearcher({
  baseDN: 'DC=company,DC=com',
  clientOptions: {
    url: 'ldap://dc.company.com',
    bindDN: 'service@company.com',
    bindCredentials: 'password'
  },
  searchOptions: {
    filter: '(objectCategory=person)',
    attributes: ['cn', 'mail'],
    paged: { pageSize: 500 },
    scope: 'sub'
  },
  includeDeleted: false, // Only active objects
  defaultReferrals: {
    enabled: true, // Follow referrals for distributed environments
    exclude: ['ForestDnsZones']
  }
});

console.log(`Found ${results.length} users`);
```

### LdapSearchResult

Wrapper class for search results with additional methods.

```typescript
import { LdapSearchResult } from 'af-ad-ts';

const result = new LdapSearchResult(searchEntry);

// Get distinguished name
const dn = result.name();

// Get entry as object with string attributes
const attributes = result.value();
```

### RangeAttributesParser

Internal class for handling Active Directory ranged attributes. Used automatically by the library.

```typescript
import { RangeAttributesParser, RangeAttribute } from 'af-ad-ts';

// Note: This class is used internally by the library and requires a Searcher instance
// It's typically not used directly in application code
```

### RangeAttribute

Interface for ranged attributes.

```typescript
interface RangeAttribute {
  attribute: string; // Attribute name (e.g., "member")
  value: string;     // Attribute value
  range?: {          // Range information for AD ranged attributes
    start: number;   // Start index
    end?: number;    // End index (undefined for last range)
  };
}
```

### Utilities

#### getWildcardsUserFilter(search: string): string

Create LDAP filter with wildcards for user search.

```typescript
const filter = getWildcardsUserFilter('john');
// Result: '(&(objectCategory=person)(objectClass=user)(|(cn=*john*)(sAMAccountName=*john*)))'

const complexFilter = getWildcardsUserFilter('john admin');
// Handles multiple search terms automatically
```

#### setLogger(logger: IAbstractLogger)

Set logger for debugging.

```typescript
import { setLogger, IAbstractLogger } from 'af-ad-ts';

const logger: IAbstractLogger = {
  trace: (msg) => console.log('[TRACE]', msg),
  debug: (msg) => console.debug('[DEBUG]', msg),
  info: (msg) => console.info('[INFO]', msg),
  warn: (msg) => console.warn('[WARN]', msg),
  error: (msg) => console.error('[ERROR]', msg)
};

setLogger(logger);
```

### LDAP Controls

#### EControl

Enum for Active Directory LDAP control OIDs.

```typescript
import { EControl } from 'af-ad-ts';

// Common controls
EControl.DELETED     // '1.2.840.113556.1.4.417' - Show deleted objects
EControl.RECYCLED    // '1.2.840.113556.1.4.2064' - Show recycled objects
EControl.STATS       // '1.2.840.113556.1.4.970' - Get search statistics
EControl.LAZY_COMMIT // '1.2.840.113556.1.4.619' - Lazy commit for performance
EControl.SORT        // '1.2.840.113556.1.4.473' - Sort search results
```

#### getControl(type: EControl): Control

Create LDAP control object from enum value.

```typescript
import { getControl, EControl } from 'af-ad-ts';

// Create control for showing deleted objects
const deletedControl = getControl(EControl.DELETED);

// Use in search options
const searchOptions = {
  filter: '(objectCategory=user)',
  controls: [deletedControl]
};
```

### Constants

#### DEFAULT_ATTRIBUTES

Default attributes for users and groups.

```typescript
DEFAULT_ATTRIBUTES.user  // ['dn', 'distinguishedName', 'userPrincipalName', 'sAMAccountName', 'mail', 'lockoutTime', 'whenCreated', 'pwdLastSet', 'userAccountControl', 'employeeID', 'sn', 'givenName', 'initials', 'cn', 'displayName', 'comment', 'description']
DEFAULT_ATTRIBUTES.group // ['dn', 'cn', 'description', 'distinguishedName', 'objectCategory']
```

#### DEFAULT_REFERRALS

Default referral settings.

```typescript
DEFAULT_REFERRALS // { enabled: false, exclude: ['ForestDnsZones', 'DomainDnsZones', 'Configuration'] }
```

### Models

#### IUser and newUser()

User interface and constructor function.

```typescript
import { IUser, newUser } from 'af-ad-ts';

// Create new user object
const user = newUser({
  cn: 'John Doe',
  sAMAccountName: 'john.doe',
  mail: 'john.doe@company.com'
});

// User properties include:
// - cn: Common Name
// - sAMAccountName: Pre-Windows 2000 logon name
// - mail: Email address
// - displayName: Display name
// - distinguishedName: Full distinguished name
// - userAccountControl: Account control flags
// - groups: Array of group memberships
// - isMemberOf(dn): Method to check group membership
```

#### IGroup and newGroup()

Group interface and constructor function.

```typescript
import { IGroup, newGroup } from 'af-ad-ts';

// Create new group object
const group = newGroup(searchEntry);

// Group properties include:
// - idn: Internal distinguished name
// - cn: Common Name
// - distinguishedName: Full distinguished name
// - [other attributes]: Any LDAP attributes as properties
```

### Types

#### IUserInfoShort

Short user information format:
```typescript
interface IUserInfoShort {
  sAMAccountName: string;        // User login (jpupkin)
  displayName: string;           // Full name (Pupkin John Batone)
  mail: string | undefined;      // Email (jpupkin@company.com)
  enabled: boolean;              // Account status
  userPrincipalName?: string;    // UPN (jpupkin@company.com)
  userAccountControl?: string;   // Account control flags
  domain: string;                // Domain name
}
```

#### IUserInfoFull

Full user information format (extends IUserInfoShort):
```typescript
interface IUserInfoFull extends IUserInfoShort {
  dn: string;                    // Full distinguished name
  userPrincipalName: string;     // User Principal Name
  homeDrive?: string;           // Home drive letter
  profilePath?: string;         // Roaming profile path
  givenName: string;            // First name
  sn: string;                   // Last name
  middleName: string;          // Middle name (required)
  employeeId: string;          // Employee ID (required)
  lastLogon: string | number | null; // Last logon timestamp
  memberOf: any[];              // Group memberships
  workPhone: string;           // Work phone (required)
  telephoneNumber: string;     // Telephone number (required)
  company: string;             // Company name (required)
  mobile: string;              // Mobile phone (required)
  name: string;                 // Full name
  description: string;         // Description (required)
  thumbnailPhoto: string;      // Photo data (required)
  photo: string;               // Alternative photo (required)
  jpegPhoto: string;           // JPEG photo (required)
}
```

#### IPlainGroupInfo

Plain group information format:
```typescript
interface IPlainGroupInfo {
  cn: string;                    // Common name
  distinguishedName: string;     // Full distinguished name
  description?: string;          // Group description
  sAMAccountName?: string;       // Pre-Windows 2000 name
  groupType?: string;            // Group type
}
```

#### ITreeGroupInfo

Hierarchical group information format (extends IPlainGroupInfo):
```typescript
interface ITreeGroupInfo extends IPlainGroupInfo {
  members: ITreeGroupInfo[];     // Nested group members
}
```

## Configuration

### IAdOptions

Main configuration interface for Active Directory operations:

```typescript
interface IAdOptions {
  /** Base Distinguished Name for all search operations */
  baseDN: string;

  /** LDAP client connection options */
  clientOptions: {
    /** LDAP server URL(s) - supports multiple for failover */
    url: string;

    /** Bind DN - username in any AD format: 'user', 'user@domain.com', 'domain\user', 'cn=user,ou=users,dc=root' */
    bindDN: string;

    /** Password for the bind DN */
    bindCredentials: string;

    /** Custom logger instance */
    log?: IAbstractLogger;
  };

  /** Extended search options */
  searchOptions: ISearchOptionsEx;

  /** LDAP controls for advanced operations */
  controls?: Control[];

  /** Include deleted objects in search results (requires special permissions) */
  includeDeleted?: boolean;

  /** Referral chasing configuration */
  defaultReferrals?: DefaultReferrals;

  /** Pre-processing function for search entries */
  preEntryParser?: (searchEntry: SearchEntryEx) => SearchEntryEx;

  /** Post-processing function for search entries */
  postEntryParser?: TEntryParser;
}
```

### ISearchOptionsEx

Extended search options interface:

```typescript
interface ISearchOptionsEx {
  /** LDAP search filter */
  filter?: string | Filter;

  /** Search scope: 'base' (single entry), 'one' (one level), 'sub' (subtree) */
  scope?: 'base' | 'one' | 'sub';

  /** Attributes to return:
    - Empty array: use default attributes
    - 'all' or '*': return all attributes
    - Specific array: return only specified attributes
  */
  attributes?: string[] | undefined;

  /** Pagination configuration for large result sets */
  paged?: {
    pageSize: number; // Number of entries per page
  };

  /** Include membership information:
    - Empty: no membership
    - 'all': include all group memberships
    - Specific array: include only specified attributes
  */
  includeMembership?: string[] | null;

  /** Alternative filter property */
  f?: string | Filter;
}
```

### DefaultReferrals

Configuration for LDAP referral chasing:

```typescript
interface DefaultReferrals {
  /** Whether to chase referrals. Default: false */
  enabled?: boolean;

  /** Array of regular expressions to match for referral exclusion */
  exclude?: string[];
}
```

### IGroupCheckerConfig

Configuration for GroupChecker class:

```typescript
interface IGroupCheckerConfig {
  /** LDAP server URL */
  url: string;

  /** Bind DN for authentication */
  bindDN: string;

  /** Password for authentication */
  bindPassword: string;

  /** Base DN for searches */
  baseDn: string;

  /** Cache TTL in milliseconds (default: 10 minutes) */
  cacheTtlMs?: number;

  /** DN cache TTL in milliseconds (default: 24 hours) */
  dnCacheTtlMs?: number;
}
```

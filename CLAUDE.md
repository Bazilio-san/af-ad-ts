# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**af-ad-ts** is a TypeScript library for Active Directory/LDAP operations. It provides a high-level API for searching users, groups, and handling AD-specific features like ranged attribute retrieval, referral chasing, and deleted object queries.

The library is built on top of `ldapjs` and `ldapts` and focuses on Active Directory-specific functionality with intelligent defaults and handling of AD quirks.

## Development Commands

```bash
# Clean build artifacts
npm run clean

# Build all targets (CJS, ESM, and types)
npm run build

# Quick clean + build
npm run cb

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run tests
npm run test
```

## Build System

The project uses TypeScript with multiple build targets:
- **CJS**: `./dist/cjs/src/` - CommonJS modules
- **ESM**: `./dist/esm/src/` - ES modules
- **Types**: `./dist/types/src/` - TypeScript declarations

Build configuration files:
- `tsconfig.json` - Main TypeScript config (CJS)
- `tsconfig.esm.json` - ES modules build
- `tsconfig.types.json` - Type declarations

## Testing

- **Framework**: Jest with ts-jest
- **Test files**: `__tests__/**/*.spec.ts`
- **Timeout**: 100 seconds (for LDAP operations)
- **Custom sequencer**: Uses custom test sequencer in `__tests__/setup/test-sequencer.js`
- **Setup/Teardown**: Global setup and teardown files for test environment

Run a single test file:
```bash
npx jest __tests__/find-users.spec.ts
```

## Architecture

### Core Components

**Searcher Class** (`src/main/Searcher.ts`):
- Main search engine for LDAP operations
- Handles pagination, referrals, and ranged attribute retrieval
- Supports both callback and promise-based APIs via `asyncSearcher`

**RangeAttributesParser** (`src/main/RangeAttributesParser.ts`):
- Handles AD's ranged attribute responses (e.g., `member;range=0-1499`)
- Automatically fetches additional pages for large multi-valued attributes

**LdapSearchResult** (`src/main/LdapSearchResult.ts`):
- Wrapper for search results with enhanced functionality

**Entry Parsers** (`src/main/default-enry-parser.ts`):
- Pre/post processing hooks for search entries
- Converts LDAP attributes to JavaScript objects

### Key Features

1. **Ranged Attribute Handling**: Automatically handles AD's limitation on multi-valued attributes
2. **Referral Chasing**: Follows LDAP referrals when enabled (disabled by default)
3. **Deleted Object Queries**: Support for querying deleted AD objects
4. **Paging**: Built-in support for paged results (default page size: 1000)
5. **User/Group Models**: Typed interfaces for AD user and group objects

### Directory Structure

```
src/
├── @type/           # TypeScript interfaces and type definitions
├── main/            # Core functionality (Searcher, parsers, utilities)
├── models/          # Data models (user, group)
├── lib/             # Utility libraries (logger, attributes, utilities)
├── constants.ts     # Default configurations and constants
└── index.ts         # Main export file
```

### Dependencies

**Runtime**:
- `ldapjs` & `ldapts` - LDAP client libraries
- `async` - Control flow utilities
- `af-color` - Terminal colors (internal library)
- `af-tools-ts` - Utility functions (internal library)
- `merge-options` - Option merging

**Development**:
- `jest` + `ts-jest` - Testing framework
- `typescript` - TypeScript compiler
- `eslint` + `eslint-config-af-24` - Linting (custom config)

## Configuration

### Default Attributes

The library defines sensible defaults for user and group queries:

**User attributes**: `dn`, `distinguishedName`, `userPrincipalName`, `sAMAccountName`, `mail`, `lockoutTime`, `whenCreated`, `pwdLastSet`, `userAccountControl`, `employeeID`, `sn`, `givenName`, `initials`, `cn`, `displayName`, `comment`, `description`

**Group attributes**: `dn`, `cn`, `description`, `distinguishedName`, `objectCategory`

### Referrals

Referrals are **disabled by default** with exclusion patterns for common AD partitions:
- ForestDnsZones
- DomainDnsZones
- Configuration partition

## Key APIs

### Main Search Interface
- `Searcher` class - Core search functionality
- `asyncSearcher()` - Promise-based wrapper
- `findUsers()` / `findUser()` - High-level user search functions

### Utility Functions
- `getUserInfoByDomainLogin()` - Get user by domain login
- `getGroupMembersForDN()` - Get group members
- `getThumbnailPhoto()` - Retrieve user photos
- `suggest()` - Search suggestions

## Important Notes

- The library is specifically designed for Active Directory, not generic LDAP
- Paging is enabled by default with 1000 item pages
- Range attribute processing is automatic and transparent
- Deleted object queries require special permissions in AD
- The library handles AD's quirks like DN case sensitivity and attribute encoding

## VERY Important Notes !!!!!!!!!!!!!!
Write the code as briefly as possible.
Don't need any bitch emojis!
Don't do what you don't ask!
Don't have to be backwards compatible if you're not asked!
USE DRY & KISS

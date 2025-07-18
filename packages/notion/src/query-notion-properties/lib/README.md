# SQL-to-Notion Parser Library

## Overview

A comprehensive TypeScript library that provides SQL-like query language support for Notion databases. This library converts familiar SQL syntax into Notion API calls while preserving all Notion-specific functionality and data types.

> **📚 For detailed documentation on SQL syntax, property types, and operations, see the comprehensive guides in [`<project-root>/docs/`](../../../../../docs/)**

## Dependencies

### Required NPM Packages

```bash
npm install @notionhq/client # Official Notion SDK
npm install node-sql-parser # SQL AST generation
npm install zod # Runtime type validation
```

### Development Dependencies

```bash
npm install --save-dev vitest typescript @types/node
```

## Architecture & File Structure

```
packages/notion/src/
├── lib/ # Shared Notion functionality
│ ├── notion-client.ts # Notion API client wrapper (@notionhq/client)
│ ├── authentication.ts # Auth handling
│ ├── request-formatter.ts # JSON request formatting
│ └── api-types.ts # Extended Notion API types
│
└── query-notion-properties/lib/ # SQL Parser Library
 ├── index.ts # Main entry point & exports
 ├── parser/ # Core parsing logic
 │ ├── index.ts # Main parser class
 │ ├── index.test.ts # Parser tests
 │ ├── preprocessor.ts # SQL preprocessing (UNDELETE, etc.)
 │ ├── preprocessor.test.ts # Preprocessor tests
 │ ├── ast-converter.ts # AST to Notion conversion
 │ ├── ast-converter.test.ts # AST converter tests
 │ ├── validator.ts # SQL validation & error handling
 │ └── validator.test.ts # Validator tests
 ├── operations/ # Operation-specific handlers
 │ ├── select.ts # SELECT operation logic
 │ ├── select.test.ts # SELECT tests
 │ ├── insert.ts # INSERT operation logic
 │ ├── insert.test.ts # INSERT tests
 │ ├── update.ts # UPDATE operation logic
 │ ├── update.test.ts # UPDATE tests
 │ ├── delete.ts # DELETE/UNDELETE operations
 │ ├── delete.test.ts # DELETE tests
 │ ├── describe.ts # DESCRIBE operations
 │ └── describe.test.ts # DESCRIBE tests
 ├── types/ # Type definitions
 │ ├── ast.ts # AST type definitions
 │ ├── operations.ts # Operation-specific types
 │ └── index.ts # Consolidated type exports
 ├── converters/ # Data conversion utilities
 │ ├── property-types.ts # Property type conversions
 │ ├── property-types.test.ts # Property conversion tests
 │ ├── filters.ts # WHERE clause to Notion filters
 │ ├── filters.test.ts # Filter conversion tests
 │ ├── values.ts # Value format conversions
 │ ├── values.test.ts # Value conversion tests
 │ ├── response.ts # Response format simplification
 │ └── response.test.ts # Response conversion tests
 ├── functions/ # Notion-specific functions
 │ ├── date-functions.ts # NEXT_WEEK(), PAST_MONTH()
 │ ├── date-functions.test.ts # Date function tests
 │ ├── rollup-functions.ts # ROLLUP_ANY(), ROLLUP_ALL()
 │ ├── rollup-functions.test.ts # Rollup function tests
 │ ├── utility-functions.ts # CURRENT_USER(), etc.
 │ └── utility-functions.test.ts # Utility function tests
 └── utils/ # Utility functions
 ├── error-handling.ts # Error formatting & handling
 ├── error-handling.test.ts # Error handling tests
 ├── validation.ts # Input validation helpers
 ├── validation.test.ts # Validation tests
 ├── constants.ts # Constants & mappings
 └── constants.test.ts # Constants tests
```

## Documentation References

For comprehensive details on SQL syntax and transformations, consult these documentation files:

- **[`/docs/README.md`](../../../../../docs/README.md)** - Overview and quick start
- **[`/docs/datatypes.md`](../../../../../docs/datatypes.md)** - Complete property type mappings
- **[`/docs/filter-where.md`](../../../../../docs/filter-where.md)** - WHERE clause syntax and operations
- **[`/docs/query-language-sql-select.md`](../../../../../docs/query-language-sql-select.md)** - SELECT operations
- **[`/docs/query-language-sql-insert.md`](../../../../../docs/query-language-sql-insert.md)** - INSERT operations
- **[`/docs/query-language-sql-update.md`](../../../../../docs/query-language-sql-update.md)** - UPDATE operations
- **[`/docs/query-language-sql-delete.md`](../../../../../docs/query-language-sql-delete.md)** - DELETE/UNDELETE operations
- **[`/docs/query-language-sql-describe.md`](../../../../../docs/query-language-sql-describe.md)** - DESCRIBE operations
- **[`/docs/response-format.md`](../../../../../docs/response-format.md)** - Response format specifications
- **[`/docs/sorting.md`](../../../../../docs/sorting.md)** - ORDER BY syntax
- **[`/docs/sql-parser-extensions.md`](../../../../../docs/sql-parser-extensions.md)** - Custom SQL extensions

## Implementation Plan

### Phase 1: Core Foundation

#### Step 1.1: Base Type Definitions

- **Files**: `types/index.ts`, `types/ast.ts`, `types/notion.ts`, `types/operations.ts`
- **Purpose**: Define TypeScript interfaces extending official Notion types
- **Content**:
- Import and extend types from `@notionhq/client`
- AST structures, operation parameters
- Custom SQL extension types
- **Tests**: Type validation and compilation tests

#### Step 1.2: Constants and Utilities

- **Files**: `utils/constants.ts`, `utils/error-handling.ts`, `utils/validation.ts`
- **Purpose**: Shared constants, error handling, and validation helpers
- **Content**:
- Property type mappings (use official Notion property types)
- Error classes extending Notion API errors
- Validation functions with official type constraints
- **Tests**: Error scenarios, validation edge cases

### Phase 2: Notion API Integration

#### Step 2.1: Official Notion Client Wrapper

- **File**: `../lib/notion-client.ts`
- **Purpose**: Wrapper around `@notionhq/client` with additional functionality
- **Content**:
- Import `Client` from `@notionhq/client`
- Rate limiting, retry logic, error handling
- Type-safe method wrappers
- **Tests**: Client initialization, error handling, rate limiting

#### Step 2.2: Authentication & Request Formatting

- **Files**: `../lib/authentication.ts`, `../lib/request-formatter.ts`
- **Purpose**: Handle auth and format requests using official types
- **Content**:
- Use official Notion auth types
- Request/response formatting with official interfaces
- Type-safe parameter validation
- **Tests**: Auth scenarios, request formatting validation

### Phase 3: SQL Parsing Foundation

#### Step 3.1: SQL Preprocessor

- **File**: `parser/preprocessor.ts`
- **Purpose**: Handle custom SQL extensions (UNDELETE, ARCHIVED, etc.)
- **Content**:
- Convert UNDELETE → UPDATE operations
- Handle Notion-specific functions (see `/docs/sql-parser-extensions.md`)
- Process custom syntax extensions
- **Tests**: All custom SQL extensions, edge cases, error conditions

#### Step 3.2: Main Parser Class

- **File**: `parser/index.ts`
- **Purpose**: Core SQL parsing using node-sql-parser
- **Content**:
- Main parser class with official Notion type integration
- SQL validation, AST generation
- Integration with `@notionhq/client` types
- **Tests**: Valid SQL parsing, invalid SQL handling, comprehensive syntax tests

#### Step 3.3: AST Converter

- **File**: `parser/ast-converter.ts`
- **Purpose**: Convert SQL AST to official Notion API format
- **Content**:
- AST traversal with official type mapping
- Generate requests using `@notionhq/client` interfaces
- Type-safe Notion API structure generation
- **Tests**: All SQL operations, complex queries, nested conditions

### Phase 4: Data Conversion Layer

#### Step 4.1: Property Type Converters

- **File**: `converters/property-types.ts`
- **Purpose**: Bidirectional conversion using official Notion property types
- **Content**:
- Import property types from `@notionhq/client`
- All 20+ Notion property types (see `/docs/datatypes.md`)
- Type inference with official type constraints
- **Tests**: Every property type, edge cases, invalid conversions

#### Step 4.2: Filter Converters

- **File**: `converters/filters.ts`
- **Purpose**: Convert WHERE clauses to official Notion filter objects
- **Content**:
- Use official filter types from `@notionhq/client`
- All comparison operators (see `/docs/filter-where.md`)
- Logical operators, Notion-specific filters
- **Tests**: Complex WHERE clauses, nested conditions, operator combinations

#### Step 4.3: Value Converters

- **File**: `converters/values.ts`
- **Purpose**: Format values using official Notion value types
- **Content**:
- Date formatting with official date types
- Collection handling with official array types
- Special value processing (user IDs, page IDs)
- **Tests**: All data types, format validation, boundary conditions

#### Step 4.4: Response Simplification

- **File**: `converters/response.ts`
- **Purpose**: Convert official Notion responses to simplified SQL-like format
- **Content**:
- Process official `QueryDatabaseResponse` types
- Property extraction and flattening (see `/docs/response-format.md`)
- Metadata handling with official system properties
- **Tests**: All response types, empty responses, error responses

### Phase 5: Operation Handlers

#### Step 5.1: SELECT Operations

- **File**: `operations/select.ts`
- **Purpose**: Handle SELECT queries using official database query methods
- **Content**:
- Use `client.databases.query()` from `@notionhq/client`
- Query execution, result processing, pagination
- Official pagination cursor handling
- **Tests**: Simple queries, complex filters, sorting, pagination edge cases

#### Step 5.2: INSERT Operations

- **File**: `operations/insert.ts`
- **Purpose**: Handle INSERT operations using official page creation
- **Content**:
- Use `client.pages.create()` from `@notionhq/client`
- Property mapping with official property types
- Batch operations, validation
- **Tests**: Single inserts, batch inserts, validation failures, property types

#### Step 5.3: UPDATE Operations

- **File**: `operations/update.ts`
- **Purpose**: Handle UPDATE operations using official page update methods
- **Content**:
- Use `client.pages.update()` from `@notionhq/client`
- Property updates with official types
- Collection operations (add/remove), conditional updates
- **Tests**: Property updates, collection math, conditional logic, batch updates

#### Step 5.4: DELETE/UNDELETE Operations

- **File**: `operations/delete.ts`
- **Purpose**: Handle DELETE (archive) and UNDELETE (restore) operations
- **Content**:
- Use official archive/restore functionality
- Archive/restore logic, safety checks, batch operations
- Official `archived` property handling
- **Tests**: Archive operations, restore operations, safety validations

#### Step 5.5: DESCRIBE Operations

- **File**: `operations/describe.ts`
- **Purpose**: Handle DESCRIBE operations for schema introspection
- **Content**:
- Use `client.databases.retrieve()` from `@notionhq/client`
- Database schema extraction with official database types
- Property metadata, relationship mapping
- **Tests**: Schema extraction, metadata validation, error handling

### Phase 6: Notion-Specific Functions

#### Step 6.1: Date Functions

- **File**: `functions/date-functions.ts`
- **Purpose**: Implement NEXT_WEEK(), PAST_MONTH(), THIS_WEEK(), etc.
- **Content**:
- Use official date filter types from `@notionhq/client`
- Date range calculations, relative date functions
- Integration with official date property handling
- **Tests**: All date functions, timezone handling, edge cases

#### Step 6.2: Rollup Functions

- **File**: `functions/rollup-functions.ts`
- **Purpose**: Implement ROLLUP_ANY(), ROLLUP_ALL(), ROLLUP_NONE()
- **Content**:
- Use official rollup property types
- Rollup condition processing, nested query handling
- Integration with official relation types
- **Tests**: All rollup functions, complex conditions, performance tests

#### Step 6.3: Utility Functions

- **File**: `functions/utility-functions.ts`
- **Purpose**: Implement CURRENT_USER(), NOW(), etc.
- **Content**:
- Use official user types from `@notionhq/client`
- User context, system functions, utility operations
- Integration with official authentication
- **Tests**: User functions, system state, context handling

### Phase 7: Integration and Main Entry Point

#### Step 7.1: Main Library Entry

- **File**: `index.ts`
- **Purpose**: Main library exports and public API
- **Content**:
- Class exports with official Notion client integration
- Type exports extending official types
- Utility exports with type safety
- **Tests**: Public API integration, end-to-end functionality

## Key Features to Implement

### 1. SQL Operations Support (See `/docs/` for detailed syntax)

- **SELECT**: Querying with filtering, sorting, pagination
- **INSERT**: Creating pages with property validation
- **UPDATE**: Modifying pages with collection operations
- **DELETE**: Archiving pages (Notion doesn't support permanent deletion)
- **UNDELETE**: Restoring archived pages
- **DESCRIBE**: Schema introspection and metadata

### 2. Property Type Support (20+ Types - See `/docs/datatypes.md`)

- **Basic**: Title, Rich Text, Number, Checkbox, Date, URL, Email, Phone
- **Collections**: Select, Multi-select, People, Relations, Files
- **Computed**: Formula, Rollup, Unique ID
- **System**: Created Time, Last Edited Time, Archived
- **Special**: Status (workflow)

### 3. Advanced SQL Features (See `/docs/filter-where.md`)

- **Collection Math**: `Tags = Tags + ['new']`, `Team = Team - ['former']`
- **Date Functions**: `NEXT_WEEK()`, `PAST_MONTH()`, `THIS_WEEK()`
- **Rollup Queries**: `ROLLUP_ANY(condition)`, `ROLLUP_ALL(condition)`
- **User Functions**: `CURRENT_USER()`, `NOW()`
- **Text Operations**: `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`

### 4. Response Format Simplification (See `/docs/response-format.md`)

- Convert verbose Notion responses to clean SQL-like JSON
- Property flattening: `{"Name": "Task 1", "Priority": 5}`
- Array simplification: `{"Tags": ["urgent", "frontend"]}`
- Date normalization: ISO 8601 format

## Technical Specifications

### Dependencies

- **@notionhq/client**: Official Notion SDK with complete type definitions
- **node-sql-parser**: SQL AST generation
- **zod**: Runtime type validation
- **TypeScript**: Type safety (ES2022, Node 16+)
- **Vitest**: Testing framework

### Architecture Principles

- **Official Types First**: Use `@notionhq/client` types wherever possible
- **Modular Design**: Each file ≤200 lines, single responsibility
- **Type Safety**: Strict TypeScript, no `any`, prefer `unknown`
- **Test Coverage**: Side-by-side tests with comprehensive coverage
- **Error Handling**: User-friendly error messages with detailed debugging info
- **Performance**: Efficient parsing, caching where appropriate

### Error Handling Strategy

- **SQL Parsing Errors**: Invalid syntax, unsupported operations
- **Type Validation Errors**: Property type mismatches, invalid values
- **Notion API Errors**: Use official error types from `@notionhq/client`
- **Business Logic Errors**: Read-only property updates, missing required fields

## Usage Examples

### Basic Setup

```typescript
import { Client } from '@notionhq/client'
import { NotionSQLParser } from './packages/notion/src/query-notion-properties/lib'

const notionClient = new Client({
  auth: 'your-notion-token',
})

const parser = new NotionSQLParser({
  client: notionClient,
})
```

### Basic Query (See `/docs/query-language-sql-select.md`)

```typescript
// Simple SELECT
const result = await parser.query(`
 SELECT Name, Priority, Status
 FROM "database-id"
 WHERE Priority >= 3
 ORDER BY Priority DESC
`)

console.log(result.results) // Clean, simplified JSON
```

### Complex Operations (See respective `/docs/` files)

```typescript
// INSERT with collections (see /docs/query-language-sql-insert.md)
await parser.query(`
 INSERT INTO "tasks-db" (Name, Tags, Assignee, "Due Date")
 VALUES ('New Task', ['urgent', 'frontend'], ['@john@company.com'], '2023-12-15')
`)

// UPDATE with collection math (see /docs/query-language-sql-update.md)
await parser.query(`
 UPDATE "projects-db"
 SET Tags = Tags + ['priority'], Team = Team - ['@former@company.com']
 WHERE Status = 'Active'
`)

// Complex filtering with Notion functions (see /docs/filter-where.md)
await parser.query(`
 SELECT * FROM "tasks-db"
 WHERE "Due Date" IN NEXT_WEEK()
 AND Projects ROLLUP_ANY(Status = 'Active')
 AND Assignee CONTAINS CURRENT_USER()
`)
```

## Testing Strategy

### Test Categories

- **Unit Tests**: Individual function testing with mocks of `@notionhq/client`
- **Integration Tests**: End-to-end SQL → Notion API conversion
- **Edge Case Tests**: Boundary conditions, error scenarios
- **Performance Tests**: Large datasets, complex queries
- **Type Safety Tests**: TypeScript compilation validation with official types

### Test Coverage Requirements

- **Business Logic**: 100% coverage of all parser and converter functions
- **Error Handling**: All error scenarios including official Notion API errors
- **Property Types**: Every Notion property type with all operations
- **SQL Operations**: All supported SQL operations with complex examples
- **Official API Integration**: Mock all `@notionhq/client` methods

## Development Workflow

1. **Setup**: Install `@notionhq/client` and import official types
2. **Implementation**: Create source file extending official Notion types
3. **Testing**: Create side-by-side `.test.ts` file with mocked Notion client
4. **Validation**: Run `npm test` and `npm run typecheck`
5. **Integration**: Update main `index.ts` exports with type safety
6. **Documentation**: Reference appropriate `/docs/` files for detailed syntax

This modular, well-tested approach ensures a robust, maintainable SQL-to-Notion parser that leverages the official Notion SDK while following MCP development guidelines and providing comprehensive SQL functionality for Notion databases.

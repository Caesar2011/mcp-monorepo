# Type System Fixing - Iteration 1

Based on the TypeScript errors, we have 74 errors across 13 files. Here's the breakdown into manageable work packages:

## Work Package 1: AST Type Foundation Fix

**Priority: CRITICAL** - Blocks other fixes

**Errors:** 1 error in `types/ast.ts:9`

- `NotionSQLAST extends BaseSQLAST` - BaseSQLAST doesn't exist

**Knowledge Needed:**

- `node-sql-parser` AST structure and types
- How `node-sql-parser` defines its base AST interface

**Files to Update:**

- `src/query-notion-properties/lib/types/ast.ts`

**Files to Consult:**

- `node_modules/node-sql-parser/types/` (if exists) or documentation
- Look at actual `node-sql-parser` usage in `parser/index.ts`

**Description:** The fundamental AST type is broken. Need to either define `BaseSQLAST` properly or remove the extends clause and redefine the interface to match what `node-sql-parser` actually returns.

---

## Work Package 2: Notion API Type Alignment

**Priority: HIGH** - Many errors stem from this

**Errors:** 16 errors across converters and operations

- Missing 'link' property in RichTextItemResponse (property-types.ts:222, 235)
- Missing 'object' property in PropertyItemObjectResponse (response.ts:74)
- Property access issues with dynamic types (response.ts:270, 276, 285)
- Database response type mismatches (describe.ts:47, 57, 500)
- RichTextItemResponse property access (property-types.ts:381, 389)

**Knowledge Needed:**

- Complete `@notionhq/client` type definitions
- Current version of @notionhq/client being used
- Exact structure of PropertyItemObjectResponse, RichTextItemResponse, DatabaseObjectResponse

**Files to Update:**

- `src/query-notion-properties/lib/converters/property-types.ts`
- `src/query-notion-properties/lib/converters/response.ts`
- `src/query-notion-properties/lib/operations/describe.ts`
- `src/query-notion-properties/lib/types/notion.ts`

**Files to Consult:**

- `node_modules/@notionhq/client/build/src/api-endpoints.d.ts`
- `@notionhq/client` documentation

**Description:** Our custom types don't align with official @notionhq/client types. Need to either extend official types properly or adjust our implementations to match the actual API structure.

---

## Work Package 3: Filter and WHERE Clause Type System

**Priority: HIGH** - Affects all query operations

**Errors:** 18 errors across filters, operations

- `WhereClause` vs `NotionFilter` type conflicts
- `convertWhereClauseToNotionFilter` parameter/return type mismatches
- Filter assignment to official Notion API parameters

**Knowledge Needed:**

- Official Notion API filter structure from @notionhq/client
- How node-sql-parser represents WHERE clauses
- Difference between our WhereClause and what we should use

**Files to Update:**

- `src/query-notion-properties/lib/converters/filters.ts`
- `src/query-notion-properties/lib/operations/select.ts`
- `src/query-notion-properties/lib/operations/update.ts`
- `src/query-notion-properties/lib/operations/delete.ts`
- `src/query-notion-properties/lib/types/ast.ts`
- `src/query-notion-properties/lib/types/notion.ts`

**Files to Consult:**

- `node_modules/@notionhq/client/build/src/api-endpoints.d.ts` (QueryDatabaseParameters.filter type)
- `node_modules/node-sql-parser/` types for WHERE clause structure

**Description:** The WHERE clause conversion system has fundamental type mismatches. Need to align our filter types with both node-sql-parser input and @notionhq/client output.

---

## Work Package 4: Validation and Error Type System

**Priority: MEDIUM** - Affects error handling

**Errors:** 8 errors in parser and main-parser

- `ValidationResult` expects `ValidationError[]` but gets `string[]`
- Error/warning types throughout validation system

**Knowledge Needed:**

- What ValidationError and ValidationWarning should actually be
- Whether they should be simple strings or complex objects

**Files to Update:**

- `src/query-notion-properties/lib/types/ast.ts`
- `src/query-notion-properties/lib/parser/index.ts`
- `src/query-notion-properties/lib/main-parser.ts`
- `src/query-notion-properties/lib/utils/error-handling.ts`

**Files to Consult:**

- `src/query-notion-properties/lib/utils/error-handling.ts`
- Look at how validation is used throughout the codebase

**Description:** The validation system has inconsistent error types. Need to decide if ValidationError should be a string or a structured object and update accordingly.

---

## Work Package 5: Operation Context and Interface Types

**Priority: MEDIUM** - Affects operation execution

**Errors:** 6 errors in main-parser

- Missing 'permissions' property in QueryContext
- Context objects don't match expected interfaces

**Knowledge Needed:**

- What QueryContext should actually contain
- What permissions system we need (if any)

**Files to Update:**

- `src/query-notion-properties/lib/types/operations.ts`
- `src/query-notion-properties/lib/main-parser.ts`
- All operation handlers

**Files to Consult:**

- `src/query-notion-properties/lib/types/operations.ts`
- Look at how QueryContext is used in operation handlers

**Description:** QueryContext interface doesn't match what's being passed. Need to either add missing properties or make them optional.

---

## Work Package 6: Property Value Type System

**Priority: MEDIUM** - Affects data conversion

**Errors:** 5 errors in converters and operations

- `SimplifiedPropertyValue` array type issues
- Collection operation return types
- Value conversion type mismatches

**Knowledge Needed:**

- What SimplifiedPropertyValue should actually represent
- How arrays and null values should be handled

**Files to Update:**

- `src/query-notion-properties/lib/types/index.ts`
- `src/query-notion-properties/lib/converters/values.ts`
- `src/query-notion-properties/lib/converters/property-types.ts`
- `src/query-notion-properties/lib/operations/update.ts`

**Files to Consult:**

- `docs/datatypes.md`
- `docs/response-format.md`
- Look at how SimplifiedPropertyValue is used throughout

**Description:** The SimplifiedPropertyValue type system has issues with arrays and null handling. Need to clarify the type definition and fix conversion functions.

---

## Work Package 7: SQL Response Union Type System

**Priority: MEDIUM** - Affects API usability

**Errors:** 4 errors in main-parser

- `SQLResponse<T>` union type issues
- Error property access on success results
- Type casting issues

**Knowledge Needed:**

- How union types should be handled in TypeScript
- Whether we need type guards for SQLResponse

**Files to Update:**

- `src/query-notion-properties/lib/types/index.ts`
- `src/query-notion-properties/lib/main-parser.ts`
- `src/query-notion-properties/lib/types/operations.ts`

**Files to Consult:**

- Look at how SQLResponse is used throughout the codebase
- TypeScript union type best practices

**Description:** The SQLResponse union type (success | error) causes property access issues. Need to add proper type guards or restructure the response system.

---

## Work Package 8: Utility Function Type Fixes

**Priority: LOW** - Specific function issues

**Errors:** 3 errors in utility-functions

- User context optional property handling
- Function result type issues

**Knowledge Needed:**

- How optional properties should be handled in user context
- What FunctionResult should represent

**Files to Update:**

- `src/query-notion-properties/lib/functions/utility-functions.ts`
- `src/query-notion-properties/lib/types/index.ts`

**Files to Consult:**

- Look at how UserContext is used
- Function usage examples

**Description:** Minor type issues in utility functions, mostly around optional property handling.

---

## Work Package 9: Operation Handler Type Alignment

**Priority: MEDIUM** - Affects core operations

**Errors:** 8 errors across operation handlers

- AST property type mismatches
- Sort/OrderBy type issues
- Value clause type problems

**Knowledge Needed:**

- What node-sql-parser actually returns for different AST nodes
- How OrderByClause relates to NotionSort

**Files to Update:**

- `src/query-notion-properties/lib/operations/select.ts`
- `src/query-notion-properties/lib/operations/insert.ts`
- `src/query-notion-properties/lib/types/ast.ts`

**Files to Consult:**

- `node-sql-parser` documentation
- Look at actual AST structure from parser

**Description:** Operation handlers expect different AST structures than what's defined in types. Need to align with actual node-sql-parser output.

---

## Work Package 10: Missing Property and Method Fixes

**Priority: LOW** - Minor property issues

**Errors:** 3 errors

- Missing 'sql' property on NotionSQLAST
- Delete operator on non-optional property
- Implicit any types

**Knowledge Needed:**

- Whether sql property should be part of AST or handled separately
- TypeScript strict mode requirements

**Files to Update:**

- `src/query-notion-properties/lib/main-parser.ts`
- `src/query-notion-properties/lib/converters/response.ts`
- `src/query-notion-properties/lib/types/ast.ts`

**Files to Consult:**

- Look at how sql property is used
- TypeScript configuration

**Description:** Minor property and method issues that are relatively easy to fix once the major type systems are sorted out.

---

## Recommended Order:

1. **Work Package 1** (AST Foundation) - Critical blocker
2. **Work Package 2** (Notion API Alignment) - Major impact
3. **Work Package 3** (Filter System) - Major impact
4. **Work Package 4** (Validation System) - Medium impact
5. **Work Package 5** (Operation Context) - Medium impact
6. **Work Package 6** (Property Value System) - Medium impact
7. **Work Package 9** (Operation Handlers) - Medium impact
8. **Work Package 7** (Response Types) - Medium impact
9. **Work Package 8** (Utility Functions) - Low impact
10. **Work Package 10** (Minor Fixes) - Low impact

## Next Steps:

Please provide the missing knowledge for Work Package 1 (node-sql-parser AST structure) so we can start with the critical foundation fixes.

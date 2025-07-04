# Electron Development Guidelines

## Project Overview

Electron application with TypeScript and React, featuring a modular architecture with separation between main and renderer processes. Key features include persistent data storage, IPC communication, and strong typing.

## Technology Stack

- **Electron/Electron-Vite**: Cross-platform desktop application framework
- **TypeScript**: Type-safe JavaScript development
- **Vitest**: Fast unit testing framework with TypeScript support
- **React**: User interface
- **Electron-Store**: Persistent data storage

## Project Structure

```
src/
├── main/                  # Main process code (Node.js environment)
│   ├── services/          # Business logic implementations
│   ├── utilities/         # Helper functions and utilities
│   └── index.ts           # Main process entry point
├── preload/               # Preload scripts (bridge between main and renderer)
└── renderer/              # Renderer process code (browser environment)
    └── src/
        ├── assets/        # Static assets
        ├── components/    # React components
        ├── hooks/         # Custom React hooks
        ├── App.tsx        # Main React component
        ├── env.d.ts       # Environment type definitions
        └── main.tsx       # Renderer entry point
```

## Typing Conventions

### General Guidelines

- **Use very strict types, never use `any`**
- **Prefer `unknown` over `any` in all cases**
- Use TypeScript interfaces and types to define data structures
- Use generics for reusable components and functions
- Define explicit return types for functions
- Use union types instead of `any` when a variable can have multiple types
- Use type guards to narrow types when necessary

### Specific Patterns

#### Store Schema

Use strongly-typed store schema for type safety when accessing stored data.

#### React Components

- Use arrow function components with FC type
- Define prop types using interfaces
- Prefer the `const XXComponent: FC<Props> = () => {}` syntax

#### React Hooks

- Define explicit return types for custom hooks
- Use generics for reusable hooks

## Architecture Patterns

### Main Process

- **Store Management**: Singleton store manager for persistent data storage

### Renderer Process

- **State Management**: Custom hooks for store data, React state for UI
- **IPC Communication**: Type-safe API for main-renderer communication

## Best Practices

### Error Handling

- Use try/catch for async operations with meaningful error messages
- Handle errors at appropriate levels with user-friendly UI messages

### Performance

- Avoid unnecessary re-renders and clean up subscriptions
- Use memoization and batch updates when appropriate

### Code Organization

- Single responsibility per file with clear naming conventions
- Group related functionality and use index files

### Testing

- Use **Vitest** as the primary testing framework for unit tests
- Unit test critical functionality with comprehensive mocks for dependencies
- Test edge cases and use TypeScript for compile-time checks
- Leverage Vitest's built-in TypeScript support and fast execution

## Areas for Improvement

### Type Safety

- Continue avoiding `any` type, prefer `unknown`
- Use type guards over type assertions
- Consider branded types for enhanced safety

### Code Organization

- Use shared types directory for cross-process interfaces
- Create more shared utilities for common functionality

### Performance

- Implement caching and memoization
- Optimize React component rendering

## After Junie Instructions

- Always run tests after implementing Junie instructions to ensure your changes don't break existing functionality
- Run `npm test` to verify unit tests pass
- Run `npm run typecheck` to verify types are strict enough
- Fix any failing tests before submitting your changes
- Abort if it does not work after two iterations of fixes

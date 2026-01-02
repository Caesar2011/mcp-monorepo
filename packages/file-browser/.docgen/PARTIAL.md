This package provides a comprehensive set of tools for an AI agent to interact with a local file system. It enables operations such as reading, writing, patching, and moving files, as well as creating, listing, and removing directories. For security, all operations are strictly sandboxed within a user-defined working directory.

### Key Features

- **Secure Sandboxing**: All file system access is restricted to the directory specified by the `WORKING_DIR` environment variable, preventing unintended access to other parts of the system.
- **Comprehensive File Operations**: Includes tools for creating, reading, writing, patching, moving, and deleting files and directories.
- **Advanced Search & Replace**: A powerful `find-or-replace` tool that supports multi-line, case-sensitive regular expressions across multiple files.
- **Fuzzy Context Patching**: The `patch-file` tool can intelligently apply changes to a file using approximate line numbers and context matching, making it resilient to minor code shifts.
- **Rich Directory Traversal**: Provides both a flat `list-directory` view and a nested `tree-directory` view, with options for filtering by depth and regular expressions.
- **.gitignore Aware**: Directory traversal tools automatically respect `.gitignore` files, ensuring that ignored files and folders are excluded from results.

This package provides a set of tools to interact with Node.js projects using the `npm` command-line interface. It allows a model to perform common development tasks like installing dependencies, running scripts, and inspecting the project's configuration, all within a specified working directory.

### Key Features

- **Run npm Scripts**: Execute any script defined in `package.json` using the `npm-run` tool, with support for passing arguments.
- **Manage Dependencies**: Use the `npm-install` tool to install all project dependencies or add new packages, including support for development dependencies.
- **Inspect Scripts**: The `list-scripts` tool can read the `package.json` file and return a list of all available npm scripts.
- **Monorepo Support**: All tools include an optional `workspace` parameter, allowing them to target specific packages within a monorepo.
- **Safe Execution**: Commands are executed in isolated child processes within the designated project directory, capturing all output (`stdout`, `stderr`) and the exit code.

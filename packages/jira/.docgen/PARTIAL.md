This package provides a set of tools for interacting with a Jira instance. It allows language models to search, retrieve, and update Jira issues, as well as query project and user information.

### Key Features

- **JQL Search**: Execute complex Jira Query Language (JQL) strings to find specific sets of issues.
- **Issue Management**: Fetch detailed information for a single issue and update its status by transitioning it through its workflow.
- **Discovery**: List available status transitions for an issue and find recently created projects.
- **User Information**: Retrieve the profile details of the currently authenticated user.

### Authentication

Two authentication modes are supported. Exactly one must be configured:

- **Personal Access Token (PAT)**: Set `JIRA_TOKEN` with a valid Jira PAT.
- **Cookie-based authentication**: Set `JIRA_COOKIE` with the raw Cookie header value from an authenticated Jira session.

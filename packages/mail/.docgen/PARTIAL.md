The Mail MCP package provides a set of tools for interacting with one or more email accounts using the IMAP protocol. It allows an AI agent to fetch recent emails, search through mailboxes, read specific messages, and mark emails as seen.

### Key Features

- **Multi-Account Connectivity**: Connect to and manage multiple IMAP accounts simultaneously, configured via a single environment variable.
- **Comprehensive Mail Search**: Search across accounts by subject, sender, and even email body content.
- **Content-Aware Reading**: Intelligently reads email content, automatically converting HTML to plain text for clean, readable output.
- **State Management**: Includes a tool to mark emails as read (`mark-mails-as-seen`), allowing the agent to manage the state of an inbox.

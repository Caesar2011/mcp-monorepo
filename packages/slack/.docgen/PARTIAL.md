This package provides a comprehensive set of tools to interact with the Slack API. It allows for fetching channel information, reading message history, searching for channels, and accessing user activity feeds. By leveraging private API endpoints via cookie-based authentication, it offers capabilities beyond the standard public Slack API.

### Key Features

- **Rich Data Fetching**: Access channel content, sidebars, activity feeds, and direct message lists.
- **In-Memory Caching**: Pre-loads and caches user and channel lists on startup for fast and efficient ID-to-name resolution in subsequent requests.
- **Advanced Authentication**: Uses `xoxd` and `xoxc` tokens to interact with Slack's internal API, enabling a wider range of data access.
- **Human-Readable Output**: Automatically resolves user and channel IDs in messages to their corresponding names (e.g., `<@U123...>` becomes `John Doe <@U123...>`).

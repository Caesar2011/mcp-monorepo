This package provides a set of tools to interact with a Confluence instance. It allows a model to read, search, create, and update Confluence pages and spaces, acting as a comprehensive bridge to a Confluence-based knowledge base.

### Key Features

- **Full Page Lifecycle**: Create, read, and update Confluence pages.
- **Space & Page Discovery**: List available spaces and the pages within them.
- **Powerful Search**: Leverage Confluence Query Language (CQL) for advanced content searching.
- **Direct API Integration**: Communicates directly with the Confluence REST API using a personal access token for authentication.
- **Optional Insecure TLS**: Can be configured to disable TLS certificate validation via the `CONFLUENCE_INSECURE_SKIP_VERIFY` environment variable. This is useful for connecting to self-hosted instances with self-signed certificates, but should be used with caution.

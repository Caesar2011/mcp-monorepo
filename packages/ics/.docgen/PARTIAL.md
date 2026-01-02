This package provides a robust MCP server for accessing and querying events from one or more iCalendar (`.ics`) files. It acts as a bridge, allowing an AI model to interact with calendar data without needing direct access to the source URLs.

### Key Features

- **Multi-Calendar Support**: Merge events from multiple `.ics` URLs by defining multiple environment variables (e.g., `CALENDAR_WORK`, `CALENDAR_PERSONAL`).
- **Resilient Caching**: The server fetches calendar data and stores a prepared, ready-to-query version locally. If a calendar URL becomes temporarily unavailable, the server will continue to function using the last known good data from its cache.
- **Automatic Refresh**: Calendar data is automatically refreshed in the background on a regular interval to ensure the information stays up-to-date.

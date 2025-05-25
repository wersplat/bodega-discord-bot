# bodega-discord-bot

![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen?logo=node.js)
![License](https://img.shields.io/badge/license-ISC-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Railway Deploy](https://img.shields.io/badge/-Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

A Discord bot for the Bodega esports platform. It provides tournament, roster, and stats management, as well as notifications and integrations with the Bodega backend and auth-service.

---

## Directory Structure

```
bodega-discord-bot/
├── commands/        # Slash command modules
├── utils/           # Utility modules (API, scheduler, command registration)
├── docs/            # Documentation
├── main.ts          # Bot entry point
├── sentry.ts        # Sentry integration
├── package.json     # Dependencies and scripts
├── .env.example     # Example environment variables
└── ...
```

## Example Environment Variables
See `.env.example` for all options. Key variables:

```env
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-discord-client-id
GUILD_ID=your-guild-id
API_URL=https://your-backend-api
GOOGLE_SHEET_ID=your-google-sheet-id
DATABASE_URL=your-database-url
HEALTHCHECKS_PING_URL=https://hc-ping.com/your-id
ANNOUNCE_CHANNEL_ID=channel-id
REVIEW_CHANNEL_ID=channel-id
```

## Integration
- Connects to the Bodega backend API (`API_URL`) for tournament, roster, and stats operations.
- Authenticates via the Bodega auth-service for secure actions.
- Sends notifications to Discord channels (IDs configurable in `.env`).
- Can optionally integrate with Google Sheets and external monitoring.

## Main Files & Commands
- `main.ts`: Entry point for the bot.
- `commands/`: Individual slash commands (e.g., `roster`, `broadcast`, `submitstats`, `flag`, `pingmissing`).
- `utils/api.ts`: Handles API communication with the backend.
- `utils/registerCommands.ts`: Registers slash commands with Discord.
- `utils/scheduler.ts`: Schedules periodic or recurring tasks.
- `sentry.ts`: Sentry error monitoring integration.

---

## Contributing
Contributions are welcome! To add a new command:
1. Create a new `.ts` file in `commands/`.
2. Export a command definition following the existing pattern.
3. Update documentation if needed.
4. Run `npm run register` to deploy new commands to Discord.

Please lint and format your code using the provided scripts:
```bash
npm run lint
npm run format
```

---

## Setup

### Prerequisites
- Node.js (v18 or newer recommended)
- npm (comes with Node.js)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example environment file and fill in the required values:
```bash
cp .env.example .env
# Edit .env with your Discord bot token and other settings
```

### 3. Build the bot (for production)
```bash
npm run build
```


## Usage

### Start the bot (production)
```bash
npm start
```

### Start the bot in development mode (with live reload)
```bash
npm run dev
```

### Register slash commands
If you add or update commands, register them with Discord:
```bash
npm run register
```

---

- The main entry point is `main.ts`.
- Commands are located in the `commands/` directory.
- Environment variables are documented in `.env.example`.
- For deployment, ensure all required environment variables are set.
---
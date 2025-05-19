# bodega-discord-bot
Discord Bot module of esports-platform

<img src="https://img.shields.io/badge/-Railway-0B0D0E?style=flat&logo=railway&logoColor=white"/>

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


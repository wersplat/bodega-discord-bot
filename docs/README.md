![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen?logo=node.js)
![TypeScript](https://img.shields.io/badge/type-checked-blue?logo=typescript)
![Discord.js](https://img.shields.io/npm/v/discord.js?label=discord.js&color=blueviolet)
![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Railway Deploy](https://img.shields.io/badge/-Railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Discord Bot Uptime](https://img.shields.io/uptimerobot/status/m800447867-6863cbd32f0761f2e5b3b358?label=bot%20uptime)
![CI](https://github.com/wersplat/bodega-esports-platform/actions/workflows/ci.yml/badge.svg?branch=master)

# Tech Stack

**Languages & Frameworks**
- [Node.js](https://nodejs.org/en/download/) (v18 or newer recommended)
- [TypeScript](https://www.typescriptlang.org/)
- [Express](https://expressjs.com/) (web server)
- [Discord.js](https://discord.js.org) (Discord bot framework)

**Key Libraries**
- [googleapis](https://www.npmjs.com/package/googleapis) & [google-auth-library](https://www.npmjs.com/package/google-auth-library) (Google Sheets integration)
- [dotenv](https://www.npmjs.com/package/dotenv) (env config)
- [winston](https://www.npmjs.com/package/winston) (logging)
- [Sentry](https://sentry.io) (error monitoring)

**Cloud & Services**
- [Railway](https://railway.app) (deployment)
- [UptimeRobot](https://uptimerobot.com) (monitoring)
- [GitHub Actions](https://github.com/features/actions) (CI/CD)

# Bodega Discord Bot

A unified TypeScript Discord.js bot and web app for the Bodega Esports Platform.

This single codebase powers all Discord bot features—roster lookups, announcements, moderation, OCR stat parsing—as well as the Activity App and web endpoints. The Activity App (including the live `/standings` route) is now fully integrated into the main server, providing seamless access to Google Sheets-powered standings and more. All integrations (Google Sheets, Discord, Sentry, etc.) are managed together for easier development and deployment.

---

## 🛠️ Features

- `/roster <team_name>` — show a team’s roster
- `/broadcast <message>` — send announcements (admin only)
- `/submitstats` — OCR‐process a screenshot and display stats
- `/flag <id>` — flag a submission for review
- `/pingmissing` — DM captains who haven’t submitted stats
- Buttons, dropdowns & modals for rich interactions
- Scheduled MVP & leaderboard announcements
- **Activity App**: Displays live Google Sheets standings in Discord (see below)

---

## 📊 Activity App & Google Sheets Standings

The Activity App is now integrated directly into the main bot server. It provides a `/standings` web route that displays live standings from a Google Sheet as an HTML table. This can be used as a Discord Activity or viewed in any browser.

- **Route:** `/standings`
- **Source:** Google Sheets (ID set via `GOOGLE_SHEET_ID` in your `.env`)
- **Setup:** Ensure `GOOGLE_CREDS_JSON` and `GOOGLE_SHEET_ID` are set in your environment variables

---

## 🚀 Quick Start

1. **Clone & install**

   ```bash
   git clone git@github.com:wersplat/bodega-esports-platform.git
   cd bodega-esports-platform/discord-bot
   npm ci
   ```

2. **Configure**  

   ```bash
   cp .env.example .env
   # Edit .env with your values: DISCORD_TOKEN, CLIENT_ID, GUILD_ID, API_URL, etc.
   ```

3. **Local development**  

   ```bash
   npm run dev
   ```

4. **Build & run**  

   ```bash
   npm run build
   npm run start
   ```

## 📁 Folder Structure

```text
bodega-discord-bot/
├── activity/          # Activity App web assets (for /activity route)
├── commands/          # Slash command handlers
├── docs/              # Documentation
├── scripts/           # One-off utilities (e.g. deploy-commands.ts)
├── utils/             # Shared helpers (API calls, scheduler)
├── .env.example       # Example environment variables
├── .gitignore
├── main.ts            # Bootstraps bot, web server, and Activity App
├── package.json
├── sentry.ts          # Sentry integration
└── tsconfig.json
```

## 🤝 Contributing

- Follow KISS: keep commands small & focused  
- Add new commands under `commands/`  
- Write tests alongside new features (TBD)  
- Submit PR to the `master` branch

## 📄 License

GPLv3 (see root `LICENSE`)

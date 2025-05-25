![Node.js](https://img.shields.io/badge/node-18.x-blue?logo=node.js)
![TypeScript](https://img.shields.io/badge/type-checked-blue?logo=typescript)
![Discord.js](https://img.shields.io/npm/v/discord.js?label=discord.js&color=blueviolet)
![License](https://img.shields.io/github/license/wersplat/bodega-esports-platform)
![Railway](https://img.shields.io/badge/deployed-on%20railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Discord Bot Uptime](https://img.shields.io/uptimerobot/status/m800447867-6863cbd32f0761f2e5b3b358?label=bot%20uptime)
![CI](https://github.com/wersplat/bodega-esports-platform/actions/workflows/ci.yml/badge.svg?branch=react)

# Bodega Discord Bot

A TypeScript Discord.js bot for the Bodega Esports Platform.  
Provides roster lookups, announcement, and moderation tools. Now includes a unified Activity App and Google Sheets integration.

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
├── Dockerfile         # (if present) container build config
├── main.ts            # Bootstraps bot, web server, and Activity App
├── package.json
├── sentry.ts          # Sentry integration
└── tsconfig.json
```

## 🤝 Contributing

- Follow KISS: keep commands small & focused  
- Add new commands under `commands/`  
- Write tests alongside new features (TBD)  
- Submit PR to the `react` branch

## 📄 License

GPLv3 (see root `LICENSE`)

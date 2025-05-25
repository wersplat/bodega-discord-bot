![Node.js](https://img.shields.io/badge/node-18.x-blue?logo=node.js)
![TypeScript](https://img.shields.io/badge/type-checked-blue?logo=typescript)
![Discord.js](https://img.shields.io/npm/v/discord.js?label=discord.js&color=blueviolet)
![License](https://img.shields.io/github/license/wersplat/bodega-esports-platform)
![Render](https://img.shields.io/badge/deployed-on%20render-3c4dff?logo=render)
![Discord Bot Uptime](https://img.shields.io/uptimerobot/status/m800447867-6863cbd32f0761f2e5b3b358?label=bot%20uptime)
![CI](https://github.com/wersplat/bodega-esports-platform/actions/workflows/ci.yml/badge.svg?branch=react)

# Bodega Discord Bot

A TypeScript Discord.js bot for the Bodega Cats Esports Platform.  
Provides roster lookups, announcements, OCR‐driven stat parsing, moderation tools, and more.

## 🛠️ Features

- `/roster <team_name>` — show a team’s roster  
- `/broadcast <message>` — send announcements (admin only)  
- `/submitstats` — OCR‐process a screenshot and display stats  
- `/flag <id>` — flag a submission for review  
- `/pingmissing` — DM captains who haven’t submitted stats  
- Buttons, dropdowns & modals for rich interactions  
- Scheduled MVP & leaderboard announcements  

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
discord-bot/
├── commands/          # Slash command handlers
├── scripts/           # one-off utilities (e.g. deploy-commands.ts)
├── utils/             # shared helpers (API calls, scheduler)
├── .env.example
├── .gitignore
├── main.ts            # bootstraps bot, loads & registers commands
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

- Follow KISS: keep commands small & focused  
- Add new commands under `commands/`  
- Write tests alongside new features (TBD)  
- Submit PR to the `react` branch

## 📄 License

GPLv3 (see root `LICENSE`)

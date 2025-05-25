// discord-bot/main.ts

import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { NodeOptions } from "@sentry/node";
import { RewriteFrames } from "@sentry/integrations";
import { Client, GatewayIntentBits, Collection, Interaction } from 'discord.js';
import { createLogger, transports, format } from 'winston';
import { readdirSync, readFileSync } from 'fs';
import * as fs from 'fs';
import { join } from 'path';
import { registerCommands } from './utils/registerCommands';
import { startScheduler } from './utils/scheduler';
import fetch from 'node-fetch';
import express, { Request, Response } from 'express';
import path from 'path';

// --- Express Web Server for Activity Webview ---
const app = express();
const activityPath = path.join(__dirname, 'activity');

// Middleware to inject environment variables into HTML
app.use('/activity', (req, res, next) => {
  if (req.path === '/index.html' || req.path === '/') {
    const indexPath = path.join(activityPath, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Replace the placeholder with actual environment variable
    html = html.replace('__DISCORD_CLIENT_ID__', process.env.DISCORD_CLIENT_ID || '');
    
    res.send(html);
  } else {
    next();
  }
});

// Serve static files
app.use('/activity', express.static(activityPath));

// Enable CORS for all routes
import cors from 'cors';
app.use(cors());

// --- Standings Route (Google Sheets HTML Table) ---
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const RANGE = 'Standings!A2:D';

app.get('/standings', async (req: Request, res: Response) => {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDS_JSON!);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as JWT });
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    const values = sheetRes.data.values || [];
    const rows = values
      .map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`)
      .join('');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Standings</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; background: #111; color: white; padding: 2em; text-align: center; }
          table { width: 90%; margin: auto; border-collapse: collapse; }
          th, td { padding: 0.5em 1em; border-bottom: 1px solid #444; }
          th { background: #222; }
          tr:hover { background: #333; }
        </style>
      </head>
      <body>
        <h1>Live Standings</h1>
        <table>
          <thead><tr><th>Team</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    logger.error('[STANDINGS ERROR]', error);
    res.status(500).send('Failed to load standings');
  }
});

// Helper function to parse CSV data
function parseCSV(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(header => header.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    // Create an object with headers as keys
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }
  
  return result;
}

// --- Logger Setup ---
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new transports.Console()],
});

const PORT = process.env.PORT || 3000;
try {
  app.listen(PORT, () => {
    logger.info('\n' +
      '==========================================\n' +
      '✅ Activity server is LIVE!\n' +
      '📊 Google Sheets Activity App integrated.\n' +
      `🌐 Access: http://localhost:${PORT}/activity\n` +
      '==========================================\n'
    );
  });
} catch (err) {
  logger.error('\n' +
    '==========================================\n' +
    '❌ Activity server FAILED TO START!\n' +
    '🚨 Please check configuration and logs.\n' +
    '==========================================\n'
  );
  process.exit(1);
}


// --- Client Setup ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();


client.on("messageCreate", (msg) => {
  if (msg.content === "!crash") {
    throw new Error("Discord bot Sentry test crash");
  }
});

const sentryOptions: NodeOptions = {
  dsn: process.env.SENTRY_DISCORD_DSN,
  integrations: [
    new RewriteFrames({
      root: global.__dirname,
    }) as any,
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "production",
  release: "discord-bot@1.0.0",
};

Sentry.init(sentryOptions);

export default Sentry;


// --- Load Commands ---
const commandsDir = join(__dirname, 'commands');
for (const file of readdirSync(commandsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const { default: cmd } = require(join(commandsDir, file));
  client.commands.set(cmd.data.name, cmd);
}


(async () => {
  try {
    await registerCommands();
    logger.info('✅ Slash commands registered');

    client.once('ready', () => {
      logger.info(`🤖 Logged in as ${client.user?.tag}`);
      startScheduler(client);
    });

    await client.login(process.env.DISCORD_TOKEN!);
  } catch (err) {
    logger.error('❌ Startup error:', err);
    process.exit(1);
  }
})();

// --- Interaction Handling ---
client.on('interactionCreate', async (interaction: Interaction) => {
  try {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    }

    // Buttons
    if (interaction.isButton()) {
      const [action, id] = interaction.customId.split('_');
      if (action === 'approve') {
        await interaction.update({ content: `✅ Submission ${id} approved.`, embeds: [], components: [] });
      } else if (action === 'reject') {
        await interaction.update({ content: `❌ Submission ${id} rejected.`, embeds: [], components: [] });
      }
    }

    // Modals
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'broadcastModal') {
        const channelId = interaction.fields.getTextInputValue('channel');
        const message = interaction.fields.getTextInputValue('message');
        const channel = await client.channels.fetch(channelId);
        await (channel as any).send(`📢 ${message}`);
        await interaction.reply({ content: '✅ Broadcast sent.', ephemeral: true });
      }
    }
  } catch (err) {
    logger.error('❌ Interaction error:', err);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: '⚠️ Error handling your request.', ephemeral: true });
    }
  }
});

// --- Uptime Ping (UptimeRobot) ---
if (process.env.UPTIMEROBOT_HEARTBEAT_URL) {
  setInterval(() => {
    fetch(process.env.UPTIMEROBOT_HEARTBEAT_URL!)
      .then(() => logger.info('📡 UptimeRobot ping sent'))
      .catch(err => logger.warn('⚠️ UptimeRobot ping failed:', err));
  }, 60_000); // every 1 minute
}

// --- Crash Safety ---
process.on('unhandledRejection', err => logger.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Extend the Client class to include a commands property
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

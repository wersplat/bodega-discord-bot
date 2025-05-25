// src/main.ts - Main entry point for the Bodega Discord Bot

// Load environment variables first
import 'dotenv/config';

// Core dependencies
import * as Sentry from "@sentry/node";
import { NodeOptions } from "@sentry/node";
import { RewriteFrames } from "@sentry/integrations";
import { Client, GatewayIntentBits, Collection, Interaction, TextChannel } from 'discord.js';
import { createLogger, format, transports } from 'winston';
import { readdirSync, readFileSync } from 'fs';
import * as fs from 'fs';
import { join } from 'path';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

// Internal modules
import { registerCommands } from './utils/registerCommands';
import { startScheduler } from './utils/scheduler';

// Types

// Constants
const ACTIVITY_PATH = path.join(__dirname, '..', 'public', 'activity');

// --- Express Web Server for Activity Webview ---
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes

// Activity page route
app.get('/activity', (req: Request, res: Response) => {
  const indexPath = path.join(ACTIVITY_PATH, 'index.html');
  
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Inject environment variables
    const envScript = `
      <script>
        window.ENV = {
          DISCORD_CLIENT_ID: '${process.env.DISCORD_CLIENT_ID || ''}',
          GOOGLE_SHEET_ID: '${process.env.GOOGLE_SHEET_ID || ''}'
        };
      </script>
    `;
    
    // Inject the script before the closing head tag
    html = html.replace('</head>', `${envScript}</head>`);
    
    res.send(html);
  } catch (error) {
    console.error('Error processing activity page:', error);
    res.status(500).send('Error loading activity page');
  }
});

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// Bot ready event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  // Register slash commands
  try {
    await registerCommands();
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Failed to register application commands:', error);
  }
  
  // Start scheduled tasks
  startScheduler(client);
});

// Interaction (slash command) handler
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    try {
      await interaction.reply({
        content: 'There was an error executing this command!',
        ephemeral: true,
      });
    } catch (e) {
      console.error('Failed to send error reply:', e);
    }
  }
});

// Error handling
process.on('unhandledRejection', (error: Error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);


// Enable CORS for all routes
import cors from 'cors';
app.use(cors());

// --- Google Sheets Integration ---
const { google } = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const RANGE = 'Standings!A1:D'; // Default range, assuming A1:D contains headers and data

// Helper function to get authenticated Google Sheets client
async function getAuthClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    logger.error('[AUTH ERROR] Missing Google Service Account Email or Private Key in .env');
    throw new Error('Google authentication credentials missing.');
  }
  const auth = new (require('google-auth-library').JWT)({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });
  return auth;
}

// Standings route
app.get('/standings', async (req: Request, res: Response): Promise<void> => {
  if (!process.env.GOOGLE_SHEET_ID) {
    logger.error('[STANDINGS ERROR] Missing GOOGLE_SHEET_ID in .env');
    res.status(500).send('Server configuration error: Missing Google Sheet ID.');
    return;
  }
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  // Allow overriding range via query parameter, e.g., /standings?range=SheetName!A1:E10
  const currentRange = (req.query.range as string) || RANGE;

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: currentRange,
    });

    const values = sheetResponse.data.values;
    let tableHeadersHtml = '';
    let tableRowsHtml = '';

    if (values && values.length > 0) {
      const headers = values[0] as any[];
      headers.forEach(header => {
        tableHeadersHtml += `<th>${header}</th>`;
      });

      const dataRows = values.slice(1);
      if (dataRows.length > 0) {
        dataRows.forEach((row: any[]) => {
          tableRowsHtml += '<tr>';
          (row as any[]).forEach(cell => {
            tableRowsHtml += `<td>${cell === null || cell === undefined ? '' : cell}</td>`;
          });
          tableRowsHtml += '</tr>';
        });
      } else {
        tableRowsHtml = `<tr><td colspan="${headers.length || 1}">No data rows found.</td></tr>`;
      }
    } else {
      tableHeadersHtml = '<th>Info</th>';
      tableRowsHtml = '<tr><td>No data found in the specified sheet or range.</td></tr>';
    }

    const htmlOutput = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Standings</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #121212; color: #e0e0e0; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
          h1 { color: #1DB954; text-align: center; margin-bottom: 20px; }
          table { width: 95%; max-width: 900px; margin: 20px 0; border-collapse: collapse; box-shadow: 0 4px 12px rgba(0,0,0,0.4); background-color: #1e1e1e; border-radius: 8px; overflow: hidden; }
          th, td { border-bottom: 1px solid #333; padding: 12px 18px; text-align: left; }
          th { background-color: #282828; color: #1DB954; font-weight: 600; }
          td { color: #b3b3b3; }
          tr:nth-child(even) { background-color: #232323; }
          tr:hover { background-color: #2a2a2a; }
          .container { width: 100%; text-align: center; }
          .footer { margin-top: 30px; font-size: 0.9em; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Live Standings</h1>
          <table>
            <thead>
              <tr>
                ${tableHeadersHtml}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <p class="footer">Data fetched from Google Sheets. Last updated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    res.send(htmlOutput);
  } catch (error: any) {
    logger.error('[STANDINGS ERROR] Failed to fetch or render standings for range ' + currentRange + ':', error.message);
    Sentry.captureException(error, { extra: { sheetId: SHEET_ID, range: currentRange } });
    res.status(500).send('Failed to load standings. An error occurred with the server or Google Sheets API. Check server logs for details.');
  }
});

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


// Initialize Sentry error tracking
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

// Uptime Ping (UptimeRobot)
if (process.env.UPTIMEROBOT_HEARTBEAT_URL) {
  setInterval(() => {
    fetch(process.env.UPTIMEROBOT_HEARTBEAT_URL!)
      .then(() => console.log('UptimeRobot ping sent'))
      .catch(err => console.warn('UptimeRobot ping failed:', err));
  }, 60_000); // every 1 minute
}

// Crash Safety
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  Sentry.captureException(err);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  Sentry.captureException(err);
  process.exit(1);
});

export default Sentry;

// Extend the Client class to include a commands property
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

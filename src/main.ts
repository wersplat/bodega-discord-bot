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
// const ACTIVITY_PATH = path.join(__dirname, '..', 'public', 'activity'); // Removed

// --- Express Web Server for Activity Webview ---
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes

// Activity page route for old system - REMOVED

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

// --- Google Sheets Integration (related to old activity) - REMOVED ---

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
      '✅ Express server is LIVE for bot interactions!\n' +
      // '📊 Google Sheets Activity App integrated.\n' + // Removed log line
      // `🌐 Access: http://localhost:${PORT}/activity\n` + // Removed log line
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

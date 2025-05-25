// robo.config.ts
import { defineConfig } from '@robojs/core';

export default defineConfig({
  intents: ['Guilds', 'GuildMessages', 'MessageContent'],
  commands: ['commands/**/*.ts'],
  events:   ['utils/**/*.ts'],    // or wherever you keep event handlers
});
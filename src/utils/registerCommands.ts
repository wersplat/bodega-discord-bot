import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';

export async function registerCommands() {
  // Detect if running from dist (production) or src (development)
  const isDist = __dirname.endsWith('dist') || __dirname.includes('/dist/');
  const commandsDir = join(__dirname, '../commands');
  const ext = isDist ? '.js' : '.ts';

  const commands: any[] = [];
  for (const file of readdirSync(commandsDir).filter(f => f.endsWith(ext))) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const commandModule = require(join(commandsDir, file));
    if (commandModule && commandModule.data) {
      commands.push(commandModule.data.toJSON());
    } else {
      console.warn(`[WARNING] The command at ${join(commandsDir, file)} is missing a "data" export, or the module is empty.`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  const route = process.env.REGISTER_GLOBAL === 'true'
    ? Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!)
    : Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.GUILD_ID!);

  console.log(`🔄 Registering ${commands.length} commands (${process.env.REGISTER_GLOBAL === 'true' ? 'GLOBAL' : 'GUILD'})…`);
  await rest.put(route, { body: commands });
  console.log('✅ Commands registered successfully.');
}

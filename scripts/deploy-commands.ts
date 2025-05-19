// discord_bot/scripts/deploy-commands.ts
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';

const commands = [];
const commandsPath = join(__dirname, '../commands');
const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.ts'));

for (const file of commandFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: command } = require(join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} commands to guild ${process.env.GUILD_ID}...`);
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    );
    console.log('✅ Commands registered successfully.');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
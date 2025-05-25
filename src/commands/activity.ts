import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from 'dotenv';

config();

export const data = new SlashCommandBuilder()
  .setName('activity')
  .setDescription('Open the Activity App to view standings');

export async function execute(interaction: ChatInputCommandInteraction) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const activityUrl = `${baseUrl}/activity`;
  
  await interaction.reply({
    content: `[Open Standings in Activity App](${activityUrl})`,
    ephemeral: true,
  });
}

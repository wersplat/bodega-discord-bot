import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

export default {
  data: new SlashCommandBuilder()
    .setName('pingmissing')
    .setDescription('DM captains who have not submitted weekly stats'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const res = await fetch(`${process.env.API_URL}/api/captains/missing`);
    const captains: { discordId: string, team: string }[] = await res.json();

    await Promise.all(captains.map(c =>
      interaction.client.users.send(c.discordId, `⚠️ You have not submitted stats for team **${c.team}** this week!`)
    ));

    await interaction.editReply(`📨 Reminders sent to ${captains.length} captains.`);
  }
};
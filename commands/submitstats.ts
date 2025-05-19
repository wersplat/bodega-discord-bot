import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { submitStats } from '../utils/api';

export default {
  data: new SlashCommandBuilder()
    .setName('submitstats')
    .setDescription('Process a game screenshot for stats via OCR')
    .addAttachmentOption(opt =>
      opt.setName('screenshot')
         .setDescription('Upload the game screenshot')
         .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const attachment = interaction.options.getAttachment('screenshot', true);
    await interaction.deferReply();
    try {
      const data = await submitStats(attachment.url);
      const embed = new EmbedBuilder()
        .setTitle('Game Stats')
        .setColor('Green')
        .setTimestamp();

      // List each player’s stats
      data.players.forEach((p: any) => {
        embed.addFields({
          name: p.gamertag,
          value: `PTS: ${p.pts} | AST: ${p.ast} | REB: ${p.reb}`,
          inline: false
        });
      });

      // MVP & winner
      embed.addFields(
        { name: '🏆 MVP', value: data.mvp, inline: true },
        { name: '🎉 Winner', value: data.winner, inline: true }
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Failed to process screenshot. Please try again.');
    }
  }
};
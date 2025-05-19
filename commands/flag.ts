import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('flag')
    .setDescription('Flag a stat submission for review')
    .addStringOption(opt => opt.setName('id').setDescription('Submission ID').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString('id', true);
    const embed = new EmbedBuilder()
      .setTitle('🔖 Submission Flagged')
      .setDescription(`Submission ID: ${id}`)
      .setColor('Orange');

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId(`approve_${id}`).setLabel('Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${id}`).setLabel('Reject').setStyle(ButtonStyle.Danger),
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Send scoped announcement via modal'),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('broadcastModal')
      .setTitle('Create Broadcast');

    const channelInput = new TextInputBuilder()
      .setCustomId('channel')
      .setLabel('Channel ID')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel('Message')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(channelInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
    );

    await interaction.showModal(modal);
  }
};
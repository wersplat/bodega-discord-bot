import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
  GuildTextBasedChannel
} from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('saymodal')
  .setDescription('Send a custom message via a form')
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Where to send the message')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel | null;
  if (!channel) {
    await interaction.reply({ content: '🚫 That\'s not a text channel!', ephemeral: true });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId(`sayModal|${channel.id}`)
    .setTitle('Send Custom Message');

  const messageInput = new TextInputBuilder()
    .setCustomId('messageInput')
    .setLabel('Message')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export default { data, execute };


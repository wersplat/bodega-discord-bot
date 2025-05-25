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
  .setName('embedmodal')
  .setDescription('Create an embed via a form')
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Where to send the embed')
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
    .setCustomId(`embedModal|${channel.id}`)
    .setTitle('Create Embed');

  const titleInput = new TextInputBuilder()
    .setCustomId('titleInput')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId('descInput')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const colorInput = new TextInputBuilder()
    .setCustomId('colorInput')
    .setLabel('Color (hex, e.g. FF0000)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const footerInput = new TextInputBuilder()
    .setCustomId('footerInput')
    .setLabel('Footer (optional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const imageInput = new TextInputBuilder()
    .setCustomId('imageInput')
    .setLabel('Image URL (optional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
  );

  await interaction.showModal(modal);
}

export default { data, execute };


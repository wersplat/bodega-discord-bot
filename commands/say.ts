import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Send a custom message to a channel')
  .addChannelOption(opt =>
    opt
      .setName('channel')
      .setDescription('Where to send the message')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('message')
      .setDescription('Content to send')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel | null;
  const content = interaction.options.getString('message') ?? '';

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '🚫 That\'s not a text channel!', ephemeral: true });
    return;
  }

  await channel.send({ content });
  await interaction.reply({ content: '✅ Message sent!', ephemeral: true });
}

export default { data, execute };

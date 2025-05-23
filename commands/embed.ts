import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, TextChannel, GuildTextBasedChannel } from 'discord.js';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel | null;
  const title = interaction.options.getString('title') ?? '';
  const description = interaction.options.getString('description') ?? '';
  const color = interaction.options.getString('color') || '0099ff';

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '🚫 That\'s not a text channel!', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(`#${color}`)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '📬 Embed sent!', ephemeral: true });
}


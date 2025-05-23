import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js';

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel | null;
  const content = interaction.options.getString('message') ?? '';

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '🚫 That\'s not a text channel!', ephemeral: true });
    return;
  }

  await channel.send({ content });
  await interaction.reply({ content: '✅ Message sent!', ephemeral: true });
}

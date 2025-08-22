import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { setRosterChannelId } from '../utils/guildSettingsStore';

export const data = new SlashCommandBuilder()
  .setName('set-roster-channel')
  .setDescription('Set the default channel for roster posts')
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Target text channel')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return interaction.reply({ content: 'Guild only.', ephemeral: true });
  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  setRosterChannelId(interaction.guild.id, channel.id);
  await interaction.reply({ content: `✅ Roster channel set to <#${channel.id}>`, ephemeral: true });
}

export default { data, execute };

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel, GuildTextBasedChannel } from 'discord.js';
import { getRosterChannelId } from '../utils/guildSettingsStore';
import { getTeamByIdOrSlug, getTeamWithRoster } from '../utils/supabase';
import { buildRosterEmbeds } from '../utils/embeds';
import { isUuid } from '../utils/isUuid';

export const data = new SlashCommandBuilder()
  .setName('post-roster')
  .setDescription('Post a team roster embed to the roster channel')
  .addStringOption(o => o.setName('team').setDescription('Team slug or UUID').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guild || !interaction.client.user) {
    return interaction.editReply('Guild only.');
  }

  const targetChannelId = getRosterChannelId(interaction.guild.id);
  if (!targetChannelId) return interaction.editReply('⚠️ No roster channel configured. Use `/set-roster-channel`.');

  const channel = interaction.guild.channels.cache.get(targetChannelId) as GuildTextBasedChannel | null;
  if (!channel) return interaction.editReply('⚠️ Configured roster channel not found.');

  const me = interaction.guild.members.me!;
  const perms = channel.permissionsFor(me);
  if (!perms?.has('SendMessages') || !perms?.has('EmbedLinks')) {
    return interaction.editReply('🚫 I lack SendMessages or EmbedLinks in the roster channel.');
  }

  const input = interaction.options.getString('team', true).trim();
  const team = await getTeamByIdOrSlug(input);
  if (!team) return interaction.editReply('⚠️ Team not found.');

  const full = await getTeamWithRoster(team.id);
  if (!full) return interaction.editReply('⚠️ Team or roster not found.');

  const embeds = buildRosterEmbeds(full);
  await channel.send({ embeds });
  await interaction.editReply(`✅ Posted roster for **${full.name}** in <#${channel.id}>.`);
}

export default { data, execute };

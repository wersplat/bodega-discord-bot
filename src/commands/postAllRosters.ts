import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, GuildTextBasedChannel } from 'discord.js';
import { getRosterChannelId } from '../utils/guildSettingsStore';
import { getAllActiveTeams, getTeamWithRoster } from '../utils/supabase';
import { buildRosterEmbeds } from '../utils/embeds';
import { sleep } from '../utils/sleep';

export const data = new SlashCommandBuilder()
  .setName('post-all-rosters')
  .setDescription('Post roster embeds for all active teams')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guild || !interaction.client.user) return interaction.editReply('Guild only.');

  const targetChannelId = getRosterChannelId(interaction.guild.id);
  if (!targetChannelId) return interaction.editReply('⚠️ No roster channel configured. Use `/set-roster-channel`.');

  const channel = interaction.guild.channels.cache.get(targetChannelId) as GuildTextBasedChannel | null;
  if (!channel) return interaction.editReply('⚠️ Configured roster channel not found.');

  const me = interaction.guild.members.me!;
  const perms = channel.permissionsFor(me);
  if (!perms?.has('SendMessages') || !perms?.has('EmbedLinks')) {
    return interaction.editReply('🚫 I lack SendMessages or EmbedLinks in the roster channel.');
  }

  const teams = await getAllActiveTeams();
  let posted = 0;
  for (const t of teams) {
    const full = await getTeamWithRoster(t.id);
    if (!full) continue;
    const embeds = buildRosterEmbeds(full);
    await channel.send({ embeds });
    posted++;
    await sleep(1000); // be gentle with rate limits
    if (posted % 10 === 0) await sleep(5000);
  }

  await interaction.editReply(`✅ Posted ${posted} roster${posted === 1 ? '' : 's'} to <#${channel.id}>.`);
}

export default { data, execute };

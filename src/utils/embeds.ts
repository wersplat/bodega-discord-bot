import { EmbedBuilder } from 'discord.js';
import type { TeamWithRoster } from './supabase';

export function buildRosterEmbeds(team: TeamWithRoster): EmbedBuilder[] {
  const makeBase = (cont = false) => {
    const e = new EmbedBuilder()
      .setTitle(`Team Roster — ${team.name}${cont ? ' (cont.)' : ''}`)
      .setFooter({ text: `${team.slug} • Updated ${new Date().toISOString()}` });
    if (team.logo_url) e.setThumbnail(team.logo_url);
    const desc = [team.league, team.season].filter(Boolean).join(' • ');
    if (desc) e.setDescription(desc);
    return e;
  };

  const chunks: { name: string; value: string; inline: boolean }[][] = [];
  const fields = team.roster.map(m => {
    const star = m.is_captain ? '⭐ ' : '';
    const jersey = m.jersey_number ?? '—';
    const name = `${star}#${jersey}. ${m.player?.gamertag ?? 'Unknown'}`;
    const value = m.player?.position ?? '—';
    return { name, value, inline: false };
  });

  for (let i = 0; i < fields.length; i += 25) {
    chunks.push(fields.slice(i, i + 25));
  }

  if (chunks.length === 0) return [makeBase().setDescription('No players on roster.')];

  return chunks.map((chunk, idx) => {
    const e = makeBase(idx > 0);
    e.addFields(chunk);
    return e;
  });
}
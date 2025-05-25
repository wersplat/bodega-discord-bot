import { Client, TextChannel } from 'discord.js';
import { CronJob } from 'cron';
import fetch from 'node-fetch';

export function startScheduler(client: Client) {
  const channelId = process.env.ANNOUNCE_CHANNEL_ID!;

  // Daily MVP at 9:00 UTC
  new CronJob('0 9 * * *', async () => {
    const res = await fetch(`${process.env.API_URL}/api/mvp/today`);
    const { player, stats }: { player: string; stats: number } = await res.json();
    const channel = client.channels.cache.get(channelId) as TextChannel;
    channel?.send(`🏆 Today's MVP: **${player}** with ${stats} MVP points!`);
  }, null, true);

  // Weekly Top 5 every Monday at 12:00 UTC
  new CronJob('0 12 * * 1', async () => {
    const res = await fetch(`${process.env.API_URL}/api/leaderboard/top5?period=week`);
    const { top }: { top: { name: string; pts: number }[] } = await res.json();
    const channel = client.channels.cache.get(channelId) as TextChannel;
    channel?.send(`📈 Weekly Top 5:\n${top.map((p: { name: string; pts: number }, i: number) => `${i + 1}. ${p.name} (${p.pts} pts)`).join('\n')}`);
  }, null, true);
}
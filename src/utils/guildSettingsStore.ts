import fs from 'node:fs';
import path from 'node:path';

type Store = Record<string, { rosterChannelId?: string }>;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'settings.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

export function getRosterChannelId(guildId: string): string | undefined {
  ensureFile();
  const raw = fs.readFileSync(FILE, 'utf8');
  const store: Store = JSON.parse(raw || '{}');
  return store[guildId]?.rosterChannelId || process.env.ROSTER_CHANNEL_ID || undefined;
}

export function setRosterChannelId(guildId: string, channelId: string) {
  ensureFile();
  const raw = fs.readFileSync(FILE, 'utf8');
  const store: Store = JSON.parse(raw || '{}');
  store[guildId] = { ...(store[guildId] || {}), rosterChannelId: channelId };
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

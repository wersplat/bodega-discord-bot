import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase = () => {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side only
    _supabase = createClient(url, key);
  }
  return _supabase;
};

export type Team = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  league?: string | null;
  season?: string | null;
  is_active?: boolean | null;
};

export type Player = {
  id: string;
  gamertag: string;
  position?: string | null;
};

export type RosterMember = {
  team_id: string;
  player_id: string;
  jersey_number?: number | null;
  is_captain: boolean;
  player: Player;
};

export type TeamWithRoster = Team & { roster: RosterMember[] };

export async function getTeamByIdOrSlug(input: string): Promise<Team | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
  const q = supabase().from('teams').select('*').eq(isUuid ? 'id' : 'slug', input).maybeSingle();
  const { data, error } = await q;
  if (error) throw error;
  return data ?? null;
}

export async function getTeamWithRoster(teamId: string): Promise<TeamWithRoster | null> {
  const { data: team, error: tErr } = await supabase().from('teams').select('*').eq('id', teamId).maybeSingle();
  if (tErr) throw tErr;
  if (!team) return null;

  const { data: roster, error: rErr } = await supabase()
    .from('roster_members')
    .select('player:players(id,gamertag,position), jersey_number, is_captain, team_id, player_id')
    .eq('team_id', teamId);
  if (rErr) throw rErr;

  const ordered = (roster ?? []).sort((a: any, b: any) => {
    // captains first, then jersey asc, then gamertag
    if (a.is_captain !== b.is_captain) return a.is_captain ? -1 : 1;
    const aj = a.jersey_number ?? 9999, bj = b.jersey_number ?? 9999;
    if (aj !== bj) return aj - bj;
    return (a.player?.gamertag ?? '').localeCompare(b.player?.gamertag ?? '');
  });

  return { ...(team as Team), roster: ordered as any };
}

export async function getAllActiveTeams(): Promise<Team[]> {
  const { data, error } = await supabase().from('teams').select('*').eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

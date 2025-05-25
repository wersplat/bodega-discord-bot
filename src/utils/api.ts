import fetch from 'node-fetch';
import FormData from 'form-data';

export async function submitStats(imageUrl: string) {
  // Download image
  const resp = await fetch(imageUrl);
  const buffer = await resp.buffer();

  // Prepare multipart form
  const form = new FormData();
  form.append('file', buffer, { filename: 'screenshot.png' });

  // Send to OCR endpoint
  const apiRes = await fetch(`${process.env.API_URL}/api/ocr`, {
    method: 'POST',
    body: form
  });
  if (!apiRes.ok) throw new Error('OCR API error');
  return apiRes.json();  // Expected: { players: [...], mvp: string, winner: string }
}

export async function fetchRoster(teamName: string): Promise<RosterData> {
  const res = await fetch(`${process.env.API_URL}/teams/${encodeURIComponent(teamName)}/roster`);
  if (!res.ok) throw new Error('Team not found');
  return (await res.json()) as RosterData;
}

type Player = {
  gamertag: string;
  role: string;
};

type RosterData = {
  players: Player[];
};
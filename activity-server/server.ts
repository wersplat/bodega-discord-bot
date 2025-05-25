import Fastify from 'fastify';

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const RANGE = 'Standings!A2:D';

// Root test route
fastify.get('/', async (req, reply) => {
  reply.send({ status: 'Bot backend running' });
});

// Live standings route for Discord Activity
fastify.get('/standings', async (req: any, reply: any) => {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDS_JSON!);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: SCOPES,
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as JWT });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const values = res.data.values || [];
    const rows = values
      .map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Standings</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; background: #111; color: white; padding: 2em; text-align: center; }
          table { width: 90%; margin: auto; border-collapse: collapse; }
          th, td { padding: 0.5em 1em; border-bottom: 1px solid #444; }
          th { background: #222; }
          tr:hover { background: #333; }
        </style>
      </head>
      <body>
        <h1>Live Standings</h1>
        <table>
          <thead><tr><th>Team</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;

    reply.type('text/html').send(html);
  } catch (error) {
    console.error('[STANDINGS ERROR]', error);
    reply.code(500).send('Failed to load standings');
  }
});

// Start server
fastify.listen({ port: 3000, host: '0.0.0.0' }, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Bot backend server running on http://localhost:3000');
});

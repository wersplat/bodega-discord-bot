import { Hono } from "hono";
import { google } from 'googleapis';

type Bindings = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GOOGLE_SHEET_ID: string; // For Google Sheets integration
  GOOGLE_API_KEY: string;  // For Google Sheets integration
};

const app = new Hono<{ Bindings: Bindings }>();

// GID to Sheet Name Mapping
const GID_TO_SHEET_NAME_MAP: Record<string, string> = {
  '2116993983': 'Road-to-25K-Teams',
  '2002411778': 'Overall Standings',
  '1182226510': 'D1',
  '2033091792': 'D2',
  '2000624894': 'D3',
  '191822127': 'Open',
};
const DEFAULT_SHEET_NAME = GID_TO_SHEET_NAME_MAP['2116993983']; // Road-to-25K-Teams as default

// Helper function to convert Google Sheets API values (array of arrays) to an array of objects
function convertSheetValuesToObjects(values: any[][]): Record<string, any>[] {
  if (!values || values.length === 0) {
    return [];
  }
  const headers = values[0].map(String); // First row as headers
  const dataRows = values.slice(1);

  return dataRows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index] : '';
    });
    return obj;
  });
}

// Original csvToJSON function (no longer primary for sheet data but kept if used elsewhere or for reference)
function csvToJSON(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) {
    return [];
  }
  // Robust header splitting: handles headers with commas if they are quoted
  const headersLine = lines[0];
  const headers: string[] = [];
  let currentHeader = '';
  let inHeaderQuotes = false;
  for (const char of headersLine) {
    if (char === '"') {
      inHeaderQuotes = !inHeaderQuotes;
    } else if (char === ',' && !inHeaderQuotes) {
      headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }
  headers.push(currentHeader.trim().replace(/^"|"$/g, '')); // Add the last header

  const result: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const obj: { [key: string]: string } = {};
    const currentLineChars = lines[i].split('');
    const processedLineValues: string[] = [];
    let currentValue = '';
    let inValueQuotes = false;

    for (let charIndex = 0; charIndex < currentLineChars.length; charIndex++) {
      const char = currentLineChars[charIndex];
      if (char === '"') {
        // Handle escaped quotes: if the next char is also a quote, it's an escaped quote
        if (inValueQuotes && charIndex + 1 < currentLineChars.length && currentLineChars[charIndex + 1] === '"') {
          currentValue += '"'; // Add one quote to the value
          charIndex++; // Skip the next quote
          continue;
        }
        inValueQuotes = !inValueQuotes;
      } else if (char === ',' && !inValueQuotes) {
        processedLineValues.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    processedLineValues.push(currentValue.trim()); // Add the last value

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = processedLineValues[j] !== undefined ? processedLineValues[j] : '';
    }
    result.push(obj);
  }
  return result;
}

app.get("/", (c) => {
  return c.text("Hello Hono!!");
});

app.get("/api/config", (c) => {
  return c.json({
    clientId: c.env.DISCORD_CLIENT_ID
    // googleSheetId: c.env.GOOGLE_SHEET_ID, // Intentionally commented out for now
    // googleApiKey: c.env.GOOGLE_API_KEY,    // Intentionally commented out for now
  });
});

app.post("/token", async (c) => {
  const code = await c.req
    .json()
    .then(({ code }) => {
      return code;
    })
    .catch(() => {
      return undefined;
    });

  if (code === undefined) {
    return c.json({ error: "Code is undefined" });
  }

  if (code === null) {
    return c.json({ error: "Code is null" });
  }

  if (typeof code !== "string") {
    return c.json({ error: "Code is not a string" });
  }

  const { access_token, error } = await fetch(
    `https://discord.com/api/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: c.env.DISCORD_CLIENT_ID,
        client_secret: c.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      }),
    }
  ).then(async (response) => {
    if (!response.ok) {
      console.error({
        status: response.status,
        details: response.statusText,
        code,
      });
      return { access_token: "", error: "Failed to get access token" };
    }

    return response.json() as Promise<{ access_token: string; error: string }>;
  });

  return c.json({ access_token, error });
});


app.get('/api/sheet-data/:gid?', async (c) => {
  const SPREADSHEET_ID = c.env.GOOGLE_SHEET_ID;
  const API_KEY = c.env.GOOGLE_API_KEY;

  if (!SPREADSHEET_ID || !API_KEY) {
    console.error("[WORKER /api/sheet-data] Missing SPREADSHEET_ID or GOOGLE_API_KEY in environment variables.");
    return c.json({ error: 'Server configuration error: Missing Google Sheets credentials.' }, { status: 500 });
  }

  const requestedGid = c.req.param('gid');
  const sheetNameToFetch = (requestedGid && GID_TO_SHEET_NAME_MAP[requestedGid]) ? GID_TO_SHEET_NAME_MAP[requestedGid] : DEFAULT_SHEET_NAME;

  console.log(`[WORKER /api/sheet-data/:gid?] Param GID: "${requestedGid}", Fetching Sheet Name: "${sheetNameToFetch}"`);

  if (!sheetNameToFetch) {
      console.error(`[WORKER /api/sheet-data] No sheet name found for GID: ${requestedGid}, and no default sheet name configured properly.`);
      return c.json({ error: `Sheet not found for the provided identifier.` }, { status: 404 });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: API_KEY });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetNameToFetch, // Use the sheet name for the range
    });

    if (!response.data.values) {
      console.log(`[WORKER /api/sheet-data] No data found in sheet: ${sheetNameToFetch}`);
      return c.json([]); // Return empty array if sheet has no data or no values
    }

    const jsonData = convertSheetValuesToObjects(response.data.values);
    console.log(`[WORKER /api/sheet-data] Successfully fetched and processed data from sheet: ${sheetNameToFetch}. Rows: ${jsonData.length}`);
    return c.json(jsonData);

  } catch (e: any) {
    console.error(`[WORKER /api/sheet-data] Error fetching from Google Sheets API for sheet "${sheetNameToFetch}": ${e.message}`, e.response?.data || e);
    if (e.response && e.response.data && e.response.data.error) {
      const apiError = e.response.data.error;
      return c.json({ 
          error: 'Google Sheets API Error', 
          details: apiError.message || 'Failed to retrieve data.',
          googleApiStatus: apiError.code,
      }, { status: apiError.code === 403 ? 403 : apiError.code === 404 ? 404 : 500 });
    }
    return c.json({ error: 'Internal server error while fetching sheet data via API', details: e.message }, { status: 500 });
  }
});

// The old CSV fetching logic is replaced by the Google Sheets API logic above.
// We can remove the old app.get('/api/sheet-data/:gid?', ...) implementation or comment it out.
// For this replacement, we assume the entire old block from the previous `app.get('/api/sheet-data/:gid?'`
// down to its closing `});` is being replaced by the new implementation above.
// To ensure this, the TargetContent for the next chunk will be the start of the old logic
// and ReplacementContent will be empty, effectively deleting the old block if the new one is placed correctly.



export default app;

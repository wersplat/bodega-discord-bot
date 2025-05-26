import { Hono } from "hono";

type Bindings = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GOOGLE_SHEET_ID: string; // For Google Sheets integration
  GOOGLE_API_KEY: string;  // For Google Sheets integration
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper function to parse CSV to JSON
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
  // Enhanced console log
  console.log(`[WORKER /api/sheet-data/:gid?] Path: ${c.req.path}, Method: ${c.req.method}, Param GID: "${c.req.param('gid')}", GID to fetch: "${c.req.param('gid') || '2116993983'}", Origin: ${c.req.header('Origin')}, Referer: ${c.req.header('Referer')}`);
  const baseSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRV_Tz8yKtGZne961tId4A2Cdit7ZYGMJ8sinYHo_nX1SKj_VqAIi2haBbSd-UsUpVmkTFD-RDGezIt/pub';
  const requestedGid = c.req.param('gid');
  const defaultGid = '2116993983'; // Default to "Road-to-25K-Teams"
  const gidToFetch = requestedGid || defaultGid;

  const sheetUrl = `${baseSheetUrl}?gid=${gidToFetch}&single=true&output=csv`;
  console.log(`[WORKER /api/sheet-data] Fetching sheet data from: ${sheetUrl}`);

  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      console.error(`Failed to fetch sheet: ${response.status} ${response.statusText} for GID ${gidToFetch}. URL: ${sheetUrl}`);
      return c.json({ error: 'Failed to fetch sheet data from Google', upstreamStatus: response.status, details: response.statusText }, { status: response.status });
    }
    const csvText = await response.text();
    console.log(`[WORKER /api/sheet-data] Successfully fetched CSV for GID ${gidToFetch}. Length: ${csvText.length}`);
    c.header('Content-Type', 'text/plain; charset=UTF-8'); // Or 'text/csv'
    return c.text(csvText);
  } catch (e: any) {
    console.error(`[WORKER /api/sheet-data] Error in fetch logic for GID ${gidToFetch}: ${e.message}`, e);
    return c.json({ error: 'Internal server error', details: e.message }, { status: 500 });
  }
});

export default app;

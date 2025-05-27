import dotenv from 'dotenv';
dotenv.config();
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { google, sheets_v4  as sheets_v4 } from 'googleapis'; // Import sheets_v4 for type hints
// import { google } from 'googleapis'; // For Google Sheets API (Temporarily commented out for payload size debugging)

// Interface for the structured error object from Google APIs
interface GoogleApiErrorFields {
  code: number;
  message: string;
  details?: unknown[]; // Adjust if the structure of details is known and consistent
  status?: string; // Often included as well
}

type Bindings = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GOOGLE_SHEET_ID: string; 
  GOOGLE_API_KEY: string;
  ASSETS: Fetcher;  
  // SERVICE_ACCOUNT_JSON: string; // Add if using service account
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper function to convert data from sheets.spreadsheets.get() to array of objects
function convertSpreadsheetGetDataToObjects(sheetData: sheets_v4.Schema$Spreadsheet): Record<string, unknown>[] {
  // Check if the necessary data path exists
  if (!sheetData || !sheetData.sheets || sheetData.sheets.length === 0 || 
      !sheetData.sheets[0].data || sheetData.sheets[0].data.length === 0 || 
      !sheetData.sheets[0].data[0].rowData) {
    console.warn("[WORKER convertSpreadsheetGetDataToObjects] No rowData found or unexpected structure from spreadsheets.get API.");
    return [];
  }

  const rowDataArray = sheetData.sheets[0].data[0].rowData;
  if (!rowDataArray || rowDataArray.length === 0) {
    console.warn("[WORKER convertSpreadsheetGetDataToObjects] rowDataArray is empty.");
    return []; 
  }

  let headerCells: string[] = [];
  let dataRowStartIndex = 0;

  // Find the first row with actual values to use as headers
  for (let i = 0; i < rowDataArray.length; i++) {
    const currentRow = rowDataArray[i];
    if (currentRow && currentRow.values && currentRow.values.length > 0) {
      headerCells = currentRow.values.map((cell: sheets_v4.Schema$CellData) => 
        cell && cell.formattedValue !== null && cell.formattedValue !== undefined ? String(cell.formattedValue) : ''
      );
      dataRowStartIndex = i + 1;
      break; 
    }
  }

  if (headerCells.length === 0) {
    console.warn("[WORKER convertSpreadsheetGetDataToObjects] No headers found in the fetched data.");
    return [];
  }

  const objects: Record<string, unknown>[] = [];
  for (let i = dataRowStartIndex; i < rowDataArray.length; i++) {
    const row = rowDataArray[i];
    if (row && row.values && row.values.length > 0) {
      const obj: Record<string, unknown> = {};
      let hasDataInRow = false;
      for (let j = 0; j < headerCells.length; j++) {
        const header = headerCells[j];
        const cellValue = (row.values[j] && row.values[j].formattedValue !== null && row.values[j].formattedValue !== undefined) 
                          ? String(row.values[j].formattedValue) 
                          : '';
        obj[header] = cellValue;
        if (cellValue.trim() !== '') {
          hasDataInRow = true;
        }
      }
      // Only add the object if it has at least one non-empty value for the mapped headers
      // and the corresponding header is not empty
      if (hasDataInRow && headerCells.some(h => h.trim() !== '')) {
        objects.push(obj);
      }
    }
  }
  return objects;
}

app.get("/", (c) => {
  return c.text("Hello from Bodega Discord Activity Server!");
});

app.get("/api/config", (c) => {
  return c.json({
    clientId: c.env.DISCORD_CLIENT_ID
  });
});

app.post("/token", async (c) => {
  const code = await c.req
    .json()
    .then(({ code }) => code as string | undefined)
    .catch(() => undefined);

  if (!code) {
    return c.json({ error: "Code is missing or invalid" }, { status: 400 });
  }

  const response = await fetch(
    "https://discord.com/api/oauth2/token",
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
  );

  if (!response.ok) {
    const errorBody = await response.text(); 
    console.error("Token exchange failed:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      codeUsed: code
    });
    return c.json({ error: "Failed to exchange code for token.", details: errorBody }, response.status as ContentfulStatusCode);
  }

  const tokenData = await response.json() as { access_token?: string; error?: string }; 
  return c.json(tokenData);
});

app.get('/api/sheet-data/:sheetName', async (c) => {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
  const API_KEY = process.env.GOOGLE_API_KEY; 
  // const SERVICE_ACCOUNT_JSON_STRING = c.env.SERVICE_ACCOUNT_JSON;

  if (!SPREADSHEET_ID) {
    console.error("[WORKER /api/sheet-data] Missing SPREADSHEET_ID environment variable.");
    return c.json({ error: 'Server configuration error: Missing Google Sheet ID.' }, { status: 500 });
  }
  // TODO: Prioritize Service Account if SERVICE_ACCOUNT_JSON_STRING is present
  if (!API_KEY) { 
    console.error("[WORKER /api/sheet-data] Missing GOOGLE_API_KEY environment variable.");
    return c.json({ error: 'Server configuration error: Missing Google API Key.' }, { status: 500 });
  }

  const sheetNameFromParam = c.req.param('sheetName');
  const rangeQuery = c.req.query('range');
  // If range is provided, use it. Otherwise, just use sheet name to get all cells.
  const effectiveRange = rangeQuery ? `${sheetNameFromParam}!${rangeQuery}` : sheetNameFromParam;

  if (!sheetNameFromParam) {
    console.error("[WORKER /api/sheet-data] Sheet name not provided in URL parameter.");
    return c.json({ error: 'Sheet name must be provided.' }, { status: 400 });
  }

  console.log(`[WORKER /api/sheet-data] Attempting to fetch sheet: '${sheetNameFromParam}', effective range: '${effectiveRange}' from SPREADSHEET_ID: '${SPREADSHEET_ID}'`);

  try {
    const sheets = google.sheets({ version: 'v4', auth: API_KEY });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: [effectiveRange],
      includeGridData: true, 
    });

    if (!response.data || !response.data.sheets || response.data.sheets.length === 0) {
      console.warn(`[WORKER /api/sheet-data] No sheets data returned for range '${effectiveRange}'. The sheet might be empty, name/range incorrect, or not found.`);
      return c.json([]);
    }

    const objects = convertSpreadsheetGetDataToObjects(response.data);
    return c.json(objects);

  } catch (e: unknown) {
    let errorMessage = 'Failed to fetch sheet data from Google Sheets API.';
    let errorDetails = 'Unknown error';
    let statusCode = 500;

    if (e && typeof e === 'object' && e !== null && 'response' in e && e.response && typeof e.response === 'object' && e.response !== null && 'data' in e.response && e.response.data && typeof e.response.data === 'object' && e.response.data !== null && 'error' in e.response.data) {
      const googleError = e.response.data.error as GoogleApiErrorFields; // Assuming googleError has a predictable structure
      console.error(`[WORKER /api/sheet-data] Google API Error for range '${effectiveRange}': ${googleError.code} ${googleError.message}`, googleError.details);
      errorDetails = `${googleError.message} (Code: ${googleError.code})`;
      if (googleError.code === 403) {
        errorMessage = 'Permission denied. Ensure API key is valid and sheet has correct sharing settings (e.g., public or shared with API key user/service account).';
        statusCode = 403;
      } else if (googleError.code === 400 && googleError.message && googleError.message.includes('Unable to parse range')) {
        errorMessage = `Invalid sheet name or range format: '${effectiveRange}'. Check sheet name and A1 notation.`;
        statusCode = 400;
      } else if (googleError.code === 404) {
        errorMessage = `Spreadsheet not found (ID: ${SPREADSHEET_ID}) or sheet/range '${effectiveRange}' does not exist.`;
        statusCode = 404;
      }
    } else {
      console.error(`[WORKER /api/sheet-data] Error fetching from Google Sheets API for range '${effectiveRange}': ${errorDetails}`, e);
    }
    return c.json({ error: errorMessage, details: errorDetails }, statusCode as ContentfulStatusCode); // Cast to any for status code to bypass Hono's specific types for now
  }
});

// --- Static Asset Serving --- //

// Fallback for all other GET requests: serve static assets from Vite build
// This should be the LAST route added to Hono for GET requests.
// In production, Cloudflare Pages or a similar service will serve static assets.
// The ASSETS binding is used here for that purpose.
// During development with Vite, Vite's dev server handles static assets.
if (process.env.NODE_ENV === 'production') {
  app.get('*', (c) => {
    if (c.env && c.env.ASSETS) {
      return c.env.ASSETS.fetch(c.req.raw);
    }
    // Optional: return a 404 or a message if ASSETS is not available even in PROD for some reason
    console.error("ASSETS binding not found in production environment.");
    return c.text('Static asset serving is misconfigured.', 500);
  });
}

// Export the Hono app to be used by the Cloudflare Workers runtime

export default app;
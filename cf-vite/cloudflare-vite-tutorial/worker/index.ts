import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
// import { google } from 'googleapis'; // For Google Sheets API (Temporarily commented out for payload size debugging)

// --- Type Definitions --- //

// For the parsed body of the /token request
interface TokenRequestBody {
  code: string;
}

// For the successful token response from Discord
interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// For Discord OAuth error responses
interface DiscordOAuthErrorData {
  error: string;
  error_description?: string;
  message?: string; // Discord sometimes uses 'message'
  code?: number;    // And 'code'
}

// For the /api/config response
interface ApiConfigResponse {
  discordClientId: string;
}

// For the /api/sheet-data response (successful)
interface SheetDataResponse {
  data: Record<string, string>[];
  message?: string; // Optional message for empty sheets or errors
}

// For Google API error structure
interface GoogleApiErrorDetail {
  domain?: string;
  reason?: string;
  message?: string;
  extendedHelp?: string;
  sendReport?: string;
}

interface GoogleApiErrorStructure {
  code?: number;
  message?: string;
  errors?: GoogleApiErrorDetail[];
  status?: string;
}

// Generic API error response structure from our worker
interface ApiErrorResponse {
  error: string;
  details?: DiscordOAuthErrorData | GoogleApiErrorDetail[] | GoogleApiErrorStructure | string | null;
}


// Define the Bindings interface for Cloudflare Worker environment variables and services
interface Bindings {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GOOGLE_SHEET_ID: string;
  GOOGLE_API_KEY: string;
  ASSETS: Fetcher; // Service binding for Vite's static assets
}

const app = new Hono<{ Bindings: Bindings }>();

// Apply CORS middleware to all routes
app.use('*', cors({
  origin: '*', // Consider restricting this in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Helper function to convert Google Sheets API data to a more usable array of objects
// function convertSpreadsheetGetDataToObjects(data: any[][]): Record<string, string>[] { // (Temporarily commented out for payload size debugging)
// The following function body is temporarily commented out for payload size debugging:
//   if (!data || data.length < 2) {
//     // Needs at least one header row and one data row
//     return [];
//   }
//   const headers = data[0];            // First row is headers
//   const rows = data.slice(1);         // Remaining rows are data
//
//   return rows.map(row => { 
//     const obj: Record<string, string> = {};
//     headers.forEach((header, index) => {
//       obj[header] = String(row[index] !== undefined ? row[index] : '');
//     });
//     return obj;
//   });
// } // Closing bracket for convertSpreadsheetGetDataToObjects - ensure this is correctly placed when uncommenting
// Function body commented out as part of convertSpreadsheetGetDataToObjects

// --- API Routes --- //

// Root endpoint (e.g., for health check or basic info)
// Note: The frontend makes calls to /api/* and /token, not directly to '/'
// This root '/' is primarily for the worker itself, not client-facing for this app.
app.get('/', (c) => {
  return c.json({ message: 'Bodega Activity API Worker is running!' });
});

// Endpoint to provide Discord Client ID to the frontend
app.get('/api/config', (c) => {
  // return c.json<ApiConfigResponse>({ discordClientId: c.env.DISCORD_CLIENT_ID });
  console.log('Worker /api/config hit. Env DISCORD_CLIENT_ID:', c.env.DISCORD_CLIENT_ID); // Log access and env var
  return c.json<ApiConfigResponse>({ discordClientId: "test_client_id_from_worker" });
});

// Endpoint to exchange authorization code for Discord OAuth token
app.post('/token', async (c) => {
  try {
    const body = await c.req.json<TokenRequestBody>();
    if (!body.code) {
      return c.json({ error: 'Authorization code is missing' }, 400);
    }

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: c.env.DISCORD_CLIENT_ID,
        client_secret: c.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: body.code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json<DiscordOAuthErrorData>();
      console.error('Discord token exchange failed:', JSON.stringify(errorData));
      return c.json<ApiErrorResponse>({ error: 'Failed to fetch token from Discord', details: errorData }, response.status as ContentfulStatusCode);
    }
    const successData = await response.json<DiscordTokenResponse>();
    return c.json<DiscordTokenResponse>(successData);
  } catch (error: unknown) {
    let errorMessage = 'Internal server error during token exchange';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error in /token endpoint:', error.message, error.stack);
    } else {
      console.error('Error in /token endpoint (unknown type):', error);
    }
    return c.json({ error: errorMessage }, 500);
  }
});

// Endpoint to fetch data from a specified Google Sheet
app.get('/api/sheet-data/:sheetName', async (c) => {
  const sheetName = c.req.param('sheetName');
  // const { GOOGLE_API_KEY, GOOGLE_SHEET_ID } = c.env; // (Temporarily commented out for payload size debugging)

  if (!sheetName) {
    return c.json({ error: 'Sheet name parameter is required' }, 400);
  }

  // Temporarily return minimal data to diagnose Max payload size error
  console.log(`Temporarily returning minimal data for sheet: ${sheetName}`);
  return c.json<SheetDataResponse>({ data: [{ "col1": "test", "col2": "data" }], message: "Temporary minimal data" });

  /* 
  // Original Google Sheets API call logic:
  try {
    const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: sheetName, // e.g., 'Sheet1' or 'Sheet1!A1:D10'
    });

    if (!response.data.values || response.data.values.length === 0) {
      return c.json<SheetDataResponse>({ data: [], message: 'No data found in the specified sheet or sheet is empty.' });
    }
    
    const data = convertSpreadsheetGetDataToObjects(response.data.values);
    return c.json<SheetDataResponse>({ data });

  } catch (error: unknown) {
    let errorMessage = `Failed to fetch data for sheet: ${sheetName}`;
    let errorDetails: GoogleApiErrorDetail[] | string | undefined | null = null;
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`Error fetching Google Sheet data for '${sheetName}':`, error.message, error.stack);

      // Attempt to parse Google API like error structure
      const errorResponse = (error as any).response?.data?.error as GoogleApiErrorStructure | undefined;
      if (errorResponse?.message) {
        errorMessage = `Google API Error: ${errorResponse.message}`;
        errorDetails = errorResponse.errors;
        statusCode = errorResponse.code || 500;
      } else {
        // Fallback if not a Google API structured error but still an Error instance
        errorDetails = error.message; 
      }
    } else {
      console.error(`Error fetching Google Sheet data for '${sheetName}' (unknown type):`, error);
      errorDetails = 'An unknown error occurred.';
    }
    return c.json<ApiErrorResponse>({ error: errorMessage, details: errorDetails }, statusCode as ContentfulStatusCode);
  }
  */

});

// --- Static Asset Serving --- //

// Fallback for all other GET requests: serve static assets from Vite build
// This should be the LAST route added to Hono for GET requests.
// In production, Cloudflare Pages or a similar service will serve static assets.
// The ASSETS binding is used here for that purpose.
// During development with Vite, Vite's dev server handles static assets.
if (import.meta.env.PROD) {
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
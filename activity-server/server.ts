import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the dist/activity directory
app.use(express.static(path.join(__dirname, '../dist/activity')));

// API endpoint to fetch Google Sheets data
app.get('/api/sheet-data', async (req, res) => {
  try {
    const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_CSV_URL;
    if (!GOOGLE_SHEETS_URL) {
      return res.status(500).json({ error: 'Google Sheets URL not configured' });
    }

    const response = await fetch(GOOGLE_SHEETS_URL);
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch Google Sheets data: ${response.statusText}` 
      });
    }

    const csvData = await response.text();
    const parsedData = parseCSV(csvData);
    
    res.json(parsedData);
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Helper function to parse CSV data
function parseCSV(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(header => header.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    // Create an object with headers as keys
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }
  
  return result;
}

// Discord OAuth2 callback endpoint
app.get('/oauth/callback', (req, res) => {
  // This would handle the OAuth flow if needed
  res.send('Authentication successful! You can close this window.');
});

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/activity/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

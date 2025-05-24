import { DiscordSDK } from "@discord/embedded-app-sdk";

// Google Sheets CSV URL - Replace with your own Google Sheet's published CSV URL
// To get this URL: File > Share > Publish to web > Select CSV format > Publish
const GOOGLE_SHEETS_CSV_URL = 'YOUR_GOOGLE_SHEETS_CSV_PUBLISHED_URL';

// Discord SDK setup
const discordSdk = new (window as any).DiscordSDK(process.env.CLIENT_ID!);

// DOM Elements
const loadingElement = document.getElementById('loading') as HTMLElement;
const errorElement = document.getElementById('error') as HTMLElement;
const contentElement = document.getElementById('content') as HTMLElement;
const tableHeaders = document.getElementById('table-headers') as HTMLElement;
const tableBody = document.getElementById('table-body') as HTMLElement;

// Parse CSV string to array of objects
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(header => header.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
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
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }
  
  return result;
}

// Fetch data from Google Sheets
async function fetchData() {
  try {
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    contentElement.style.display = 'none';
    
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const data = parseCSV(csvText);
    
    if (data.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    renderTable(data);
    
    // Refresh data every 30 seconds
    setTimeout(fetchData, 30000);
  } catch (error) {
    console.error('Error fetching data:', error);
    showError(`Error loading data: ${error.message}`);
    // Retry after 10 seconds on error
    setTimeout(fetchData, 10000);
  } finally {
    loadingElement.style.display = 'none';
  }
}

// Render data in the table
function renderTable(data: any[]) {
  // Clear previous data
  tableHeaders.innerHTML = '';
  tableBody.innerHTML = '';
  
  // Set headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      tableHeaders.appendChild(th);
    });
    
    // Set rows
    data.forEach(row => {
      const tr = document.createElement('tr');
      Object.values(row).forEach((value: any) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
    
    contentElement.style.display = 'block';
  }
}

// Show error message
function showError(message: string) {
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// Initialize the app
async function init() {
  try {
    await discordSdk.ready();
    console.log('Discord SDK is ready');
    
    // Start fetching data
    fetchData();
    
  } catch (error) {
    console.error('Error initializing Discord SDK:', error);
    showError('Failed to initialize Discord. Please try refreshing the page.');
    loadingElement.style.display = 'none';
  }
}

// Start the app when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

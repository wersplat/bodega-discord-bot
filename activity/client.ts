// Extend the Window interface to include ENV for TypeScript
declare global {
  interface Window {
    ENV: {
      DISCORD_CLIENT_ID: string;
      GOOGLE_SHEETS_CSV_URL: string;
    };
  }
}

// Define types for our data
interface DataRow {
  [key: string]: string;
}

// DOM Elements
const loadingElement = document.getElementById('loading') as HTMLElement;
const errorElement = document.getElementById('error') as HTMLElement;
const contentElement = document.getElementById('content') as HTMLElement;
const tableHeaders = document.getElementById('table-headers') as HTMLElement;
const tableBody = document.getElementById('table-body') as HTMLElement;
const refreshButton = document.getElementById('refreshData') as HTMLElement;
const openSheetButton = document.getElementById('openSheet') as HTMLElement;

// API endpoint for fetching sheet data
const API_ENDPOINT = '/api/sheet-data';

declare global {
  interface Window {
    ENV: {
      DISCORD_CLIENT_ID: string;
      GOOGLE_SHEETS_CSV_URL: string;
    };
  }
}

// Google Sheets URL for direct viewing
const GOOGLE_SHEETS_URL = window.ENV.GOOGLE_SHEETS_CSV_URL;

// Initialize the Discord SDK
// Using window.DiscordSDK which is provided by Discord's script
import { DiscordSDK } from "@discord/embedded-app-sdk";

// Initialize the Discord SDK using the npm package import
const discordSdk = new DiscordSDK(window.ENV.DISCORD_CLIENT_ID);

// Fetch data from our backend API
async function fetchData(): Promise<void> {
  try {
    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (contentElement) contentElement.style.display = 'none';
    
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as DataRow[];
    
    if (data.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    renderTable(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    showError(`Error loading data: ${errorMessage}`);
  } finally {
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

// Render data in the table
function renderTable(data: DataRow[]): void {
  if (!tableHeaders || !tableBody || !contentElement) return;
  
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
      Object.values(row).forEach(value => {
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
function showError(message: string): void {
  if (!errorElement) return;
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// Handle opening the Google Sheet
async function handleOpenSheet() {
  try {
    // Try to open in Discord's external browser
    await discordSdk.commands.openExternalLink({
      url: GOOGLE_SHEETS_URL
    });
  } catch (error) {
    console.error('Error opening sheet in Discord:', error);
    // Fallback to regular window.open
    window.open(GOOGLE_SHEETS_URL, '_blank');
  }
}

// Initialize the app
async function initApp() {
  try {
    await discordSdk.ready();
    console.log('Discord SDK is ready');
    
    // Set up event listeners
    if (openSheetButton) {
      openSheetButton.addEventListener('click', handleOpenSheet);
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', fetchData);
    }
    
    // Initial data fetch
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    setInterval(fetchData, 30000);
  } catch (error) {
    console.error('Error initializing Discord SDK:', error);
    showError(`Failed to initialize Discord SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Fallback for when not in Discord
    if (openSheetButton) {
      openSheetButton.addEventListener('click', () => {
        window.open(GOOGLE_SHEETS_URL, '_blank');
      });
    }
    
    // Still try to fetch data even if Discord SDK fails
    fetchData();
  }
}

// Initialize the app when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

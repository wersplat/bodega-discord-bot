const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const contentEl = document.getElementById('content');
const refreshBtn = document.getElementById('refreshData');
const openSheetBtn = document.getElementById('openSheet');

// Fetch data from the /standings endpoint
async function loadData() {
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  contentEl.style.display = 'none';

  try {
    const response = await fetch('/standings');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Inject the HTML response into the page
    contentEl.innerHTML = html;
    contentEl.style.display = 'block';
    loadingEl.style.display = 'none';
  } catch (error) {
    console.error('Error loading standings:', error);
    errorEl.textContent = 'Failed to load standings. Please try again.';
    errorEl.style.display = 'block';
  } finally {
    loadingEl.style.display = 'none';
  }
}

// Open the Google Sheet in a new tab
openSheetBtn.addEventListener('click', () => {
  const sheetId = window.ENV.GOOGLE_SHEET_ID;
  if (sheetId) {
    window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
  } else {
    console.error('Google Sheet ID not found in environment variables');
  }
});

// Load data on page load and set up refresh button
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  refreshBtn.addEventListener('click', loadData);
});

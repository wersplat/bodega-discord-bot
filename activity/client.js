"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Get Google Sheets URL from window object set in index.html
var GOOGLE_SHEETS_CSV_URL = window.GOOGLE_SHEETS_CSV_URL;
if (!GOOGLE_SHEETS_CSV_URL) {
    console.error('Google Sheets URL is not set');
}
// Discord SDK setup
var discordSdk = new window.DiscordSDK(process.env.CLIENT_ID);
// DOM Elements
var loadingElement = document.getElementById('loading');
var errorElement = document.getElementById('error');
var contentElement = document.getElementById('content');
var tableHeaders = document.getElementById('table-headers');
var tableBody = document.getElementById('table-body');
// Parse CSV string to array of objects
function parseCSV(csvText) {
    var lines = csvText.split('\n').filter(function (line) { return line.trim() !== ''; });
    if (lines.length === 0)
        return [];
    var headers = lines[0].split(',').map(function (header) { return header.trim(); });
    var result = [];
    var _loop_1 = function (i) {
        var values = [];
        var currentValue = '';
        var inQuotes = false;
        for (var j = 0; j < lines[i].length; j++) {
            var char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = '';
            }
            else {
                currentValue += char;
            }
        }
        // Add the last value
        values.push(currentValue);
        // Create an object with headers as keys
        var row = {};
        headers.forEach(function (header, index) {
            row[header] = values[index] || '';
        });
        result.push(row);
    };
    for (var i = 1; i < lines.length; i++) {
        _loop_1(i);
    }
    return result;
}
// Fetch data from Google Sheets
function fetchData() {
    return __awaiter(this, void 0, void 0, function () {
        var response, csvText, data, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    loadingElement.style.display = 'block';
                    errorElement.style.display = 'none';
                    contentElement.style.display = 'none';
                    return [4 /*yield*/, fetch(GOOGLE_SHEETS_CSV_URL)];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.text()];
                case 2:
                    csvText = _a.sent();
                    data = parseCSV(csvText);
                    if (data.length === 0) {
                        throw new Error('No data found in the sheet');
                    }
                    renderTable(data);
                    // Refresh data every 30 seconds
                    setTimeout(fetchData, 30000);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error fetching data:', error_1);
                    errorMessage = error_1 instanceof Error ? error_1.message : 'An unknown error occurred';
                    showError("Error loading data: ".concat(errorMessage));
                    // Retry after 10 seconds on error
                    setTimeout(fetchData, 10000);
                    return [3 /*break*/, 5];
                case 4:
                    loadingElement.style.display = 'none';
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Render data in the table
function renderTable(data) {
    // Clear previous data
    tableHeaders.innerHTML = '';
    tableBody.innerHTML = '';
    // Set headers
    if (data.length > 0) {
        var headers = Object.keys(data[0]);
        headers.forEach(function (header) {
            var th = document.createElement('th');
            th.textContent = header;
            tableHeaders.appendChild(th);
        });
        // Set rows
        data.forEach(function (row) {
            var tr = document.createElement('tr');
            Object.values(row).forEach(function (value) {
                var td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
        contentElement.style.display = 'block';
    }
}
// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}
// Initialize the app
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, discordSdk.ready()];
                case 1:
                    _a.sent();
                    console.log('Discord SDK is ready');
                    // Start fetching data
                    fetchData();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error initializing Discord SDK:', error_2);
                    errorMessage = error_2 instanceof Error ? error_2.message : 'Failed to initialize Discord';
                    showError("".concat(errorMessage, ". Please try refreshing the page."));
                    loadingElement.style.display = 'none';
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Start the app when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}

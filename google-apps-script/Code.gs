/**
 * FinTrack - Google Apps Script Backend
 * =====================================
 * 
 * PETUNJUK SETUP:
 * 1. Buat Google Spreadsheet baru
 * 2. Buka Extensions > Apps Script
 * 3. Hapus semua code, paste code ini
 * 4. Ganti SPREADSHEET_ID dengan ID spreadsheet Anda
 *    (ID ada di URL: https://docs.google.com/spreadsheets/d/[ID_DISINI]/edit)
 * 5. Jalankan fungsi setupSpreadsheet() sekali (Run > setupSpreadsheet)
 * 6. Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy URL deployment, paste di app Settings
 */

// ===== KONFIGURASI =====
const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_ANDA';

// ===== HELPER =====
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(name);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateId() {
  return 'TXN_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 5);
}

// ===== SETUP =====
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  
  // Create Transactions sheet
  let txnSheet = ss.getSheetByName('Transactions');
  if (!txnSheet) {
    txnSheet = ss.insertSheet('Transactions');
  }
  txnSheet.getRange(1, 1, 1, 7).setValues([
    ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Created']
  ]);
  txnSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4A90D9').setFontColor('#FFFFFF');
  txnSheet.setColumnWidths(1, 7, 150);
  
  // Create Settings sheet
  let settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
  }
  settingsSheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  settingsSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4A90D9').setFontColor('#FFFFFF');
  
  // Set default settings
  settingsSheet.getRange(2, 1, 2, 2).setValues([
    ['userName', 'User'],
    ['currency', 'Rp']
  ]);
  
  Logger.log('Setup selesai! Spreadsheet siap digunakan.');
}

// ===== HTTP HANDLERS =====
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getTransactions':
        return getTransactions(e);
      case 'getStatistics':
        return getStatistics(e);
      case 'getSettings':
        return getSettings();
      case 'ping':
        return jsonResponse({ status: 'ok', message: 'FinTrack API is running' });
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'addTransaction':
        return addTransaction(data);
      case 'updateTransaction':
        return updateTransaction(data);
      case 'deleteTransaction':
        return deleteTransaction(data);
      case 'updateSettings':
        return updateSettings(data);
      case 'syncTransactions':
        return syncTransactions(data);
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ===== TRANSACTIONS =====
function getTransactions(e) {
  const sheet = getSheet('Transactions');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ success: true, transactions: [] });
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const month = e.parameter.month; // Format: '2026-03'
  
  let transactions = data.map(row => ({
    id: row[0],
    date: formatDate(row[1]),
    type: row[2],
    category: row[3],
    amount: Number(row[4]),
    description: row[5],
    created: row[6] ? new Date(row[6]).toISOString() : ''
  })).filter(t => t.id); // Filter rows kosong
  
  // Filter by month if specified
  if (month) {
    transactions = transactions.filter(t => t.date.startsWith(month));
  }
  
  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return jsonResponse({ success: true, transactions: transactions });
}

function addTransaction(data) {
  const sheet = getSheet('Transactions');
  const id = generateId();
  const now = new Date();
  
  sheet.appendRow([
    id,
    data.date || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    data.type,
    data.category,
    Number(data.amount),
    data.description || '',
    now.toISOString()
  ]);
  
  return jsonResponse({ success: true, id: id, message: 'Transaksi berhasil ditambahkan' });
}

function updateTransaction(data) {
  const sheet = getSheet('Transactions');
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.indexOf(data.id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Transaksi tidak ditemukan' });
  }
  
  const row = rowIndex + 2;
  sheet.getRange(row, 2, 1, 5).setValues([[
    data.date,
    data.type,
    data.category,
    Number(data.amount),
    data.description || ''
  ]]);
  
  return jsonResponse({ success: true, message: 'Transaksi berhasil diubah' });
}

function deleteTransaction(data) {
  const sheet = getSheet('Transactions');
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.indexOf(data.id);
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Transaksi tidak ditemukan' });
  }
  
  sheet.deleteRow(rowIndex + 2);
  return jsonResponse({ success: true, message: 'Transaksi berhasil dihapus' });
}

function syncTransactions(data) {
  const sheet = getSheet('Transactions');
  const transactions = data.transactions || [];
  
  // Get existing IDs
  const lastRow = sheet.getLastRow();
  let existingIds = [];
  if (lastRow > 1) {
    existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  }
  
  let added = 0;
  transactions.forEach(t => {
    if (!existingIds.includes(t.id)) {
      sheet.appendRow([
        t.id,
        t.date,
        t.type,
        t.category,
        Number(t.amount),
        t.description || '',
        t.created || new Date().toISOString()
      ]);
      added++;
    }
  });
  
  return jsonResponse({ 
    success: true, 
    message: `Sinkronisasi selesai. ${added} transaksi baru ditambahkan.`,
    added: added
  });
}

// ===== STATISTICS =====
function getStatistics(e) {
  const sheet = getSheet('Transactions');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ 
      success: true, 
      totalIncome: 0, 
      totalExpense: 0, 
      balance: 0,
      categoryBreakdown: [],
      monthlyData: []
    });
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const month = e.parameter.month;
  
  let transactions = data.map(row => ({
    date: formatDate(row[1]),
    type: row[2],
    category: row[3],
    amount: Number(row[4])
  })).filter(t => t.type);
  
  // Filter by month if specified
  let filtered = transactions;
  if (month) {
    filtered = transactions.filter(t => t.date.startsWith(month));
  }
  
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  // Category breakdown
  const categoryMap = {};
  filtered.filter(t => t.type === 'expense').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const categoryBreakdown = Object.entries(categoryMap).map(([name, amount]) => ({
    category: name,
    amount: amount
  })).sort((a, b) => b.amount - a.amount);
  
  // Monthly data (last 6 months)
  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
    const monthTxns = transactions.filter(t => t.date.startsWith(m));
    monthlyData.push({
      month: m,
      label: Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM'),
      income: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    });
  }
  
  // Overall balance (all time)
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  return jsonResponse({
    success: true,
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    balance: allIncome - allExpense,
    categoryBreakdown: categoryBreakdown,
    monthlyData: monthlyData
  });
}

// ===== SETTINGS =====
function getSettings() {
  const sheet = getSheet('Settings');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ success: true, settings: {} });
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const settings = {};
  data.forEach(row => {
    if (row[0]) settings[row[0]] = row[1];
  });
  
  return jsonResponse({ success: true, settings: settings });
}

function updateSettings(data) {
  const sheet = getSheet('Settings');
  const lastRow = sheet.getLastRow();
  
  let existingKeys = [];
  if (lastRow > 1) {
    existingKeys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  }
  
  Object.entries(data.settings).forEach(([key, value]) => {
    const idx = existingKeys.indexOf(key);
    if (idx !== -1) {
      sheet.getRange(idx + 2, 2).setValue(value);
    } else {
      sheet.appendRow([key, value]);
    }
  });
  
  return jsonResponse({ success: true, message: 'Pengaturan berhasil disimpan' });
}

// ===== UTILITY =====
function formatDate(dateValue) {
  if (!dateValue) return '';
  try {
    if (dateValue instanceof Date) {
      return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return String(dateValue).substring(0, 10);
  } catch (e) {
    return String(dateValue);
  }
}

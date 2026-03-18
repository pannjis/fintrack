// ===================================================================
// FinTrack - Finance Tracker App
// ===================================================================

// ===== CONFIGURATION =====
const CONFIG = {
  STORAGE_KEY: 'fintrack_data',
  SETTINGS_KEY: 'fintrack_settings',
  VERSION: '1.0.0'
};

// ===== CATEGORIES =====
const CATEGORIES = {
  income: [
    { id: 'gaji', name: 'Gaji', icon: 'work', color: '#00b894' },
    { id: 'freelance', name: 'Freelance', icon: 'laptop_mac', color: '#00cec9' },
    { id: 'investasi', name: 'Investasi', icon: 'trending_up', color: '#0984e3' },
    { id: 'bisnis', name: 'Bisnis', icon: 'store', color: '#6c5ce7' },
    { id: 'hadiah', name: 'Hadiah', icon: 'card_giftcard', color: '#fd79a8' },
    { id: 'lainnya_in', name: 'Lainnya', icon: 'more_horiz', color: '#636e72' }
  ],
  expense: [
    { id: 'makanan', name: 'Makanan', icon: 'restaurant', color: '#e74c3c' },
    { id: 'transport', name: 'Transport', icon: 'directions_car', color: '#e67e22' },
    { id: 'belanja', name: 'Belanja', icon: 'shopping_bag', color: '#f39c12' },
    { id: 'tagihan', name: 'Tagihan', icon: 'receipt', color: '#9b59b6' },
    { id: 'hiburan', name: 'Hiburan', icon: 'sports_esports', color: '#3498db' },
    { id: 'kesehatan', name: 'Kesehatan', icon: 'local_hospital', color: '#1abc9c' },
    { id: 'pendidikan', name: 'Pendidikan', icon: 'school', color: '#2ecc71' },
    { id: 'rumah', name: 'Rumah Tangga', icon: 'home', color: '#34495e' },
    { id: 'lainnya_ex', name: 'Lainnya', icon: 'more_horiz', color: '#636e72' }
  ]
};

// ===== STATE =====
let state = {
  transactions: [],
  settings: {
    userName: 'User',
    gasUrl: ''
  },
  currentPage: 'dashboard',
  currentMonth: new Date().toISOString().slice(0, 7),
  filterType: 'all',
  searchQuery: '',
  selectedCategory: null,
  transactionType: 'expense',
  editingSettingKey: null
};

// Chart instances
let monthlyChart = null;
let categoryChart = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadData();
  updateGreeting();
  updateBalanceMonth();
  setInputDate();
  renderDashboard();
  renderCategoryGrid('expense');
  registerServiceWorker();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW error:', err));
  }
}

// ===== DATA MANAGEMENT =====
function loadData() {
  try {
    const data = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (data) {
      state.transactions = JSON.parse(data);
    }
    const settings = localStorage.getItem(CONFIG.SETTINGS_KEY);
    if (settings) {
      state.settings = { ...state.settings, ...JSON.parse(settings) };
    }
  } catch (e) {
    console.error('Load data error:', e);
  }
  updateSettingsUI();
}

function saveData() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.transactions));
    localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error('Save data error:', e);
  }
}

// ===== NAVIGATION =====
function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  state.currentPage = page;

  // Render page content
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'statistics':
      renderStatistics();
      break;
    case 'transactions':
      renderAllTransactions();
      break;
    case 'profile':
      renderProfile();
      break;
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== GREETING =====
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Selamat Malam';
  if (hour >= 5 && hour < 12) greeting = 'Selamat Pagi';
  else if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';

  document.getElementById('greeting-text').textContent = greeting;
  document.getElementById('greeting-name').textContent = `Halo, ${state.settings.userName} 👋`;
}

function updateBalanceMonth() {
  const date = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('balance-month').textContent = `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ===== FORMAT HELPERS =====
function formatCurrency(amount) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(amount));
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getCategoryInfo(categoryId, type) {
  const cats = CATEGORIES[type] || CATEGORIES.expense;
  return cats.find(c => c.id === categoryId) || { name: categoryId, icon: 'help', color: '#636e72' };
}

function generateId() {
  return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

// ===== DASHBOARD =====
function renderDashboard() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  // Calculate totals for current month
  const monthTxns = state.transactions.filter(t => t.date.startsWith(currentMonth));
  const totalIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Calculate total balance (all time)
  const allIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = allIncome - allExpense;

  document.getElementById('total-balance').textContent = formatCurrency(balance);
  document.getElementById('total-income').textContent = formatCurrency(totalIncome);
  document.getElementById('total-expense').textContent = formatCurrency(totalExpense);

  // Recent transactions (last 5)
  renderRecentTransactions();
}

function renderRecentTransactions() {
  const container = document.getElementById('recent-transactions');
  const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">receipt_long</span>
        <p>Belum ada transaksi</p>
        <small>Tap + untuk menambah transaksi pertama</small>
      </div>`;
    return;
  }

  container.innerHTML = recent.map(t => createTransactionHTML(t)).join('');
}

function createTransactionHTML(t) {
  const cat = getCategoryInfo(t.category, t.type);
  const isIncome = t.type === 'income';
  const amountClass = isIncome ? 'income' : 'expense';
  const amountPrefix = isIncome ? '+' : '-';

  return `
    <div class="transaction-item type-${t.type}" onclick="showTransactionOptions('${t.id}')">
      <div class="txn-icon" style="background: ${cat.color}15; color: ${cat.color}">
        <span class="material-icons-round">${cat.icon}</span>
      </div>
      <div class="txn-info">
        <div class="txn-category">${cat.name}</div>
        <div class="txn-desc">${t.description || 'Tidak ada catatan'}</div>
      </div>
      <div class="txn-right">
        <div class="txn-amount ${amountClass}">${amountPrefix}${formatCurrency(t.amount)}</div>
        <div class="txn-date">${formatDateShort(t.date)}</div>
      </div>
    </div>`;
}

// ===== STATISTICS =====
function renderStatistics() {
  updateMonthLabel();
  const month = state.currentMonth;
  const monthTxns = state.transactions.filter(t => t.date.startsWith(month));

  const totalIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  document.getElementById('stats-income').textContent = formatCurrency(totalIncome);
  document.getElementById('stats-expense').textContent = formatCurrency(totalExpense);

  renderMonthlyChart();
  renderCategoryChart(month);
  renderMonthTransactions(month);
}

function updateMonthLabel() {
  const [year, month] = state.currentMonth.split('-').map(Number);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('current-month-label').textContent = `${months[month - 1]} ${year}`;
}

function changeMonth(delta) {
  const [year, month] = state.currentMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  state.currentMonth = date.toISOString().slice(0, 7);
  renderStatistics();
}

function renderMonthlyChart() {
  const ctx = document.getElementById('monthly-chart');
  if (!ctx) return;

  const now = new Date();
  const labels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    labels.push(months[d.getMonth()]);

    const monthTxns = state.transactions.filter(t => t.date.startsWith(m));
    incomeData.push(monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    expenseData.push(monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(0, 184, 148, 0.7)',
          borderColor: '#00b894',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 20
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(231, 76, 60, 0.7)',
          borderColor: '#e74c3c',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 20
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#6B7280',
            font: { size: 11, family: 'Inter' },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e8e8e8',
          bodyColor: '#a0a0b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF', font: { size: 11, family: 'Inter' } }
        },
        y: {
          grid: { color: '#F3F4F6' },
          ticks: {
            color: '#9CA3AF',
            font: { size: 10, family: 'Inter' },
            callback: function(value) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'rb';
              return value;
            }
          }
        }
      }
    }
  });
}

function renderCategoryChart(month) {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  const monthTxns = state.transactions.filter(t => t.date.startsWith(month) && t.type === 'expense');

  // Group by category
  const categoryMap = {};
  monthTxns.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const entries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const labels = [];
  const data = [];
  const colors = [];

  entries.forEach(([catId, amount]) => {
    const cat = getCategoryInfo(catId, 'expense');
    labels.push(cat.name);
    data.push(amount);
    colors.push(cat.color);
  });

  // Render legend
  const legendContainer = document.getElementById('category-legend');
  if (entries.length === 0) {
    legendContainer.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.8rem;">Belum ada data pengeluaran</p>';
  } else {
    legendContainer.innerHTML = entries.map(([catId, amount], i) => {
      const cat = getCategoryInfo(catId, 'expense');
      return `<div class="legend-item">
        <div class="legend-dot" style="background: ${cat.color}"></div>
        <span>${cat.name}: ${formatCurrency(amount)}</span>
      </div>`;
    }).join('');
  }

  if (categoryChart) categoryChart.destroy();

  if (data.length === 0) {
    // Show empty state
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Belum ada data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(108, 108, 128, 0.2)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        cutout: '65%'
      }
    });
    return;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e8e8e8',
          bodyColor: '#a0a0b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderMonthTransactions(month) {
  const container = document.getElementById('stats-transactions');
  const txns = state.transactions
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (txns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">event_busy</span>
        <p>Belum ada transaksi bulan ini</p>
      </div>`;
    return;
  }

  container.innerHTML = txns.map(t => createTransactionHTML(t)).join('');
}

// ===== ALL TRANSACTIONS =====
function renderAllTransactions() {
  const container = document.getElementById('all-transactions');
  let txns = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter by type
  if (state.filterType !== 'all') {
    txns = txns.filter(t => t.type === state.filterType);
  }

  // Filter by search
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    txns = txns.filter(t => {
      const cat = getCategoryInfo(t.category, t.type);
      return cat.name.toLowerCase().includes(q) ||
             (t.description && t.description.toLowerCase().includes(q)) ||
             t.amount.toString().includes(q);
    });
  }

  if (txns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">receipt_long</span>
        <p>${state.searchQuery ? 'Tidak ditemukan' : 'Belum ada transaksi'}</p>
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  txns.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  let html = '';
  Object.entries(groups).forEach(([date, items]) => {
    html += `<div class="transaction-date-group">
      <div class="transaction-date-label">${formatDate(date)}</div>
      ${items.map(t => createTransactionHTML(t)).join('')}
    </div>`;
  });

  container.innerHTML = html;
}

function setFilter(type, btn) {
  state.filterType = type;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAllTransactions();
}

function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) {
    document.getElementById('search-input').focus();
  }
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  state.searchQuery = '';
  renderAllTransactions();
}

function filterTransactions() {
  state.searchQuery = document.getElementById('search-input').value;
  renderAllTransactions();
}

// ===== PROFILE =====
function renderProfile() {
  document.getElementById('profile-name').textContent = state.settings.userName;
  updateSettingsUI();
}

function updateSettingsUI() {
  document.getElementById('setting-name').textContent = state.settings.userName;
  document.getElementById('setting-gas-url').textContent =
    state.settings.gasUrl ? state.settings.gasUrl.substring(0, 40) + '...' : 'Belum diatur';
  document.getElementById('greeting-name').textContent = `Halo, ${state.settings.userName} 👋`;
}

// ===== MODAL: ADD TRANSACTION =====
function openAddModal(type) {
  state.transactionType = type || 'expense';
  state.selectedCategory = null;

  // Update type toggle
  setTransactionType(state.transactionType);

  // Reset form
  document.getElementById('input-amount').value = '';
  document.getElementById('input-description').value = '';
  setInputDate();

  // Show modal
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('modal-add').classList.add('active');
  document.getElementById('modal-title').textContent = 'Tambah Transaksi';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-add').classList.remove('active');
}

function setTransactionType(type) {
  state.transactionType = type;
  state.selectedCategory = null;

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  renderCategoryGrid(type);
}

function renderCategoryGrid(type) {
  const grid = document.getElementById('category-grid');
  const cats = CATEGORIES[type] || CATEGORIES.expense;

  grid.innerHTML = cats.map(cat => `
    <button class="category-item" data-id="${cat.id}" onclick="selectCategory('${cat.id}')">
      <div class="cat-icon" style="background: ${cat.color}20; color: ${cat.color}">
        <span class="material-icons-round">${cat.icon}</span>
      </div>
      <span>${cat.name}</span>
    </button>
  `).join('');
}

function selectCategory(id) {
  state.selectedCategory = id;

  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === id);
  });
}

function setInputDate() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  document.getElementById('input-date').value = dateStr;
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('input-amount').value);
  const description = document.getElementById('input-description').value.trim();
  const date = document.getElementById('input-date').value;

  // Validation
  if (!amount || amount <= 0) {
    showToast('Masukkan jumlah yang valid', 'error');
    return;
  }
  if (!state.selectedCategory) {
    showToast('Pilih kategori', 'error');
    return;
  }
  if (!date) {
    showToast('Pilih tanggal', 'error');
    return;
  }

  const transaction = {
    id: generateId(),
    date: date,
    type: state.transactionType,
    category: state.selectedCategory,
    amount: amount,
    description: description,
    created: new Date().toISOString()
  };

  state.transactions.push(transaction);
  saveData();
  closeModal();

  // Refresh current page
  navigateTo(state.currentPage);

  showToast('Transaksi berhasil disimpan!');

  // Sync to Google Sheets if URL is configured
  if (state.settings.gasUrl) {
    syncTransactionToSheet(transaction);
  }
}

// ===== TRANSACTION OPTIONS =====
function showTransactionOptions(id) {
  const txn = state.transactions.find(t => t.id === id);
  if (!txn) return;

  showConfirm(
    'Hapus Transaksi',
    `Hapus transaksi ${getCategoryInfo(txn.category, txn.type).name} sebesar ${formatCurrency(txn.amount)}?`,
    () => deleteTransaction(id)
  );
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveData();
  closeConfirm();
  navigateTo(state.currentPage);
  showToast('Transaksi berhasil dihapus');

  // Delete from Google Sheets
  if (state.settings.gasUrl) {
    fetch(state.settings.gasUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTransaction', id: id }),
      headers: { 'Content-Type': 'text/plain' }
    }).catch(e => console.log('Delete sync error:', e));
  }
}

// ===== SETTINGS =====
function editSetting(key) {
  state.editingSettingKey = key;
  const titles = {
    name: 'Edit Nama',
    gasUrl: 'Google Apps Script URL'
  };
  const placeholders = {
    name: 'Masukkan nama Anda',
    gasUrl: 'Paste URL deployment GAS'
  };
  const values = {
    name: state.settings.userName,
    gasUrl: state.settings.gasUrl
  };

  document.getElementById('setting-modal-title').textContent = titles[key] || 'Edit';
  document.getElementById('setting-input').placeholder = placeholders[key] || '';
  document.getElementById('setting-input').value = values[key] || '';

  document.getElementById('modal-setting-overlay').classList.add('active');
  document.getElementById('modal-setting').classList.add('active');

  setTimeout(() => document.getElementById('setting-input').focus(), 300);
}

function closeSettingModal() {
  document.getElementById('modal-setting-overlay').classList.remove('active');
  document.getElementById('modal-setting').classList.remove('active');
}

function saveSetting() {
  const value = document.getElementById('setting-input').value.trim();
  if (!value) {
    showToast('Nilai tidak boleh kosong', 'error');
    return;
  }

  switch (state.editingSettingKey) {
    case 'name':
      state.settings.userName = value;
      break;
    case 'gasUrl':
      state.settings.gasUrl = value;
      break;
  }

  saveData();
  closeSettingModal();
  updateSettingsUI();
  renderProfile();
  updateGreeting();
  showToast('Pengaturan berhasil disimpan');
}

// ===== SYNC WITH GOOGLE SHEETS =====
async function syncData() {
  if (!state.settings.gasUrl) {
    showToast('Atur Google Apps Script URL terlebih dahulu', 'error');
    editSetting('gasUrl');
    return;
  }

  showLoading(true);
  document.getElementById('sync-status').textContent = 'Menyinkronkan...';

  try {
    // Send all local transactions to Google Sheets
    const response = await fetch(state.settings.gasUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'syncTransactions',
        transactions: state.transactions
      }),
      headers: { 'Content-Type': 'text/plain' }
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Sinkronisasi berhasil! ${result.added || 0} transaksi baru`);
      document.getElementById('sync-status').textContent = 'Terakhir sync: ' + new Date().toLocaleTimeString('id-ID');
    } else {
      showToast('Gagal sinkronisasi: ' + (result.error || 'Unknown error'), 'error');
      document.getElementById('sync-status').textContent = 'Gagal sinkronisasi';
    }
  } catch (e) {
    console.error('Sync error:', e);
    showToast('Gagal terhubung ke server', 'error');
    document.getElementById('sync-status').textContent = 'Gagal terhubung';
  } finally {
    showLoading(false);
  }
}

async function syncTransactionToSheet(transaction) {
  try {
    await fetch(state.settings.gasUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addTransaction',
        ...transaction
      }),
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (e) {
    console.log('Auto-sync error:', e);
  }
}

// ===== EXPORT DATA =====
function exportData() {
  if (state.transactions.length === 0) {
    showToast('Tidak ada data untuk di-export', 'error');
    return;
  }

  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Deskripsi'];
  const rows = state.transactions.map(t => {
    const cat = getCategoryInfo(t.category, t.type);
    return [
      t.date,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      cat.name,
      t.amount,
      t.description || ''
    ];
  });

  let csv = '\ufeff'; // UTF-8 BOM
  csv += headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fintrack_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  showToast('Data berhasil di-export!');
}

// ===== CLEAR ALL DATA =====
function clearAllData() {
  showConfirm(
    'Hapus Semua Data',
    'Semua transaksi lokal akan dihapus. Data di Google Sheets tidak terpengaruh. Lanjutkan?',
    () => {
      state.transactions = [];
      saveData();
      closeConfirm();
      navigateTo(state.currentPage);
      showToast('Semua data berhasil dihapus');
    }
  );
}

// ===== CONFIRM DIALOG =====
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-btn').onclick = onConfirm;
  document.getElementById('confirm-overlay').classList.add('active');
  document.getElementById('confirm-dialog').classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('active');
  document.getElementById('confirm-dialog').classList.remove('active');
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-message').textContent = message;
  toast.className = 'toast ' + type;

  const icon = toast.querySelector('.toast-icon');
  icon.textContent = type === 'error' ? 'error' : 'check_circle';

  // Show
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto hide
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ===== LOADING =====
function showLoading(show) {
  const overlay = document.getElementById('loading');
  if (show) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

// ===== PULL TO REFRESH (touch) =====
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  const touchEndY = e.changedTouches[0].clientY;
  const diff = touchEndY - touchStartY;

  if (diff > 100 && window.scrollY === 0) {
    // Pull to refresh
    if (state.settings.gasUrl) {
      syncData();
    } else {
      navigateTo(state.currentPage);
      showToast('Data diperbarui');
    }
  }
});

/**
 * Simple IoT World - Frontend Application Logic
 * Integrates Authentication, Real-Time Sensor Gauges, Charts,
 * Paginated Records (Asia/Kolkata +5:30), 16x2 LCD Sync, and LED Control.
 */

// Application State
const state = {
  token: localStorage.getItem('iot_token') || null,
  user: JSON.parse(localStorage.getItem('iot_user') || 'null'),
  currentTab: 1,
  currentPage: 1,
  limit: 10,
  sensorChart: null,
  pollInterval: null,
  deviceData: {
    online: false,
    temperature: 34,
    humidity: 50,
    lcdLine1: 'SMART DISPLAY',
    lcdLine2: 'MyData',
    ledState: 'OFF'
  }
};

// ==================== INITIALIZATION ==================== //
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthUI();
  initTabs();
  initLcdControls();
  initLedControls();
  initRecordsTable();

  if (state.token && state.user) {
    showDashboard();
  } else {
    showAuth();
  }
});

// ==================== THEME MANAGEMENT ==================== //
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');

  const savedTheme = localStorage.getItem('iot_theme') || 'dark';
  applyTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('iot_theme', newTheme);
    if (state.sensorChart) updateChartTheme();
  });

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }
}

// ==================== AUTHENTICATION UI & LOGIC ==================== //
function initAuthUI() {
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginFormContainer = document.getElementById('login-form-container');
  const registerFormContainer = document.getElementById('register-form-container');
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  function switchAuthTab(tab) {
    if (tab === 'login') {
      tabLoginBtn.className = 'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm';
      tabRegisterBtn.className = 'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:white';
      loginFormContainer.classList.remove('hidden');
      registerFormContainer.classList.add('hidden');
    } else {
      tabRegisterBtn.className = 'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm';
      tabLoginBtn.className = 'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:white';
      loginFormContainer.classList.add('hidden');
      registerFormContainer.classList.remove('hidden');
    }
  }

  tabLoginBtn.addEventListener('click', () => switchAuthTab('login'));
  tabRegisterBtn.addEventListener('click', () => switchAuthTab('register'));
  linkToRegister.addEventListener('click', () => switchAuthTab('register'));
  linkToLogin.addEventListener('click', () => switchAuthTab('login'));

  // Handle Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const alertBox = document.getElementById('login-alert');

    alertBox.classList.add('hidden');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('iot_token', data.token);
      localStorage.setItem('iot_user', JSON.stringify(data.user));

      showDashboard();
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove('hidden');
    }
  });

  // Handle Registration Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const alertBox = document.getElementById('register-alert');

    alertBox.classList.add('hidden');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('iot_token', data.token);
      localStorage.setItem('iot_user', JSON.stringify(data.user));

      showDashboard();
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove('hidden');
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('iot_token');
    localStorage.removeItem('iot_user');
    if (state.pollInterval) clearInterval(state.pollInterval);
    showAuth();
  });
}

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('user-greeting-container').classList.add('hidden');
  document.getElementById('user-greeting-container').classList.remove('flex');
}

function showDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.add('flex');
  
  // Header User greeting: "Welcome <Name>"
  const greetingContainer = document.getElementById('user-greeting-container');
  const welcomeText = document.getElementById('user-welcome-text');
  const avatarChar = document.getElementById('user-avatar-char');

  if (state.user && state.user.name) {
    welcomeText.textContent = `Welcome ${state.user.name}`;
    avatarChar.textContent = state.user.name.charAt(0).toUpperCase();
  } else {
    welcomeText.textContent = 'Welcome Ashish';
    avatarChar.textContent = 'A';
  }
  greetingContainer.classList.remove('hidden');
  greetingContainer.classList.add('flex');

  // Initialize Dynamic Charts & Data Polling
  initCharts();
  fetchDeviceStatus();
  fetchRecords(1);

  if (state.pollInterval) clearInterval(state.pollInterval);
  state.pollInterval = setInterval(() => {
    fetchDeviceStatus();
  }, 4000);
}

// ==================== TABS SWITCHING ==================== //
function initTabs() {
  const tabBtns = [
    { btn: document.getElementById('tab-nav-1'), content: document.getElementById('tab-content-1'), id: 1 },
    { btn: document.getElementById('tab-nav-2'), content: document.getElementById('tab-content-2'), id: 2 },
    { btn: document.getElementById('tab-nav-3'), content: document.getElementById('tab-content-3'), id: 3 },
  ];

  tabBtns.forEach(({ btn, content, id }) => {
    btn.addEventListener('click', () => {
      state.currentTab = id;
      tabBtns.forEach(t => {
        if (t.id === id) {
          t.btn.className = 'dashboard-tab-btn flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 red-gradient-bg text-white shadow-lg shadow-red-500/25 active:scale-95';
          t.content.classList.remove('hidden');
        } else {
          t.btn.className = 'dashboard-tab-btn flex items-center space-x-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 bg-white/70 dark:bg-zinc-800/70 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-zinc-700/60 active:scale-95';
          t.content.classList.add('hidden');
        }
      });

      // Resize chart if tab 1 becomes visible
      if (id === 1 && state.sensorChart) {
        setTimeout(() => state.sensorChart.resize(), 100);
      }
    });
  });
}

// ==================== IOT STATUS & READINGS POLLING ==================== //
async function fetchDeviceStatus() {
  try {
    const res = await fetch('/api/device/status');
    if (!res.ok) return;
    const data = await res.json();
    state.deviceData = data;

    updateOnlineOfflineBadge(data.online, data.secondsAgo, data.lastSeen);
    updateGauges(data.currentTemperature, data.currentHumidity);
    updateLcdPreview(data.lcdLine1, data.lcdLine2);
    updateLedUI(data.ledState);
  } catch (err) {
    console.error('Error fetching device status:', err);
  }
}

// Update ESP8266 Online/Offline Status Indicator
function updateOnlineOfflineBadge(isOnline, secondsAgo, lastSeen) {
  const badge = document.getElementById('device-status-badge');
  const ping = document.getElementById('beacon-ping');
  const dot = document.getElementById('beacon-dot');
  const text = document.getElementById('esp-status-text');
  const lastSeenSpan = document.getElementById('esp-last-seen');

  // Mobile elements
  const pingMobile = document.getElementById('beacon-ping-mobile');
  const dotMobile = document.getElementById('beacon-dot-mobile');
  const textMobile = document.getElementById('esp-status-text-mobile');
  const lastSeenMobile = document.getElementById('esp-last-seen-mobile');

  if (isOnline) {
    // ONLINE
    badge.className = 'hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm transition-all duration-300 bg-emerald-100/70 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400';
    ping.className = 'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 beacon-pulse';
    dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
    text.textContent = 'ESP8266 ONLINE';
    lastSeenSpan.textContent = `(${secondsAgo}s ago)`;

    pingMobile.className = 'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 beacon-pulse';
    dotMobile.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
    textMobile.textContent = 'ESP8266 ONLINE';
    textMobile.className = 'text-emerald-600 dark:text-emerald-400';
    lastSeenMobile.textContent = `${secondsAgo}s ago`;
  } else {
    // OFFLINE
    badge.className = 'hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm transition-all duration-300 bg-red-100/70 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-400';
    ping.className = 'absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-30';
    dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600';
    text.textContent = 'ESP8266 OFFLINE';

    let timeAgoMsg = 'No signal';
    if (lastSeen > 0) {
      const mins = Math.floor(secondsAgo / 60);
      timeAgoMsg = mins > 0 ? `${mins}m ago` : `${secondsAgo}s ago`;
    }
    lastSeenSpan.textContent = `(${timeAgoMsg})`;

    pingMobile.className = 'absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-30';
    dotMobile.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600';
    textMobile.textContent = 'ESP8266 OFFLINE';
    textMobile.className = 'text-red-600 dark:text-red-400';
    lastSeenMobile.textContent = timeAgoMsg;
  }
}

// Update Temperature & Humidity Gauges / Seek Bars
function updateGauges(temp, hum) {
  const safeTemp = Math.max(0, Math.min(60, temp || 0));
  const safeHum = Math.max(0, Math.min(100, hum || 0));

  // Temperature
  const tempCardVal = document.getElementById('card-temp-value');
  const tempCircle = document.getElementById('temp-gauge-circle');
  const tempSeekBar = document.getElementById('temp-seek-bar');
  const tempSeekPct = document.getElementById('temp-seek-pct');
  const tempTag = document.getElementById('temp-status-tag');

  tempCardVal.textContent = Math.round(temp);
  
  // Circumference = 2 * PI * 50 = 314.159
  const maxCircumference = 314.159;
  const tempOffset = maxCircumference * (1 - (safeTemp / 60));
  tempCircle.style.strokeDashoffset = tempOffset;

  const tempPct = Math.round((safeTemp / 60) * 100);
  tempSeekBar.style.width = `${tempPct}%`;
  tempSeekPct.textContent = `${tempPct}% of Scale`;

  if (temp < 18) {
    tempTag.textContent = 'Cool';
    tempTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
  } else if (temp <= 36) {
    tempTag.textContent = 'Normal';
    tempTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  } else if (temp <= 42) {
    tempTag.textContent = 'Warm';
    tempTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  } else {
    tempTag.textContent = 'Hot';
    tempTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 animate-pulse';
  }

  // Humidity
  const humCardVal = document.getElementById('card-hum-value');
  const humCircle = document.getElementById('hum-gauge-circle');
  const humSeekBar = document.getElementById('hum-seek-bar');
  const humSeekPct = document.getElementById('hum-seek-pct');
  const humTag = document.getElementById('hum-status-tag');

  humCardVal.textContent = Math.round(hum);
  const humOffset = maxCircumference * (1 - (safeHum / 100));
  humCircle.style.strokeDashoffset = humOffset;

  humSeekBar.style.width = `${safeHum}%`;
  humSeekPct.textContent = `${safeHum}% of Scale`;

  if (hum < 30) {
    humTag.textContent = 'Dry';
    humTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  } else if (hum <= 60) {
    humTag.textContent = 'Comfortable';
    humTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300';
  } else {
    humTag.textContent = 'Humid';
    humTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
  }
}

// ==================== CHART.JS SENSOR TRENDS ==================== //
async function initCharts() {
  const ctx = document.getElementById('sensorChart').getContext('2d');

  // Create gradient fills
  const tempGrad = ctx.createLinearGradient(0, 0, 0, 300);
  tempGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
  tempGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

  const humGrad = ctx.createLinearGradient(0, 0, 0, 300);
  humGrad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
  humGrad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

  state.sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: tempGrad,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ef4444',
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: [],
          borderColor: '#0284c7',
          backgroundColor: humGrad,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#0284c7',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(148, 163, 184, 0.1)'
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temperature (°C)',
            color: '#ef4444',
            font: { size: 11, weight: 'bold' }
          },
          min: 0,
          max: 60,
          grid: {
            color: 'rgba(148, 163, 184, 0.1)'
          },
          ticks: {
            color: '#ef4444',
            font: { size: 10 }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humidity (%)',
            color: '#0284c7',
            font: { size: 11, weight: 'bold' }
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#0284c7',
            font: { size: 10 }
          }
        }
      }
    }
  });

  await updateChartData();
}

function updateChartTheme() {
  if (!state.sensorChart) return;
  state.sensorChart.update();
}

async function updateChartData() {
  if (!state.token) return;
  try {
    const res = await fetch('/api/records/recent?count=15', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const records = data.records || [];

    if (records.length > 0 && state.sensorChart) {
      state.sensorChart.data.labels = records.map(r => r.time || 'N/A');
      state.sensorChart.data.datasets[0].data = records.map(r => r.temperature);
      state.sensorChart.data.datasets[1].data = records.map(r => r.humidity);
      state.sensorChart.update();

      // Update min/max stats
      const temps = records.map(r => r.temperature);
      const hums = records.map(r => r.humidity);
      document.getElementById('temp-min-stat').textContent = `${Math.min(...temps)} °C`;
      document.getElementById('temp-max-stat').textContent = `${Math.max(...temps)} °C`;
      document.getElementById('hum-min-stat').textContent = `${Math.min(...hums)} %`;
      document.getElementById('hum-max-stat').textContent = `${Math.max(...hums)} %`;
    }
  } catch (err) {
    console.error('Error updating chart data:', err);
  }
}

// ==================== TAB 1: SAVED RECORDS TABLE & PAGINATION ==================== //
function initRecordsTable() {
  const limitSelect = document.getElementById('records-limit-select');
  const refreshBtn = document.getElementById('refresh-records-btn');
  const clearBtn = document.getElementById('clear-records-btn');
  const simBtn = document.getElementById('sim-data-btn');
  const prevBtn = document.getElementById('pag-prev-btn');
  const nextBtn = document.getElementById('pag-next-btn');

  limitSelect.addEventListener('change', () => {
    state.limit = parseInt(limitSelect.value);
    state.currentPage = 1;
    fetchRecords(state.currentPage);
  });

  refreshBtn.addEventListener('click', () => {
    fetchRecords(state.currentPage);
    updateChartData();
  });

  prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      fetchRecords(state.currentPage - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    fetchRecords(state.currentPage + 1);
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all saved records?')) return;
    try {
      const res = await fetch('/api/records', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        fetchRecords(1);
        updateChartData();
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Simulator button: quickly test adding sensor records
  simBtn.addEventListener('click', async () => {
    simBtn.disabled = true;
    simBtn.classList.add('opacity-50');
    try {
      const res = await fetch('/api/sim/reading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchDeviceStatus();
        await fetchRecords(1);
        await updateChartData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      simBtn.disabled = false;
      simBtn.classList.remove('opacity-50');
    }
  });
}

async function fetchRecords(page = 1) {
  if (!state.token) return;
  state.currentPage = page;

  const tbody = document.getElementById('records-table-body');
  try {
    const res = await fetch(`/api/records?page=${page}&limit=${state.limit}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showAuth();
        return;
      }
      throw new Error('Failed to load records');
    }

    const data = await res.json();
    renderRecordsTable(data.records, data.page, data.limit, data.total, data.totalPages);
  } catch (err) {
    console.error('Error fetching records:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500 font-semibold">${err.message}</td></tr>`;
  }
}

function renderRecordsTable(records, page, limit, total, totalPages) {
  const tbody = document.getElementById('records-table-body');
  const pagStart = document.getElementById('pag-start');
  const pagEnd = document.getElementById('pag-end');
  const pagTotal = document.getElementById('pag-total');
  const prevBtn = document.getElementById('pag-prev-btn');
  const nextBtn = document.getElementById('pag-next-btn');
  const pagNumbers = document.getElementById('pag-numbers');

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">No records found. Readings from ESP8266 or Simulator will appear here.</td></tr>`;
    pagStart.textContent = '0';
    pagEnd.textContent = '0';
    pagTotal.textContent = '0';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    pagNumbers.innerHTML = '';
    return;
  }

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(startIdx + records.length - 1, total);
  pagStart.textContent = startIdx;
  pagEnd.textContent = endIdx;
  pagTotal.textContent = total;

  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;

  // Build Table Rows strictly conforming to:
  // # | Temeprature | Humidity | Time | Date | Action (Delete)
  // 1 | 34 'C | 50% | HH:MM AM | DD-MM-YYYY | Delete
  tbody.innerHTML = records.map((r, index) => {
    const rowNumber = (page - 1) * limit + index + 1;
    return `
      <tr class="hover:bg-red-50/40 dark:hover:bg-zinc-800/40 transition-colors">
        <td class="py-3 px-4 text-center font-bold text-slate-500 dark:text-slate-400 font-mono text-xs">${rowNumber}</td>
        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            ${r.temperature} 'C
          </span>
        </td>
        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            ${r.humidity}%
          </span>
        </td>
        <td class="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
          ${r.time}
        </td>
        <td class="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
          ${r.date}
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="deleteRecord(${r.id})" title="Delete Record" class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:hover:bg-red-600 transition-all active:scale-95">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span>Delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Generate pagination buttons
  pagNumbers.innerHTML = '';
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
      const pBtn = document.createElement('button');
      pBtn.textContent = p;
      if (p === page) {
        pBtn.className = 'w-7 h-7 rounded-xl font-bold text-xs bg-red-600 text-white shadow-sm';
      } else {
        pBtn.className = 'w-7 h-7 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-zinc-700';
      }
      pBtn.addEventListener('click', () => fetchRecords(p));
      pagNumbers.appendChild(pBtn);
    } else if (p === page - 2 || p === page + 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'px-1 text-slate-400';
      pagNumbers.appendChild(dots);
    }
  }
}

// Global delete handler
window.deleteRecord = async function(id) {
  if (!confirm(`Delete record #${id}?`)) return;
  try {
    const res = await fetch(`/api/records/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      fetchRecords(state.currentPage);
      updateChartData();
    }
  } catch (err) {
    console.error('Error deleting record:', err);
  }
};

// ==================== TAB 2: SMART LCD 16X2 CONTROLS ==================== //
function initLcdControls() {
  const f1 = document.getElementById('lcd-field-1');
  const f2 = document.getElementById('lcd-field-2');
  const count1 = document.getElementById('char-count-1');
  const count2 = document.getElementById('char-count-2');
  const form = document.getElementById('lcd-control-form');
  const alertBox = document.getElementById('lcd-alert');
  const saveBtn = document.getElementById('lcd-save-btn');
  const presetBtns = document.querySelectorAll('.lcd-preset-btn');

  function updateCounts() {
    count1.textContent = `${f1.value.length} / 16`;
    count2.textContent = `${f2.value.length} / 16`;
    updateLcdPreview(f1.value, f2.value);
  }

  f1.addEventListener('input', updateCounts);
  f2.addEventListener('input', updateCounts);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      f1.value = btn.getAttribute('data-line1');
      f2.value = btn.getAttribute('data-line2');
      updateCounts();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.classList.add('opacity-75');

    try {
      const res = await fetch('/api/control/lcd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
          line1: f1.value,
          line2: f2.value
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update LCD');

      alertBox.classList.remove('hidden');
      setTimeout(() => alertBox.classList.add('hidden'), 4000);
      updateLcdPreview(data.lcdLine1, data.lcdLine2);
    } catch (err) {
      alert(err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-75');
    }
  });
}

function updateLcdPreview(line1 = 'SMART DISPLAY', line2 = 'MyData') {
  const r1 = document.getElementById('lcd-preview-row1');
  const r2 = document.getElementById('lcd-preview-row2');

  const padded1 = (line1 || '').padEnd(16, ' ').substring(0, 16);
  const padded2 = (line2 || '').padEnd(16, ' ').substring(0, 16);

  if (r1) r1.textContent = padded1;
  if (r2) r2.textContent = padded2;
}

// ==================== TAB 3: LED ACTUATOR CONTROLS ==================== //
function initLedControls() {
  const toggleBtn = document.getElementById('led-power-toggle-btn');
  const ledBulb = document.getElementById('led-bulb');

  async function toggleLedState() {
    const currentState = state.deviceData.ledState || 'OFF';
    const nextState = currentState === 'ON' ? 'OFF' : 'ON';

    toggleBtn.disabled = true;

    try {
      const res = await fetch('/api/control/led', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ state: nextState })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle LED');

      state.deviceData.ledState = data.ledState;
      updateLedUI(data.ledState);
    } catch (err) {
      alert(err.message);
    } finally {
      toggleBtn.disabled = false;
    }
  }

  toggleBtn.addEventListener('click', toggleLedState);
  ledBulb.addEventListener('click', toggleLedState);
}

function updateLedUI(stateStr) {
  const bulb = document.getElementById('led-bulb');
  const badge = document.getElementById('led-status-badge');
  const toggleBtn = document.getElementById('led-power-toggle-btn');
  const toggleText = document.getElementById('led-toggle-btn-text');
  const bgGlow = document.getElementById('led-bg-glow');
  const logicLevel = document.getElementById('led-logic-level');

  const isON = (stateStr === 'ON');

  if (isON) {
    bulb.className = 'led-bulb-container led-on cursor-pointer transform hover:scale-105 active:scale-95 transition-all';
    badge.className = 'px-3.5 py-1 rounded-full text-xs font-black tracking-wide bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse';
    badge.textContent = 'ACTIVE (ON)';
    toggleBtn.className = 'group relative inline-flex items-center justify-center px-8 py-4 text-base font-extrabold text-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 active:scale-95 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 shadow-red-500/40 hover:brightness-110';
    toggleText.textContent = 'Turn LED OFF';
    bgGlow.classList.remove('opacity-0');
    bgGlow.classList.add('opacity-40');
    logicLevel.textContent = 'HIGH (3.3V)';
    logicLevel.className = 'font-mono font-bold text-red-600 dark:text-red-400';
  } else {
    bulb.className = 'led-bulb-container led-off cursor-pointer transform hover:scale-105 active:scale-95 transition-all';
    badge.className = 'px-3.5 py-1 rounded-full text-xs font-black tracking-wide bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-all';
    badge.textContent = 'INACTIVE (OFF)';
    toggleBtn.className = 'group relative inline-flex items-center justify-center px-8 py-4 text-base font-extrabold text-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 active:scale-95 bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-red-600 hover:to-red-700 shadow-zinc-500/20';
    toggleText.textContent = 'Turn LED ON';
    bgGlow.classList.remove('opacity-40');
    bgGlow.classList.add('opacity-0');
    logicLevel.textContent = 'LOW (0V)';
    logicLevel.className = 'font-mono font-bold text-slate-700 dark:text-slate-200';
  }
}

// ============================================================
//  app.js — Main Application (routing, settings, UI helpers)
// ============================================================

/* ──────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await window.loadV3RuntimeConfig?.();
  updateLoginGate(null, { pending: true });
  loadSettings();
  updateSheetSyncInfo();
  buildYearSelectors();
  updateDashboard();
  renderQueueTable();
  renderRevenue();
  setTodayDate();
  setupPickerIconClicks();
  setupStaticEventHandlers();
  initTheme();
  startInactivityCheck();

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  const firebaseInitResult = await window.initFirebaseData?.();
  const wasLoggedIn = localStorage.getItem('oracat_logged_in') === 'true';
  const lastActive = Number(localStorage.getItem('oracat_last_activity') || 0);
  const isExpired = lastActive && (Date.now() - lastActive > 15 * 60 * 1000);

  if (!window.firebaseData?.currentUser?.()) {
    if (wasLoggedIn && !isExpired) {
      window.setTimeout(() => {
        if (!window.firebaseData?.currentUser?.()) {
          updateLoginGate(null, {
            message: 'เซสชันหมดอายุหรือโปรดเข้าสู่ระบบใหม่',
          });
        }
      }, 3000);
    } else {
      updateLoginGate(null, {
        message: firebaseInitResult === false
          ? 'Firebase ยังไม่ได้ตั้งค่า จึงยังไม่สามารถเข้าสู่ระบบได้'
          : 'กรุณาเข้าสู่ระบบด้วย Google เพื่อใช้งาน Oracat Manager',
      });
    }
  }
  loadGoogleAPIs();
  await window.googleOAuthV3?.init?.();

  // Close modal on overlay click
  document.getElementById('jobModal').addEventListener('click', function (e) {
    if (e.target === this) closeJobModal({ preserveDraft: true });
  });
});

function setupStaticEventHandlers() {
  bindClick('googleAuthBtn', () => handleGoogleAuth());
  bindClick('menuToggleBtn', () => toggleSidebar());
  bindClick('syncAllBtn', () => syncAll());
  bindClick('openJobModalBtn', () => openJobModal());
  bindClick('syncSheetsBtn', () => syncSheets());
  bindClick('syncCalendarBtn', () => syncCalendar());
  bindClick('dashboardTaxPaidButton', () => markDashboardTaxPaid());
  bindClick('createBookingSheetBtn', () => createBookingSheetFromSettings());
  bindClick('bookingPreviewBtn', () => renderBookingDocument());
  bindClick('bookingDownloadBtn', () => downloadBookingDocument());
  bindClick('saveSheetSettingsBtn', () => saveGoogleSheetSettings());
  bindClick('saveBusinessInfoBtn', () => saveBusinessInfo());
  bindClick('addJobTypeBtn', () => addJobTypeSetting());
  bindClick('saveJobBtn', () => saveJob());
  bindClick('jobDetailEditBtn', () => editCurrentJobDetail());
  bindClick('jobDetailBookingBtn', () => openCurrentJobDetailBooking());
  bindClick('downloadCurrentBookingBtn', () => downloadCurrentBookingDocument());
  bindClick('themeToggleBtn', () => toggleTheme());

  bindChange('chartYear', () => renderChart());
  bindChange('chartType', () => renderChart());
  bindInput('searchInput', () => filterJobs());
  bindChange('filterMonth', () => filterJobs());
  bindChange('filterJobType', () => filterJobs());
  bindChange('filterStatus', () => filterJobs());
  bindChange('bookingJobSelect', () => renderBookingDocument());
  bindChange('bookingSlipInput', event => loadBookingSlip(event.currentTarget));
  bindChange('revYear', () => renderRevenue());
  bindChange('revMonth', () => renderRevenue());

  document.querySelectorAll('[data-show-page]').forEach(button => {
    button.addEventListener('click', () => showPage(button.dataset.showPage));
  });
  document.querySelectorAll('[data-job-modal-close]').forEach(button => {
    button.addEventListener('click', () => closeJobModal({ clearDraft: true }));
  });
  document.querySelectorAll('[data-job-detail-close]').forEach(button => {
    button.addEventListener('click', () => closeJobDetailModal());
  });
  document.querySelectorAll('[data-booking-preview-close]').forEach(button => {
    button.addEventListener('click', () => closeBookingPreviewModal());
  });

  document.querySelectorAll('[data-login-alert-close]').forEach(button => {
    button.addEventListener('click', () => closeLoginAlertModal());
  });

  const loginAlertModal = document.getElementById('loginAlertModal');
  loginAlertModal?.addEventListener('click', event => {
    if (event.target === loginAlertModal) closeLoginAlertModal();
  });

  const jobDetailModal = document.getElementById('jobDetailModal');
  jobDetailModal?.addEventListener('click', event => {
    if (event.target === jobDetailModal) closeJobDetailModal();
  });

  const bookingPreviewModal = document.getElementById('bookingPreviewModal');
  bookingPreviewModal?.addEventListener('click', event => {
    if (event.target === bookingPreviewModal) closeBookingPreviewModal();
  });

  // Handle Login Form Submit
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      
      setLoginGateBusy(true, 'กำลังเข้าสู่ระบบ...');
      setLoginGateStatus('กำลังตรวจสอบชื่อผู้ใช้งานและรหัสผ่าน...');
      
      try {
        const user = await window.firebaseData.login(username, password);
        localStorage.setItem('oracat_logged_in', 'true');
        localStorage.setItem('oracat_last_activity', Date.now().toString());
        updateLoginGate(user);
        showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!', 'success');
      } catch (err) {
        updateLoginGate(null, { message: err.message || 'เข้าสู่ระบบล้มเหลว' });
        showToast(err.message || 'เข้าสู่ระบบล้มเหลว', 'error');
      }
    });
  }
}

function bindClick(id, handler) {
  document.getElementById(id)?.addEventListener('click', handler);
}

function bindInput(id, handler) {
  document.getElementById(id)?.addEventListener('input', handler);
}

function bindChange(id, handler) {
  document.getElementById(id)?.addEventListener('change', handler);
}

const TEST_NOTICE_SESSION_PREFIX = 'oracatManagerTestNoticeSeen:';

/* ──────────────────────────────────────────────────────────
   LOGIN GATE
   ────────────────────────────────────────────────────────── */
function setLoginGateBusy(isBusy, label = '') {
  const btn = document.getElementById('loginGoogleBtn');
  const labelEl = document.getElementById('loginGoogleLabel');
  if (btn) btn.disabled = Boolean(isBusy);
  if (labelEl) labelEl.textContent = label || 'เข้าสู่ระบบด้วย Google';
}

function setLoginGateStatus(message) {
  const status = document.getElementById('loginGateStatus');
  if (status) status.textContent = message || '';
}

function updateLoginGate(user = null, options = {}) {
  if (!document.body) return;

  if (options.pending) {
    document.body.classList.add('auth-pending');
    document.body.classList.remove('auth-ready', 'auth-locked');
    setLoginGateBusy(true, 'กำลังตรวจสอบ...');
    setLoginGateStatus('กำลังตรวจสอบสถานะการเข้าสู่ระบบ...');
    return;
  }

  if (user) {
    document.body.classList.add('auth-ready');
    document.body.classList.remove('auth-pending', 'auth-locked');
    setLoginGateBusy(false);
    setLoginGateStatus(`เข้าสู่ระบบแล้ว: ${user.email || user.displayName || 'Google account'}`);
    showTestNoticeAfterLogin(user);
    window.setTimeout(() => updateSheetSetupUI(), 0);
    return;
  }

  initialLandingResolved = false;
  document.body.classList.add('auth-locked');
  document.body.classList.remove('auth-pending', 'auth-ready');
  setLoginGateBusy(false);
  setLoginGateStatus(options.message || 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าใช้งาน Oracat Manager');
}

async function handleLoginGateAuth() {
  if (!window.googleOAuthV3?.login) {
    setLoginGateStatus('Google OAuth ยังไม่พร้อมใช้งาน ลองรีเฟรชหน้าเว็บอีกครั้ง');
    showToast?.('Google OAuth ยังไม่พร้อมใช้งาน', 'error');
    return;
  }

  setLoginGateBusy(true, 'กำลังเปิด Google...');
  setLoginGateStatus('กำลังเปิด Google Popup เพื่อเข้าสู่ระบบ');
  const ok = await window.googleOAuthV3.login();
  if (!ok) {
    updateLoginGate(null);
    return;
  }

  setLoginGateStatus('รอการยืนยันจาก Google...');
  window.setTimeout(() => {
    if (!window.firebaseData?.currentUser?.()) {
      const message = getGoogleLoginTimeoutMessage();
      updateLoginGate(null, { message });
      showToast?.(message, 'error');
    }
  }, 20000);
}

function getGoogleLoginTimeoutMessage() {
  const origin = window.location.origin;
  const lastLoginError = String(window.__lastGoogleLoginError || '').trim();
  const runtimeError = window.runtimeConfigState?.error;
  const clientId = String(window.CONFIG?.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  if (lastLoginError) return lastLoginError;
  if (runtimeError) return `Google Login ยังไม่สำเร็จ: ${runtimeError}`;
  if (!clientId) return 'Google Login ยังไม่สำเร็จ: ไม่พบ GOOGLE_OAUTH_CLIENT_ID จาก backend config';
  return `Google Login ยังไม่สำเร็จ: ตรวจ Firebase Authentication, Render logs และ OAuth origin ${origin}`;
}

function testNoticeSessionKey(user) {
  const identity = user?.uid || user?.email || 'current-user';
  return TEST_NOTICE_SESSION_PREFIX + identity;
}

function showTestNoticeAfterLogin(user) {
  // Disabled trial notice pop-up
}

function closeTestNoticeModal() {
  // Disabled trial notice pop-up
}

let lastActivitySaved = 0;
function resetActivityTimer() {
  if (!window.firebaseData?.currentUser?.()) return;
  const now = Date.now();
  if (now - lastActivitySaved > 5000) {
    localStorage.setItem('oracat_last_activity', now.toString());
    lastActivitySaved = now;
  }
}

function startInactivityCheck() {
  // Initialize current activity timestamp on startup to prevent stale value logouts
  localStorage.setItem('oracat_last_activity', Date.now().toString());

  const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  ACTIVITY_EVENTS.forEach(event => {
    window.addEventListener(event, resetActivityTimer, { passive: true });
  });

  window.setInterval(() => {
    if (window.firebaseData?.currentUser?.()) {
      const lastActive = Number(localStorage.getItem('oracat_last_activity') || 0);
      // Extend timeout to 7 days for private photographer dashboard
      if (lastActive && (Date.now() - lastActive > 7 * 24 * 60 * 60 * 1000)) {
        showToast?.('เซสชันหมดอายุหลังจากไม่มีการใช้งานเป็นเวลา 7 วัน', 'warning');
        window.firebaseData?.signOut?.();
      }
    }
  }, 30000);
}

/* ──────────────────────────────────────────────────────────
   THEME MANAGER
   ────────────────────────────────────────────────────────── */
function initTheme() {
  const savedTheme = localStorage.getItem('oracatManagerTheme') === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggle(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const nextTheme = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('oracatManagerTheme', nextTheme);
  updateThemeToggle(nextTheme);
  renderChart();
}

function updateThemeToggle(theme) {
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;
  const nextLabel = theme === 'light' ? 'มืด' : 'สว่าง';
  button.textContent = `ธีม${nextLabel}`;
  button.title = `สลับเป็นธีม${nextLabel}`;
  button.setAttribute('aria-label', `สลับเป็นธีม${nextLabel}`);
}

/* ──────────────────────────────────────────────────────────
   LOGIN ALERT MANAGER
   ────────────────────────────────────────────────────────── */
let loginAlertShown = false;
function checkLoginAlerts(alerts) {
  if (loginAlertShown) return;
  const deliveryAlerts = Array.isArray(alerts) ? alerts : [];
  if (deliveryAlerts.length > 0) {
    const listHtml = deliveryAlerts.slice(0, 8).map(item => `
      <div class="delivery-alert-item ${item.isOverdue ? 'overdue' : item.daysLeft === 0 ? 'due-today' : 'due-soon'}">
        <div class="delivery-alert-main">
          <strong>${appEscHtml(item.client)}</strong>
          <span>${appEscHtml(item.typeLabel)} • งานวันที่ ${appEscHtml(formatDate(item.jobDateText))}</span>
        </div>
        <div class="delivery-alert-meta">
          <b>${appEscHtml(item.statusText)}</b>
          <small>กำหนดส่ง ${appEscHtml(formatDate(item.dueDateText))}</small>
        </div>
      </div>
    `).join('');
    const listEl = document.getElementById('loginAlertList');
    if (listEl) listEl.innerHTML = listHtml;

    document.getElementById('loginAlertModal')?.classList.add('open');
    loginAlertShown = true;
  }
}

function closeLoginAlertModal() {
  document.getElementById('loginAlertModal')?.classList.remove('open');
}

/* ──────────────────────────────────────────────────────────
   PAGE ROUTING
   ────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  bookings: 'คำขอจองคิวงาน',
  queue: 'คิวงาน',
  gallery: 'จัดการคลังรูปภาพผลงาน',
  revenue: 'รายรับ',
  tax: 'โปรแกรมคำนวณภาษี',
  documents: 'เอกสาร',
  settings: 'ตั้งค่า',
};

let initialLandingResolved = false;

function routeInitialLanding() {
  if (initialLandingResolved || !window.firebaseData?.isReady?.()) return;
  initialLandingResolved = true;
  showPage(isSheetSetupRequired() ? 'settings' : 'dashboard', { quietGate: true });
}

function showPage(page, options = {}) {
  let target = page;
  if (isSheetSetupRequired() && page !== 'settings') {
    target = 'settings';
    if (!options.quietGate) {
      showToast('กรุณาตั้งค่า Google Sheet ก่อนเริ่มใช้งาน', 'error');
    }
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById(`page-${target}`);
  if (targetPage) targetPage.classList.add('active');

  const targetBtn = document.querySelector(`.nav-btn[data-page="${target}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  document.getElementById('pageTitle').textContent = PAGE_TITLES[target] || target;

  // Page-specific refresh
  if (target === 'dashboard') { updateDashboard(); }
  if (target === 'bookings') { window.refreshBookingsTab?.(); }
  if (target === 'queue') { renderQueueTable(); }
  if (target === 'gallery') { window.refreshGalleryTab?.(); }
  if (target === 'revenue') { renderRevenue(); }
  if (target === 'tax') { window.renderTaxCalculator?.(); }
  if (target === 'documents') { refreshBookingDocumentJobs(); }
  if (target === 'settings') { loadSettingsForm(); }

  // Close sidebar on mobile
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

/* ──────────────────────────────────────────────────────────
   SIDEBAR TOGGLE (MOBILE)
   ────────────────────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ──────────────────────────────────────────────────────────
   TODAY DATE
   ────────────────────────────────────────────────────────── */
function setTodayDate() {
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('todayDate').textContent = d.toLocaleDateString('th-TH', opts);
}

function setupPickerIconClicks() {
  document.querySelectorAll('input[type="date"].form-control, input[type="time"].form-control').forEach(input => {
    input.addEventListener('pointerdown', e => {
      const rect = input.getBoundingClientRect();
      const iconZoneStart = rect.right - 44;
      if (e.clientX < iconZoneStart) return;

      e.preventDefault();
      input.focus();
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); return; } catch { }
      }
      input.click();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   SETTINGS
   ────────────────────────────────────────────────────────── */
const APP_LOCAL_DATA_KEYS = [
  'jobs',
  'appSettings',
  'lastSheetSync',
  'deletedJobIds',
  'calendarDeleteQueue',
  'oracat_last_activity',
  'oracat_logged_in',
];

const sheetAccessState = {
  id: '',
  status: 'idle',
  message: '',
};
let sheetAccessCheckTimer = null;

const appSettingsState = {};
const DEFAULT_DELIVERY_DAYS = 30;
const DEFAULT_JOB_TYPE_LABELS = { ...JOB_TYPE_LABELS };
const DEFAULT_JOB_TYPES = Object.entries(DEFAULT_JOB_TYPE_LABELS).map(([id, label]) => ({
  id,
  label,
  active: true,
  system: true,
  deliveryDays: DEFAULT_DELIVERY_DAYS,
}));

function defaultSettings() {
  return {
    sheetId: '',
    calendarId: CONFIG.CALENDAR_ID || 'primary',
    studioName: '',
    phone: '',
    email: '',
    facebook: '',
    bookingTerms: '',
    hourRate: 1500,
    jobTypes: cloneJobTypes(DEFAULT_JOB_TYPES),
    lastSheetSync: null,
    taxPaidReminders: [],
    welcome_title: '',
    welcome_subtitle: '',
    promptpay_id: '',
    thunder_token: '',
  };
}

function setSettingsState(settings = {}, options = {}) {
  const base = options.replace ? defaultSettings() : { ...defaultSettings(), ...appSettingsState };
  const next = {
    ...base,
    ...settings,
  };

  appSettingsState.sheetId = getSpreadsheetId(next.sheetId || '');
  appSettingsState.calendarId = next.calendarId || 'primary';
  appSettingsState.studioName = String(next.studioName || '');
  appSettingsState.phone = String(next.phone || '');
  appSettingsState.email = String(next.email || '');
  appSettingsState.facebook = String(next.facebook || '');
  appSettingsState.bookingTerms = String(next.bookingTerms || '');
  appSettingsState.hourRate = nonNegativeNumber(next.hourRate, 1500);
  appSettingsState.jobTypes = normalizeJobTypeSettings(next.jobTypes);
  appSettingsState.lastSheetSync = next.lastSheetSync || null;
  appSettingsState.taxPaidReminders = normalizeTaxPaidReminders(next.taxPaidReminders);
  
  // Custom API integrations state mapping
  appSettingsState.welcome_title = String(next.welcome_title || '');
  appSettingsState.welcome_subtitle = String(next.welcome_subtitle || '');
  appSettingsState.promptpay_id = String(next.promptpay_id || '');
  appSettingsState.thunder_token = String(next.thunder_token || '');

  syncJobTypeLabels(appSettingsState.jobTypes);
  CONFIG.SHEET_ID = appSettingsState.sheetId;
  CONFIG.CALENDAR_ID = appSettingsState.calendarId;
  updateSidebarUserProfile();
}

function cloneJobTypes(types) {
  return (Array.isArray(types) ? types : []).map(type => ({ ...type }));
}

function normalizeJobTypeId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDeliveryDays(value, fallback = DEFAULT_DELIVERY_DAYS) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function normalizeJobTypeSettings(jobTypes) {
  const defaults = cloneJobTypes(DEFAULT_JOB_TYPES);
  const defaultIds = new Set(defaults.map(type => type.id));
  const byId = new Map(defaults.map(type => [type.id, type]));
  const customOrder = [];

  (Array.isArray(jobTypes) ? jobTypes : []).forEach(item => {
    const id = normalizeJobTypeId(item?.id);
    const label = String(item?.label || '').trim();
    if (!id || !label) return;
    const existing = byId.get(id);
    const normalized = {
      id,
      label,
      active: item.active !== false,
      system: existing?.system || defaultIds.has(id),
      deliveryDays: normalizeDeliveryDays(item?.deliveryDays, existing?.deliveryDays ?? DEFAULT_DELIVERY_DAYS),
    };
    byId.set(id, normalized);
    if (!defaultIds.has(id) && !customOrder.includes(id)) customOrder.push(id);
  });

  const result = [
    ...defaults.map(type => byId.get(type.id)),
    ...customOrder.map(id => byId.get(id)),
  ].filter(Boolean);

  if (!result.some(type => type.active !== false) && result[0]) result[0].active = true;
  return result;
}

function syncJobTypeLabels(jobTypes) {
  Object.keys(JOB_TYPE_LABELS).forEach(id => delete JOB_TYPE_LABELS[id]);
  Object.assign(JOB_TYPE_LABELS, DEFAULT_JOB_TYPE_LABELS);
  normalizeJobTypeSettings(jobTypes).forEach(type => {
    JOB_TYPE_LABELS[type.id] = type.label;
  });
}

function normalizeTaxPaidReminders(keys) {
  return Array.from(new Set((Array.isArray(keys) ? keys : [])
    .map(key => String(key || '').trim())
    .filter(Boolean)));
}

function resetSettingsState() {
  setSettingsState(defaultSettings(), { replace: true });
}

function getSettings() {
  return {
    ...appSettingsState,
    jobTypes: cloneJobTypes(appSettingsState.jobTypes),
    taxPaidReminders: normalizeTaxPaidReminders(appSettingsState.taxPaidReminders),
  };
}

function configuredSheetId() {
  return getSpreadsheetId(getSettings().sheetId || CONFIG.SHEET_ID || '');
}

function isSheetSetupRequired() {
  return Boolean(window.firebaseData?.isReady?.() && !configuredSheetId());
}

function updateSheetSetupUI() {
  const isLoggedIn = Boolean(window.firebaseData?.isReady?.());
  const sheetId = configuredSheetId();
  const requiresSetup = Boolean(isLoggedIn && !sheetId);
  document.body?.classList.toggle('sheet-required', requiresSetup);

  document.querySelectorAll('.nav-btn').forEach(button => {
    const locked = requiresSetup && button.dataset.page !== 'settings';
    button.disabled = locked;
    button.title = locked ? 'ตั้งค่า Google Sheet ก่อนเริ่มใช้งาน' : '';
  });

  const createButton = document.getElementById('createBookingSheetBtn');
  const createInfo = document.getElementById('sheetCreateInfo');
  if (!createButton) return;

  const isBusy = createButton.dataset.busy === '1';
  const canCreate = isLoggedIn && !isBusy && (!sheetId || sheetAccessState.status === 'missing');
  createButton.disabled = !canCreate;
  createButton.textContent = isBusy
    ? 'กำลังสร้าง Booking Sheet...'
    : sheetId && sheetAccessState.status !== 'missing'
      ? 'มี Booking Sheet แล้ว'
      : 'สร้าง Booking Sheet ใหม่';

  if (createInfo) {
    if (!isLoggedIn) {
      createInfo.textContent = 'Login ก่อนเพื่อสร้างหรือบันทึก Google Sheet';
    } else if (!sheetId) {
      createInfo.textContent = 'ผู้ใช้งานใหม่ต้องบันทึก Google Sheet ID หรือสร้าง Booking Sheet ก่อนเริ่มใช้งาน';
    } else if (sheetAccessState.status === 'missing') {
      createInfo.textContent = 'ตรวจไม่พบ Sheet ID เดิม สามารถสร้าง Booking Sheet ใหม่ได้';
    } else if (sheetAccessState.status === 'checking') {
      createInfo.textContent = 'กำลังตรวจสอบ Google Sheet ID เดิม...';
    } else if (sheetAccessState.status === 'exists') {
      createInfo.textContent = `พบ Google Sheet แล้ว: ${sheetAccessState.message || compactId(sheetId)}`;
    } else if (sheetAccessState.status === 'unverified') {
      createInfo.textContent = sheetAccessState.message || 'มี Sheet ID แล้ว เชื่อมต่อ Google เพื่อให้ระบบตรวจสอบสิทธิ์';
    } else {
      createInfo.textContent = 'มี Google Sheet ID แล้ว ระบบจะปลดล็อกปุ่มสร้างใหม่เมื่อ ID เดิมตรวจไม่พบ';
    }
  }
}

function enforceSheetSetupGate() {
  updateSheetSetupUI();
  if (!isSheetSetupRequired()) return false;
  const activePage = document.querySelector('.page.active')?.id?.replace('page-', '') || '';
  if (activePage !== 'settings') showPage('settings', { quietGate: true });
  return true;
}

function scheduleSheetAccessCheck() {
  window.clearTimeout(sheetAccessCheckTimer);
  sheetAccessCheckTimer = window.setTimeout(() => verifyCurrentSheetAccess(), 300);
  updateSheetSetupUI();
}

async function verifyCurrentSheetAccess() {
  const sheetId = configuredSheetId();
  sheetAccessState.id = sheetId;
  sheetAccessState.message = '';

  if (!sheetId || !window.firebaseData?.isReady?.()) {
    sheetAccessState.status = 'idle';
    updateSheetSetupUI();
    return;
  }

  if (!window.isGoogleSignedIn?.() || !window.checkSpreadsheetExists) {
    sheetAccessState.status = 'unverified';
    sheetAccessState.message = 'เชื่อมต่อ Google เพื่อให้ระบบตรวจสอบว่า Sheet ID เดิมยังใช้ได้';
    updateSheetSetupUI();
    return;
  }

  sheetAccessState.status = 'checking';
  updateSheetSetupUI();
  const result = await window.checkSpreadsheetExists(sheetId);
  if (sheetAccessState.id !== configuredSheetId()) return;

  if (result.exists === true) {
    sheetAccessState.status = 'exists';
    sheetAccessState.message = result.title || compactId(sheetId);
  } else if (result.exists === false) {
    sheetAccessState.status = 'missing';
    sheetAccessState.message = result.error || 'ตรวจไม่พบ Sheet ID เดิม';
  } else {
    sheetAccessState.status = 'unverified';
    sheetAccessState.message = result.error || 'ยังตรวจสอบ Sheet ID ไม่สำเร็จ';
  }
  updateSheetSetupUI();
}

function loadSettings() {
  resetSettingsState();
  updateSidebarUserProfile();
  updateSheetSetupUI();
}

function updateSidebarUserProfile() {
  const user = window.firebaseData?.currentUser?.();
  const emailEl = document.getElementById('sidebarUserEmail');
  const studioEl = document.getElementById('sidebarUserStudio');

  if (emailEl) {
    emailEl.textContent = user?.email || 'ยังไม่ได้เข้าสู่ระบบ';
  }
  if (studioEl) {
    studioEl.textContent = appSettingsState.studioName || 'ยังไม่ได้ตั้งค่า';
  }
}

function loadSettingsForm() {
  const s = getSettings();
  const nameInput = document.getElementById('settingName');
  const phoneInput = document.getElementById('settingPhone');
  const emailInput = document.getElementById('settingEmail');
  const facebookInput = document.getElementById('settingFacebook');
  const bookingTermsInput = document.getElementById('settingBookingTerms');
  const hourRateInput = document.getElementById('settingHourRate');
  const sheetIdInput = document.getElementById('settingSheetId');
  if (nameInput) nameInput.value = s.studioName || '';
  if (phoneInput) phoneInput.value = s.phone || '';
  if (emailInput) emailInput.value = s.email || '';
  if (facebookInput) facebookInput.value = s.facebook || '';
  if (bookingTermsInput) bookingTermsInput.value = s.bookingTerms || '';
  if (hourRateInput) hourRateInput.value = s.hourRate || '';
  if (sheetIdInput) sheetIdInput.value = s.sheetId || '';

  // Expose additional settings
  const wtInput = document.getElementById('settingWelcomeTitle');
  if (wtInput) wtInput.value = s.welcome_title || '';
  const wsInput = document.getElementById('settingWelcomeSubtitle');
  if (wsInput) wsInput.value = s.welcome_subtitle || '';
  const ppInput = document.getElementById('settingPromptPay');
  if (ppInput) ppInput.value = s.promptpay_id || '';
  const ttInput = document.getElementById('settingThunderToken');
  if (ttInput) ttInput.value = s.thunder_token || '';

  renderJobTypeSettings();
  renderJobTypeSelect();
  updateSheetSyncInfo();
  scheduleSheetAccessCheck();
}

function activeJobTypes(selectedType = '') {
  const activeTypes = (appSettingsState.jobTypes || []).filter(type => type.active !== false);
  const selectedId = normalizeJobTypeId(selectedType);
  if (selectedId && !activeTypes.some(type => type.id === selectedId)) {
    activeTypes.push({
      id: selectedId,
      label: JOB_TYPE_LABELS[selectedId] || selectedType,
      active: true,
      system: false,
      readonly: true,
    });
  }
  return activeTypes;
}

function renderJobTypeSelect(selectedType = '') {
  const select = document.getElementById('jobType');
  if (!select) return '';

  const current = normalizeJobTypeId(selectedType || select.value);
  const types = activeJobTypes(current);
  select.innerHTML = types.map(type => (
    `<option value="${appEscAttr(type.id)}">${appEscHtml(type.label)}</option>`
  )).join('');

  const nextValue = types.some(type => type.id === current) ? current : (types[0]?.id || '');
  if (nextValue) select.value = nextValue;
  return nextValue;
}

function renderJobTypeSettings() {
  const list = document.getElementById('jobTypeSettingsList');
  if (!list) return;

  const activeTypes = (appSettingsState.jobTypes || []).filter(type => type.active !== false);
  if (!activeTypes.length) {
    list.innerHTML = '<div class="job-type-empty">ยังไม่มีประเภทงาน</div>';
    return;
  }

  const canRemove = activeTypes.length > 1;
  list.innerHTML = activeTypes.map(type => `
    <div class="job-type-row">
      <div class="job-type-field">
        <label>ประเภทงาน</label>
        <input
          type="text"
          class="form-control"
          id="jobTypeLabel_${appEscAttr(type.id)}"
          value="${appEscAttr(type.label)}"
          aria-label="ชื่อประเภทงาน ${appEscAttr(type.label)}"
        />
      </div>
      <div class="job-type-field job-type-delivery-field">
        <label>ส่งในกี่วัน</label>
        <input
          type="number"
          class="form-control"
          id="jobTypeDelivery_${appEscAttr(type.id)}"
          min="0"
          step="1"
          value="${normalizeDeliveryDays(type.deliveryDays)}"
          aria-label="จำนวนวันส่งงาน ${appEscAttr(type.label)}"
        />
      </div>
      <button class="action-btn" type="button" data-job-type-action="save" data-job-type-id="${appEscAttr(type.id)}">บันทึก</button>
      <button class="action-btn del" type="button" data-job-type-action="remove" data-job-type-id="${appEscAttr(type.id)}" ${canRemove ? '' : 'disabled'}>ลบ</button>
    </div>
  `).join('');
  bindJobTypeSettingsActions(list);
}

function bindJobTypeSettingsActions(list) {
  list.querySelectorAll('[data-job-type-action]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.jobTypeId || '';
      if (!id) return;
      if (button.dataset.jobTypeAction === 'save') {
        saveJobTypeSetting(id);
      } else if (button.dataset.jobTypeAction === 'remove') {
        removeJobTypeSetting(id);
      }
    });
  });
}

function makeJobTypeId(label) {
  const slug = normalizeJobTypeId(label);
  const base = slug || 'type';
  const existingIds = new Set((appSettingsState.jobTypes || []).map(type => type.id));
  if (!existingIds.has(base)) return base;

  let nextId = `${base}-${Date.now().toString(36)}`;
  while (existingIds.has(nextId)) nextId = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  return nextId;
}

function refreshJobTypeViews() {
  renderJobTypeSettings();
  renderJobTypeSelect();
  renderQueueTable();
  updateDashboard();
  if (document.getElementById('page-revenue')?.classList.contains('active')) renderRevenue();
  if (document.getElementById('page-documents')?.classList.contains('active')) refreshBookingDocumentJobs();
}

async function persistJobTypeSettings(nextTypes, successMessage) {
  if (!window.firebaseData?.isReady?.()) {
    showToast('กรุณา Login ก่อนแก้ไขประเภทงาน', 'error');
    return false;
  }

  const previous = getSettings();
  setSettingsState({ jobTypes: nextTypes });
  refreshJobTypeViews();

  try {
    await window.firebaseData.saveSettings({ jobTypes: appSettingsState.jobTypes });
    showToast(successMessage || 'บันทึกประเภทงานแล้ว ✓', 'success');
    return true;
  } catch (e) {
    setSettingsState(previous, { replace: true });
    refreshJobTypeViews();
    showToast('บันทึกประเภทงานไม่สำเร็จ: ' + (e.message || e), 'error');
    return false;
  }
}

async function addJobTypeSetting() {
  const input = document.getElementById('newJobTypeLabel');
  const label = input?.value.trim() || '';
  if (!label) {
    showToast('กรุณาใส่ชื่อประเภทงาน', 'error');
    return;
  }

  const nextTypes = cloneJobTypes(appSettingsState.jobTypes);
  const existing = nextTypes.find(type => type.label.trim().toLowerCase() === label.toLowerCase());
  if (existing) {
    if (existing.active !== false) {
      showToast('มีประเภทงานนี้อยู่แล้ว', 'error');
      return;
    }
    existing.active = true;
  } else {
    nextTypes.push({
      id: makeJobTypeId(label),
      label,
      active: true,
      system: false,
      deliveryDays: DEFAULT_DELIVERY_DAYS,
    });
  }

  const saved = await persistJobTypeSettings(nextTypes, 'เพิ่มประเภทงานแล้ว ✓');
  if (saved && input) input.value = '';
}

async function saveJobTypeSetting(typeId) {
  const id = normalizeJobTypeId(typeId);
  const input = document.getElementById(`jobTypeLabel_${id}`);
  const deliveryInput = document.getElementById(`jobTypeDelivery_${id}`);
  const label = input?.value.trim() || '';
  if (!id || !label) {
    showToast('ชื่อประเภทงานห้ามว่าง', 'error');
    return;
  }

  const nextTypes = cloneJobTypes(appSettingsState.jobTypes);
  const duplicate = nextTypes.find(type => type.id !== id && type.active !== false && type.label.trim().toLowerCase() === label.toLowerCase());
  if (duplicate) {
    showToast('มีประเภทงานชื่อนี้อยู่แล้ว', 'error');
    return;
  }

  const target = nextTypes.find(type => type.id === id);
  if (!target) return;
  target.label = label;
  target.deliveryDays = normalizeDeliveryDays(deliveryInput?.value, target.deliveryDays ?? DEFAULT_DELIVERY_DAYS);
  await persistJobTypeSettings(nextTypes, 'บันทึกประเภทงานและกำหนดส่งแล้ว ✓');
}

async function removeJobTypeSetting(typeId) {
  const id = normalizeJobTypeId(typeId);
  const nextTypes = cloneJobTypes(appSettingsState.jobTypes);
  const activeCount = nextTypes.filter(type => type.active !== false).length;
  if (activeCount <= 1) {
    showToast('ต้องเหลือประเภทงานอย่างน้อย 1 รายการ', 'error');
    return;
  }

  const target = nextTypes.find(type => type.id === id);
  if (!target) return;
  target.active = false;
  await persistJobTypeSettings(nextTypes, 'ลบประเภทงานออกจาก dropdown แล้ว ✓');
}

function appEscHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function appEscAttr(value) {
  return appEscHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function saveSettings() {
  saveBusinessInfo();
}

async function saveBusinessInfo() {
  if (!window.firebaseData?.isReady?.()) {
    showToast('กรุณา Login ก่อนบันทึกการตั้งค่า', 'error');
    return;
  }
  const previous = getSettings();
  const s = getSettings();
  s.studioName = document.getElementById('settingName').value.trim();
  s.phone = document.getElementById('settingPhone')?.value.trim() || '';
  s.email = document.getElementById('settingEmail')?.value.trim() || '';
  s.facebook = document.getElementById('settingFacebook')?.value.trim() || '';
  s.bookingTerms = document.getElementById('settingBookingTerms')?.value.trim() || '';
  s.hourRate = Number(document.getElementById('settingHourRate').value) || 1500;
  
  // Expose PromptPay and Thunder settings
  s.welcome_title = document.getElementById('settingWelcomeTitle')?.value.trim() || '';
  s.welcome_subtitle = document.getElementById('settingWelcomeSubtitle')?.value.trim() || '';
  s.promptpay_id = document.getElementById('settingPromptPay')?.value.trim() || '';
  s.thunder_token = document.getElementById('settingThunderToken')?.value.trim() || '';

  setSettingsState(s);
  try {
    await window.firebaseData.saveSettings({
      studioName: s.studioName,
      phone: s.phone,
      email: s.email,
      facebook: s.facebook,
      bookingTerms: s.bookingTerms,
      hourRate: s.hourRate,
      welcome_title: s.welcome_title,
      welcome_subtitle: s.welcome_subtitle,
      promptpay_id: s.promptpay_id,
      thunder_token: s.thunder_token,
    });
    showToast('บันทึกข้อมูลธุรกิจไปยังระบบฐานข้อมูลแล้ว ✓', 'success');
  } catch (e) {
    setSettingsState(previous, { replace: true });
    loadSettingsForm();
    showToast('บันทึกข้อมูลธุรกิจไม่สำเร็จ: ' + (e.message || e), 'error');
  }
}

async function saveGoogleSheetSettings() {
  if (!window.firebaseData?.isReady?.()) {
    showToast('กรุณา Login ก่อนบันทึก Google Sheet ID', 'error');
    return;
  }
  const input = document.getElementById('settingSheetId');
  const sheetId = getSpreadsheetId(input?.value || '');
  if (!sheetId) {
    showToast('กรุณาใส่ Google Sheet ID ก่อน', 'error');
    return;
  }

  const previous = getSettings();
  const settings = getSettings();
  settings.sheetId = sheetId;
  setSettingsState(settings);

  try {
    await window.firebaseData.saveSettings({ sheetId });
    updateSheetSyncInfo();
    scheduleSheetAccessCheck();
    enforceSheetSetupGate();
    showPage('dashboard', { quietGate: true });
    showToast('บันทึก Google Sheet ID ไป Firebase แล้ว ✓', 'success');
  } catch (e) {
    setSettingsState(previous, { replace: true });
    loadSettingsForm();
    console.error('Save Sheet ID to Firebase failed:', e);
    showToast('บันทึก Sheet ID ไป Firebase ไม่สำเร็จ: ' + (e.message || e), 'error');
  }
}

async function createBookingSheetFromSettings() {
  if (!window.firebaseData?.isReady?.()) {
    showToast('กรุณา Login ก่อนสร้าง Google Sheet', 'error');
    return;
  }

  const existingId = configuredSheetId();
  if (existingId && sheetAccessState.status !== 'missing') {
    await verifyCurrentSheetAccess();
    if (configuredSheetId() && sheetAccessState.status !== 'missing') {
      showToast('มี Google Sheet ID ที่ใช้งานอยู่แล้ว ระบบจะให้สร้างใหม่เมื่อ ID เดิมตรวจไม่พบ', 'error');
      return;
    }
  }

  const button = document.getElementById('createBookingSheetBtn');
  if (button) button.dataset.busy = '1';
  updateSheetSetupUI();

  try {
    if (!window.createBookingSpreadsheet) {
      throw new Error('Google Sheets API ยังไม่พร้อมใช้งาน');
    }
    const result = await window.createBookingSpreadsheet({ title: 'Booking' });
    const sheetId = getSpreadsheetId(result?.id || result?.spreadsheetId || '');
    if (!sheetId) throw new Error('สร้าง Sheet แล้วแต่ไม่พบ spreadsheetId');

    const previous = getSettings();
    const input = document.getElementById('settingSheetId');
    if (input) input.value = sheetId;
    setSettingsState({ sheetId });

    try {
      await window.firebaseData.saveSettings({ sheetId });
    } catch (error) {
      setSettingsState(previous, { replace: true });
      loadSettingsForm();
      throw error;
    }

    sheetAccessState.id = sheetId;
    sheetAccessState.status = 'exists';
    sheetAccessState.message = result.title || 'Booking';
    updateSheetSyncInfo();
    updateSheetSetupUI();
    showPage('dashboard', { quietGate: true });
    showToast('สร้าง Booking Sheet และบันทึก Sheet ID แล้ว ✓', 'success');
  } catch (error) {
    console.error('Create Booking Sheet failed:', error);
    showToast('สร้าง Booking Sheet ไม่สำเร็จ: ' + (error.message || error), 'error');
  } finally {
    if (button) button.dataset.busy = '0';
    updateSheetSetupUI();
  }
}

function applyCloudSettings(settings) {
  setSettingsState(settings || {}, { replace: true });

  const input = document.getElementById('settingSheetId');
  if (input) input.value = appSettingsState.sheetId || '';
  const nameInput = document.getElementById('settingName');
  if (nameInput) nameInput.value = appSettingsState.studioName || '';
  const phoneInput = document.getElementById('settingPhone');
  if (phoneInput) phoneInput.value = appSettingsState.phone || '';
  const emailInput = document.getElementById('settingEmail');
  if (emailInput) emailInput.value = appSettingsState.email || '';
  const facebookInput = document.getElementById('settingFacebook');
  if (facebookInput) facebookInput.value = appSettingsState.facebook || '';
  const bookingTermsInput = document.getElementById('settingBookingTerms');
  if (bookingTermsInput) bookingTermsInput.value = appSettingsState.bookingTerms || '';
  const hourRateInput = document.getElementById('settingHourRate');
  if (hourRateInput) hourRateInput.value = appSettingsState.hourRate || '';

  // Expose additional settings
  const wtInput = document.getElementById('settingWelcomeTitle');
  if (wtInput) wtInput.value = appSettingsState.welcome_title || '';
  const wsInput = document.getElementById('settingWelcomeSubtitle');
  if (wsInput) wsInput.value = appSettingsState.welcome_subtitle || '';
  const ppInput = document.getElementById('settingPromptPay');
  if (ppInput) ppInput.value = appSettingsState.promptpay_id || '';
  const ttInput = document.getElementById('settingThunderToken');
  if (ttInput) ttInput.value = appSettingsState.thunder_token || '';
  renderJobTypeSettings();
  renderJobTypeSelect();
  updateSheetSyncInfo();
  scheduleSheetAccessCheck();
  updateSidebarUserProfile();
  renderQueueTable();
  updateDashboard();
  if (document.getElementById('page-revenue')?.classList.contains('active')) renderRevenue();
  if (document.getElementById('page-documents')?.classList.contains('active')) refreshBookingDocumentJobs();
  routeInitialLanding();
  enforceSheetSetupGate();
}

function setLastSheetSyncInfo(info) {
  setSettingsState({ lastSheetSync: info || null });
  updateSheetSyncInfo();
}

function updateSheetSyncInfo() {
  const isLoggedIn = Boolean(window.firebaseData?.isReady?.());
  const info = appSettingsState.lastSheetSync || null;
  const settings = getSettings();
  const text = !isLoggedIn
    ? 'Login ก่อนเพื่อโหลดข้อมูล Google Sheets ของ user นี้'
    : info
      ? `ล่าสุด: ${info.title} / แท็บ ${info.tab} (ID: ${compactId(info.id)})`
      : 'ยังไม่เคย Sync ไป Google Sheets';

  const settingsEl = document.getElementById('sheetSyncInfo');
  if (settingsEl) settingsEl.textContent = text;

  const sheetSettingEl = document.getElementById('sheetSettingInfo');
  if (sheetSettingEl) {
    sheetSettingEl.textContent = !isLoggedIn
      ? 'Login ก่อนเพื่อโหลด Sheet ID ของ user นี้'
      : settings.sheetId
        ? `Sheet ID ที่ใช้งาน: ${compactId(settings.sheetId)}`
        : 'ต้องตั้งค่า Google Sheet ID หรือกดสร้าง Booking Sheet ก่อนเริ่มใช้งาน';
  }
  window.firebaseData?.updateAuthUI?.();
  updateSheetSetupUI();
}

function refreshAppData() {
  renderQueueTable();
  updateDashboard();
  if (document.getElementById('page-revenue')?.classList.contains('active')) renderRevenue();
  if (document.getElementById('page-tax')?.classList.contains('active')) window.renderTaxCalculator?.();
  if (document.getElementById('page-documents')?.classList.contains('active')) refreshBookingDocumentJobs();
  if (document.getElementById('page-settings')?.classList.contains('active')) loadSettingsForm();
  if (typeof checkLoginAlerts === 'function' && typeof getDeliveryAlerts === 'function') {
    checkLoginAlerts(getDeliveryAlerts(new Date(), getJobs()));
  }
  enforceSheetSetupGate();
}

function clearPersistentAppData() {
  APP_LOCAL_DATA_KEYS.forEach(key => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter(key => key.startsWith('firebaseImportDone_'))
    .forEach(key => localStorage.removeItem(key));
  window.clearGoogleSyncState?.();
}

function clearAppData(options = {}) {
  window.clearJobsCache?.();
  resetSettingsState();
  window.resetTaxCalculator?.();
  closeJobModal?.({ clearDraft: true });
  closeJobDetailModal?.();
  closeBookingPreviewModal?.();
  [
    'searchInput',
    'filterMonth',
    'filterJobType',
    'filterStatus',
    'settingSheetId',
    'settingName',
    'settingPhone',
    'settingEmail',
    'settingFacebook',
    'settingBookingTerms',
    'settingHourRate',
    'newJobTypeLabel',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (options.clearPersistent) clearPersistentAppData();
  updateSheetSyncInfo();
  refreshAppData();
  if (!options.quiet) showToast('ล้างข้อมูลหน้าเว็บแล้ว');
}

window.applyCloudSettings = applyCloudSettings;
window.updateSidebarUserProfile = updateSidebarUserProfile;
window.renderJobTypeSelect = renderJobTypeSelect;
window.addJobTypeSetting = addJobTypeSetting;
window.saveJobTypeSetting = saveJobTypeSetting;
window.removeJobTypeSetting = removeJobTypeSetting;
window.setLastSheetSyncInfo = setLastSheetSyncInfo;
window.clearAppData = clearAppData;
window.refreshAppData = refreshAppData;
window.isSheetSetupRequired = isSheetSetupRequired;
window.scheduleSheetAccessCheck = scheduleSheetAccessCheck;
window.updateLoginGate = updateLoginGate;
window.handleLoginGateAuth = handleLoginGateAuth;

/* ──────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
   ────────────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}

window.showToast = showToast;

/* ──────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
   ────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLoginAlertModal();
    closeJobDetailModal();
    closeBookingPreviewModal();
    closeJobModal({ preserveDraft: true });
  }
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    openJobModal();
  }
});

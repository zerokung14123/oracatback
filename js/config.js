// ============================================================
//  config.js — ไฟล์ตั้งค่า public client config และราคาตั้งต้น
//  ห้ามใส่ secret จริงในไฟล์นี้ เพราะผู้ใช้เปิดดูจาก browser ได้
// ============================================================

const CONFIG = {
  // -----  Google OAuth v3 code flow  -----
  // Static hosting mode: leave backend endpoints blank.
  // Do not put Google client secrets in frontend files.
  RUNTIME_CONFIG_ENDPOINT: '',
  GOOGLE_OAUTH_CLIENT_ID: '',
  GOOGLE_OAUTH_TOKEN_ENDPOINT: '',
  GOOGLE_SESSION_IDLE_LIMIT_MS: 5 * 60 * 1000,
  SCOPES: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar',
  ].join(' '),

  // -----  Google Sheets  -----
  SHEET_ID: '',
  SHEET_NAME: 'Jobs',      // ชื่อ Sheet tab

  // -----  Google Calendar  -----
  CALENDAR_ID: 'primary',  // 'primary' = ปฏิทินหลัก หรือใส่ Calendar ID ที่ต้องการ

  // -----  Firebase / Firestore  -----
  // สร้างได้ที่ https://console.firebase.google.com/
  // ใส่ค่าจาก Project settings → Your apps → Firebase SDK config
  // ค่า Firebase Web config เป็น public identifier ไม่ใช่ secret; ให้ป้องกันจริงด้วย Firestore Rules + App Check
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyD1Bha-ZdHOguwN2og6wgcEhdoxML1iEKE',
    authDomain: 'tinmeawfoto-manager.firebaseapp.com',
    projectId: 'tinmeawfoto-manager',
    storageBucket: 'tinmeawfoto-manager.firebasestorage.app',
    messagingSenderId: '879037575078',
    appId: '1:879037575078:web:f49a2a4d56bb8665a1e967',
    measurementId: '',
  },
  FIREBASE_APP_CHECK_SITE_KEY: '6LfEu_osAAAAAK2QotD7bA6ZTgdQLpGtDy1B_dM5',

  // -----  App Settings  -----
  APP_NAME: 'Tinmeaw Manager',
  CURRENCY: '฿',
};

// -----  ชื่อประเภทงาน (TH)  -----
const JOB_TYPE_LABELS = {
  wedding: 'งานแต่งงาน',
  portrait: 'พอร์ตเทรต',
  event: 'Event',
  product: 'ถ่ายสินค้า',
  family: 'ครอบครัว',
  graduation: 'รับปริญญา',
  custom: 'อื่นๆ',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  done: 'เสร็จสิ้น',
  cancelled: 'ยกเลิกงาน',
};

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegativeNumber(value, fallback = 0) {
  return Math.max(0, asNumber(value, fallback));
}

function formatCurrency(value) {
  const amount = asNumber(value, 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${CONFIG.CURRENCY} ${Math.abs(amount).toLocaleString('th-TH')}`;
}

function getSpreadsheetId(value) {
  const input = String(value || '').trim();
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
}

function compactId(value) {
  const id = String(value || '').trim();
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}

function sheetRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.JOB_TYPE_LABELS = JOB_TYPE_LABELS;
  window.STATUS_LABELS = STATUS_LABELS;
}

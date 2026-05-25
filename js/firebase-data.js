// ============================================================
//  firebase-data.js — Firebase Auth + Firestore realtime data
// ============================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app-check.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCustomToken,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const REQUIRED_FIREBASE_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

const firebaseState = {
  app: null,
  auth: null,
  db: null,
  appCheck: null,
  user: null,
  configured: false,
  snapshotLoaded: false,
  unsubscribeJobs: null,
  unsubscribeSettings: null,
};

function firebaseConfig() {
  return window.CONFIG?.FIREBASE_CONFIG || {};
}

function isFirebaseConfigured() {
  const cfg = firebaseConfig();
  return REQUIRED_FIREBASE_KEYS.every(key => String(cfg[key] || '').trim());
}

function appCheckSiteKey() {
  return String(window.CONFIG?.FIREBASE_APP_CHECK_SITE_KEY || '').trim();
}

function isAppCheckConfigured() {
  return Boolean(appCheckSiteKey());
}

function emailName(user = firebaseState.user) {
  const email = String(user?.email || '').trim().toLowerCase();
  const localPart = email ? email.split('@')[0] : '';
  const fallback = String(user?.uid || 'user').replace(/^google:/, '');
  return String(localPart || fallback || 'user')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'user';
}

function getJobsCollectionName(user = firebaseState.user) {
  return `${emailName(user)}-jobs`;
}

function getJobsCollection() {
  if (!firebaseState.db || !firebaseState.user) {
    throw new Error('Firebase ยังไม่ได้เชื่อมต่อ');
  }
  return collection(firebaseState.db, 'users', firebaseState.user.uid, getJobsCollectionName());
}

function getSettingsDoc() {
  if (!firebaseState.db || !firebaseState.user) {
    throw new Error('Firebase ยังไม่ได้เชื่อมต่อ');
  }
  return doc(firebaseState.db, 'users', firebaseState.user.uid, 'settings', 'app');
}

function normalizeJob(job) {
  const now = new Date().toISOString();
  return stripUndefined({
    ...job,
    id: String(job?.id || generateId()),
    client: String(job?.client || ''),
    type: String(job?.type || 'custom'),
    date: String(job?.date || ''),
    startTime: String(job?.startTime || ''),
    endTime: String(job?.endTime || ''),
    location: String(job?.location || ''),
    price: nonNegativeNumber(job?.price),
    deposit: nonNegativeNumber(job?.deposit),
    depositRefunded: Boolean(job?.depositRefunded),
    isCash: Boolean(job?.isCash),
    status: String(job?.status || 'pending'),
    note: String(job?.note || ''),
    images: normalizeJobImages(job?.images),
    bookingDocument: normalizeBookingDocument(job?.bookingDocument),
    createdAt: job?.createdAt || now,
    updatedAt: job?.updatedAt || now,
  });
}

function normalizeJobImages(images) {
  return (Array.isArray(images) ? images : []).map(image => stripUndefined({
    id: String(image?.id || generateId()),
    name: String(image?.name || ''),
    mimeType: String(image?.mimeType || ''),
    size: nonNegativeNumber(image?.size),
    dataUrl: String(image?.dataUrl || ''),
    webViewLink: String(image?.webViewLink || ''),
    webContentLink: String(image?.webContentLink || ''),
    uploadedAt: image?.uploadedAt || image?.storedAt || '',
  })).filter(image => image.id && (image.dataUrl || image.webViewLink || image.webContentLink));
}

function normalizeBookingDocument(documentData) {
  if (!documentData || typeof documentData !== 'object') return null;
  return stripUndefined({
    dataUrl: String(documentData.dataUrl || ''),
    fileName: String(documentData.fileName || ''),
    mimeType: String(documentData.mimeType || 'image/jpeg'),
    size: nonNegativeNumber(documentData.size),
    createdAt: documentData.createdAt || '',
    template: String(documentData.template || ''),
  });
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

function normalizeJobTypes(jobTypes) {
  return (Array.isArray(jobTypes) ? jobTypes : []).map(type => stripUndefined({
    id: String(type?.id || '').trim(),
    label: String(type?.label || '').trim(),
    active: type?.active !== false,
    system: Boolean(type?.system),
    deliveryDays: Math.max(0, Math.round(nonNegativeNumber(type?.deliveryDays, 30))),
  })).filter(type => type.id && type.label);
}

function refreshLocalViews() {
  window.refreshAppData?.();
}

function subscribeJobs() {
  if (firebaseState.unsubscribeJobs) firebaseState.unsubscribeJobs();
  firebaseState.snapshotLoaded = false;

  const jobsQuery = query(getJobsCollection(), orderBy('date', 'desc'));
  firebaseState.unsubscribeJobs = onSnapshot(jobsQuery, async snapshot => {
    try {
      const jobs = snapshot.docs.map(item => normalizeJob({ id: item.id, ...item.data() }));
      firebaseState.snapshotLoaded = true;
      window.setJobsFromFirebase?.(jobs);
      refreshLocalViews();
      updateFirebaseAuthUI(firebaseState.user);
    } catch (e) {
      console.error('Firebase snapshot handling failed:', e);
      showToast('โหลดข้อมูล Firebase ไม่สำเร็จ: ' + (e.message || e), 'error');
    }
  }, error => {
    console.error('Firebase snapshot failed:', error);
    showToast('Firebase sync ผิดพลาด: ' + (error.message || error), 'error');
  });
}

function subscribeUserSettings() {
  if (firebaseState.unsubscribeSettings) firebaseState.unsubscribeSettings();

  firebaseState.unsubscribeSettings = onSnapshot(getSettingsDoc(), snapshot => {
    window.applyCloudSettings?.(snapshot.exists() ? (snapshot.data() || {}) : {});
  }, error => {
    console.error('Firebase settings snapshot failed:', error);
    showToast('โหลดการตั้งค่า Firebase ไม่สำเร็จ: ' + (error.message || error), 'error');
  });
}

function updateFirebaseAuthUI(user = firebaseState.user) {
  const btn = document.getElementById('googleAuthBtn');
  const label = document.getElementById('googleAuthLabel');
  const status = document.getElementById('syncStatus');

  if (!isFirebaseConfigured()) {
    if (status) {
      status.textContent = '● Firebase ยังไม่ได้ตั้งค่า';
      status.className = 'sync-status';
    }
    window.updateSidebarUserProfile?.();
    window.updateLoginGate?.(null, { message: 'Firebase ยังไม่ได้ตั้งค่า จึงยังไม่สามารถเข้าสู่ระบบได้' });
    return;
  }

  if (user) {
    if (label) label.textContent = 'ออกจากระบบ';
    if (btn) btn.style.borderColor = 'rgba(94,184,106,0.4)';
    if (status) {
      status.textContent = '● เข้าสู่ระบบแล้ว';
      status.className = 'sync-status connected';
    }
    window.updateSidebarUserProfile?.();
    window.updateLoginGate?.(user);
  } else {
    if (label) label.textContent = 'เข้าสู่ระบบ Google';
    if (btn) btn.style.borderColor = '';
    if (status) {
      status.textContent = '● ยังไม่ได้เข้าสู่ระบบ';
      status.className = 'sync-status';
    }
    window.updateSidebarUserProfile?.();
    window.updateLoginGate?.(null);
  }
}

async function signInFirebaseWithCustomToken(customToken) {
  if (!firebaseState.auth) {
    window.__lastGoogleLoginError = 'Firebase client ยังไม่พร้อม: กรุณาตรวจ Firebase config';
    showToast('กรุณาใส่ Firebase config ใน js/config.js ก่อน', 'error');
    return null;
  }
  if (!customToken) {
    window.__lastGoogleLoginError = 'ไม่พบ Firebase custom token จาก backend';
    showToast('ไม่พบ Firebase custom token จาก backend', 'error');
    return null;
  }

  try {
    const result = await signInWithCustomToken(firebaseState.auth, customToken);
    window.__lastGoogleLoginError = '';
    return result.user;
  } catch (e) {
    console.error('Firebase custom-token sign-in failed:', e);
    const message = 'เข้าสู่ระบบ Firebase จาก backend ไม่สำเร็จ: ' + (e.message || e);
    window.__lastGoogleLoginError = message;
    showToast(message, 'error');
    return null;
  }
}

async function signInFirebaseWithGooglePopup(options = {}) {
  if (!firebaseState.auth) {
    showToast('กรุณาใส่ Firebase config ใน js/config.js ก่อน', 'error');
    return null;
  }

  const provider = new GoogleAuthProvider();
  const scopes = String(options.scopes || window.CONFIG?.SCOPES || '')
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(scope => scope.startsWith('https://'));
  scopes.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(firebaseState.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return {
      user: result.user,
      accessToken: credential?.accessToken || '',
    };
  } catch (e) {
    console.error('Firebase Google popup sign-in failed:', e);
    showToast('เข้าสู่ระบบ Google ไม่สำเร็จ: ' + getFirebaseAuthErrorMessage(e), 'error');
    return null;
  }
}

function getFirebaseAuthErrorMessage(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error || '');
  const host = window.location.hostname || 'localhost';

  if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
    return `Firebase ยังไม่อนุญาตโดเมนนี้ (${host}) ให้เพิ่ม "${host}" ใน Firebase Console > Authentication > Settings > Authorized domains แล้วลองใหม่`;
  }

  if (code === 'auth/popup-blocked') {
    return 'เบราว์เซอร์บล็อก popup กรุณาอนุญาต popup สำหรับเว็บนี้แล้วลองใหม่';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'ปิดหน้าต่าง Google Login ก่อนทำรายการเสร็จ';
  }

  return message || 'ไม่ทราบสาเหตุ';
}

async function signOutFirebase() {
  if (firebaseState.unsubscribeJobs) {
    firebaseState.unsubscribeJobs();
    firebaseState.unsubscribeJobs = null;
  }
  if (firebaseState.unsubscribeSettings) {
    firebaseState.unsubscribeSettings();
    firebaseState.unsubscribeSettings = null;
  }
  firebaseState.user = null;
  firebaseState.snapshotLoaded = false;
  window.clearAppData?.({ clearPersistent: true, quiet: true });
  window.clearGoogleAccessToken?.();
  if (firebaseState.auth) await firebaseSignOut(firebaseState.auth);
  updateFirebaseAuthUI(null);
  showToast('ออกจากระบบ Firebase แล้ว');
}

async function saveJobToFirebase(job) {
  if (!isFirebaseReady()) return false;
  const data = normalizeJob(job);
  await setDoc(doc(getJobsCollection(), data.id), data, { merge: true });
  return true;
}

async function saveJobsToFirebase(jobs) {
  if (!isFirebaseReady()) return false;
  const cleanJobs = (Array.isArray(jobs) ? jobs : []).map(normalizeJob);
  if (!cleanJobs.length) return true;

  let batch = writeBatch(firebaseState.db);
  let opCount = 0;
  for (const job of cleanJobs) {
    batch.set(doc(getJobsCollection(), job.id), job, { merge: true });
    opCount++;
    if (opCount === 450) {
      await batch.commit();
      batch = writeBatch(firebaseState.db);
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  return true;
}

async function deleteJobFromFirebase(jobId) {
  if (!isFirebaseReady()) return false;
  await deleteDoc(doc(getJobsCollection(), String(jobId)));
  return true;
}

async function saveSettingsToFirebase(settings) {
  if (!isFirebaseReady()) return false;
  const data = { updatedAt: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'sheetId')) {
    data.sheetId = String(settings.sheetId || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'studioName')) {
    data.studioName = String(settings.studioName || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'phone')) {
    data.phone = String(settings.phone || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'email')) {
    data.email = String(settings.email || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'facebook')) {
    data.facebook = String(settings.facebook || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'bookingTerms')) {
    data.bookingTerms = String(settings.bookingTerms || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'hourRate')) {
    data.hourRate = nonNegativeNumber(settings.hourRate, 1500);
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'jobTypes')) {
    data.jobTypes = normalizeJobTypes(settings.jobTypes);
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'lastSheetSync')) {
    data.lastSheetSync = settings.lastSheetSync || null;
  }
  if (Object.prototype.hasOwnProperty.call(settings || {}, 'taxPaidReminders')) {
    data.taxPaidReminders = Array.from(new Set((Array.isArray(settings.taxPaidReminders) ? settings.taxPaidReminders : [])
      .map(key => String(key || '').trim())
      .filter(Boolean)));
  }
  await setDoc(getSettingsDoc(), data, { merge: true });
  return true;
}

function isFirebaseReady() {
  return Boolean(firebaseState.configured && firebaseState.db && firebaseState.user);
}

async function initFirebaseData() {
  firebaseState.configured = isFirebaseConfigured();
  updateFirebaseAuthUI(null);
  if (!firebaseState.configured) return false;

  firebaseState.app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig());
if (isAppCheckConfigured()) {
  try {
    firebaseState.appCheck = initializeAppCheck(firebaseState.app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey()),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('Firebase App Check setup failed:', e);
  }
}
  firebaseState.auth = getAuth(firebaseState.app);
  firebaseState.db = getFirestore(firebaseState.app);

  try {
    await setPersistence(firebaseState.auth, browserLocalPersistence);
  } catch (e) {
    console.warn('Firebase persistence setup failed:', e);
  }

  onAuthStateChanged(firebaseState.auth, async user => {
    if (firebaseState.unsubscribeJobs) {
      firebaseState.unsubscribeJobs();
      firebaseState.unsubscribeJobs = null;
    }
    if (firebaseState.unsubscribeSettings) {
      firebaseState.unsubscribeSettings();
      firebaseState.unsubscribeSettings = null;
    }

    if (!user) {
      firebaseState.user = null;
      firebaseState.snapshotLoaded = false;
      window.clearAppData?.({ clearPersistent: true, quiet: true });
      updateFirebaseAuthUI(null);
      return;
    }

    firebaseState.user = user;
    updateFirebaseAuthUI(user);
    subscribeUserSettings();
    subscribeJobs();
  });

  return true;
}

window.firebaseData = {
  init: initFirebaseData,
  signInWithCustomToken: signInFirebaseWithCustomToken,
  signInWithGooglePopup: signInFirebaseWithGooglePopup,
  signOut: signOutFirebase,
  saveJob: saveJobToFirebase,
  saveJobs: saveJobsToFirebase,
  deleteJob: deleteJobFromFirebase,
  saveSettings: saveSettingsToFirebase,
  isConfigured: isFirebaseConfigured,
  isAppCheckConfigured,
  isReady: isFirebaseReady,
  currentUser: () => firebaseState.user,
  jobsCollectionName: getJobsCollectionName,
  updateAuthUI: updateFirebaseAuthUI,
};

window.initFirebaseData = initFirebaseData;

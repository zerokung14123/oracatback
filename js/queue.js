// ============================================================
//  queue.js — จัดการคิวงาน (CRUD)
// ============================================================

let editingJobId = null;
let jobsCache = [];
let previewBookingJobId = null;
let preserveNewJobDraft = false;

/* ──────────────────────────────────────────────────────────
   STORAGE HELPERS
   ────────────────────────────────────────────────────────── */
function getJobs() {
  return window.firebaseData?.isReady?.() ? jobsCache : [];
}

function saveJobs(jobs) {
  jobsCache = Array.isArray(jobs) ? jobs.map(job => ({ ...job })) : [];
}

function getDeletedJobIds() {
  return [];
}

function rememberDeletedJob(jobId) {
  // Firebase is the source of truth in v3; deleted jobs are removed directly.
}

function clearDeletedJobIds() {
  // Kept for sync compatibility.
}

function setJobsFromFirebase(jobs) {
  saveJobs(jobs);
  window.refreshAppData?.();
}

function clearJobsCache() {
  saveJobs([]);
  window.refreshAppData?.();
}

function generateId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function isFirebaseDataReady() {
  return Boolean(window.firebaseData?.isReady?.());
}

function ensureDataStoreReady() {
  if (!isFirebaseDataReady()) {
    showToast('กรุณาเข้าสู่ระบบ Google เพื่อเชื่อมต่อ Firebase ก่อนบันทึกข้อมูล', 'error');
    return false;
  }
  return true;
}

async function persistJobToDataStore(job) {
  if (!isFirebaseDataReady()) return false;
  await window.firebaseData.saveJob(job);
  return true;
}

async function deleteJobFromDataStore(jobId) {
  if (!isFirebaseDataReady()) return false;
  await window.firebaseData.deleteJob(jobId);
  return true;
}

/* ──────────────────────────────────────────────────────────
   MODAL
   ────────────────────────────────────────────────────────── */
function openJobModal(jobId = null) {
  if (!jobId && window.isSheetSetupRequired?.()) {
    window.showPage?.('settings');
    showToast?.('กรุณาตั้งค่า Google Sheet ก่อนเพิ่มงานใหม่', 'error');
    return;
  }
  editingJobId = jobId;
  const modal = document.getElementById('jobModal');
  const title = document.getElementById('modalTitle');

  if (jobId) {
    preserveNewJobDraft = false;
    title.textContent = 'แก้ไขงาน';
    const job = getJobs().find(j => j.id === jobId);
    if (job) fillJobForm(job);
  } else {
    title.textContent = 'เพิ่มงานใหม่';
    if (preserveNewJobDraft) {
      window.renderJobTypeSelect?.(document.getElementById('jobType')?.value || '');
      if (!document.getElementById('jobDate').value) {
        document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
      }
    } else {
      clearJobForm();
    }
  }

  modal.classList.add('open');
}

function closeJobModal(options = {}) {
  const wasEditing = Boolean(editingJobId);
  const shouldClearDraft = Boolean(options.clearDraft);
  const shouldPreserveDraft = Boolean(options.preserveDraft);
  document.getElementById('jobModal')?.classList.remove('open');
  if (!wasEditing) {
    if (shouldClearDraft) {
      preserveNewJobDraft = false;
      clearJobForm();
    } else if (shouldPreserveDraft) {
      preserveNewJobDraft = true;
    }
  } else {
    preserveNewJobDraft = false;
  }
  editingJobId = null;
}

function fillJobForm(job) {
  document.getElementById('jobClient').value   = job.client || '';
  window.renderJobTypeSelect?.(job.type || 'custom');
  document.getElementById('jobType').value     = job.type || 'custom';
  document.getElementById('jobDate').value     = job.date || '';
  document.getElementById('jobStartTime').value = job.startTime || '09:00';
  document.getElementById('jobEndTime').value   = job.endTime || '13:00';
  document.getElementById('jobLocation').value  = job.location || '';
  const price = nonNegativeNumber(job.price);
  const deposit = nonNegativeNumber(job.deposit);
  document.getElementById('jobPrice').value    = price ? price : '';
  document.getElementById('jobDeposit').value  = deposit ? deposit : '';
  document.getElementById('jobNote').value     = job.note || '';
  const isCash = document.getElementById('jobIsCash');
  if (isCash) isCash.checked = Boolean(job.isCash);
  const autoBooking = document.getElementById('jobAutoBooking');
  if (autoBooking) autoBooking.checked = Boolean(job.bookingDocument?.dataUrl);
  clearJobImageInput();
  renderJobImageSummary(job);
}

function clearJobForm() {
  ['jobClient','jobLocation','jobNote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
  const defaultType = window.renderJobTypeSelect?.() || 'wedding';
  document.getElementById('jobType').value      = defaultType;
  document.getElementById('jobStartTime').value = '09:00';
  document.getElementById('jobEndTime').value   = '13:00';
  document.getElementById('jobPrice').value     = '';
  document.getElementById('jobDeposit').value   = '';
  const isCash = document.getElementById('jobIsCash');
  if (isCash) isCash.checked = false;
  const autoBooking = document.getElementById('jobAutoBooking');
  if (autoBooking) autoBooking.checked = false;
  clearJobImageInput();
  renderJobImageSummary(null);
}

function clearJobImageInput() {
  const input = document.getElementById('jobImages');
  if (input) input.value = '';
}

function selectedJobImageFiles() {
  return Array.from(document.getElementById('jobImages')?.files || []);
}

function renderJobImageSummary(job) {
  const el = document.getElementById('jobImageSummary');
  if (!el) return;
  const images = Array.isArray(job?.images) ? job.images : [];
  const bookingDocument = job?.bookingDocument?.dataUrl ? job.bookingDocument : null;
  el.replaceChildren();
  if (!images.length && !bookingDocument) {
    el.textContent = 'ยังไม่มีรูป / ใบจองในงานนี้';
    return;
  }

  if (bookingDocument) {
    appendJobImageFolder(el, `ใบจองที่บันทึกไว้: ${bookingDocument.fileName || 'booking.jpg'}`);
    appendJobImageLinks(el, [{
      dataUrl: bookingDocument.dataUrl,
      name: bookingDocument.fileName || 'booking.jpg',
      label: 'ดาวน์โหลดใบจอง',
    }]);
  }

  if (images.length) {
    appendJobImageFolder(el, `รูปที่เก็บไว้ใน Firebase: ${images.length} ไฟล์`);
    appendJobImageLinks(el, images.map((image, index) => ({
      dataUrl: image.dataUrl,
      name: image.name || `image-${index + 1}.jpg`,
      label: image.name || `รูป ${index + 1}`,
    })));
  }
}

function appendJobImageFolder(container, text) {
  const folder = document.createElement('div');
  folder.className = 'job-image-folder';
  folder.textContent = text;
  container.appendChild(folder);
}

function appendJobImageLinks(container, items) {
  const list = document.createElement('div');
  list.className = 'job-image-list';
  items.forEach(item => {
    const href = safeAssetUrl(item.dataUrl);
    const link = document.createElement('a');
    link.href = href;
    link.textContent = item.label || item.name || 'download';
    if (href !== '#') link.download = safeFileName(item.name || 'download.jpg');
    list.appendChild(link);
  });
  container.appendChild(list);
}

async function prepareJobImagesForFirebase(files) {
  const imageFiles = Array.from(files || []).filter(file => file?.type?.startsWith('image/'));
  const limitedFiles = imageFiles.slice(0, 3);
  if (imageFiles.length > limitedFiles.length) {
    showToast('เก็บรูปได้สูงสุด 3 ไฟล์ต่อครั้งเพื่อไม่ให้ข้อมูล Firebase ใหญ่เกินไป');
  }

  const images = [];
  for (const file of limitedFiles) {
    const dataUrl = await imageFileToStoredDataUrl(file);
    images.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: safeFileName(file.name || 'slip.jpg'),
      mimeType: 'image/jpeg',
      size: dataUrlLengthToBytes(dataUrl),
      dataUrl,
      uploadedAt: new Date().toISOString(),
    });
  }
  return images;
}

function imageFileToStoredDataUrl(file) {
  if (window.imageFileToDataUrl) {
    return window.imageFileToDataUrl(file, { maxSide: 980, quality: 0.76 });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function getPreferredSlipDataUrl(job) {
  const images = Array.isArray(job?.images) ? job.images : [];
  return images[images.length - 1]?.dataUrl || images[0]?.dataUrl || '';
}

function dataUrlLengthToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

function safeFileName(value) {
  return String(value || 'image.jpg')
    .replace(/[\\/:*?"<>|\x00-\x1F]+/g, '-')
    .trim()
    .slice(0, 120) || 'image.jpg';
}

/* ──────────────────────────────────────────────────────────
   SAVE JOB
   ────────────────────────────────────────────────────────── */
async function saveJob() {
  const client = document.getElementById('jobClient').value.trim();
  const date   = document.getElementById('jobDate').value;
  const priceRaw = document.getElementById('jobPrice').value.trim();
  const depositRaw = document.getElementById('jobDeposit').value.trim();
  const price  = priceRaw === '' ? 0 : asNumber(priceRaw, NaN);
  const deposit = depositRaw === '' ? 0 : asNumber(depositRaw, NaN);
  const jobs = getJobs();
  const previousJobs = jobs.map(item => ({ ...item }));
  const existingJob = editingJobId ? jobs.find(j => j.id === editingJobId) : null;
  const newImageFiles = selectedJobImageFiles();
  const shouldGenerateBooking = Boolean(document.getElementById('jobAutoBooking')?.checked);
  const isCash = Boolean(document.getElementById('jobIsCash')?.checked);
  let addedImageCount = 0;

  if (!client) { showToast('กรุณาใส่ชื่อลูกค้า', 'error'); return; }
  if (!date)   { showToast('กรุณาเลือกวันที่งาน', 'error'); return; }
  if (!Number.isFinite(price) || price < 0) { showToast('กรุณาใส่ราคางานเป็นตัวเลข 0 ขึ้นไป', 'error'); return; }
  if (!Number.isFinite(deposit) || deposit < 0) { showToast('กรุณาใส่มัดจำเป็นตัวเลข 0 ขึ้นไป', 'error'); return; }
  if (!ensureDataStoreReady()) return;

  let storedImages = Array.isArray(existingJob?.images) ? [...existingJob.images] : [];
  try {
    if (newImageFiles.length) {
      showToast('กำลังย่อรูปเพื่อเก็บใน Firebase...');
      const preparedImages = await prepareJobImagesForFirebase(newImageFiles);
      addedImageCount = preparedImages.length;
      storedImages = [...storedImages, ...preparedImages];
    }
  } catch (e) {
    showToast('เตรียมรูปภาพไม่สำเร็จ: ' + (e.message || e), 'error');
    return;
  }

  const job = {
    id: editingJobId || generateId(),
    client,
    type:      document.getElementById('jobType').value,
    date,
    startTime: document.getElementById('jobStartTime').value,
    endTime:   document.getElementById('jobEndTime').value,
    location:  document.getElementById('jobLocation').value.trim(),
    price,
    deposit,
    isCash,
    status:    existingJob?.status || 'pending',
    note:      document.getElementById('jobNote').value.trim(),
    images: storedImages,
    bookingDocument: existingJob?.bookingDocument || null,
    createdAt: editingJobId ? (getJobs().find(j => j.id === editingJobId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (shouldGenerateBooking) {
    try {
      if (!window.generateBookingDocumentData) {
        throw new Error('ตัวสร้างใบจองยังไม่พร้อมใช้งาน');
      }
      showToast('กำลังสร้างใบจองอัตโนมัติ...');
      const slipDataUrl = getPreferredSlipDataUrl(job);
      job.bookingDocument = await window.generateBookingDocumentData(job, { slipDataUrl });
    } catch (e) {
      showToast('สร้างใบจองไม่สำเร็จ: ' + (e.message || e), 'error');
      return;
    }
  }

  if (editingJobId) {
    const idx = jobs.findIndex(j => j.id === editingJobId);
    if (idx >= 0) jobs[idx] = job; else jobs.push(job);
  } else {
    jobs.push(job);
  }

  saveJobs(jobs);
  if (job.status === 'cancelled' && existingJob?.status !== 'cancelled') {
    rememberCalendarDelete(job.id);
  }
  const actionLabel = editingJobId ? 'อัปเดตงานแล้ว' : 'เพิ่มงานแล้ว';
  closeJobModal({ clearDraft: true });
  renderQueueTable();
  updateDashboard();
  try {
    await persistJobToDataStore(job);
  } catch (e) {
    saveJobs(previousJobs);
    renderQueueTable();
    updateDashboard();
    showToast('บันทึกไป Firebase ไม่สำเร็จ: ' + (e.message || e), 'error');
    return;
  }

  const imageText = addedImageCount ? ` + เก็บรูป ${addedImageCount} ไฟล์` : '';
  const bookingText = shouldGenerateBooking ? ' + สร้างใบจอง' : '';
  await syncAfterJobMutation(`${actionLabel}${imageText}${bookingText}`);
}

async function syncAfterJobMutation(successLabel) {
  if (!isSignedIn) {
    showToast(`${successLabel} ✓`, 'success');
    return;
  }

  const results = [];
  const sheetConfigured = getSpreadsheetId(getSettings().sheetId || CONFIG.SHEET_ID);
  if (sheetConfigured) {
    results.push(await syncSheets({ quiet: true }));
  }
  results.push(await syncCalendar({ quiet: true }));

  const failures = results.filter(result => !result?.ok);
  if (failures.length) {
    showToast(`${successLabel} แต่ sync บางส่วนไม่สำเร็จ: ${failures.map(result => result.error).join(' | ')}`, 'error');
    return;
  }

  const sheetResult = results.find(result => result?.destination);
  const calendarResult = results.find(result => result?.synced !== undefined);
  const sheetText = sheetResult ? `Sheets: ${sheetResult.jobs} งาน` : 'Sheets: ไม่ได้ตั้งค่า';
  const calendarText = calendarResult ? `Calendar: ${calendarResult.synced} รายการ` : 'Calendar: ไม่ได้ Sync';
  showToast(`${successLabel} และ Sync ${sheetText} | ${calendarText} ✓`, 'success');
}

/* ──────────────────────────────────────────────────────────
   DELETE JOB
   ────────────────────────────────────────────────────────── */
async function deleteJob(jobId) {
  if (!confirm('ลบงานนี้ออกจากคิว?')) return;
  if (!ensureDataStoreReady()) return;
  const currentJobs = getJobs();
  const previousJobs = currentJobs.map(item => ({ ...item }));
  const jobs = currentJobs.filter(j => j.id !== jobId);
  rememberDeletedJob(jobId);
  rememberCalendarDelete(jobId);
  saveJobs(jobs);
  renderQueueTable();
  updateDashboard();
  try {
    await deleteJobFromDataStore(jobId);
  } catch (e) {
    saveJobs(previousJobs);
    renderQueueTable();
    updateDashboard();
    showToast('ลบงาน/รูปภาพใน Firebase ไม่สำเร็จ: ' + (e.message || e), 'error');
    return;
  }
  await syncAfterJobMutation('ลบงานแล้ว');
}

/* ──────────────────────────────────────────────────────────
   RENDER TABLE
   ────────────────────────────────────────────────────────── */
function renderQueueTable(filterFn = null) {
  let jobs = getJobs();
  if (filterFn) jobs = jobs.filter(filterFn);

  // Apply search / status filter
  const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const status = document.getElementById('filterStatus')?.value || '';
  if (search) {
    jobs = jobs.filter(j => {
      const haystack = [
        j.client,
        j.location,
        JOB_TYPE_LABELS[j.type],
        j.type,
        j.note,
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }
  if (status) jobs = jobs.filter(j => j.status === status);

  // Sort by date desc
  jobs.sort((a, b) => (a.date < b.date ? 1 : -1));

  const tbody = document.getElementById('jobTableBody');
  if (!jobs.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state">ไม่พบงานที่ตรงกับเงื่อนไข</td></tr>';
    return;
  }

  tbody.innerHTML = jobs.map((j, i) => `
    <tr>
      <td style="color:var(--text-dim);font-size:0.78rem">${i + 1}</td>
      <td>${formatDate(j.date)}</td>
      <td>
        <div style="font-weight:500">${escHtml(j.client)}</div>
      </td>
      <td>${escHtml(JOB_TYPE_LABELS[j.type] || j.type || '-')}</td>
      <td class="job-location">${j.location ? escHtml(j.location) : '-'}</td>
      <td class="job-time">${escHtml(j.startTime || '-')}</td>
      <td class="job-time">${escHtml(j.endTime || '-')}</td>
      <td style="color:var(--gold-light);font-weight:600">${formatCurrency(j.price)}</td>
      <td>${j.isCash ? '<span class="cash-badge">รับเงินสด</span>' : '<span class="cash-muted">-</span>'}</td>
      <td>${renderStatusRadios(j, i)}</td>
      <td>
        ${j.bookingDocument?.dataUrl ? `<button class="action-btn" type="button" data-job-action="booking" data-job-id="${escAttr(j.id)}">ใบจอง</button>` : ''}
        <button class="action-btn" type="button" data-job-action="edit" data-job-id="${escAttr(j.id)}">แก้ไข</button>
        <button class="action-btn del" type="button" data-job-action="delete" data-job-id="${escAttr(j.id)}">ลบ</button>
      </td>
    </tr>
  `).join('');
  bindQueueTableActions(tbody);
}

function bindQueueTableActions(tbody) {
  tbody.querySelectorAll('[data-job-action]').forEach(button => {
    button.addEventListener('click', () => {
      const jobId = button.dataset.jobId || '';
      if (!jobId) return;
      if (button.dataset.jobAction === 'booking') {
        openJobBookingDocumentModal(jobId);
      } else if (button.dataset.jobAction === 'edit') {
        openJobModal(jobId);
      } else if (button.dataset.jobAction === 'delete') {
        deleteJob(jobId);
      }
    });
  });

  tbody.querySelectorAll('[data-job-status]').forEach(input => {
    input.addEventListener('change', () => updateJobStatus(input.dataset.jobId || '', input.value));
  });
}

function filterJobs() { renderQueueTable(); }

function openJobBookingDocumentModal(jobId) {
  const job = getJobs().find(item => item.id === jobId);
  const documentData = job?.bookingDocument;
  if (!documentData?.dataUrl) {
    showToast('งานนี้ยังไม่มีใบจองที่บันทึกไว้', 'error');
    return;
  }

  previewBookingJobId = jobId;
  const modal = document.getElementById('bookingPreviewModal');
  const title = document.getElementById('bookingPreviewTitle');
  const image = document.getElementById('bookingPreviewImage');
  if (title) title.textContent = `ใบจอง - ${job.client || 'ลูกค้า'}`;
  if (image) {
    image.src = documentData.dataUrl;
    image.alt = `ใบจอง ${job.client || ''}`.trim();
  }
  modal?.classList.add('open');
}

function closeBookingPreviewModal() {
  const modal = document.getElementById('bookingPreviewModal');
  const image = document.getElementById('bookingPreviewImage');
  modal?.classList.remove('open');
  if (image) {
    image.removeAttribute('src');
    image.alt = 'ใบจอง';
  }
  previewBookingJobId = null;
}

function downloadCurrentBookingDocument() {
  if (!previewBookingJobId) {
    showToast('ไม่พบใบจองที่เลือก', 'error');
    return;
  }
  downloadJobBookingDocument(previewBookingJobId);
}

function downloadJobBookingDocument(jobId) {
  const job = getJobs().find(item => item.id === jobId);
  const documentData = job?.bookingDocument;
  if (!documentData?.dataUrl) {
    showToast('งานนี้ยังไม่มีใบจองที่บันทึกไว้', 'error');
    return;
  }

  const link = document.createElement('a');
  link.href = documentData.dataUrl;
  link.download = documentData.fileName || `booking-${job.client || job.id}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function renderStatusRadios(job, index) {
  const statuses = [
    ['pending', 'รอ'],
    ['confirmed', 'ยืนยัน'],
    ['done', 'เสร็จ'],
    ['cancelled', 'ยกเลิก'],
  ];
  return `
    <div class="table-status-radios" role="radiogroup" aria-label="สถานะ ${escAttr(job.client || '')}">
      ${statuses.map(([status, shortLabel]) => `
        <label class="table-status-radio status-${escAttr(status)}" title="${escAttr(STATUS_LABELS[status])}">
          <input
            type="radio"
            name="job_status_${escAttr(job.id || index)}"
            value="${escAttr(status)}"
            data-job-status="1"
            data-job-id="${escAttr(job.id)}"
            ${job.status === status ? 'checked' : ''}
          />
          <span>${shortLabel}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function updateJobStatusFromRadio(input) {
  return updateJobStatus(input.dataset.jobId, input.value);
}

async function updateJobStatus(jobId, status) {
  const jobs = getJobs();
  const previousJobs = jobs.map(item => ({ ...item }));
  const job = jobs.find(j => j.id === jobId);
  if (!job || job.status === status) return;
  if (!ensureDataStoreReady()) {
    renderQueueTable();
    return;
  }

  const previousStatus = job.status;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  saveJobs(jobs);

  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    rememberCalendarDelete(job.id);
  }

  renderQueueTable();
  updateDashboard();
  if (document.getElementById('page-revenue')?.classList.contains('active')) renderRevenue();
  try {
    await persistJobToDataStore(job);
  } catch (e) {
    saveJobs(previousJobs);
    renderQueueTable();
    updateDashboard();
    if (document.getElementById('page-revenue')?.classList.contains('active')) renderRevenue();
    showToast('อัปเดตสถานะใน Firebase ไม่สำเร็จ: ' + (e.message || e), 'error');
    return;
  }
  await syncAfterJobMutation(`เปลี่ยนสถานะเป็น ${STATUS_LABELS[status] || status} แล้ว`);
}

/* ──────────────────────────────────────────────────────────
   UTILS
   ────────────────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeAssetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '#';
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(raw)) return raw;
  if (/^blob:/i.test(raw)) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol === 'https:' || url.origin === window.location.origin) return url.href;
  } catch {
    // Fall through to a disabled link for unexpected URL values.
  }
  return '#';
}

window.setJobsFromFirebase = setJobsFromFirebase;
window.clearJobsCache = clearJobsCache;
window.openJobBookingDocumentModal = openJobBookingDocumentModal;
window.closeBookingPreviewModal = closeBookingPreviewModal;
window.downloadCurrentBookingDocument = downloadCurrentBookingDocument;
window.downloadJobBookingDocument = downloadJobBookingDocument;

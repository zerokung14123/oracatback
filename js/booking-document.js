// ============================================================
//  booking-document.js - Booking JPG generator
//  ฟีเจอร์หลักสำหรับสร้างใบจองเป็นไฟล์ JPG
//  แยก template เอกสารไว้เฉพาะส่วน เพื่อให้ปรับดีไซน์ใบจองได้ชัดเจน
// ============================================================

const BOOKING_CANVAS_WIDTH = 1080;
const BOOKING_CANVAS_HEIGHT = 1528;
const BOOKING_TEMPLATE_NAME = 'pixmanager-booking-luxury-v3';
const BOOKING_FONT = '"Segoe UI", Tahoma, sans-serif';
const BOOKING_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const BOOKING_COLOR = {
  paper: '#f4f1ea',
  ink: '#1f1e1a',
  muted: '#625f57',
  faint: '#d8d0c3',
  gold: '#b89449',
  dark: '#191916',
  white: '#ffffff',
};

let bookingSlipDataUrl = '';
let bookingSlipImage = null;
const bookingSlipCache = { src: '', image: null, loading: false };

function refreshBookingDocumentJobs() {
  const select = document.getElementById('bookingJobSelect');
  if (!select) return;

  const selectedId = select.value;
  const jobs = getJobs()
    .filter(job => job.status !== 'cancelled')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  select.replaceChildren();
  if (jobs.length) {
    jobs.forEach(job => {
      const label = [
        job.date || '-',
        job.client || 'ไม่มีชื่อลูกค้า',
        JOB_TYPE_LABELS[job.type] || job.type || 'งาน',
      ].join(' - ');
      const option = document.createElement('option');
      option.value = String(job.id || '');
      option.textContent = label;
      select.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'ยังไม่มีงานในคิว';
    select.appendChild(option);
  }

  if (jobs.some(job => job.id === selectedId)) select.value = selectedId;
  renderBookingDocument();
}

async function loadBookingSlip(input) {
  const file = input?.files?.[0];
  if (!file) {
    bookingSlipDataUrl = '';
    bookingSlipImage = null;
    renderBookingDocument();
    return;
  }
  if (!/^image\/(?:png|jpe?g|webp|gif)$/i.test(file.type || '')) {
    showToast('กรุณาเลือกไฟล์รูปสลิป', 'error');
    input.value = '';
    return;
  }
  if (file.size > BOOKING_MAX_UPLOAD_BYTES) {
    showToast('ไฟล์รูปสลิปใหญ่เกิน 8 MB', 'error');
    input.value = '';
    return;
  }

  try {
    bookingSlipDataUrl = await imageFileToDataUrl(file, { maxSide: 980, quality: 0.78 });
    bookingSlipImage = await loadCanvasImage(bookingSlipDataUrl);
    renderBookingDocument();
  } catch (e) {
    bookingSlipDataUrl = '';
    bookingSlipImage = null;
    input.value = '';
    showToast('โหลดรูปสลิปไม่สำเร็จ: ' + (e.message || e), 'error');
    renderBookingDocument();
  }
}

function renderBookingDocument() {
  const canvas = document.getElementById('bookingCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const job = getSelectedBookingJob();
  const settings = getSettings();

  canvas.width = BOOKING_CANVAS_WIDTH;
  canvas.height = BOOKING_CANVAS_HEIGHT;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBookingTemplate(ctx, canvas, job, settings, getPreviewSlipImage(job));
}

function downloadBookingDocument() {
  const canvas = document.getElementById('bookingCanvas');
  const job = getSelectedBookingJob();
  if (!canvas || !job) {
    showToast('กรุณาเลือกงานก่อนดาวน์โหลด', 'error');
    return;
  }

  renderBookingDocument();
  const filename = bookingDocumentFileName(job, 'booking');

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('สร้างไฟล์ JPG แล้ว ✓', 'success');
}

async function generateBookingDocumentData(job, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = BOOKING_CANVAS_WIDTH;
  canvas.height = BOOKING_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const settings = getSettings();
  const slipDataUrl = options.slipDataUrl || getJobSlipDataUrl(job);
  const slipImage = slipDataUrl ? await loadCanvasImage(slipDataUrl).catch(() => null) : null;
  drawBookingTemplate(ctx, canvas, job, settings, slipImage);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  return {
    dataUrl,
    fileName: bookingDocumentFileName(job, 'booking'),
    mimeType: 'image/jpeg',
    size: dataUrlLengthToBytes(dataUrl),
    createdAt: new Date().toISOString(),
    template: BOOKING_TEMPLATE_NAME,
  };
}

function getSelectedBookingJob() {
  const jobId = document.getElementById('bookingJobSelect')?.value;
  return getJobs().find(job => job.id === jobId) || null;
}

function getPreviewSlipImage(job) {
  if (bookingSlipImage) return bookingSlipImage;

  const src = getJobSlipDataUrl(job);
  if (!src) return null;
  if (bookingSlipCache.src === src && bookingSlipCache.image) return bookingSlipCache.image;

  if (bookingSlipCache.src !== src && !bookingSlipCache.loading) {
    bookingSlipCache.src = src;
    bookingSlipCache.image = null;
    bookingSlipCache.loading = true;
    loadCanvasImage(src)
      .then(image => { bookingSlipCache.image = image; })
      .catch(() => { bookingSlipCache.image = null; })
      .finally(() => {
        bookingSlipCache.loading = false;
        renderBookingDocument();
      });
  }
  return null;
}

function getJobSlipDataUrl(job) {
  const images = Array.isArray(job?.images) ? job.images : [];
  return images.find(image => image?.dataUrl)?.dataUrl || '';
}

/* ============================================================
   BOOKING TEMPLATE
   Template ใบจอง luxury สำหรับใช้งานจริง
   ============================================================ */

function drawBookingTemplate(ctx, canvas, job, settings, slipImage) {
  const w = canvas.width;
  const h = canvas.height;
  const studioName = bookingStudioName(settings);
  const contact = bookingContact(settings);

  ctx.fillStyle = BOOKING_COLOR.paper;
  ctx.fillRect(0, 0, w, h);

  drawBookingWatermark(ctx, w);
  drawBookingHeader(ctx, w, studioName, contact);
  drawBookingTitle(ctx, w);

  if (!job) {
    drawBookingEmptyState(ctx, w, h);
    return;
  }

  drawBookingMeta(ctx, job);
  drawBookingTable(ctx, job);
  drawBookingTermsAndSlip(ctx, job, slipImage);
  drawBookingTotals(ctx, job);
  drawBookingSignature(ctx, settings);
}

function drawBookingWatermark(ctx, w) {
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.textAlign = 'right';
  ctx.font = `900 118px ${BOOKING_FONT}`;
  ctx.fillText('BOOKING', w - 74, 522);
  ctx.restore();
}

function drawBookingHeader(ctx, w, studioName, contact) {
  ctx.fillStyle = BOOKING_COLOR.dark;
  ctx.fillRect(0, 0, w, 164);
  ctx.fillStyle = BOOKING_COLOR.gold;
  ctx.fillRect(0, 164, w, 4);

  ctx.fillStyle = BOOKING_COLOR.white;
  ctx.textAlign = 'left';
  drawFittedText(ctx, studioName, 86, 98, 430, 76, 43, '800', BOOKING_FONT, BOOKING_COLOR.white);

  drawContactRow(ctx, 540, 55, 'phone', contact.phone || 'เบอร์โทร');
  drawContactRow(ctx, 540, 105, 'web', contact.facebook || 'Facebook');
  drawContactRow(ctx, 792, 55, 'mail', contact.email || 'อีเมล');
}

function drawContactRow(ctx, x, y, icon, text) {
  ctx.save();
  ctx.fillStyle = BOOKING_COLOR.white;
  ctx.beginPath();
  ctx.arc(x, y - 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOOKING_COLOR.dark;
  ctx.textAlign = 'center';
  ctx.font = `800 16px ${BOOKING_FONT}`;
  const glyph = icon === 'phone' ? 'T' : icon === 'mail' ? '@' : 'f';
  ctx.fillText(glyph, x, y + 3);

  ctx.fillStyle = BOOKING_COLOR.white;
  ctx.textAlign = 'left';
  ctx.font = `500 24px ${BOOKING_FONT}`;
  wrapCanvasText(ctx, text, x + 31, y + 7, icon === 'mail' ? 246 : 204, 30, 2);
  ctx.restore();
}

function drawBookingTitle(ctx, w) {
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'ใบจองคิวถ่ายภาพ', w / 2, 300, 930, 118, 82, '300', BOOKING_FONT, BOOKING_COLOR.ink);
  ctx.fillStyle = BOOKING_COLOR.gold;
  ctx.font = `700 20px ${BOOKING_FONT}`;
  ctx.fillText('BOOKING CONFIRMATION', w / 2, 342);
  ctx.textAlign = 'left';
}

function drawBookingEmptyState(ctx, w, h) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = BOOKING_COLOR.muted;
  ctx.font = `500 40px ${BOOKING_FONT}`;
  ctx.fillText('เลือกงานจากคิวเพื่อสร้างใบจอง', w / 2, h / 2 - 15);
  ctx.font = `400 29px ${BOOKING_FONT}`;
  ctx.fillText('แนบรูปสลิปได้จากช่องด้านซ้าย หรือใช้รูปแรกที่เก็บไว้ในงาน', w / 2, h / 2 + 28);
  ctx.restore();
}

function drawBookingMeta(ctx, job) {
  const leftX = 86;
  const rightX = 584;
  const y = 402;

  drawBookingDivider(ctx, leftX, y - 26, 908);
  drawBookingMetaField(ctx, 'วันที่', formatThaiLongDate(job.date), leftX, y, 410,);
  ctx.textAlign = 'center';
  drawBookingMetaField(ctx, 'ลูกค้า', job.client || '-', rightX, y, 410);
  ctx.textAlign = 'center';
  drawBookingMetaField(ctx, 'ช่วงเวลา', bookingTimeLabel(job), leftX, y + 96, 410);
  ctx.textAlign = 'center';
  drawBookingMetaField(ctx, 'สถานที่', job.location || '-', rightX, y + 96, 410);
  ctx.textAlign = 'center';
  drawBookingDivider(ctx, leftX, y + 178, 908);
}

function drawBookingMetaField(ctx, label, value, x, y, w) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = BOOKING_COLOR.gold;
  ctx.font = `800 20px ${BOOKING_FONT}`;
  ctx.fillText(label, x, y);
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 31px ${BOOKING_FONT}`;
  wrapCanvasText(ctx, value, x, y + 42, w, 36, 2);
  ctx.restore();
}

function drawBookingTable(ctx, job) {
  const x = 86;
  const y = 636;
  const w = 908;
  const itemX = x + 56;
  const detailX = x + 504;
  const priceX = x + w - 4;
  const labelY = y;
  const headerY = y + 48;
  const bodyY = headerY + 55;
  const itemW = 370;
  const detailW = 284;
  const priceW = 144;

  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.textAlign = 'left';
  ctx.font = `800 34px ${BOOKING_FONT}`;
  ctx.fillText('รายละเอียดบริการ', x, labelY);

  ctx.fillStyle = BOOKING_COLOR.muted;
  ctx.font = `850 25px ${BOOKING_FONT}`;
  ctx.fillText('รายการ', itemX, headerY);
  ctx.fillText('รายละเอียด', detailX-30, headerY);
  ctx.textAlign = 'center';
  ctx.fillText('ราคา', priceX-20, headerY);
  ctx.textAlign = 'center';
  drawBookingDivider(ctx, x, headerY + 20, w);

  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 25px ${BOOKING_FONT}`;
  ctx.fillText('1.', x, bodyY);

  const itemText = bookingItemText(job);
  drawWrappedCellText(ctx, itemText, itemX, bodyY - 30, itemW, 220, {
    paddingX: 0,
    paddingY: 30,
    lineHeight: 36,
    maxLines: 5,
    font: `500 26px ${BOOKING_FONT}`,
    color: BOOKING_COLOR.ink,
  });

  const details = [
    bookingTimeLabel(job),
    job.location ? `สถานที่ ${job.location}` : '',
  ].filter(Boolean).join(' / ');
  drawWrappedCellText(ctx, details || '-', detailX, bodyY - 30, detailW, 220, {
    paddingX: 0,
    paddingY: 30,
    lineHeight: 36,
    maxLines: 4,
    font: `500 26px ${BOOKING_FONT}`,
    color: BOOKING_COLOR.ink,
  });

  ctx.textAlign = 'center';
  drawFittedText(
    ctx,
    formatBahtShort(nonNegativeNumber(job.price)),
    priceX,
    bodyY,
    priceW,
    28,
    20,
    '500',
    BOOKING_FONT,
    BOOKING_COLOR.ink
  );
  ctx.textAlign = 'left';
  drawBookingDivider(ctx, x, bodyY + 170, w);
}

function drawBookingTermsAndSlip(ctx, job, slipImage) {
  const x = 86;
  const y = 946;

  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 32px ${BOOKING_FONT}`;
  ctx.fillText('เงื่อนไขและข้อกำหนด :', x, y);

  ctx.font = `400 28px ${BOOKING_FONT}`;
  const terms = (document.getElementById('bookingExtraNote')?.value?.trim() || job.note || defaultBookingTerms());
  wrapCanvasText(ctx, terms, x, y + 50, 452, 38, 4);
  ctx.font = `600 27px ${BOOKING_FONT}`;
  ctx.fillText(`มัดจำค่าถ่ายภาพ เป็นจำนวน ${formatNumber(nonNegativeNumber(job.deposit))} บาท`, x, y + 182);

  const slipX = 122;
  const slipY = 1184;
  const slipW = 180;
  const slipH = 160;
  if (slipImage) {
    drawImageCover(ctx, slipImage, slipX, slipY, slipW, slipH);
  } else {
    drawSlipPlaceholder(ctx, slipX, slipY, slipW, slipH);
  }

  ctx.strokeStyle = BOOKING_COLOR.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(slipX, slipY + slipH + 40);
  ctx.lineTo(slipX + slipW + 18, slipY + slipH + 40);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 27px ${BOOKING_FONT}`;
  ctx.fillText('หลักฐานการโอน', slipX + slipW / 2 + 9, slipY + slipH + 74);
  ctx.font = `800 22px ${BOOKING_FONT}`;
  ctx.fillText('มัดจำค่าถ่ายภาพ', slipX + slipW / 2 + 9, slipY + slipH + 101);
  ctx.textAlign = 'left';
}

function drawBookingTotals(ctx, job) {
  const x = 618;
  const y = 946;
  const total = nonNegativeNumber(job.price);
  const deposit = nonNegativeNumber(job.deposit);
  const remaining = Math.max(0, total - deposit);

  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 32px ${BOOKING_FONT}`;
  ctx.fillText('สรุปยอดชำระ', x, y);
  drawBookingAmountLine(ctx, 'ราคางาน', total, x, y + 64);
  drawBookingAmountLine(ctx, 'มัดจำ', deposit, x, y + 112);
  drawBookingAmountLine(ctx, 'ยอดคงเหลือ', remaining, x, y + 160);

  drawBookingDivider(ctx, x, y + 204, 376);
  ctx.textAlign = 'right';
  ctx.fillStyle = BOOKING_COLOR.gold;
  ctx.font = `900 66px ${BOOKING_FONT}`;
  ctx.fillText(`${formatNumber(total)} ฿`, 994, y + 292);

  ctx.textAlign = 'center';
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 27px ${BOOKING_FONT}`;
  ctx.fillText('ยอดรวมทั้งหมด', 820, y + 232);
  drawFittedText(ctx, `(${thaiBahtText(total)})`, 820, y + 337, 348, 27, 19, '700', BOOKING_FONT, BOOKING_COLOR.ink);
  ctx.textAlign = 'left';
}

function drawBookingAmountLine(ctx, label, amount, x, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = BOOKING_COLOR.muted;
  ctx.font = `600 25px ${BOOKING_FONT}`;
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `700 25px ${BOOKING_FONT}`;
  ctx.fillText(formatBahtShort(amount), 994, y);
  ctx.textAlign = 'left';
}

function drawBookingSignature(ctx, settings) {
  const x = 710;
  const y = 1396;
  const name = settings?.signatureName || bookingStudioName(settings);

  ctx.strokeStyle = BOOKING_COLOR.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 260, y);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = BOOKING_COLOR.ink;
  ctx.font = `800 30px ${BOOKING_FONT}`;
  ctx.fillText(name, x + 130, y + 34);
  ctx.font = `400 27px ${BOOKING_FONT}`;
  ctx.fillText('ผู้ให้บริการ', x + 130, y + 66);
  ctx.textAlign = 'left';
}

function drawBookingDivider(ctx, x, y, w) {
  ctx.save();
  ctx.strokeStyle = BOOKING_COLOR.faint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

/* ============================================================
   HELPERS
   ============================================================ */

function bookingStudioName(settings) {
  return String(settings?.studioName || '').trim() || 'Tinmeawfoto';
}

function bookingContact(settings, overrides = {}) {
  return {
    phone: String(overrides?.phone || settings?.phone || '').trim(),
    email: String(overrides?.email || settings?.email || '').trim(),
    facebook: String(overrides?.facebook || settings?.facebook || '').trim(),
  };
}

function bookingTimeLabel(job) {
  const start = job?.startTime || '-';
  const end = job?.endTime || '-';
  return `${start} - ${end}`;
}

function bookingItemText(job) {
  const jobType = JOB_TYPE_LABELS[job?.type] || job?.type || 'ถ่ายภาพ';
  const location = job?.location ? ` ${job.location}` : '';
  return `${jobType}${location} พร้อมส่งงานตามข้อตกลง`;
}

function defaultBookingTerms() {
  return 'ส่งภาพพร้อมปรับแต่งแสงสว่าง สี ผ่าน Google photo ภายใน 7 วัน หลังจบงาน';
}

function formatThaiLongDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

function bookingDocumentFileName(job, prefix) {
  const safeClient = String(job?.client || 'client').replace(/[\\/:*?"<>|]+/g, '').trim() || 'client';
  return `${prefix}-${safeClient}-${job?.date || 'no-date'}.jpg`;
}

function formatBahtShort(amount) {
  return `${formatNumber(nonNegativeNumber(amount))}.- ฿`;
}

function formatNumber(amount) {
  return Math.round(nonNegativeNumber(amount)).toLocaleString('th-TH');
}

function thaiBahtText(amount) {
  const value = Math.round(nonNegativeNumber(amount));
  if (!value) return 'ศูนย์บาทถ้วน';
  return `${thaiNumberText(value)}บาทถ้วน`;
}

function thaiNumberText(value) {
  const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const num = Math.floor(Number(value));
  if (num >= 1000000) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    return thaiNumberText(million) + 'ล้าน' + (rest ? thaiNumberText(rest) : '');
  }
  const chars = String(num).split('').map(Number);
  return chars.map((digit, index) => {
    if (!digit) return '';
    const pos = chars.length - index - 1;
    if (pos === 1 && digit === 1) return 'สิบ';
    if (pos === 1 && digit === 2) return 'ยี่สิบ';
    if (pos === 0 && digit === 1 && chars.length > 1) return 'เอ็ด';
    return digits[digit] + positions[pos];
  }).join('');
}

function drawSlipPlaceholder(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#e9e6df';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d2cec4';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#c7c0b5';
  ctx.fillRect(x + 24, y + 26, w - 48, 28);
  ctx.fillRect(x + 24, y + 72, w - 92, 18);
  ctx.fillRect(x + 24, y + 104, w - 70, 18);
  ctx.fillRect(x + 24, y + 136, w - 118, 18);
  ctx.fillStyle = '#bbb3a7';
  ctx.font = '600 24px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('แนบรูปสลิป', x + w / 2, y + h - 34);
  ctx.restore();
}

function drawWrappedCellText(ctx, text, x, y, w, h, options = {}) {
  const paddingX = options.paddingX ?? 20;
  const paddingY = options.paddingY ?? 30;
  const lineHeight = options.lineHeight ?? 28;
  const maxLines = options.maxLines ?? 4;
  const font = options.font || '400 20px "Segoe UI", Tahoma, sans-serif';
  const color = options.color || '#1f1f1c';

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - 4);
  ctx.clip();
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = font;
  wrapCanvasText(ctx, text, x + paddingX, y + paddingY, w - (paddingX * 2), lineHeight, maxLines);
  ctx.restore();
}

function drawImageCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawFittedText(ctx, text, x, y, maxWidth, startSize, minSize, weight, family, color) {
  const value = String(text || '').trim() || 'Tinmeawfoto';
  let size = startSize;
  ctx.fillStyle = color;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(value).width <= maxWidth || size <= minSize) break;
    size -= 3;
  } while (size > minSize);
  ctx.fillText(value, x, y);
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const value = String(text || '').trim();
  if (!value) return 0;

  const hasWhitespace = /\s/.test(value);
  const tokens = hasWhitespace ? value.split(/\s+/) : Array.from(value);
  const joiner = hasWhitespace ? ' ' : '';
  let line = '';
  let lines = 0;

  tokens.forEach(token => {
    if (lines >= maxLines) return;
    const test = line ? `${line}${joiner}${token}` : token;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + (lines * lineHeight));
      line = token;
      lines += 1;
      return;
    }
    line = test;
  });

  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + (lines * lineHeight));
    lines += 1;
  }
  return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function imageFileToDataUrl(file, options = {}) {
  const maxSide = options.maxSide || 1100;
  const quality = options.quality || 0.8;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปไม่ถูกต้อง'));
      img.onload = () => {
        const scale = Math.min(maxSide / img.width, maxSide / img.height, 1);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
    image.src = src;
  });
}

function dataUrlLengthToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

window.refreshBookingDocumentJobs = refreshBookingDocumentJobs;
window.renderBookingDocument = renderBookingDocument;
window.loadBookingSlip = loadBookingSlip;
window.downloadBookingDocument = downloadBookingDocument;
window.generateBookingDocumentData = generateBookingDocumentData;
window.imageFileToDataUrl = imageFileToDataUrl;

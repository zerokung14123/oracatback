// ============================================================
//  revenue.js — ระบบคำนวนรายรับ + Chart
// ============================================================

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
let dashboardTaxSelectedKey = '';

function getJobDate(job) {
  if (!job?.date) return null;
  const d = new Date(job.date + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

function isRevenueJob(job) {
  return job?.status === 'done' && getJobDate(job) !== null;
}

function isScheduledJob(job) {
  return job?.status !== 'cancelled' && getJobDate(job) !== null;
}

/* ──────────────────────────────────────────────────────────
   REVENUE PAGE
   ────────────────────────────────────────────────────────── */
function renderRevenue() {
  const year = Number(document.getElementById('revYear').value);
  const month = document.getElementById('revMonth').value;

  let jobs = getJobs().filter(isRevenueJob);

  // Filter year
  jobs = jobs.filter(j => getJobDate(j).getFullYear() === year);

  // Filter month
  if (month) jobs = jobs.filter(j => (getJobDate(j).getMonth() + 1) === Number(month));

  const total = jobs.reduce((s, j) => s + nonNegativeNumber(j.price), 0);
  const count = jobs.length;

  document.getElementById('rev-total').textContent = formatCurrency(total);
  document.getElementById('rev-count').textContent = count;

  renderMonthlyBreakdown(year, jobs, month);
  renderTypeBreakdown(jobs);
}

function renderMonthlyBreakdown(year, jobs, filterMonth) {
  const el = document.getElementById('monthlyBreakdown');
  const months = filterMonth ? [Number(filterMonth)] : Array.from({ length: 12 }, (_, i) => i + 1);

  const rows = months.map(m => {
    const mJobs = jobs.filter(j => (getJobDate(j).getMonth() + 1) === m);
    const rev = mJobs.reduce((s, j) => s + nonNegativeNumber(j.price), 0);
    return { m, rev, count: mJobs.length };
  }).filter(r => r.rev > 0 || !filterMonth);

  if (!rows.some(r => r.rev > 0)) {
    el.innerHTML = '<div class="empty-state">ยังไม่มีรายรับในช่วงนี้</div>';
    return;
  }

  el.innerHTML = rows.map(r => `
    <div class="breakdown-row">
      <span class="breakdown-label">${MONTH_NAMES[r.m - 1]} ${year}</span>
      <span>
        <span class="breakdown-value">${formatCurrency(r.rev)}</span>
        <span class="breakdown-count">${r.count} งาน</span>
      </span>
    </div>
  `).join('');
}

function renderTypeBreakdown(jobs) {
  const el = document.getElementById('typeBreakdown');
  const byType = {};
  jobs.forEach(j => {
    if (!byType[j.type]) byType[j.type] = { rev: 0, count: 0 };
    byType[j.type].rev += nonNegativeNumber(j.price);
    byType[j.type].count += 1;
  });

  const sorted = Object.entries(byType).sort((a, b) => b[1].rev - a[1].rev);

  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
    return;
  }

  el.innerHTML = sorted.map(([type, d]) => `
    <div class="breakdown-row">
      <span class="breakdown-label">${revenueEscHtml(JOB_TYPE_LABELS[type] || type || '-')}</span>
      <span>
        <span class="breakdown-value">${formatCurrency(d.rev)}</span>
        <span class="breakdown-count">${d.count} งาน</span>
      </span>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────────────────
   DASHBOARD CHART (Vanilla Canvas)
   ────────────────────────────────────────────────────────── */
function renderChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const year = Number(document.getElementById('chartYear')?.value || new Date().getFullYear());
  const chartType = document.getElementById('chartType')?.value || 'bar';

  const jobs = getJobs().filter(j => isRevenueJob(j) && getJobDate(j).getFullYear() === year);
  const data = Array.from({ length: 12 }, (_, i) =>
    jobs.filter(j => getJobDate(j).getMonth() === i).reduce((s, j) => s + nonNegativeNumber(j.price), 0)
  );

  const W = canvas.offsetWidth || canvas.width;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  if (chartType === 'pie') {
    const total = data.reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      ctx.fillStyle = 'rgba(136,136,136,0.8)';
      ctx.font = '12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ไม่มีข้อมูลรายรับ', W / 2, H / 2);
      return;
    }

    let currentAngle = -0.5 * Math.PI;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 20;

    data.forEach((val, i) => {
      if (val <= 0) return;
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();

      const hueBase = 42;
      const light = 30 + (i * 4);
      ctx.fillStyle = `hsl(${hueBase}, 75%, ${light}%)`;
      ctx.fill();
      
      const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.strokeStyle = isLightTheme ? '#ffffff' : '#141414';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      const midAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const lx = cx + Math.cos(midAngle) * labelRadius;
      const ly = cy + Math.sin(midAngle) * labelRadius;
      ctx.fillStyle = isLightTheme ? '#fff' : '#000';
      ctx.font = 'bold 9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(MONTH_NAMES[i], lx, ly);

      currentAngle += sliceAngle;
    });
  } else {
    const maxVal = Math.max(...data, 1);
    const padL = 10, padR = 10, padT = 20, padB = 30;
    const barW = (W - padL - padR) / 12;

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + ((H - padT - padB) * i / 4);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }

    data.forEach((val, i) => {
      const bH  = ((H - padT - padB) * val / maxVal);
      const x   = padL + i * barW + barW * 0.15;
      const w   = barW * 0.7;
      const y   = H - padB - bH;

      const grad = ctx.createLinearGradient(0, y, 0, H - padB);
      grad.addColorStop(0, 'rgba(201,168,76,0.9)');
      grad.addColorStop(1, 'rgba(201,168,76,0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, bH, [3,3,0,0]);
      } else {
        ctx.rect(x, y, w, bH);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(136,136,136,0.8)';
      ctx.font = '9px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(MONTH_NAMES[i], x + w/2, H - padB + 14);
    });
  }
}

/* ──────────────────────────────────────────────────────────
   DASHBOARD STATS
   ────────────────────────────────────────────────────────── */
function updateDashboard() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const jobs  = getJobs();

  const scheduledJobs = jobs.filter(isScheduledJob);
  const revenueJobs = jobs.filter(isRevenueJob);
  const thisMonth = scheduledJobs.filter(j => {
    const d = getJobDate(j);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const thisMonthRevenue = revenueJobs.filter(j => {
    const d = getJobDate(j);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const thisYearRevenue = revenueJobs.filter(j => getJobDate(j).getFullYear() === year);
  const pending   = jobs.filter(j => j.status === 'pending');

  document.getElementById('stat-month-jobs').textContent  = thisMonth.length;
  document.getElementById('stat-month-income').textContent = formatCurrency(thisMonthRevenue.reduce((s,j)=>s + nonNegativeNumber(j.price),0));
  document.getElementById('stat-year-income').textContent  = formatCurrency(thisYearRevenue.reduce((s,j)=>s + nonNegativeNumber(j.price),0));
  document.getElementById('stat-pending').textContent      = pending.length;

  // Upcoming list (next 5 jobs)
  const upcoming = scheduledJobs
    .filter(j => j.date >= now.toISOString().split('T')[0])
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const ul = document.getElementById('upcomingList');
  if (!upcoming.length) {
    ul.innerHTML = '<div class="empty-state">ยังไม่มีงานที่กำลังจะมาถึง</div>';
  } else {
    ul.innerHTML = upcoming.map(j => `
      <div class="upcoming-item">
        <div class="upcoming-date">${formatDate(j.date)}</div>
        <div class="upcoming-info">
          <div class="upcoming-client">${revenueEscHtml(j.client)}</div>
          <div class="upcoming-type">${revenueEscHtml(JOB_TYPE_LABELS[j.type] || j.type || '-')}</div>
        </div>
        <div class="upcoming-price">${formatCurrency(j.price)}</div>
      </div>
    `).join('');
  }

  renderDeliveryAlerts(now, jobs);
  renderDashboardTaxReminder(now);
  renderChart();
}

function renderDeliveryAlerts(now = new Date(), jobs = getJobs()) {
  const listEl = document.getElementById('deliveryAlertList');
  const overdueEl = document.getElementById('deliveryOverdueCount');
  const dueSoonEl = document.getElementById('deliveryDueSoonCount');
  if (!listEl || !overdueEl || !dueSoonEl) return;

  const alerts = getDeliveryAlerts(now, jobs);
  const overdue = alerts.filter(item => item.isOverdue);
  const dueSoon = alerts.filter(item => !item.isOverdue);

  overdueEl.textContent = overdue.length;
  dueSoonEl.textContent = dueSoon.length;

  if (!alerts.length) {
    listEl.innerHTML = '<div class="empty-state">ยังไม่มีงานส่งล่าช้าหรือใกล้ครบกำหนด</div>';
    return;
  }

  listEl.innerHTML = alerts.slice(0, 6).map(item => `
    <div class="delivery-alert-item ${item.isOverdue ? 'overdue' : item.daysLeft === 0 ? 'due-today' : 'due-soon'}">
      <div class="delivery-alert-main">
        <strong>${revenueEscHtml(item.client)}</strong>
        <span>${revenueEscHtml(item.typeLabel)} • งานวันที่ ${revenueEscHtml(formatDate(item.jobDateText))} • ตั้งไว้ ${item.deliveryDays} วัน</span>
      </div>
      <div class="delivery-alert-meta">
        <b>${revenueEscHtml(item.statusText)}</b>
        <small>กำหนดส่ง ${revenueEscHtml(formatDate(item.dueDateText))}</small>
      </div>
    </div>
  `).join('');
}

function getDeliveryAlerts(now = new Date(), jobs = getJobs()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const typeSettings = getJobTypeDeliverySettings();

  return (Array.isArray(jobs) ? jobs : [])
    .filter(job => job?.status !== 'done' && job?.status !== 'cancelled')
    .map(job => {
      const jobDate = getJobDate(job);
      if (!jobDate) return null;
      const typeSetting = typeSettings.get(job.type) || {};
      const deliveryDays = normalizeDashboardDeliveryDays(typeSetting.deliveryDays);
      const dueDate = addDays(jobDate, deliveryDays);
      const daysLeft = Math.ceil((dueDate - today) / dayMs);
      if (daysLeft > 7) return null;
      const overdueDays = Math.max(0, Math.ceil((today - dueDate) / dayMs));
      return {
        job,
        client: job.client || 'ไม่ระบุชื่อลูกค้า',
        typeLabel: typeSetting.label || JOB_TYPE_LABELS[job.type] || job.type || 'ไม่ระบุประเภท',
        deliveryDays,
        jobDateText: dateToInputString(jobDate),
        dueDateText: dateToInputString(dueDate),
        daysLeft,
        overdueDays,
        isOverdue: daysLeft < 0,
        statusText: daysLeft < 0
          ? `เลยกำหนดส่งงาน ${overdueDays} วัน`
          : daysLeft === 0
            ? 'ครบกำหนดส่งวันนี้'
            : `เหลือ ${daysLeft} วัน`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.isOverdue) return b.overdueDays - a.overdueDays;
      return a.daysLeft - b.daysLeft;
    });
}

function getJobTypeDeliverySettings() {
  const settings = typeof getSettings === 'function' ? getSettings() : {};
  return new Map((Array.isArray(settings.jobTypes) ? settings.jobTypes : [])
    .filter(type => type?.id)
    .map(type => [type.id, {
      label: String(type.label || '').trim(),
      deliveryDays: normalizeDashboardDeliveryDays(type.deliveryDays),
    }]));
}

function normalizeDashboardDeliveryDays(value, fallback = 30) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + normalizeDashboardDeliveryDays(days, 0));
  return next;
}

function dateToInputString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderDashboardTaxReminder(now = new Date()) {
  const labelEl = document.getElementById('dashboardTaxCountdownLabel');
  const titleEl = document.getElementById('dashboardTaxTitle');
  const descriptionEl = document.getElementById('dashboardTaxDescription');
  const countdownEl = document.getElementById('dashboardTaxCountdown');
  const dueDateEl = document.getElementById('dashboardTaxDueDate');
  const listEl = document.getElementById('dashboardTaxDeadlines');
  const paidButton = document.getElementById('dashboardTaxPaidButton');
  const countdownBox = countdownEl?.closest('.tax-countdown-box');
  if (!labelEl || !titleEl || !descriptionEl || !countdownEl || !dueDateEl || !listEl) return;

  const deadlines = getTaxPaymentDeadlines(now);
  if (!deadlines.length) {
    labelEl.textContent = 'ไม่มีแจ้งเตือน';
    titleEl.textContent = 'แจ้งเตือนการจ่ายภาษี';
    descriptionEl.textContent = 'ยังไม่มีกำหนดภาษีที่ต้องแจ้งเตือนในช่วง 30 วันที่ผ่านมา';
    countdownEl.textContent = '-';
    dueDateEl.textContent = '-';
    listEl.innerHTML = '<div class="empty-state">ไม่มีแจ้งเตือนภาษี</div>';
    if (paidButton) paidButton.hidden = true;
    countdownBox?.classList.remove('overdue');
    return;
  }

  const selected = deadlines.find(item => item.key === dashboardTaxSelectedKey) || deadlines[0];
  dashboardTaxSelectedKey = selected.key;

  titleEl.textContent = selected.title;
  descriptionEl.textContent = selected.description;
  labelEl.textContent = selected.statusLabel;
  countdownEl.textContent = selected.displayNumber;
  dueDateEl.textContent = selected.date.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  countdownBox?.classList.toggle('overdue', selected.isOverdue);
  if (paidButton) {
    paidButton.hidden = !selected.canMarkPaid;
    paidButton.disabled = !selected.canMarkPaid;
  }

  listEl.innerHTML = deadlines.slice(0, 3).map(item => `
    <button class="tax-deadline-item ${item.key === selected.key ? 'active' : ''} ${item.isOverdue ? 'overdue' : ''}" type="button" data-tax-key="${revenueEscAttr(item.key)}" aria-pressed="${item.key === selected.key ? 'true' : 'false'}">
      <div>
        <strong>${revenueEscHtml(item.shortTitle)}</strong>
        <span>${revenueEscHtml(item.dateText)}</span>
      </div>
      <b>${revenueEscHtml(item.listLabel)}</b>
    </button>
  `).join('');

  listEl.querySelectorAll('[data-tax-key]').forEach(button => {
    button.addEventListener('click', () => {
      dashboardTaxSelectedKey = button.dataset.taxKey || '';
      renderDashboardTaxReminder();
    });
  });
}

function getTaxPaymentDeadlines(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = today.getFullYear();
  const paidKeys = getTaxPaidReminderKeys();
  const candidates = [
    buildTaxDeadline({
      key: `pnd90-91-${currentYear - 1}`,
      title: 'ภ.ง.ด.90/91 ยื่นและชำระภาษีออนไลน์',
      shortTitle: 'ภ.ง.ด.90/91 ออนไลน์',
      description: 'กำหนดยื่นแบบและชำระภาษีเงินได้บุคคลธรรมดาประจำปีผ่านระบบ e-Filing',
      date: new Date(currentYear, 3, 8),
      taxYear: currentYear - 1,
      today,
    }),
    buildTaxDeadline({
      key: `pnd94-${currentYear}`,
      title: 'ภ.ง.ด.94 ยื่นและชำระภาษีครึ่งปี',
      shortTitle: 'ภ.ง.ด.94 ครึ่งปี',
      description: 'สำหรับผู้มีเงินได้บางประเภท เช่น ค่าเช่า วิชาชีพอิสระ รับเหมา หรือธุรกิจส่วนตัว',
      date: new Date(currentYear, 9, 8),
      taxYear: currentYear,
      today,
    }),
    buildTaxDeadline({
      key: `pnd90-91-${currentYear}`,
      title: 'ภ.ง.ด.90/91 ยื่นและชำระภาษีออนไลน์',
      shortTitle: 'ภ.ง.ด.90/91 ออนไลน์',
      description: 'กำหนดยื่นแบบและชำระภาษีเงินได้บุคคลธรรมดาประจำปีผ่านระบบ e-Filing',
      date: new Date(currentYear + 1, 3, 8),
      taxYear: currentYear,
      today,
    }),
    buildTaxDeadline({
      key: `pnd94-${currentYear + 1}`,
      title: 'ภ.ง.ด.94 ยื่นและชำระภาษีครึ่งปี',
      shortTitle: 'ภ.ง.ด.94 ครึ่งปี',
      description: 'สำหรับผู้มีเงินได้บางประเภท เช่น ค่าเช่า วิชาชีพอิสระ รับเหมา หรือธุรกิจส่วนตัว',
      date: new Date(currentYear + 1, 9, 8),
      taxYear: currentYear + 1,
      today,
    }),
  ];

  return candidates
    .filter(item => !paidKeys.has(item.key))
    .filter(item => item.daysLeft >= 0 || item.overdueDays <= 30)
    .sort((a, b) => a.date - b.date);
}

function buildTaxDeadline({ key, title, shortTitle, description, date, taxYear, today }) {
  const dayMs = 24 * 60 * 60 * 1000;
  const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysLeft = Math.ceil((dueDate - today) / dayMs);
  const overdueDays = Math.max(0, Math.ceil((today - dueDate) / dayMs));
  const isOverdue = daysLeft < 0;
  const isToday = daysLeft === 0;
  return {
    key,
    title,
    shortTitle,
    description,
    date: dueDate,
    daysLeft,
    overdueDays,
    isOverdue,
    isToday,
    canMarkPaid: daysLeft <= 0,
    statusLabel: isOverdue ? 'เกินกำหนด' : isToday ? 'ถึงกำหนด' : 'เหลืออีก',
    displayNumber: isOverdue ? overdueDays : daysLeft,
    listLabel: isOverdue ? `เกินกำหนด ${overdueDays} วัน` : isToday ? 'วันนี้' : `${daysLeft} วัน`,
    dateText: `${dueDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} / ปีภาษี ${taxYear + 543}`,
  };
}

function getTaxPaidReminderKeys() {
  const settings = typeof getSettings === 'function' ? getSettings() : {};
  return new Set((Array.isArray(settings.taxPaidReminders) ? settings.taxPaidReminders : [])
    .map(key => String(key || '').trim())
    .filter(Boolean));
}

async function markDashboardTaxPaid() {
  const deadlines = getTaxPaymentDeadlines(new Date());
  const selected = deadlines.find(item => item.key === dashboardTaxSelectedKey) || deadlines[0];
  if (!selected?.canMarkPaid) return;

  const previous = typeof getSettings === 'function' ? getSettings() : {};
  const previousKeys = Array.isArray(previous.taxPaidReminders) ? previous.taxPaidReminders : [];
  const nextKeys = Array.from(new Set([...previousKeys, selected.key]));

  try {
    if (typeof setSettingsState === 'function') setSettingsState({ taxPaidReminders: nextKeys });
    dashboardTaxSelectedKey = '';
    renderDashboardTaxReminder();

    if (!window.firebaseData?.saveSettings) throw new Error('Firebase settings is not ready');
    const saved = await window.firebaseData.saveSettings({ taxPaidReminders: nextKeys });
    if (!saved) throw new Error('Firebase settings save failed');
    showToast?.('ปิดแจ้งเตือนภาษีนี้แล้ว');
  } catch (error) {
    console.error('Mark tax reminder paid failed:', error);
    if (typeof setSettingsState === 'function') setSettingsState({ taxPaidReminders: previousKeys });
    renderDashboardTaxReminder();
    showToast?.('บันทึกสถานะชำระแล้วไม่สำเร็จ', 'error');
  }
}

/* ──────────────────────────────────────────────────────────
   YEAR SELECTORS
   ────────────────────────────────────────────────────────── */
function buildYearSelectors() {
  const yr = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yr - 2 + i);

  ['chartYear', 'revYear'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = years.map(y => `<option value="${y}" ${y === yr ? 'selected' : ''}>${y + 543} (${y})</option>`).join('');
  });
}

function revenueEscHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function revenueEscAttr(value) {
  return revenueEscHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

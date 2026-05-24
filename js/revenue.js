// ============================================================
//  revenue.js — ระบบคำนวนรายรับ + Chart
// ============================================================

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
let dashboardTaxSelectedKey = '';
const REVENUE_CHART_COLORS = [
  '#d8b76c',
  '#76a9fa',
  '#70d49b',
  '#f18b72',
  '#a896ff',
  '#5fd0dc',
  '#f4c95d',
  '#ec7fa3',
  '#99a8b8',
  '#b8e879',
  '#f7a660',
  '#8fd3ff',
];
const revenueChartState = {
  chartType: '',
  hoverIndex: -1,
  bars: [],
  slices: [],
  tooltipData: [],
};

function getJobDate(job) {
  if (!job?.date) return null;
  const d = new Date(job.date + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

function isRevenueJob(job) {
  return getJobDate(job) !== null && getJobRevenueAmount(job) > 0;
}

function getJobRevenueAmount(job) {
  if (job?.status === 'done') return nonNegativeNumber(job.price);
  if (job?.status === 'cancelled' && !job.depositRefunded) return nonNegativeNumber(job.deposit);
  return 0;
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

  const total = jobs.reduce((s, j) => s + getJobRevenueAmount(j), 0);
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
    const rev = mJobs.reduce((s, j) => s + getJobRevenueAmount(j), 0);
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
    byType[j.type].rev += getJobRevenueAmount(j);
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
function renderChartLegacy() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const year = Number(document.getElementById('chartYear')?.value || new Date().getFullYear());
  const chartType = document.getElementById('chartType')?.value || 'bar';

  const jobs = getJobs().filter(j => isRevenueJob(j) && getJobDate(j).getFullYear() === year);
  const data = Array.from({ length: 12 }, (_, i) =>
    jobs.filter(j => getJobDate(j).getMonth() === i).reduce((s, j) => s + getJobRevenueAmount(j), 0)
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
  document.getElementById('stat-month-income').textContent = formatCurrency(thisMonthRevenue.reduce((s,j)=>s + getJobRevenueAmount(j),0));
  document.getElementById('stat-year-income').textContent  = formatCurrency(thisYearRevenue.reduce((s,j)=>s + getJobRevenueAmount(j),0));
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

function renderChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  setupRevenueChartInteractions(canvas);

  const ctx = canvas.getContext('2d');
  const year = Number(document.getElementById('chartYear')?.value || new Date().getFullYear());
  const chartType = document.getElementById('chartType')?.value || 'bar';
  const jobs = getJobs().filter(job => isRevenueJob(job) && getJobDate(job).getFullYear() === year);
  const monthData = Array.from({ length: 12 }, (_, index) => {
    const monthJobs = jobs.filter(job => getJobDate(job).getMonth() === index);
    return {
      index,
      label: MONTH_NAMES[index],
      value: monthJobs.reduce((sum, job) => sum + getJobRevenueAmount(job), 0),
      count: monthJobs.length,
      color: REVENUE_CHART_COLORS[index % REVENUE_CHART_COLORS.length],
    };
  });

  const W = canvas.offsetWidth || canvas.width || 640;
  const H = chartType === 'pie' ? 240 : 210;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  if (revenueChartState.chartType !== chartType) {
    revenueChartState.hoverIndex = -1;
    hideRevenueChartTooltip();
  }
  revenueChartState.chartType = chartType;
  revenueChartState.tooltipData = monthData;
  revenueChartState.bars = [];
  revenueChartState.slices = [];

  if (chartType === 'pie') {
    renderDonutRevenueChart(ctx, monthData, W, H);
  } else {
    renderBarRevenueChart(ctx, monthData, W, H);
  }
}

function renderBarRevenueChart(ctx, monthData, W, H) {
  const data = monthData.map(item => item.value);
  const total = data.reduce((sum, value) => sum + value, 0);
  const maxVal = Math.max(...data, 1);
  const padL = 10;
  const padR = 10;
  const padT = 20;
  const padB = 30;
  const barW = (W - padL - padR) / 12;
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
  if (revenueChartState.hoverIndex >= monthData.length) revenueChartState.hoverIndex = -1;

  revenueChartState.bars = [];
  ctx.strokeStyle = isLightTheme ? 'rgba(143,112,51,0.12)' : 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + ((H - padT - padB) * i / 4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
  }

  monthData.forEach((item, i) => {
    const bH = ((H - padT - padB) * item.value / maxVal);
    const x = padL + i * barW + barW * 0.15;
    const w = barW * 0.7;
    const y = H - padB - bH;
    const isHover = revenueChartState.hoverIndex === i;
    const visibleHeight = Math.max(2, bH);
    const hitTop = Math.min(y, H - padB - visibleHeight);
    revenueChartState.bars.push({
      ...item,
      barIndex: i,
      percent: total > 0 ? item.value / total : 0,
      total,
      x,
      y: hitTop,
      width: w,
      height: Math.max(visibleHeight, 12),
      bottom: H - padB,
    });

    if (isHover) {
      ctx.save();
      ctx.fillStyle = isLightTheme ? 'rgba(216,183,108,0.14)' : 'rgba(216,183,108,0.08)';
      drawChartRoundRect(ctx, x - barW * 0.12, padT - 8, w + barW * 0.24, H - padT - padB + 16, 8);
      ctx.fill();
      ctx.restore();
    }

    const grad = ctx.createLinearGradient(0, y, 0, H - padB);
    grad.addColorStop(0, isHover ? 'rgba(240,214,149,1)' : 'rgba(201,168,76,0.9)');
    grad.addColorStop(1, isHover ? 'rgba(216,183,108,0.32)' : 'rgba(201,168,76,0.15)');
    ctx.fillStyle = grad;
    ctx.save();
    if (isHover) {
      ctx.shadowColor = 'rgba(216,183,108,0.42)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;
    }
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, H - padB - visibleHeight, w, visibleHeight, [5, 5, 0, 0]);
    } else {
      ctx.rect(x, H - padB - visibleHeight, w, visibleHeight);
    }
    ctx.fill();
    ctx.restore();

    if (isHover && item.value > 0) {
      ctx.fillStyle = isLightTheme ? '#7a5b1d' : 'rgba(240,214,149,0.96)';
      ctx.font = '700 10px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatCompactCurrency(item.value), x + w / 2, Math.max(12, H - padB - visibleHeight - 9));
    }

    ctx.fillStyle = isHover ? (isLightTheme ? '#5e4617' : 'rgba(240,214,149,0.95)') : 'rgba(136,136,136,0.8)';
    ctx.font = `${isHover ? '700' : '500'} 9px Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + w / 2, H - padB + 14);
  });
}

function renderDonutRevenueChart(ctx, monthData, W, H) {
  const total = monthData.reduce((sum, item) => sum + item.value, 0);
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
  if (total === 0) {
    revenueChartState.hoverIndex = -1;
    hideRevenueChartTooltip();
    drawChartEmptyState(ctx, W, H);
    return;
  }

  const activeData = monthData.filter(item => item.value > 0);
  if (revenueChartState.hoverIndex >= activeData.length) revenueChartState.hoverIndex = -1;

  const hasLegend = W >= 540;
  const cx = hasLegend ? Math.max(112, Math.min(W * 0.32, 210)) : W / 2;
  const cy = H / 2 + 4;
  const radius = Math.max(66, Math.min(hasLegend ? 86 : 78, H * 0.36, W * (hasLegend ? 0.18 : 0.28)));
  const baseWidth = Math.max(26, Math.min(34, radius * 0.34));
  const innerRadius = radius - baseWidth / 2 - 6;
  const outerRadius = radius + baseWidth / 2 + 8;

  ctx.save();
  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';
  ctx.strokeStyle = isLightTheme ? 'rgba(143,112,51,0.13)' : 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  let currentAngle = -0.5 * Math.PI;
  const gap = activeData.length > 1 ? 0.018 : 0;
  revenueChartState.slices = [];

  activeData.forEach((item, sliceIndex) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const drawStart = currentAngle + gap;
    const drawEnd = currentAngle + sliceAngle - gap;
    const isHover = revenueChartState.hoverIndex === sliceIndex;
    const lineWidth = baseWidth + (isHover ? 7 : 0);

    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = item.color;
    ctx.shadowColor = isHover ? `${item.color}88` : 'rgba(0,0,0,0.26)';
    ctx.shadowBlur = isHover ? 18 : 8;
    ctx.shadowOffsetY = isHover ? 0 : 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, drawStart, Math.max(drawStart, drawEnd));
    ctx.stroke();
    ctx.restore();

    revenueChartState.slices.push({
      ...item,
      sliceIndex,
      percent: item.value / total,
      startAngle: drawStart,
      endAngle: Math.max(drawStart, drawEnd),
      cx,
      cy,
      innerRadius,
      outerRadius,
      total,
    });

    currentAngle += sliceAngle;
  });

  drawDonutCenter(ctx, cx, cy, radius, total, isLightTheme);
  drawDonutLegend(ctx, activeData, total, W, H, cx, radius, isLightTheme);
}

function drawDonutCenter(ctx, cx, cy, radius, total, isLightTheme) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isLightTheme ? '#6f5527' : 'rgba(240,214,149,0.92)';
  ctx.font = '700 10px Segoe UI, system-ui, sans-serif';
  ctx.fillText('รวม', cx, cy - 18);
  drawFittedChartText(ctx, formatCompactCurrency(total), cx, cy + 2, radius * 1.15, 19, '800', isLightTheme ? '#201a12' : '#ffffff');
  ctx.fillStyle = isLightTheme ? 'rgba(68,58,46,0.64)' : 'rgba(230,230,230,0.58)';
  ctx.font = '600 10px Segoe UI, system-ui, sans-serif';
  ctx.fillText('รายรับปีนี้', cx, cy + 24);
  ctx.restore();
}

function drawDonutLegend(ctx, activeData, total, W, H, cx, radius, isLightTheme) {
  if (W < 540) return;
  const legendX = cx + radius + 52;
  const legendY = Math.max(24, (H - activeData.length * 17) / 2);
  const maxTextWidth = Math.max(130, W - legendX - 18);

  ctx.save();
  ctx.textBaseline = 'middle';
  activeData.forEach((item, index) => {
    const y = legendY + index * 17;
    const isHover = revenueChartState.hoverIndex === index;
    if (isHover) {
      ctx.fillStyle = isLightTheme ? 'rgba(216,183,108,0.16)' : 'rgba(216,183,108,0.10)';
      drawChartRoundRect(ctx, legendX - 8, y - 8, maxTextWidth + 18, 16, 7);
      ctx.fill();
    }
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX, y, isHover ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isLightTheme ? '#33291b' : 'rgba(245,245,245,0.88)';
    ctx.font = `${isHover ? '700' : '600'} 10px Segoe UI, system-ui, sans-serif`;
    const percent = `${Math.round((item.value / total) * 100)}%`;
    const label = `${item.label}  ${formatCompactCurrency(item.value)}  ${percent}`;
    drawClippedChartText(ctx, label, legendX + 12, y, maxTextWidth);
  });
  ctx.restore();
}

function drawChartEmptyState(ctx, W, H) {
  ctx.fillStyle = 'rgba(136,136,136,0.8)';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ไม่มีข้อมูลรายรับ', W / 2, H / 2);
}

function setupRevenueChartInteractions(canvas) {
  if (canvas.dataset.chartHoverBound === '1') return;
  canvas.dataset.chartHoverBound = '1';
  canvas.addEventListener('pointermove', handleRevenueChartPointerMove);
  canvas.addEventListener('pointerleave', () => {
    if (revenueChartState.hoverIndex !== -1) {
      revenueChartState.hoverIndex = -1;
      renderChart();
    }
    hideRevenueChartTooltip();
    canvas.style.cursor = '';
  });
}

function handleRevenueChartPointerMove(event) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const isPie = revenueChartState.chartType === 'pie';
  const index = isPie ? findRevenueChartSlice(x, y) : findRevenueChartBar(x, y);

  if (index !== revenueChartState.hoverIndex) {
    revenueChartState.hoverIndex = index;
    renderChart();
  }

  if (index >= 0) {
    canvas.style.cursor = 'pointer';
    const item = isPie ? revenueChartState.slices[index] : revenueChartState.bars[index];
    showRevenueChartTooltip(canvas, item, x, y);
  } else {
    canvas.style.cursor = '';
    hideRevenueChartTooltip();
  }
}

function findRevenueChartSlice(x, y) {
  return revenueChartState.slices.findIndex(slice => {
    const dx = x - slice.cx;
    const dy = y - slice.cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < slice.innerRadius || distance > slice.outerRadius) return false;
    let angle = Math.atan2(dy, dx);
    while (angle < -0.5 * Math.PI) angle += Math.PI * 2;
    return angle >= slice.startAngle && angle <= slice.endAngle;
  });
}

function findRevenueChartBar(x, y) {
  return revenueChartState.bars.findIndex(bar => (
    x >= bar.x - 4 &&
    x <= bar.x + bar.width + 4 &&
    y >= bar.y - 8 &&
    y <= bar.bottom + 8
  ));
}

function showRevenueChartTooltip(canvas, slice, x, y) {
  const tooltip = document.getElementById('revenueChartTooltip');
  if (!tooltip || !slice) return;
  tooltip.hidden = false;
  tooltip.innerHTML = `
    <div class="chart-tooltip-title">
      <span class="chart-tooltip-dot" style="background:${revenueEscAttr(slice.color)}"></span>
      ${revenueEscHtml(slice.label)}
    </div>
    <div class="chart-tooltip-value">${revenueEscHtml(formatCurrency(slice.value))}</div>
    <div class="chart-tooltip-meta">${slice.count} งาน / ${Math.round(slice.percent * 100)}% ของปี</div>
  `;

  const stage = canvas.parentElement;
  const stageW = stage?.clientWidth || canvas.clientWidth;
  const stageH = stage?.clientHeight || canvas.clientHeight;
  const tooltipW = tooltip.offsetWidth || 190;
  const tooltipH = tooltip.offsetHeight || 82;
  const left = Math.min(Math.max(x + 16, 8), Math.max(8, stageW - tooltipW - 8));
  const top = Math.min(Math.max(y + 16, 8), Math.max(8, stageH - tooltipH - 8));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideRevenueChartTooltip() {
  const tooltip = document.getElementById('revenueChartTooltip');
  if (!tooltip) return;
  tooltip.hidden = true;
}

function formatCompactCurrency(value) {
  const amount = nonNegativeNumber(value);
  if (amount >= 1000000) return `฿ ${(amount / 1000000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}M`;
  if (amount >= 1000) return `฿ ${(amount / 1000).toLocaleString('th-TH', { maximumFractionDigits: 0 })}K`;
  return formatCurrency(amount);
}

function drawFittedChartText(ctx, text, x, y, maxWidth, fontSize, weight, color) {
  let size = fontSize;
  do {
    ctx.font = `${weight} ${size}px Segoe UI, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 10) break;
    size -= 1;
  } while (size > 10);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawClippedChartText(ctx, text, x, y, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let next = text;
  while (next.length > 4 && ctx.measureText(`${next}...`).width > maxWidth) next = next.slice(0, -1);
  ctx.fillText(`${next}...`, x, y);
}

function drawChartRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

window.getJobRevenueAmount = getJobRevenueAmount;

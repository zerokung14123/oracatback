// ============================================================
//  tax-calculator.js - โปรแกรมคำนวนภาษี
//  Adapted from thai_tax_pro_app.html into the PixManager page system.
// ============================================================

(() => {
  'use strict';

  const INCOME_TYPES = [
    { id: '40_1', label: 'ม.40(1) เงินเดือน / โบนัส', rate: 0.5, cap: 100000 },
    { id: '40_2', label: 'ม.40(2) ค่านายหน้า / คอมมิชชัน', rate: 0.5, cap: 100000 },
    { id: '40_3', label: 'ม.40(3) ค่าลิขสิทธิ์ / สิทธิบัตร', rate: 0.5, cap: 100000 },
    { id: '40_4', label: 'ม.40(4) ดอกเบี้ย / เงินปันผล', rate: 0, cap: 0 },
    { id: '40_5', label: 'ม.40(5) ค่าเช่าอสังหาริมทรัพย์', rate: 0.3, cap: 1000000000 },
    { id: '40_6', label: 'ม.40(6) วิชาชีพอิสระ', rate: 0.6, cap: 300000 },
    { id: '40_7', label: 'ม.40(7) รับเหมาก่อสร้าง', rate: 0.7, cap: 1000000000 },
    { id: '40_8', label: 'ม.40(8) ฟรีแลนซ์ / ธุรกิจ / อื่น ๆ', rate: 0.6, cap: 300000 },
  ];

  const BRACKETS = [
    { max: 150000, rate: 0 },
    { max: 300000, rate: 0.05 },
    { max: 500000, rate: 0.1 },
    { max: 750000, rate: 0.15 },
    { max: 1000000, rate: 0.2 },
    { max: 2000000, rate: 0.25 },
    { max: 5000000, rate: 0.3 },
    { max: Infinity, rate: 0.35 },
  ];

  const TABS = [
    { id: 'income', label: 'รายได้' },
    { id: 'result', label: 'ผลคำนวน' },
    { id: 'advice', label: 'คำแนะนำ' },
    { id: 'guide', label: 'คู่มือลดหย่อน' },
    { id: 'calendar', label: 'ปฏิทินภาษี' },
    { id: 'simulate', label: 'จำลองภาษี' },
  ];

  const INITIAL_STATE = {
    tab: 'income',
    income: '',
    incomeType: '40_8',
    spouse: false,
    children: 0,
    parents: 0,
    lifeIns: '',
    healthIns: '',
    parentIns: '',
    soc: '',
    rmf: '',
    ssf: '',
    pvd: '',
    thaiEsg: '',
    mortgage: '',
    donate: '',
    donateX2: '',
    simRmf: '',
    simThaiEsg: '',
  };

  let state = { ...INITIAL_STATE };
  let isBound = false;
  let incomeWasEdited = false;

  const byId = id => document.getElementById(id);
  const toNumber = value => Math.max(0, Number.parseFloat(value) || 0);
  const formatNumber = value => Math.round(Math.max(0, value || 0)).toLocaleString('th-TH');
  const formatCurrency = value => `${formatNumber(value)} บาท`;

  function getIncomeType(typeId) {
    return INCOME_TYPES.find(type => type.id === typeId) || INCOME_TYPES[0];
  }

  function calcExpense(typeId, income) {
    const type = getIncomeType(typeId);
    return Math.min(income * type.rate, type.cap);
  }

  function calcTax(netIncome) {
    let previousMax = 0;
    let tax = 0;
    const breakdown = [];

    for (const bracket of BRACKETS) {
      if (netIncome <= previousMax) break;

      const chunk = Math.min(netIncome, bracket.max) - previousMax;
      const amount = chunk * bracket.rate;
      tax += amount;

      if (chunk > 0) {
        breakdown.push({
          min: previousMax,
          max: bracket.max,
          rate: bracket.rate,
          chunk,
          amount,
        });
      }

      previousMax = bracket.max;
    }

    return { tax, breakdown };
  }

  function derive() {
    const income = toNumber(state.income);
    const incomeType = getIncomeType(state.incomeType);
    const expDed = calcExpense(state.incomeType, income);
    const afterExpense = Math.max(0, income - expDed);

    const lifeIns = Math.min(toNumber(state.lifeIns), 100000);
    const healthIns = Math.min(toNumber(state.healthIns), 25000);
    const insCombined = Math.min(lifeIns + healthIns, 100000);
    const parentIns = Math.min(toNumber(state.parentIns), 15000);
    const soc = Math.min(toNumber(state.soc), 9000);

    const rmf = Math.min(toNumber(state.rmf), income * 0.3, 500000);
    const ssf = Math.min(toNumber(state.ssf), income * 0.3, 200000);
    const pvd = Math.min(toNumber(state.pvd), income * 0.15, 500000);
    const invDed = Math.min(rmf + ssf + pvd, 500000);
    const thaiEsgDed = Math.min(toNumber(state.thaiEsg), income * 0.3, 300000);

    const mortgage = Math.min(toNumber(state.mortgage), 100000);
    const donate = Math.min(toNumber(state.donate), afterExpense * 0.1);
    const donateX2 = Math.min(toNumber(state.donateX2) * 2, afterExpense * 0.1);

    const personalDed = 60000
      + (state.spouse ? 60000 : 0)
      + (state.children * 30000)
      + (state.parents * 30000);
    const insuranceDed = insCombined + parentIns + soc;
    const otherDed = mortgage + donate + donateX2;
    const totalDed = personalDed + insuranceDed + invDed + thaiEsgDed + otherDed;
    const netIncome = Math.max(0, afterExpense - totalDed);
    const { tax, breakdown } = calcTax(netIncome);

    return {
      income,
      incomeType,
      expDed,
      afterExpense,
      personalDed,
      insuranceDed,
      invDed,
      thaiEsgDed,
      otherDed,
      totalDed,
      netIncome,
      tax,
      breakdown,
      effectiveRate: income ? (tax / income) * 100 : 0,
    };
  }

  function initTaxCalculator() {
    const shell = document.querySelector('.tax-shell');
    if (!shell) return;

    if (!isBound) {
      shell.addEventListener('click', handleTaxClick);
      shell.addEventListener('input', handleTaxInput);
      shell.addEventListener('change', handleTaxChange);
      isBound = true;
    }

    renderTaxCalculator();
  }

  function renderTaxCalculator() {
    const content = byId('taxContent');
    const tabs = byId('taxTabs');
    if (!content || !tabs) return;

    syncDefaultIncomeFromRevenue();
    const data = derive();
    updateQuickStats(data);

    tabs.innerHTML = TABS.map(tab => `
      <button class="tax-tab${state.tab === tab.id ? ' active' : ''}" type="button" data-tax-tab="${tab.id}">
        ${tab.label}
      </button>
    `).join('');

    if (state.tab === 'income') content.innerHTML = renderIncomeTab(data);
    if (state.tab === 'result') content.innerHTML = renderResultTab(data);
    if (state.tab === 'advice') content.innerHTML = renderAdviceTab(data);
    if (state.tab === 'guide') content.innerHTML = renderGuideTab();
    if (state.tab === 'calendar') content.innerHTML = renderCalendarTab();
    if (state.tab === 'simulate') content.innerHTML = renderSimulateTab(data);

    updateIncomeLiveText(data);
  }

  function resetTaxCalculator() {
    state = { ...INITIAL_STATE };
    incomeWasEdited = false;
    renderTaxCalculator();
  }

  function syncDefaultIncomeFromRevenue() {
    if (incomeWasEdited) return;

    const income = getCurrentYearDoneRevenue();
    state.income = String(Math.round(income));
  }

  function updateQuickStats(data) {
    const income = byId('taxQuickIncome');
    const tax = byId('taxQuickTax');
    const rate = byId('taxQuickRate');
    if (income) income.textContent = formatNumber(data.income);
    if (tax) tax.textContent = formatNumber(data.tax);
    if (rate) rate.textContent = `${data.effectiveRate.toFixed(1)}%`;
  }

  function updateIncomeLiveText(data) {
    const capText = data.incomeType.cap >= 100000000
      ? ''
      : ` สูงสุด ${formatCurrency(data.incomeType.cap)}`;
    setText('taxExpenseRule', `หักค่าใช้จ่าย ${Math.round(data.incomeType.rate * 100)}%${capText}`);
    setText('taxExpenseValue', `-${formatCurrency(data.expDed)}`);
    setText('taxAfterExpenseValue', formatCurrency(data.afterExpense));
    setText('taxTotalDeductionValue', formatCurrency(data.totalDed));
    setText('taxNetIncomePreview', formatCurrency(data.netIncome));
  }

  function setText(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }

  function renderIncomeTab(data) {
    return `
      <div class="tax-grid">
        <div class="tax-card">
          <div class="tax-card-head">
            <div>
              <h3>ข้อมูลรายได้</h3>
              <p>กรอกรายได้รวมทั้งปี และเลือกประเภทเงินได้ตามมาตรา 40</p>
            </div>
          </div>

          <div class="form-group">
            <label>ประเภทเงินได้</label>
            <select class="form-control" data-tax-field="incomeType">
              ${INCOME_TYPES.map(type => `<option value="${type.id}"${state.incomeType === type.id ? ' selected' : ''}>${type.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>รายได้รวมทั้งปี (บาท)</label>
            <input class="form-control tax-number-input" type="number" inputmode="decimal" min="0" data-tax-field="income" value="${state.income}" placeholder="เช่น 600000" />
            <div class="field-help">
              ${incomeWasEdited
                ? 'ใช้ค่าที่กรอกเองอยู่ หากต้องการกลับไปใช้รายรับปีนี้ ให้กดปุ่ม "ใช้รายรับปีนี้จากงาน Done"'
                : 'ค่าเริ่มต้นดึงจากรายรับปีนี้ของงานสถานะ Done โดยไม่รวมงานรับเงินสด และยังสามารถแก้ตัวเลขเองได้'}
            </div>
          </div>

          <div class="tax-info-panel">
            <div class="tax-info-row">
              <span id="taxExpenseRule">หักค่าใช้จ่าย</span>
              <strong id="taxExpenseValue">-${formatCurrency(data.expDed)}</strong>
            </div>
            <div class="tax-info-row">
              <span>เงินได้หลังหักค่าใช้จ่าย</span>
              <strong id="taxAfterExpenseValue">${formatCurrency(data.afterExpense)}</strong>
            </div>
          </div>
        </div>

        <div class="tax-card">
          <div class="tax-card-head">
            <div>
              <h3>ค่าลดหย่อน</h3>
              <p>ปรับค่าลดหย่อนหลักที่ใช้บ่อย ระบบจะคุมเพดานเบื้องต้นให้อัตโนมัติ</p>
            </div>
          </div>

          <div class="tax-section-label">ส่วนตัวและครอบครัว</div>
          <div class="tax-row">
            <div>
              <strong>ลดหย่อนส่วนตัว</strong>
              <span>ได้รับอัตโนมัติทุกคน</span>
            </div>
            <em>60,000 บาท</em>
          </div>
          <div class="tax-row">
            <div>
              <strong>คู่สมรสไม่มีเงินได้</strong>
              <span>เพิ่มลดหย่อน 60,000 บาท</span>
            </div>
            <button class="tax-toggle${state.spouse ? ' on' : ''}" type="button" data-tax-toggle="spouse" aria-label="คู่สมรสไม่มีเงินได้"></button>
          </div>
          ${renderCounterRow('children', 'จำนวนบุตร', 'คนละ 30,000 บาท', state.children)}
          ${renderCounterRow('parents', 'บิดา / มารดา อายุ 60+', 'คนละ 30,000 บาท สูงสุด 4 คน', state.parents)}

          <div class="tax-section-label">ประกันและการออม</div>
          ${renderTaxInput('lifeIns', 'ประกันชีวิต', 'สูงสุด 100,000 บาท')}
          ${renderTaxInput('healthIns', 'ประกันสุขภาพตัวเอง', 'สูงสุด 25,000 บาท และรวมประกันชีวิตไม่เกิน 100,000')}
          ${renderTaxInput('parentIns', 'ประกันสุขภาพบิดา / มารดา', 'สูงสุด 15,000 บาท')}
          ${renderTaxInput('soc', 'ประกันสังคม', 'สูงสุดประมาณ 9,000 บาท/ปี')}

          <div class="tax-section-label">กองทุน</div>
          ${renderTaxInput('rmf', 'RMF', 'ไม่เกิน 30% ของเงินได้ และรวมกองทุนไม่เกิน 500,000')}
          ${renderTaxInput('ssf', 'SSF', 'ไม่เกิน 30% ของเงินได้ สูงสุด 200,000')}
          ${renderTaxInput('pvd', 'PVD / กองทุนสำรองเลี้ยงชีพ', 'ไม่เกิน 15% ของค่าจ้าง')}
          ${renderTaxInput('thaiEsg', 'Thai ESG', 'แยกจากกลุ่มกองทุนเกษียณ ไม่เกิน 30% ของเงินได้ และสูงสุด 300,000 บาท')}

          <div class="tax-section-label">อื่น ๆ</div>
          ${renderTaxInput('mortgage', 'ดอกเบี้ยบ้าน', 'สูงสุด 100,000 บาท')}
          ${renderTaxInput('donate', 'เงินบริจาคทั่วไป', 'สูงสุด 10% ของเงินได้หลังหักค่าใช้จ่าย')}
          ${renderTaxInput('donateX2', 'บริจาคการศึกษา / กีฬา', 'ระบบคูณ 2 ให้ในผลคำนวณ')}

          <div class="tax-total-strip">
            <span>ลดหย่อนรวม</span>
            <strong id="taxTotalDeductionValue">${formatCurrency(data.totalDed)}</strong>
          </div>
          <div class="tax-total-strip subtle">
            <span>เงินได้สุทธิ</span>
            <strong id="taxNetIncomePreview">${formatCurrency(data.netIncome)}</strong>
          </div>
          <button class="btn-primary full-width" type="button" data-tax-tab="result">ดูผลคำนวน</button>
        </div>
      </div>
    `;
  }

  function renderCounterRow(key, label, note, value) {
    return `
      <div class="tax-row">
        <div>
          <strong>${label}</strong>
          <span>${note}</span>
        </div>
        <div class="tax-counter">
          <button type="button" data-tax-counter="${key}" data-tax-step="-1">-</button>
          <b>${value}</b>
          <button type="button" data-tax-counter="${key}" data-tax-step="1">+</button>
        </div>
      </div>
    `;
  }

  function renderTaxInput(key, label, note) {
    return `
      <div class="tax-field">
        <label>${label}</label>
        <small>${note}</small>
        <input class="form-control tax-number-input" type="number" inputmode="decimal" min="0" data-tax-field="${key}" value="${state[key]}" placeholder="0" />
      </div>
    `;
  }

  function renderResultTab(data) {
    if (!data.income) return renderEmptyPrompt('กรุณากรอกรายได้ก่อนดูผลคำนวน', 'income');

    const rateWidth = Math.min((data.effectiveRate / 35) * 100, 100);
    return `
      <div class="tax-result-layout">
        <div class="tax-card tax-result-card">
          <span>ภาษีที่ต้องชำระ</span>
          <strong>${formatNumber(data.tax)}</strong>
          <em>บาท/ปี</em>
          <div class="tax-progress-label">
            <span>อัตราภาษีแท้จริง</span>
            <b>${data.effectiveRate.toFixed(2)}%</b>
          </div>
          <div class="tax-progress"><i style="--tax-progress:${rateWidth}%"></i></div>
        </div>

        <div class="tax-card">
          <div class="tax-card-head"><h3>สรุปการคำนวณ</h3></div>
          ${renderSummaryRow('รายได้รวม', data.income)}
          ${renderSummaryRow('หักค่าใช้จ่าย', -data.expDed)}
          ${renderSummaryRow('ลดหย่อนส่วนตัว / ครอบครัว', -data.personalDed)}
          ${renderSummaryRow('ลดหย่อนประกัน / ออม', -data.insuranceDed)}
          ${renderSummaryRow('ลดหย่อนกองทุน', -data.invDed)}
          ${renderSummaryRow('ลดหย่อน Thai ESG', -data.thaiEsgDed)}
          ${renderSummaryRow('ลดหย่อนอื่น ๆ', -data.otherDed)}
          ${renderSummaryRow('เงินได้สุทธิ', data.netIncome, true)}
          ${renderSummaryRow('ภาษีที่ต้องชำระ', data.tax, true)}
        </div>
      </div>

      <div class="tax-card">
        <div class="tax-card-head">
          <div>
            <h3>ภาษีแต่ละขั้นบันได</h3>
            <p>แสดงตามฐานเงินได้สุทธิ ${formatCurrency(data.netIncome)}</p>
          </div>
        </div>
        ${renderBracketRows(data.breakdown)}
      </div>
    `;
  }

  function renderSummaryRow(label, amount, strong = false) {
    const negative = amount < 0;
    return `
      <div class="tax-summary-row${strong ? ' strong' : ''}">
        <span>${label}</span>
        <b class="${negative ? 'negative' : ''}">${negative ? '-' : ''}${formatCurrency(Math.abs(amount))}</b>
      </div>
    `;
  }

  function renderBracketRows(rows) {
    if (!rows.length) return '<div class="empty-state">ยังไม่ถึงฐานภาษีที่ต้องเสีย</div>';

    const maxTax = rows.reduce((max, row) => Math.max(max, row.amount), 1);
    return rows.map(row => {
      const range = row.max === Infinity
        ? `${formatNumber(row.min)} ขึ้นไป`
        : `${formatNumber(row.min)} - ${formatNumber(row.max)}`;
      const width = Math.max(4, (row.amount / maxTax) * 100);
      return `
        <div class="tax-bracket-row">
          <span>${Math.round(row.rate * 100)}%</span>
          <div class="tax-bracket-cell">
            <small>${range}</small>
            <span class="tax-bracket-bar"><i style="--tax-progress:${width}%"></i></span>
          </div>
          <b>${formatCurrency(row.amount)}</b>
        </div>
      `;
    }).join('');
  }

  function renderAdviceTab(data) {
    if (!data.income) return renderEmptyPrompt('กรุณากรอกรายได้ก่อนดูคำแนะนำ', 'income');

    const tips = buildAdvice(data);
    return `
      <div class="tax-card">
        <div class="tax-card-head">
          <div>
            <h3>คำแนะนำจากข้อมูลที่กรอก</h3>
            <p>วิเคราะห์แบบ local ในเครื่อง ไม่มีการส่งข้อมูลภาษีออกไป API ภายนอก</p>
          </div>
        </div>
        <div class="tax-advice-list">
          ${tips.map(tip => `
            <div class="tax-advice-item ${tip.level}">
              <strong>${tip.title}</strong>
              <p>${tip.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function buildAdvice(data) {
    const items = [];
    const insuranceRemain = Math.max(0, 100000 - Math.min(toNumber(state.lifeIns) + toNumber(state.healthIns), 100000));
    const ssfRemain = Math.max(0, Math.min(data.income * 0.3, 200000) - toNumber(state.ssf));
    const rmfRemain = Math.max(0, Math.min(data.income * 0.3, 500000) - toNumber(state.rmf));
    const thaiEsgRemain = Math.max(0, Math.min(data.income * 0.3, 300000) - data.thaiEsgDed);
    const mortgageRemain = Math.max(0, 100000 - toNumber(state.mortgage));

    if (data.tax <= 0) {
      items.push({
        level: 'good',
        title: 'ตอนนี้ภาษีเป็น 0 บาท',
        body: 'จากข้อมูลที่กรอก ฐานเงินได้สุทธิยังไม่ถึงช่วงที่ต้องเสียภาษี แต่ยังควรเก็บเอกสารรายได้และค่าใช้จ่ายไว้ให้ครบ',
      });
    } else {
      items.push({
        level: 'gold',
        title: `ภาษีประมาณ ${formatCurrency(data.tax)}`,
        body: `อัตราภาษีแท้จริงอยู่ที่ ${data.effectiveRate.toFixed(2)}% การเพิ่มลดหย่อนจะช่วยลดภาษีได้มากขึ้นเมื่อฐานภาษีสูงขึ้น`,
      });
    }

    if (insuranceRemain > 0) {
      items.push({
        level: 'info',
        title: 'ยังมีวงเงินประกันเหลือ',
        body: `ประกันชีวิต/สุขภาพยังเหลือวงเงินประมาณ ${formatCurrency(insuranceRemain)} ควรพิจารณาเฉพาะกรมธรรม์ที่จำเป็นจริง`,
      });
    }

    if (ssfRemain > 0 || rmfRemain > 0) {
      items.push({
        level: 'info',
        title: 'ตรวจวงเงินกองทุนก่อนสิ้นปี',
        body: `SSF เหลือประมาณ ${formatCurrency(ssfRemain)} และ RMF เหลือประมาณ ${formatCurrency(rmfRemain)} โดยรวมกองทุนหลักไม่ควรเกิน 500,000 บาท`,
      });
    }

    if (thaiEsgRemain > 0) {
      items.push({
        level: 'info',
        title: 'Thai ESG แยกวงเงินจากกองทุนเกษียณ',
        body: `ยังเหลือวงเงิน Thai ESG ประมาณ ${formatCurrency(thaiEsgRemain)} ช่วยลดฐานภาษีได้โดยไม่ไปรวมกับเพดาน RMF/PVD 500,000 บาท`,
      });
    }

    if (mortgageRemain > 0) {
      items.push({
        level: 'info',
        title: 'ดอกเบี้ยบ้าน',
        body: `หากมีสินเชื่อบ้าน ยังมีวงเงินลดหย่อนดอกเบี้ยเหลือประมาณ ${formatCurrency(mortgageRemain)}`,
      });
    }

    if (data.income > 1800000 && state.incomeType !== '40_1') {
      items.push({
        level: 'warn',
        title: 'รายได้เกิน 1.8 ล้านบาท',
        body: 'ถ้าเป็นรายได้จากธุรกิจหรือฟรีแลนซ์ ควรตรวจเงื่อนไข VAT และเอกสารบัญชีเพิ่มเติม',
      });
    }

    items.push({
      level: 'good',
      title: `แบบยื่นที่ควรตรวจสอบ: ${state.incomeType === '40_1' ? 'ภ.ง.ด.91' : 'ภ.ง.ด.90'}`,
      body: 'หากมีรายได้หลายประเภท ให้ตรวจประเภทเงินได้และเอกสารหัก ณ ที่จ่ายก่อนยื่นจริง',
    });

    return items;
  }

  function renderGuideTab() {
    const sections = [
      {
        title: 'ส่วนตัวและครอบครัว',
        rows: [
          ['ลดหย่อนส่วนตัว', '60,000 บาท', 'ได้รับอัตโนมัติ'],
          ['คู่สมรสไม่มีเงินได้', '60,000 บาท', 'คู่สมรสต้องไม่มีเงินได้'],
          ['บุตร', '30,000 บาท/คน', 'ตรวจเงื่อนไขบุตรคนที่ 2 เป็นต้นไป'],
          ['บิดา / มารดา', '30,000 บาท/คน', 'อายุ 60 ปีขึ้นไป และรายได้ตามเงื่อนไข'],
        ],
      },
      {
        title: 'ประกันและเงินออม',
        rows: [
          ['ประกันชีวิต', 'สูงสุด 100,000 บาท', 'รวมกับประกันสุขภาพตัวเอง'],
          ['ประกันสุขภาพตัวเอง', 'สูงสุด 25,000 บาท', 'รวมประกันชีวิตไม่เกิน 100,000 บาท'],
          ['ประกันสุขภาพบิดา / มารดา', 'สูงสุด 15,000 บาท', 'ต้องเข้าเงื่อนไขผู้มีสิทธิ์'],
          ['ประกันสังคม', 'ตามจริง', 'ประมาณสูงสุด 9,000 บาท/ปี'],
        ],
      },
      {
        title: 'กองทุน',
        rows: [
          ['SSF', 'สูงสุด 200,000 บาท', 'ไม่เกิน 30% ของเงินได้'],
          ['RMF', 'สูงสุด 500,000 บาท', 'ไม่เกิน 30% ของเงินได้'],
          ['PVD / กองทุนสำรองเลี้ยงชีพ', 'ตามเงื่อนไข', 'รวมกลุ่มกองทุนหลักไม่เกิน 500,000 บาท'],
          ['Thai ESG', 'สูงสุด 300,000 บาท', 'แยกวงเงินจาก RMF/PVD และถืออย่างน้อย 5 ปี สำหรับช่วงสิทธิปี 2024-2026'],
        ],
      },
      {
        title: 'อื่น ๆ',
        rows: [
          ['ดอกเบี้ยบ้าน', 'สูงสุด 100,000 บาท', 'ใช้เอกสารรับรองดอกเบี้ย'],
          ['บริจาคทั่วไป', 'ตามจริง', 'ไม่เกิน 10% ของฐานที่กำหนด'],
          ['บริจาคการศึกษา / กีฬา', 'ลดหย่อน 2 เท่า', 'ตรวจรายชื่อหน่วยงานที่รับสิทธิ์'],
        ],
      },
    ];

    return sections.map(section => `
      <div class="tax-card">
        <div class="tax-card-head"><h3>${section.title}</h3></div>
        <div class="tax-guide-table">
          ${section.rows.map(row => `
            <div>
              <strong>${row[0]}</strong>
              <b>${row[1]}</b>
              <span>${row[2]}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderCalendarTab() {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    const deadlines = [
      { name: 'ยื่น ภ.ง.ด.90/91 แบบกระดาษ', date: new Date(nextYear, 2, 31), tag: 'ภาษีประจำปี' },
      { name: 'ยื่น ภ.ง.ด.90/91 ออนไลน์', date: new Date(nextYear, 3, 8), tag: 'e-Filing' },
      { name: 'ยื่น ภ.ง.ด.94 ครึ่งปี', date: new Date(year, 8, 30), tag: 'ครึ่งปี' },
      { name: 'ภ.พ.30 สำหรับ VAT', date: null, tag: 'รายเดือน' },
    ];

    return `
      <div class="tax-card">
        <div class="tax-card-head">
          <div>
            <h3>กำหนดยื่นสำคัญ</h3>
            <p>ใช้เตือนภาพรวม ควรตรวจวันที่จริงของปีภาษีนั้นอีกครั้ง</p>
          </div>
        </div>
        <div class="tax-deadline-list">
          ${deadlines.map(item => renderDeadline(item, now)).join('')}
        </div>
      </div>

      <div class="tax-card">
        <div class="tax-card-head"><h3>เช็กลิสต์ก่อนสิ้นปี</h3></div>
        <div class="tax-check-list">
          <span>ตรวจใบ 50 ทวิ และเอกสารหัก ณ ที่จ่าย</span>
          <span>สรุปรายรับจากงานที่สถานะ Done</span>
          <span>เก็บหลักฐานประกัน กองทุน ดอกเบี้ยบ้าน และเงินบริจาค</span>
          <span>ตรวจรายได้ธุรกิจเกิน 1.8 ล้านบาทสำหรับ VAT หรือไม่</span>
        </div>
      </div>
    `;
  }

  function renderDeadline(item, now) {
    if (!item.date) {
      return `
        <div class="tax-deadline">
          <div><strong>${item.name}</strong><span>ยื่นรายเดือนตามรอบของผู้ประกอบการ</span></div>
          <b>${item.tag}</b>
        </div>
      `;
    }

    const days = Math.ceil((item.date - now) / 86400000);
    const text = days < 0 ? 'ผ่านแล้ว' : days === 0 ? 'วันนี้' : `${days} วัน`;
    return `
      <div class="tax-deadline${days >= 0 && days <= 60 ? ' urgent' : ''}">
        <div>
          <strong>${item.name}</strong>
          <span>${item.date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <b>${text}</b>
      </div>
    `;
  }

  function renderSimulateTab(data) {
    if (!data.income) return renderEmptyPrompt('กรุณากรอกรายได้ก่อนใช้ตัวจำลองภาษี', 'income');

    const simulations = getSimulations(data);
    const capacity = getInvestmentCapacity(data);
    const userPlan = getInvestmentPlan(data, toNumber(state.simRmf), toNumber(state.simThaiEsg));
    const maxPlan = getInvestmentPlan(data, capacity.rmfRemaining, capacity.thaiEsgRemaining);

    return `
      <div class="tax-sim-summary-grid">
        <div class="tax-summary-card">
          <span>ลงทุนตามแผน</span>
          <strong>${formatNumber(userPlan.totalInvestment)}</strong>
          <small>บาท ใช้สิทธิได้ ${formatCurrency(userPlan.totalDeductible)}</small>
        </div>
        <div class="tax-summary-card gold">
          <span>สามารถประหยัดได้สูงสุด</span>
          <strong>${formatNumber(maxPlan.taxSaved)}</strong>
          <small>บาท จากภาษีที่ต้องจ่าย ${formatCurrency(data.tax)}</small>
        </div>
        <div class="tax-summary-card">
          <span>ภาษีหลังแผนลงทุน</span>
          <strong>${formatNumber(userPlan.taxAfter)}</strong>
          <small>บาท ลดได้ ${formatCurrency(userPlan.taxSaved)}</small>
        </div>
      </div>

      <div class="tax-card">
        <div class="tax-card-head">
          <div>
            <h3>แผนลงทุนเพิ่มเพื่อลดภาษี</h3>
            <p>ปรับเงินลงทุนเองได้ ระบบจะคำนวณเฉพาะยอดที่ยังใช้สิทธิลดหย่อนได้จริงตามเพดาน</p>
          </div>
        </div>
        <div class="tax-research-note">
          ข้อมูลอ้างอิง: RMF อยู่ในกลุ่มเพดานรวมกองทุนเกษียณ 500,000 บาท ส่วน Thai ESG แยกวงเงินจากกลุ่มนี้ และช่วงปี 2024-2026 ใช้สิทธิได้สูงสุด 300,000 บาท
        </div>
        ${renderInvestmentPlannerRow({
          key: 'simRmf',
          label: 'RMF',
          note: `เหลือเพดานใช้สิทธิ ${formatCurrency(capacity.rmfRemaining)} จากกลุ่ม RMF/PVD/SSF รวม 500,000 บาท`,
          amount: toNumber(state.simRmf),
          plan: getInvestmentPlan(data, toNumber(state.simRmf), 0),
          deductible: userPlan.rmfDeductible,
        })}
        ${renderInvestmentPlannerRow({
          key: 'simThaiEsg',
          label: 'Thai ESG',
          note: `เหลือเพดานใช้สิทธิ ${formatCurrency(capacity.thaiEsgRemaining)} แยกจากกลุ่ม RMF/PVD`,
          amount: toNumber(state.simThaiEsg),
          plan: getInvestmentPlan(data, 0, toNumber(state.simThaiEsg)),
          deductible: userPlan.thaiEsgDeductible,
        })}
        <div class="tax-investment-total">
          <span>ถ้าลงทุนเต็มเพดานที่เหลือ ต้องลงทุน ${formatCurrency(maxPlan.totalInvestment)}</span>
          <strong>ภาษีจะเหลือ ${formatCurrency(maxPlan.taxAfter)}</strong>
        </div>
      </div>

      <div class="tax-card">
        <div class="tax-card-head">
          <div>
            <h3>จำลองการประหยัดภาษี</h3>
            <p>คำนวณผลลัพธ์โดยประมาณ หากเพิ่มลดหย่อนในแต่ละหมวด ยอดรวมจะไม่เกินภาษีที่ต้องจ่ายจริง</p>
          </div>
        </div>
        ${simulations.length
          ? simulations.map(item => `
              <div class="tax-sim-row">
                <div>
                  <strong>${item.label}</strong>
                  <span>เพิ่มลดหย่อน ${formatCurrency(item.add)}</span>
                </div>
                <b>ประหยัด ${formatCurrency(item.saved)}</b>
              </div>
            `).join('')
          : '<div class="empty-state">ยังไม่มีหมวดที่จำลองเพิ่มเติมได้จากข้อมูลปัจจุบัน</div>'}
      </div>
    `;
  }

  function renderInvestmentPlannerRow({ key, label, note, amount, plan, deductible }) {
    return `
      <div class="tax-investment-row">
        <div class="tax-investment-main">
          <strong>${label}</strong>
          <span>${note}</span>
          <div class="tax-investment-controls">
            <button type="button" data-tax-invest="${key}" data-tax-step="-5000">-5,000</button>
            <input class="form-control tax-number-input" type="number" min="0" inputmode="decimal" data-tax-field="${key}" value="${amount || ''}" placeholder="0" />
            <button type="button" data-tax-invest="${key}" data-tax-step="5000">+5,000</button>
          </div>
        </div>
        <div class="tax-investment-result">
          <span>ใช้สิทธิได้ ${formatCurrency(deductible)}</span>
          <b>ลดภาษี ${formatCurrency(plan.taxSaved)}</b>
        </div>
      </div>
    `;
  }

  function getInvestmentCapacity(data) {
    const currentRmfDed = Math.min(toNumber(state.rmf), data.income * 0.3, 500000);
    const retirementGroupRemaining = Math.max(0, 500000 - data.invDed);
    const rmfPersonalRemaining = Math.max(0, data.income * 0.3 - currentRmfDed);
    const rmfRemaining = Math.min(retirementGroupRemaining, rmfPersonalRemaining);
    const thaiEsgRemaining = Math.min(
      Math.max(0, data.income * 0.3 - data.thaiEsgDed),
      Math.max(0, 300000 - data.thaiEsgDed)
    );

    return { rmfRemaining, thaiEsgRemaining };
  }

  function getInvestmentPlan(data, rmfInput, thaiEsgInput) {
    const capacity = getInvestmentCapacity(data);
    const rmfDeductible = Math.min(toNumber(rmfInput), capacity.rmfRemaining);
    const thaiEsgDeductible = Math.min(toNumber(thaiEsgInput), capacity.thaiEsgRemaining);
    const totalDeductible = rmfDeductible + thaiEsgDeductible;
    const taxAfter = calcTax(Math.max(0, data.netIncome - totalDeductible)).tax;

    return {
      rmfDeductible,
      thaiEsgDeductible,
      totalInvestment: toNumber(rmfInput) + toNumber(thaiEsgInput),
      totalDeductible,
      taxAfter,
      taxSaved: Math.min(data.tax, Math.max(0, data.tax - taxAfter)),
    };
  }

  function getSimulations(data) {
    const scenarios = [
      { label: 'เติมวงเงินประกันชีวิต / สุขภาพ', add: Math.max(0, 100000 - Math.min(toNumber(state.lifeIns) + toNumber(state.healthIns), 100000)) },
      { label: 'ลงทุน RMF เพิ่ม', add: getInvestmentCapacity(data).rmfRemaining },
      { label: 'ลงทุน Thai ESG เพิ่ม', add: getInvestmentCapacity(data).thaiEsgRemaining },
      { label: 'ใช้ดอกเบี้ยบ้าน', add: Math.max(0, 100000 - toNumber(state.mortgage)) },
      { label: 'บริจาคเพื่อการศึกษา / กีฬา', add: Math.min(50000, data.afterExpense * 0.05) },
    ].filter(item => item.add > 0);

    return scenarios.map(item => {
      const nextNet = Math.max(0, data.netIncome - item.add);
      const nextTax = calcTax(nextNet).tax;
      return {
        ...item,
        saved: Math.max(0, data.tax - nextTax),
      };
    }).filter(item => item.saved > 0);
  }

  function renderEmptyPrompt(message, targetTab) {
    return `
      <div class="tax-card tax-empty-card">
        <strong>${message}</strong>
        <button class="btn-primary" type="button" data-tax-tab="${targetTab}">ไปกรอกรายได้</button>
      </div>
    `;
  }

  function handleTaxInput(event) {
    const field = event.target?.dataset?.taxField;
    if (!field || field === 'incomeType') return;

    if (field === 'income') incomeWasEdited = true;
    state[field] = event.target.value;
    const data = derive();
    updateQuickStats(data);
    updateIncomeLiveText(data);
  }

  function handleTaxChange(event) {
    const field = event.target?.dataset?.taxField;
    if (!field) return;

    state[field] = event.target.value;
    renderTaxCalculator();
  }

  function handleTaxClick(event) {
    const tabBtn = event.target.closest('[data-tax-tab]');
    if (tabBtn) {
      state.tab = tabBtn.dataset.taxTab;
      renderTaxCalculator();
      return;
    }

    const toggleBtn = event.target.closest('[data-tax-toggle="spouse"]');
    if (toggleBtn) {
      state.spouse = !state.spouse;
      renderTaxCalculator();
      return;
    }

    const counterBtn = event.target.closest('[data-tax-counter]');
    if (counterBtn) {
      const key = counterBtn.dataset.taxCounter;
      const step = Number(counterBtn.dataset.taxStep) || 0;
      const max = key === 'parents' ? 4 : 20;
      state[key] = Math.min(max, Math.max(0, (Number(state[key]) || 0) + step));
      renderTaxCalculator();
      return;
    }

    const investBtn = event.target.closest('[data-tax-invest]');
    if (investBtn) {
      const key = investBtn.dataset.taxInvest;
      const step = Number(investBtn.dataset.taxStep) || 0;
      state[key] = String(Math.max(0, toNumber(state[key]) + step));
      renderTaxCalculator();
      return;
    }

    if (event.target.closest('#taxUseRevenueBtn')) {
      const income = getCurrentYearDoneRevenue();
      incomeWasEdited = false;
      state.income = String(Math.round(income));
      state.incomeType = '40_8';
      state.tab = 'income';
      renderTaxCalculator();
      const message = income
        ? `ดึงรายรับปีนี้จากงาน Done แล้ว: ${formatCurrency(income)}`
        : 'ยังไม่มีรายรับจากงานสถานะ Done ในปีนี้';
      window.showToast?.(message, income ? 'success' : 'error');
    }
  }

  function getCurrentYearDoneRevenue() {
    if (typeof window.getJobs !== 'function') return 0;

    const currentYear = new Date().getFullYear();
    return window.getJobs()
      .filter(job => {
        if (job?.status !== 'done' || job?.isCash || !job.date) return false;
        const date = new Date(`${job.date}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear;
      })
      .reduce((sum, job) => sum + toNumber(job.price), 0);
  }

  document.addEventListener('DOMContentLoaded', initTaxCalculator);

  window.initTaxCalculator = initTaxCalculator;
  window.renderTaxCalculator = renderTaxCalculator;
  window.resetTaxCalculator = resetTaxCalculator;
})();

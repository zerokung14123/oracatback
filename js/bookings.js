// ============================================================
//  bookings.js — จัดการคำขอจองคิวงาน (Bookings)
// ============================================================

let bookingsCache = [];
let currentApproveBookingId = null;

async function fetchBookings() {
  const token = localStorage.getItem('manager_token');
  if (!token) return [];

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load bookings');
    bookingsCache = await res.json();
    return bookingsCache;
  } catch (err) {
    console.error('Fetch bookings error:', err);
    showToast('โหลดข้อมูลคำขอจองไม่สำเร็จ', 'error');
    return [];
  }
}

function getJobTypeLabelLocal(type) {
  return window.JOB_TYPE_LABELS?.[type] || type || 'ทั่วไป';
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  // Filter bookings that are pending, pending_deposit, or rejected
  const list = bookingsCache.filter(b => b.status === 'pending' || b.status === 'pending_deposit' || b.status === 'rejected');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">ยังไม่มีคำขอจองคิวงานใหม่เข้ามา</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(b => {
    const statusText = b.status === 'pending' ? 'รอดำเนินการ' :
                       b.status === 'pending_deposit' ? 'รอชำระมัดจำ' : 'ปฏิเสธแล้ว';
    const statusClass = b.status === 'pending' ? 'status-pending' :
                        b.status === 'pending_deposit' ? 'status-confirmed' : 'status-cancelled';

    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${escHtml(b.client_name)}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${escHtml(b.contact)}</div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">${escHtml(b.email || 'ไม่มีอีเมล')}</div>
        </td>
        <td>
          <div style="font-weight: 500; color: var(--gold-light);">${escHtml(b.event_date)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escHtml(b.event_time)}</div>
        </td>
        <td style="max-width: 250px; font-size: 0.8rem; color: var(--text-muted);" title="${escAttr(b.details)}">
          ${escHtml(b.details || '-')}
        </td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="job-actions" style="text-align: right; white-space: nowrap;">
          ${b.status === 'pending' ? `
            <button class="action-btn" type="button" onclick="openApproveBookingModal('${b.id}', '${escAttr(b.client_name)}', '${escAttr(b.job_type)}')">อนุมัติรับงาน</button>
            <button class="action-btn del" type="button" onclick="rejectBooking('${b.id}')">ปฏิเสธ</button>
          ` : ''}
          ${b.status === 'pending_deposit' ? `
            <button class="action-btn" type="button" onclick="confirmDepositDirectly('${b.id}')">ยืนยันรับมัดจำแล้ว</button>
            <button class="action-btn del" type="button" onclick="cancelApproval('${b.id}')">ยกเลิกอนุมัติ</button>
          ` : ''}
          ${b.status === 'rejected' ? `
            <button class="action-btn" type="button" onclick="recoverBooking('${b.id}')">กู้คืนเป็นรอยืนยัน</button>
            <button class="action-btn del" type="button" onclick="deleteBookingPermanent('${b.id}')">ลบถาวร</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

async function refreshBookingsTab() {
  await fetchBookings();
  renderBookingsTable();
  
  // Update pending badge in sidebar if element exists
  const badgeEl = document.getElementById('bookingsPendingBadge');
  if (badgeEl) {
    const pendingCount = bookingsCache.filter(b => b.status === 'pending').length;
    badgeEl.textContent = pendingCount || '';
    badgeEl.style.display = pendingCount ? 'inline-block' : 'none';
  }
}

// Modal controls
function openApproveBookingModal(id, clientName, jobType) {
  currentApproveBookingId = id;
  
  // Find default deposit from appSettingsState (defined in app.js)
  let defaultDeposit = 1000;
  if (window.appSettingsState?.jobTypes) {
    const found = window.appSettingsState.jobTypes.find(t => t.id === jobType);
    if (found && found.deposit !== undefined) defaultDeposit = found.deposit;
  }

  document.getElementById('approveModalClientName').textContent = clientName;
  document.getElementById('approveModalJobType').textContent = getJobTypeLabelLocal(jobType);
  document.getElementById('approveModalDefaultDeposit').textContent = '฿' + defaultDeposit.toLocaleString();
  document.getElementById('approveModalDepositInput').value = defaultDeposit;
  document.getElementById('approveModalDepositInput').placeholder = defaultDeposit;

  document.getElementById('approveBookingModal').classList.add('open');
}

function closeApproveBookingModal() {
  document.getElementById('approveBookingModal').classList.remove('open');
  currentApproveBookingId = null;
}

async function confirmApproveBooking() {
  if (!currentApproveBookingId) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  const depositInput = document.getElementById('approveModalDepositInput').value.trim();
  const deposit = depositInput === '' ? 1000 : Number(depositInput);

  if (Number.isNaN(deposit) || deposit < 0) {
    showToast('กรุณาระบุมัดจำเป็นจำนวนตัวเลขที่ถูกต้อง', 'error');
    return;
  }

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${currentApproveBookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'pending_deposit', deposit })
    });

    if (!res.ok) throw new Error('Failed to approve booking');
    
    showToast('อนุมัติคำขอรับงานแล้ว ส่งอีเมลแจ้งลิงก์ชำระมัดจำให้ลูกค้าเรียบร้อย ✓', 'success');
    closeApproveBookingModal();
    
    // Sync UI
    await refreshBookingsTab();
    await window.firebaseData.refreshJobs();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Confirm approve error:', err);
    showToast('อนุมัติไม่สำเร็จ', 'error');
  }
}

async function confirmDepositDirectly(id) {
  if (!confirm('ยืนยันว่าได้รับเงินโอนมัดจำของใบจองนี้แล้วใช่หรือไม่? ระบบจะอนุมัติคิวงานทันที')) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'approved' })
    });

    if (!res.ok) throw new Error('Failed to approve booking');
    
    showToast('อนุมัติคิวงานสำเร็จเรียบร้อย ✓', 'success');
    
    // Sync UI
    await refreshBookingsTab();
    await window.firebaseData.refreshJobs();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Confirm deposit direct error:', err);
    showToast('ยืนยันไม่สำเร็จ', 'error');
  }
}

async function rejectBooking(id) {
  if (!confirm('ต้องการปฏิเสธคิวงานนี้ใช่หรือไม่? ระบบจะส่งอีเมลแจ้งปฏิเสธลูกค้าอัตโนมัติ')) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'rejected', note: 'คิวงานเต็มหรือช่างภาพไม่สะดวกในช่วงเวลาดังกล่าว' })
    });

    if (!res.ok) throw new Error('Failed to reject booking');
    
    showToast('ปฏิเสธคำขอเรียบร้อยแล้ว', 'success');
    await refreshBookingsTab();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Reject booking error:', err);
    showToast('ปฏิเสธไม่สำเร็จ', 'error');
  }
}

async function cancelApproval(id) {
  if (!confirm('ต้องการยกเลิกการอนุมัติและดึงกลับมาเป็นสถานะรอยืนยันใช่หรือไม่?')) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'pending' })
    });

    if (!res.ok) throw new Error('Failed to cancel approval');
    
    showToast('ยกเลิกการอนุมัติเรียบร้อย', 'success');
    await refreshBookingsTab();
    await window.firebaseData.refreshJobs();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Cancel approval error:', err);
    showToast('ดำเนินการไม่สำเร็จ', 'error');
  }
}

async function recoverBooking(id) {
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'pending' })
    });

    if (!res.ok) throw new Error('Failed to recover booking');
    
    showToast('กู้คืนข้อมูลจองคิวสำเร็จ', 'success');
    await refreshBookingsTab();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Recover booking error:', err);
    showToast('กู้คืนไม่สำเร็จ', 'error');
  }
}

async function deleteBookingPermanent(id) {
  if (!confirm('คำเตือน: คุณต้องการลบข้อมูลจองคิวนี้อย่างถาวรใช่หรือไม่? (การกระทำนี้ไม่สามารถเรียกคืนได้)')) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to delete booking');
    
    showToast('ลบข้อมูลถาวรสำเร็จ', 'success');
    await refreshBookingsTab();
    window.refreshAppData?.();
  } catch (err) {
    console.error('Delete booking permanent error:', err);
    showToast('ลบไม่สำเร็จ', 'error');
  }
}

// Bind event handlers
window.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('confirmApproveBookingBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmApproveBooking);
});

// Helper escapes
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.refreshBookingsTab = refreshBookingsTab;
window.openApproveBookingModal = openApproveBookingModal;
window.closeApproveBookingModal = closeApproveBookingModal;
window.rejectBooking = rejectBooking;
window.cancelApproval = cancelApproval;
window.recoverBooking = recoverBooking;
window.deleteBookingPermanent = deleteBookingPermanent;
window.confirmDepositDirectly = confirmDepositDirectly;

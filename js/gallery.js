// ============================================================
//  gallery.js — จัดการรูปภาพแกลเลอรีผลงาน (Gallery)
// ============================================================

let photosCache = [];

async function fetchPhotos() {
  const token = localStorage.getItem('manager_token');
  if (!token) return [];

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/photos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load photos');
    photosCache = await res.json();
    return photosCache;
  } catch (err) {
    console.error('Fetch photos error:', err);
    showToast('โหลดข้อมูลคลังรูปภาพไม่สำเร็จ', 'error');
    return [];
  }
}

function renderGalleryGrid() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  if (!photosCache.length) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">ยังไม่มีรูปผลงานในแกลเลอรี</div>';
    return;
  }

  grid.innerHTML = photosCache.map(p => {
    const categoryLabel = window.JOB_TYPE_LABELS?.[p.category] || p.category || 'อื่นๆ';
    const visibilityText = p.is_visible ? '● แสดงปกติ' : '○ ซ่อนอยู่';
    const visibilityClass = p.is_visible ? 'status-confirmed' : 'status-pending';

    return `
      <div class="card" style="border: 1px solid var(--border); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: rgba(0,0,0,0.2);">
        <div style="position: relative; width: 100%; aspect-ratio: 16/10; background: #050505;">
          <img src="${escAttr(p.image_url)}" alt="${escAttr(p.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
          <span style="position: absolute; top: 8px; left: 8px; font-size: 0.65rem; font-weight: 700; background: rgba(0,0,0,0.85); color: var(--gold); border: 1px solid var(--border-gold); padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
            ${escHtml(categoryLabel)}
          </span>
        </div>
        <div style="padding: 12px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
          <h4 style="font-size: 0.85rem; font-weight: 600; line-height: 1.4; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escAttr(p.title)}">
            ${escHtml(p.title)}
          </h4>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--border); padding-top: 10px;">
            <button class="action-btn" style="padding: 4px 10px; font-size: 0.75rem; border-color: ${p.is_visible ? 'rgba(116,217,138,0.3)' : 'var(--border)'};" onclick="togglePhotoVisibility('${p.id}', ${p.is_visible})">
              <span class="status-badge ${visibilityClass}" style="margin: 0; padding: 0; background: none; border: none; font-size: 0.75rem;">${visibilityText}</span>
            </button>
            <button class="action-btn del" style="padding: 4px 10px; font-size: 0.75rem;" onclick="deletePhoto('${p.id}')">ลบรูป</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populatePhotoCategorySelect() {
  const select = document.getElementById('photoCategorySelect');
  if (!select) return;

  const types = window.appSettingsState?.jobTypes || [];
  select.innerHTML = types.map(t => `<option value="${escAttr(t.id)}">${escHtml(t.label)}</option>`).join('');
}

async function refreshGalleryTab() {
  populatePhotoCategorySelect();
  await fetchPhotos();
  renderGalleryGrid();
}

async function uploadPhoto(event) {
  event.preventDefault();
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  const title = document.getElementById('photoTitleInput').value.trim();
  const category = document.getElementById('photoCategorySelect').value;
  const fileInput = document.getElementById('photoFileInput');
  const urlInput = document.getElementById('photoUrlInput').value.trim();

  let imageUrl = urlInput;

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    if (file.size > 8 * 1024 * 1024) {
      showToast('ไฟล์มีขนาดใหญ่เกินกว่า 8MB', 'error');
      return;
    }
    
    showToast('กำลังประมวลผลไฟล์ภาพรูปภาพ...');
    try {
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('อ่านไฟล์ภาพล้มเหลว'));
        reader.readAsDataURL(file);
      });
    } catch (e) {
      showToast('ไม่สามารถอัปโหลดไฟล์ภาพได้', 'error');
      return;
    }
  }

  if (!imageUrl) {
    showToast('กรุณาเลือกไฟล์รูปภาพ หรือระบุ URL ลิงก์รูปภาพผลงาน', 'error');
    return;
  }

  const uploadBtn = document.getElementById('uploadPhotoBtn');
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'กำลังอัปโหลด...';
  }

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        category,
        image_url: imageUrl,
        is_visible: true
      })
    });

    if (!res.ok) throw new Error('Failed to upload photo');
    
    showToast('อัปโหลดรูปภาพเข้าคลังผลงานสำเร็จแล้ว ✓', 'success');
    
    // Clear form
    document.getElementById('photoTitleInput').value = '';
    document.getElementById('photoFileInput').value = '';
    document.getElementById('photoUrlInput').value = '';
    
    await refreshGalleryTab();
  } catch (err) {
    console.error('Upload photo error:', err);
    showToast('อัปโหลดไม่สำเร็จ', 'error');
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'อัปโหลด';
    }
  }
}

async function togglePhotoVisibility(id, currentVal) {
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/photos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_visible: !currentVal })
    });

    if (!res.ok) throw new Error('Failed to toggle visibility');
    
    showToast('สลับสถานะการแสดงผลผลงานสำเร็จ', 'success');
    await refreshGalleryTab();
  } catch (err) {
    console.error('Toggle photo visibility error:', err);
    showToast('สลับสถานะไม่สำเร็จ', 'error');
  }
}

async function deletePhoto(id) {
  if (!confirm('ยืนยันว่าต้องการลบรูปภาพผลงานชิ้นนี้ออกจากคลังหรือไม่?')) return;
  const token = localStorage.getItem('manager_token');
  if (!token) return;

  try {
    const res = await fetch(`${window.firebaseData.API_BASE}/photos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to delete photo');
    
    showToast('ลบรูปภาพผลงานสำเร็จเรียบร้อย', 'success');
    await refreshGalleryTab();
  } catch (err) {
    console.error('Delete photo error:', err);
    showToast('ลบรูปภาพไม่สำเร็จ', 'error');
  }
}

// Bind event handlers
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadPhotoForm');
  if (form) form.addEventListener('submit', uploadPhoto);
});

// Helper escapes
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.refreshGalleryTab = refreshGalleryTab;
window.togglePhotoVisibility = togglePhotoVisibility;
window.deletePhoto = deletePhoto;

import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const DEFAULT_JOB_TYPES = [
  { id: 'wedding', label: 'งานแต่งงาน', days: 30, deposit: 5000 },
  { id: 'portrait', label: 'พอร์ตเทรต', days: 15, deposit: 1000 },
  { id: 'event', label: 'Event', days: 10, deposit: 3000 },
  { id: 'product', label: 'ถ่ายสินค้า', days: 7, deposit: 1500 },
  { id: 'family', label: 'ครอบครัว', days: 14, deposit: 2000 },
  { id: 'graduation', label: 'รับปริญญา', days: 20, deposit: 1500 },
  { id: 'custom', label: 'อื่นๆ', days: 30, deposit: 1000 }
];

const DEFAULT_PACKAGES = [
  {
    id: 'wedding',
    name: 'งานแต่งงาน (Wedding)',
    price: '35,000',
    badge: 'ยอดฮิต',
    features: [
      'ช่างภาพหลัก 2 ท่าน + ผู้ช่วย 1 ท่าน',
      'ไฟแฟลชและระบบแสงสว่างแบบครบเซ็ต',
      'ถ่ายไม่จำกัดจำนวนภาพ (ส่งไฟล์ทั้งหมด)',
      'ปรับโทนสีและแสงทุกรูป',
      'ส่งงานแบบ Luxury Digital Gallery ภายใน 30 วัน'
    ]
  },
  {
    id: 'portrait',
    name: 'พอร์ตเทรต (Portrait)',
    price: '3,500',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ระยะเวลา 2 ชั่วโมง',
      'ให้คำแนะนำเรื่องท่าทางและมุมกล้อง',
      'รีทัชรูปพิเศษ 30 รูป',
      'ปรับแต่งแสงสีไฟล์ภาพให้ครบถ้วน',
      'ส่งงานแบบดิจิทัลลิงก์ภายใน 15 วัน'
    ]
  },
  {
    id: 'event',
    name: 'Event / Party',
    price: '15,000',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ระยะเวลา 4 ชั่วโมง',
      'เก็บภาพบรรยากาศทั่วไป and Candid',
      'ส่งงานด่วน 50 รูปสำหรับทำข่าวภายใน 2 วัน',
      'ปรับโทนสีและส่งไฟล์ทั้งหมด',
      'ดาวน์โหลดผ่านแกลเลอรีภายใน 10 วัน'
    ]
  },
  {
    id: 'graduation',
    name: 'รับปริญญา (Graduation)',
    price: '4,500',
    badge: '',
    features: [
      'ช่างภาพ 1 ท่าน ครึ่งวัน (4 ชั่วโมง)',
      'นอกรอบเดี่ยว/กลุ่มย่อย ในและนอกสถานที่',
      'แต่งรูปโทนสวยละมุนทุกภาพ',
      'รีทัชภาพพิเศษ 15 รูป',
      'ลิงก์ดาวน์โหลดงานความคมชัดสูงภายใน 20 วัน'
    ]
  }
];

const DEFAULT_SETTINGS = {
  welcome_title: 'Welcome to ตีนแมวfoto',
  welcome_subtitle: 'Professional photography services for weddings, portraits, and corporate events.',
  contact_email: 'contact@teenmaofoto.com',
  contact_phone: '+66 81 234 5678',
  social_instagram: 'https://instagram.com/teenmaofoto',
  social_facebook: 'https://facebook.com/teenmaofoto',
  studio_name: 'ตีนแมวfoto',
  business_phone: '093-8106998',
  business_email: 'you@email.com',
  business_facebook: 'www.facebook.com/yourpage',
  hourly_rate: '1500',
  booking_terms: 'สอบถามรายละเอียดเพิ่มเติม Inbox ได้เลยจ้า',
  job_types: JSON.stringify(DEFAULT_JOB_TYPES),
  packages: JSON.stringify(DEFAULT_PACKAGES),
  promptpay_id: '0938106998',
  thunder_token: ''
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('manager_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('manager_user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Core Data States
  const [photos, setPhotos] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Job creation/edit Modal State
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // null means create mode
  const [jobForm, setJobForm] = useState({
    client_name: '',
    contact: '',
    event_date: '',
    event_time: '',
    details: '',
    job_type: 'wedding',
    price: 0,
    deposit: 0,
    location: '',
    start_time: '09:00',
    end_time: '13:00',
    note: '',
    status: 'approved'
  });

  // Photo Upload State
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCategory, setPhotoCategory] = useState('wedding');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoVisible, setPhotoVisible] = useState(true);
  const [photoError, setPhotoError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Settings Forms State
  const [settingsForm, setSettingsForm] = useState({ ...DEFAULT_SETTINGS });

  // Filtering/Searching State in Queue
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Approve with deposit modal state
  const [approveModal, setApproveModal] = useState(null); // { booking, defaultDeposit }
  const [approveDepositInput, setApproveDepositInput] = useState('');

  // Viewing job details modal state
  const [viewingJobDetails, setViewingJobDetails] = useState(null); // null or booking object

  // Tax and document states
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxDeductions, setTaxDeductions] = useState({
    personal: 60000,
    spouse: 0,
    child: 0,
    parents: 0,
    social_sec: 9000,
    insurance: 0,
    rmf_ltf: 0,
    easy_e_receipt: 0
  });
  const [taxDeductionsOpen, setTaxDeductionsOpen] = useState(false);
  const [selectedBookingJobId, setSelectedBookingJobId] = useState('');
  const [bookingSlipFile, setBookingSlipFile] = useState(null);
  const [bookingSlipImage, setBookingSlipImage] = useState(null);

  const canvasRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Google Calendar States
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchCalendarStatus = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_BASE}/auth/google/calendar/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCalendarConnected(data.connected);
        setCalendarEmail(data.email || '');
      }
    } catch (e) {
      console.error('Failed to fetch calendar status', e);
    }
  };

  const handleConnectCalendar = () => {
    if (!window.google?.accounts?.oauth2) {
      showNotification('ไม่สามารถโหลดระบบเชื่อมต่อ Google ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', 'error');
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '629659023739-3s6q51voaeb9koebh7rm63l1c3dihdi1.apps.googleusercontent.com';

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.code) {
          try {
            setCalendarLoading(true);
            const res = await fetch(`${API_BASE}/auth/google/calendar/exchange-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ code: response.code })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setCalendarConnected(true);
              setCalendarEmail(data.email || 'Connected Account');
              showNotification('เชื่อมต่อ Google Calendar สำเร็จแล้ว!', 'success');
            } else {
              showNotification(data.error || 'แลกเปลี่ยน Token ไม่สำเร็จ', 'error');
            }
          } catch (err) {
            showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อปฏิทิน', 'error');
          } finally {
            setCalendarLoading(false);
          }
        } else {
          showNotification('การอนุญาตสิทธิ์ไม่สำเร็จ', 'error');
        }
      }
    });

    client.requestCode();
  };

  const handleDisconnectCalendar = async () => {
    if (!window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ Google Calendar ใช่หรือไม่?')) return;
    try {
      setCalendarLoading(true);
      if (!token) return;
      const res = await fetch(`${API_BASE}/auth/google/calendar/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCalendarConnected(false);
        setCalendarEmail('');
        showNotification('ยกเลิกการเชื่อมต่อ Google Calendar เรียบร้อยแล้ว', 'success');
      } else {
        showNotification(data.error || 'ไม่สามารถยกเลิกการเชื่อมต่อได้', 'error');
      }
    } catch (e) {
      showNotification('เกิดข้อผิดพลาดในการยกเลิกเชื่อมต่อปฏิทิน', 'error');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSyncCalendarBookings = async () => {
    try {
      setCalendarLoading(true);
      if (!token) return;
      const res = await fetch(`${API_BASE}/auth/google/calendar/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`ซิงก์คิวงานเรียบร้อยแล้ว ทั้งหมด ${data.syncedCount} คิวงาน`, 'success');
      } else {
        showNotification(data.error || 'ไม่สามารถซิงก์คิวงานได้', 'error');
      }
    } catch (e) {
      showNotification('เกิดข้อผิดพลาดในการซิงก์คิวงาน', 'error');
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCalendarStatus();
      
      // Parse query params to detect success/error callback
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('activeTab');
      const calendarConnect = params.get('calendarConnect');
      const message = params.get('message');
      
      if (tabParam === 'settings') {
        setActiveTab('settings');
        // Clean URL params to avoid alerts repeating on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        if (calendarConnect === 'success') {
          showNotification('เชื่อมต่อ Google Calendar สำเร็จแล้ว!', 'success');
        } else if (calendarConnect === 'error') {
          showNotification(`เชื่อมต่อไม่สำเร็จ: ${message || 'เกิดข้อผิดพลาด'}`, 'error');
        }
      }
    }
  }, [token]);

  // Fetch initial dashboard data
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [photosRes, bookingsRes, jobsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/photos`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/bookings`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/jobs`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/settings`, { headers }).then(r => r.json())
      ]);

      if (photosRes.error || bookingsRes.error || jobsRes.error || settingsRes.error) {
        handleLogout();
        return;
      }

      setPhotos(photosRes);
      setBookings(bookingsRes);
      setJobs(jobsRes);
      
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settingsRes };
      setSettings(mergedSettings);
      setSettingsForm(mergedSettings);

      // Auto-select first job for canvas preview
      const activeQueue = bookingsRes.filter(b => b.status === 'approved');
      if (activeQueue.length > 0) {
        setSelectedBookingJobId(activeQueue[0].id);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showNotification('Failed to fetch dashboard details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('manager_token', data.token);
      localStorage.setItem('manager_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      showNotification(`Welcome back, ${data.user.displayName}!`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('manager_token');
    localStorage.removeItem('manager_user');
    setToken('');
    setUser(null);
    showNotification('Logged out successfully');
  };

  // --- CRUD Bookings & Queue (Photographer Jobs) ---
  const openAddJob = () => {
    setEditingJob(null);
    setJobForm({
      client_name: '',
      contact: '',
      email: '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: '09:00 - 13:00',
      details: '',
      job_type: 'wedding',
      price: 0,
      deposit: 0,
      location: '',
      start_time: '09:00',
      end_time: '13:00',
      note: '',
      status: 'approved',
      slip_image: ''
    });
    setShowJobModal(true);
  };

  const openEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      client_name: job.client_name || '',
      contact: job.contact || '',
      email: job.email || '',
      event_date: job.event_date || '',
      event_time: job.event_time || '',
      details: job.details || '',
      job_type: job.job_type || 'custom',
      price: job.price || 0,
      deposit: job.deposit || 0,
      location: job.location || '',
      start_time: job.start_time || '09:00',
      end_time: job.end_time || '13:00',
      note: job.note || '',
      status: job.status || 'approved',
      slip_image: job.slip_image || ''
    });
    setShowJobModal(true);
  };

  const openApproveBooking = (booking) => {
    setEditingJob(booking);
    setJobForm({
      client_name: booking.client_name || '',
      contact: booking.contact || '',
      event_date: booking.event_date || '',
      event_time: booking.event_time || '',
      details: booking.details || '',
      job_type: booking.job_type || 'custom',
      price: booking.price || 0,
      deposit: booking.deposit || 0,
      location: booking.location || '',
      start_time: booking.start_time || '09:00',
      end_time: booking.end_time || '13:00',
      note: booking.note || '',
      status: 'approved'
    });
    setShowJobModal(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      if (editingJob) {
        // Edit Mode
        const res = await fetch(`${API_BASE}/bookings/${editingJob.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(jobForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setBookings(bookings.map(b => b.id === editingJob.id ? data.booking : b));
        if (data.job) {
          setJobs(jobs.some(j => j.id === data.job.id) 
            ? jobs.map(j => j.id === data.job.id ? data.job : j)
            : [data.job, ...jobs]);
        }
        showNotification('คิวงานอัปเดตเรียบร้อย');
      } else {
        // Create Mode
        const res = await fetch(`${API_BASE}/bookings`, {
          method: 'POST',
          headers,
          body: JSON.stringify(jobForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setBookings([data.booking, ...bookings]);
        if (data.job) {
          setJobs([data.job, ...jobs]);
        }
        showNotification('เพิ่มงานใหม่ในคิวเรียบร้อย');
      }
      setShowJobModal(false);
      fetchDashboardData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบคิวงานนี้? (ข้อมูลทรากเกอร์ฝั่งลูกค้าจะถูกลบด้วย)')) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setBookings(bookings.filter(b => b.id !== id));
      setJobs(jobs.filter(j => j.booking_id !== id));
      showNotification('ลบงานเรียบร้อย');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleBookingAction = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBookings(bookings.map(b => b.id === id ? data.booking : b));
      if (data.job) {
        setJobs([data.job, ...jobs]);
        showNotification(`อนุมัติใบจองแล้ว! รหัสติดตามสถานะลูกค้าคือ: ${data.job.tracking_code}`);
      } else {
        showNotification(`ปรับสถานะใบจองเป็น: ${status}`);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Open the approve+deposit modal for a pending booking
  const openApproveModal = (booking) => {
    // Find default deposit for this job type from settings or DEFAULT_JOB_TYPES
    let jobTypes = DEFAULT_JOB_TYPES;
    try {
      const parsed = settings.job_types ? JSON.parse(settings.job_types) : null;
      if (parsed && parsed.length) jobTypes = parsed;
    } catch (_) {}
    const matched = jobTypes.find(t => t.id === booking.job_type);
    const defaultDeposit = matched?.deposit ?? 1000;
    setApproveModal({ booking, defaultDeposit });
    setApproveDepositInput('');
  };

  const handleConfirmApprove = async () => {
    if (!approveModal) return;
    const { booking, defaultDeposit } = approveModal;
    const depositAmount = approveDepositInput.trim() !== ''
      ? Number(approveDepositInput)
      : defaultDeposit;
    try {
      const res = await fetch(`${API_BASE}/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'pending_deposit', deposit: depositAmount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings(bookings.map(b => b.id === booking.id ? data.booking : b));
      if (data.job) {
        setJobs([data.job, ...jobs]);
        showNotification(`อนุมัติใบจองแล้ว! รหัสติดตาม: ${data.job.tracking_code} | มัดจำ: ฿${depositAmount.toLocaleString()}`);
      } else {
        showNotification(`อนุมัติใบจองแล้ว!`);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setApproveModal(null);
      setApproveDepositInput('');
    }
  };

  const handleUpdateJobStatus = async (id, nextStatus) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setJobs(jobs.map(j => j.id === id ? data : j));
      showNotification(`อัปเดตทรากเกอร์ลูกค้าเป็น: ${nextStatus}`);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleUpdateJobUrl = async (id, url) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ download_url: url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setJobs(jobs.map(j => j.id === id ? data : j));
      showNotification('บันทึกลิงก์ดาวน์โหลดงานลูกค้าเรียบร้อย');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Portfolio Gallery CRUD ---
  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('ไฟล์ใหญ่เกินไป ขนาดสูงสุดไม่เกิน 8MB');
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result);
      setUploadingPhoto(false);
      setPhotoError('');
    };
    reader.onerror = () => {
      setPhotoError('อ่านไฟล์ล้มเหลว');
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!photoTitle || !photoUrl || !photoCategory) {
      setPhotoError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: photoTitle,
          category: photoCategory,
          image_url: photoUrl,
          is_visible: photoVisible
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo');

      setPhotos([data, ...photos]);
      setPhotoTitle('');
      setPhotoUrl('');
      setPhotoError('');
      showNotification('อัปโหลดผลงานแกลเลอรีสำเร็จ');
    } catch (err) {
      setPhotoError(err.message);
    }
  };

  const handleToggleVisibility = async (id, currentVal) => {
    try {
      const res = await fetch(`${API_BASE}/photos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_visible: !currentVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPhotos(photos.map(p => p.id === id ? data : p));
      showNotification(`ซ่อน/แสดง ผลงานเรียบร้อย`);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeletePhoto = async (id) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบรูปภาพแกลเลอรีนี้?')) return;

    try {
      const res = await fetch(`${API_BASE}/photos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setPhotos(photos.filter(p => p.id !== id));
      showNotification('ลบรูปภาพแกลเลอรีสำเร็จ');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Settings ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsForm })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSettings(data);
      showNotification('บันทึกการตั้งค่าเรียบร้อย');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
      return;
    }

    setChangePasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');

      showNotification('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleAddJobType = (newTypeLabel, newTypeDays, newTypeDeposit) => {
    if (!newTypeLabel) return;
    const currentTypes = JSON.parse(settingsForm.job_types || JSON.stringify(DEFAULT_JOB_TYPES));
    const newId = 'type_' + Date.now();
    const updatedTypes = [...currentTypes, { 
      id: newId, 
      label: newTypeLabel, 
      days: Number(newTypeDays) || 30,
      deposit: Number(newTypeDeposit) || 0 
    }];
    setSettingsForm({ ...settingsForm, job_types: JSON.stringify(updatedTypes) });
    showNotification('เพิ่มประเภทงานชั่วคราวแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleDeleteJobType = (idToDelete) => {
    const currentTypes = JSON.parse(settingsForm.job_types || JSON.stringify(DEFAULT_JOB_TYPES));
    const updatedTypes = currentTypes.filter(t => t.id !== idToDelete);
    setSettingsForm({ ...settingsForm, job_types: JSON.stringify(updatedTypes) });
    showNotification('ลบประเภทงานชั่วคราวแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleUpdateJobType = (typeId, updatedFields) => {
    const currentTypes = getJobTypesList();
    const updatedTypes = currentTypes.map(t => {
      if (t.id === typeId) {
        return { ...t, ...updatedFields };
      }
      return t;
    });
    setSettingsForm({ ...settingsForm, job_types: JSON.stringify(updatedTypes) });
  };

  // Get job type details helper
  const getJobTypesList = () => {
    try {
      return JSON.parse(settingsForm.job_types || JSON.stringify(DEFAULT_JOB_TYPES));
    } catch (e) {
      return DEFAULT_JOB_TYPES;
    }
  };

  const getJobTypeLabel = (typeId) => {
    const list = getJobTypesList();
    const found = list.find(t => t.id === typeId);
    return found ? found.label : typeId;
  };

  // Get packages list helper
  const getPackagesList = () => {
    try {
      return JSON.parse(settingsForm.packages || JSON.stringify(DEFAULT_PACKAGES));
    } catch (e) {
      return DEFAULT_PACKAGES;
    }
  };

  const handleAddPackage = (name, price, badge, featuresText) => {
    if (!name) return;
    const currentPkgs = getPackagesList();
    const newId = 'pkg_' + Date.now();
    const features = featuresText
      ? featuresText.split('\n').map(f => f.trim()).filter(Boolean)
      : [];
    const updatedPkgs = [...currentPkgs, { id: newId, name, price, badge: badge || '', features }];
    setSettingsForm({ ...settingsForm, packages: JSON.stringify(updatedPkgs) });
    showNotification('เพิ่มแพ็กเกจชั่วคราวแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleDeletePackage = (idToDelete) => {
    const currentPkgs = getPackagesList();
    const updatedPkgs = currentPkgs.filter(p => p.id !== idToDelete);
    setSettingsForm({ ...settingsForm, packages: JSON.stringify(updatedPkgs) });
    showNotification('ลบแพ็กเกจชั่วคราวแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleUpdatePackage = (pkgId, updatedFields) => {
    const currentPkgs = getPackagesList();
    const updatedPkgs = currentPkgs.map(p => {
      if (p.id === pkgId) {
        return { ...p, ...updatedFields };
      }
      return p;
    });
    setSettingsForm({ ...settingsForm, packages: JSON.stringify(updatedPkgs) });
  };

  // --- Document Slip Rendering ---
  const handleSlipFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setBookingSlipImage(img);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const getSelectedBookingJob = () => {
    return bookings.find(b => String(b.id) === String(selectedBookingJobId)) || null;
  };

  useEffect(() => {
    const job = bookings.find(b => String(b.id) === String(selectedBookingJobId));
    if (job && job.slip_image) {
      const img = new Image();
      img.onload = () => {
        setBookingSlipImage(img);
      };
      img.src = job.slip_image;
    } else {
      setBookingSlipImage(null);
    }
  }, [selectedBookingJobId, bookings]);

  useEffect(() => {
    if (activeTab === 'documents') {
      renderBookingDocument();
    }
  }, [selectedBookingJobId, settings, bookingSlipImage, activeTab, bookings]);

  const renderBookingDocument = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const job = getSelectedBookingJob();
    
    // Config values
    const w = 1080;
    const h = 1528;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, w, h);

    // Watermark
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = '#1f1e1a';
    ctx.textAlign = 'right';
    ctx.font = '900 118px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('BOOKING', w - 74, 522);
    ctx.restore();

    // Draw header
    ctx.fillStyle = '#191916';
    ctx.fillRect(0, 0, w, 164);
    ctx.fillStyle = '#d8b76c';
    ctx.fillRect(0, 164, w, 4);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '800 48px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(settings.studio_name || 'ตีนแมวfoto', 86, 98);

    // Contact info
    ctx.font = '500 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`Tel: ${settings.business_phone || '093-8106998'}`, 540, 65);
    ctx.fillText(`Facebook: ${settings.business_facebook || 'yourpage'}`, 540, 115);
    ctx.fillText(`Email: ${settings.business_email || 'you@email.com'}`, 800, 65);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f1e1a';
    ctx.font = '300 70px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('ใบจองคิวถ่ายภาพ', w / 2, 300);
    ctx.fillStyle = '#d8b76c';
    ctx.font = '700 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('BOOKING CONFIRMATION', w / 2, 342);
    ctx.textAlign = 'left';

    if (!job) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#625f57';
      ctx.font = '500 32px "Segoe UI", Tahoma, sans-serif';
      ctx.fillText('กรุณาเลือกงานจากคิวเพื่อสร้างใบจอง', w / 2, h / 2);
      return;
    }

    const relatedJob = jobs.find(j => j.booking_id === job.id);
    const trackingCode = relatedJob ? relatedJob.tracking_code : '------';

    // Draw Tracking Code Badge
    const badgeW = 340;
    const badgeH = 46;
    const badgeX = (w - badgeW) / 2;
    const badgeY = 360;

    ctx.fillStyle = '#d8b76c';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    ctx.fillStyle = '#191916';
    ctx.textAlign = 'center';
    ctx.font = '800 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`รหัสติดตามคิวงาน : ${trackingCode}`, w / 2, badgeY + 30);
    ctx.textAlign = 'left';

    // Draw Metadata details
    const leftX = 86;
    const rightX = 584;
    const metaY = 450;

    // Divider line
    ctx.strokeStyle = '#d8d0c3';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(leftX, metaY - 30); ctx.lineTo(w - leftX, metaY - 30); ctx.stroke();

    const formatThaiLongDate = (dStr) => {
      if (!dStr) return '-';
      const d = new Date(dStr);
      if (isNaN(d)) return dStr;
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Fields
    ctx.fillStyle = '#b89449';
    ctx.font = '800 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('วันที่ถ่ายภาพ', leftX, metaY);
    ctx.fillText('ลูกค้า', rightX, metaY);
    ctx.fillText('ช่วงเวลา', leftX, metaY + 96);
    ctx.fillText('สถานที่', rightX, metaY + 96);

    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 28px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(formatThaiLongDate(job.event_date), leftX, metaY + 42);
    ctx.fillText(job.client_name || '-', rightX, metaY + 42);
    ctx.fillText(job.event_time || `${job.start_time || '09:00'} - ${job.end_time || '13:00'} น.`, leftX, metaY + 138);
    ctx.fillText(job.location || '-', rightX, metaY + 138);

    // Divider
    ctx.beginPath(); ctx.moveTo(leftX, metaY + 180); ctx.lineTo(w - leftX, metaY + 180); ctx.stroke();

    // Table details
    const tableY = 680;
    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 30px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('รายละเอียดบริการ', leftX, tableY);

    ctx.fillStyle = '#625f57';
    ctx.font = '800 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('รายการ', leftX + 50, tableY + 50);
    ctx.fillText('รายละเอียด', leftX + 450, tableY + 50);
    ctx.fillText('ราคา', w - leftX - 100, tableY + 50);

    ctx.beginPath(); ctx.moveTo(leftX, tableY + 70); ctx.lineTo(w - leftX, tableY + 70); ctx.stroke();

    ctx.fillStyle = '#1f1e1a';
    ctx.font = '600 24px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('1.', leftX, tableY + 120);
    ctx.fillText(`${getJobTypeLabel(job.job_type)} (${job.location || 'ในสถานที่'})`, leftX + 50, tableY + 120);
    
    // wrap detail notes
    const descText = job.note || job.details || 'ถ่ายภาพพร้อมแต่งรูปภาพตามข้อตกลง';
    ctx.font = '400 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = '#625f57';
    
    // wrap text function
    const wrapText = (text, x, y, maxW, lineH) => {
      const words = text.split('');
      let line = '';
      let curY = y;
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n];
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && n > 0) {
          ctx.fillText(line, x, curY);
          line = words[n];
          curY += lineH;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, curY);
    };
    wrapText(descText, leftX + 450, tableY + 120, 320, 26);

    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 26px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`฿ ${(job.price || 0).toLocaleString()}`, w - leftX, tableY + 120);
    ctx.textAlign = 'left';

    ctx.beginPath(); ctx.moveTo(leftX, tableY + 220); ctx.lineTo(w - leftX, tableY + 220); ctx.stroke();

    // Terms and payment details
    const bottomY = 960;
    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 28px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('เงื่อนไขและข้อกำหนด:', leftX, bottomY);
    ctx.font = '400 20px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = '#625f57';
    wrapText(settings.booking_terms || 'จองคิวมัดจำแล้วไม่คืนเงินทุกกรณี', leftX, bottomY + 40, 420, 28);

    ctx.fillStyle = '#1f1e1a';
    ctx.font = '700 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`มัดจำค่ามัดจำคิว: ฿ ${(job.deposit || 0).toLocaleString()} บาท`, leftX, bottomY + 160);

    // Slip area
    const slipX = leftX;
    const slipY = bottomY + 200;
    const slipW = 200;
    const slipH = 200;
    if (bookingSlipImage) {
      ctx.drawImage(bookingSlipImage, slipX, slipY, slipW, slipH);
    } else {
      ctx.fillStyle = '#e9e6df';
      ctx.fillRect(slipX, slipY, slipW, slipH);
      ctx.strokeStyle = '#d2cec4';
      ctx.strokeRect(slipX, slipY, slipW, slipH);
      ctx.fillStyle = '#bbb3a7';
      ctx.font = '600 20px "Segoe UI", Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('หลักฐานโอนเงิน', slipX + slipW/2, slipY + slipH/2);
      ctx.textAlign = 'left';
    }

    // Totals details
    const totalX = 584;
    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 28px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('สรุปยอดชำระเงิน', totalX, bottomY);

    ctx.font = '500 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = '#625f57';
    ctx.fillText('ราคารวม:', totalX, bottomY + 50);
    ctx.fillText('หักมัดจำแล้ว:', totalX, bottomY + 90);
    ctx.fillText('ยอดคงเหลือที่ต้องจ่าย:', totalX, bottomY + 130);

    ctx.fillStyle = '#1f1e1a';
    ctx.textAlign = 'right';
    ctx.fillText(`฿ ${(job.price || 0).toLocaleString()}`, w - leftX, bottomY + 50);
    ctx.fillText(`- ฿ ${(job.deposit || 0).toLocaleString()}`, w - leftX, bottomY + 90);
    
    ctx.font = '800 24px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`฿ ${Math.max(0, (job.price || 0) - (job.deposit || 0)).toLocaleString()}`, w - leftX, bottomY + 130);
    ctx.textAlign = 'left';

    ctx.beginPath(); ctx.moveTo(totalX, bottomY + 160); ctx.lineTo(w - leftX, bottomY + 160); ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#b89449';
    ctx.font = '900 60px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(`฿ ${(job.price || 0).toLocaleString()}`, w - leftX, bottomY + 230);
    ctx.textAlign = 'left';

    // Signature Area
    const sigX = 710;
    const sigY = 1420;
    ctx.strokeStyle = '#1f1e1a';
    ctx.beginPath(); ctx.moveTo(sigX, sigY); ctx.lineTo(sigX + 260, sigY); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f1e1a';
    ctx.font = '800 26px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(settings.studio_name || 'ตีนแมวfoto', sigX + 130, sigY + 34);
    ctx.font = '400 22px "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('ผู้ให้บริการ / ช่างภาพ', sigX + 130, sigY + 66);
    ctx.textAlign = 'left';
  };

  const downloadBookingJpg = () => {
    const canvas = canvasRef.current;
    const job = getSelectedBookingJob();
    if (!canvas || !job) {
      showNotification('กรุณาเลือกคิวงานเพื่อสร้างใบจอง', 'error');
      return;
    }

    const filename = `booking-${job.client_name || 'customer'}-${job.event_date}.jpg`;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showNotification('ดาวน์โหลดใบจองคิวสำเร็จ ✓');
  };

  // --- Calculations for dashboard & statistics ---
  const activeQueue = bookings.filter(b => b.status === 'approved');
  const pendingRequests = bookings.filter(b => b.status === 'pending');
  
  // Calculate income
  const getCurrentMonthRevenue = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    const currentYear = new Date().getFullYear();
    return activeQueue
      .filter(b => {
        if (!b.event_date) return false;
        const d = new Date(b.event_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + (b.price || 0), 0);
  };

  const getCurrentYearRevenue = () => {
    const currentYear = new Date().getFullYear();
    return activeQueue
      .filter(b => {
        if (!b.event_date) return false;
        const d = new Date(b.event_date);
        return d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + (b.price || 0), 0);
  };

  const getMonthlyJobsCount = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return activeQueue.filter(b => {
      if (!b.event_date) return false;
      const d = new Date(b.event_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  };

  // SVG Chart data
  const getMonthlySums = () => {
    const sums = Array(12).fill(0);
    activeQueue.forEach(b => {
      if (!b.event_date) return;
      const d = new Date(b.event_date);
      if (d.getFullYear() === Number(taxYear)) {
        sums[d.getMonth()] += Number(b.price || 0);
      }
    });
    return sums;
  };

  // Overdue check
  const getOverdueJobs = () => {
    const overdueList = [];
    const jobTypes = getJobTypesList();
    
    activeQueue.forEach(b => {
      const relatedJob = jobs.find(j => j.booking_id === b.id);
      // Only check if it exists and status is not completed
      if (relatedJob && relatedJob.status !== 'completed') {
        const foundType = jobTypes.find(t => t.id === b.job_type);
        const limitDays = foundType ? foundType.days : 30;
        
        const shootDate = new Date(b.event_date);
        const today = new Date();
        const diffTime = Math.abs(today - shootDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > limitDays && today > shootDate) {
          overdueList.push({
            id: b.id,
            client_name: b.client_name,
            daysOver: diffDays - limitDays,
            event_date: b.event_date,
            status: relatedJob.status,
            tracking_code: relatedJob.tracking_code
          });
        }
      }
    });
    return overdueList;
  };

  // Tax Planning Calculator (Thai progressive rate)
  const calculateTax = () => {
    // Total income for active jobs in selected year
    const yearlyIncome = activeQueue
      .filter(b => b.event_date && new Date(b.event_date).getFullYear() === Number(taxYear))
      .reduce((sum, b) => sum + (b.price || 0), 0);

    // Expense deduction (40% of income, up to 60,000 for standard employment, 
    // but Oracat uses 50% up to 100,000 as typical photography sole proprietorship)
    const expenseDeduction = Math.min(yearlyIncome * 0.5, 100000);
    
    // Sum of client additions
    const totalAdditions = Object.values(taxDeductions).reduce((s, v) => s + Number(v), 0);
    const netIncome = Math.max(0, yearlyIncome - expenseDeduction - totalAdditions);

    // Progressive Bracket calculation
    let remaining = netIncome;
    let totalTax = 0;

    const brackets = [
      { limit: 150000, rate: 0 },
      { limit: 150000, rate: 0.05 }, // 150k - 300k
      { limit: 200000, rate: 0.10 }, // 300k - 500k
      { limit: 250000, rate: 0.15 }, // 500k - 750k
      { limit: 250000, rate: 0.20 }, // 750k - 1m
      { limit: 1000000, rate: 0.25 }, // 1m - 2m
      { limit: 3000000, rate: 0.30 }, // 2m - 5m
      { limit: Infinity, rate: 0.35 } // 5m+
    ];

    for (const b of brackets) {
      if (remaining <= 0) break;
      const taxableInBracket = Math.min(remaining, b.limit);
      totalTax += taxableInBracket * b.rate;
      remaining -= taxableInBracket;
    }

    return {
      income: yearlyIncome,
      expenses: expenseDeduction,
      deductions: totalAdditions,
      net: netIncome,
      tax: totalTax,
      rate: yearlyIncome > 0 ? ((totalTax / yearlyIncome) * 100).toFixed(1) : '0.0'
    };
  };

  const taxDetails = calculateTax();

  // Filter queue jobs list
  const filteredQueue = activeQueue.filter(b => {
    const matchSearch = searchQuery ? (
      (b.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.contact || '').toLowerCase().includes(searchQuery.toLowerCase())
    ) : true;

    const matchMonth = filterMonth ? (
      b.event_date && (new Date(b.event_date).getMonth() + 1) === Number(filterMonth)
    ) : true;

    const matchType = filterJobType ? b.job_type === filterJobType : true;

    const relatedJob = jobs.find(j => j.booking_id === b.id);
    const matchStatus = filterStatus ? (
      relatedJob && relatedJob.status === filterStatus
    ) : true;

    return matchSearch && matchMonth && matchType && matchStatus;
  });

  const getTaxCountdown = () => {
    // Standard tax filing deadline in Thailand is March 31st of the next year
    const currentYear = new Date().getFullYear();
    const deadline = new Date(currentYear + 1, 2, 31); // March 31st
    const today = new Date();
    const diff = deadline - today;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (!token) {
    // --- Login Panel Screen ---
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d8b76c]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-gradient-to-b from-[#17140e] to-[#070706] border border-[#d8b76c]/30 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#d8b76c] to-[#f0d695] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#d8b76c]/10 mb-4 border border-[#d8b76c]/40">
              <svg className="w-10 h-10 text-[#d8b76c]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-4.5-2c-.83 0-1.5.67-1.5 1.5S6.67 15 7.5 15s1.5-.67 1.5-1.5S8.33 12 7.5 12zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-7.3-4.5c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.13-.5 1.13-1.13 0-.62-.5-1.12-1.13-1.12zm5.6 0c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.12-.5 1.12-1.13 0-.62-.5-1.12-1.12-1.12z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white font-display">
              ตีนแมวFoto Manager
            </h2>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-semibold">Studio Workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center gap-1.5">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#d8b76c] uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-700 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d8b76c] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-700 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full oracat-gold-btn py-3 px-4 rounded-xl shadow-xl hover:shadow-[#d8b76c]/5 transition active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-[#e6e6e6] relative">
      {/* Mobile Top Navbar Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-[#d8b76c]/20 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#d8b76c]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-4.5-2c-.83 0-1.5.67-1.5 1.5S6.67 15 7.5 15s1.5-.67 1.5-1.5S8.33 12 7.5 12zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-7.3-4.5c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.13-.5 1.13-1.13 0-.62-.5-1.12-1.13-1.12zm5.6 0c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.12-.5 1.12-1.13 0-.62-.5-1.12-1.12-1.12z" />
          </svg>
          <span className="font-bold text-sm tracking-wider text-[#d8b76c] uppercase font-display">ตีนแมวFoto</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#d8b76c] hover:text-white p-1 border border-[#d8b76c]/30 rounded-lg hover:bg-[#d8b76c]/10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Backdrop overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transition-all border ${
          notification.type === 'success' 
            ? 'bg-[#121212] border-green-500/30 text-green-400' 
            : 'bg-[#121212] border-red-500/30 text-red-400'
        }`}>
          <span>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* ===== Approve with Deposit Modal ===== */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="bg-[#111] border border-[#d8b76c]/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg font-display">อนุมัติรับงาน</h3>
              <p className="text-xs text-slate-400">{approveModal.booking.client_name} — {approveModal.booking.event_date}</p>
            </div>
            <div className="bg-[#0d0d0d] border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทงาน</span>
                <span className="font-semibold text-slate-200 capitalize">{approveModal.booking.job_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">มัดจำพื้นฐาน</span>
                <span className="font-bold text-amber-400 font-mono">฿{approveModal.defaultDeposit.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                ยอดมัดจำที่จะเก็บ <span className="text-slate-600 font-normal">(เว้นว่างเพื่อใช้ค่าพื้นฐาน)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm">฿</span>
                <input
                  type="number"
                  min="0"
                  value={approveDepositInput}
                  onChange={e => setApproveDepositInput(e.target.value)}
                  placeholder={approveModal.defaultDeposit.toLocaleString()}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#d8b76c] rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 font-mono outline-none transition"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmApprove(); if (e.key === 'Escape') setApproveModal(null); }}
                />
              </div>
              <p className="text-[10px] text-slate-600">
                จะเก็บมัดจำ: <strong className="text-amber-400 font-mono">
                  ฿{(approveDepositInput.trim() !== '' ? Number(approveDepositInput) : approveModal.defaultDeposit).toLocaleString()}
                </strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmApprove}
                className="flex-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-sm font-bold transition"
              >
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Viewing Job Details Modal ===== */}
      {viewingJobDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl bg-gradient-to-b from-[#17140e] to-[#070706] border border-[#d8b76c]/30 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-xs space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#d8b76c]/20 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#d8b76c] uppercase tracking-widest block font-mono">
                  รหัสคิวงาน: {jobs.find(j => j.booking_id === viewingJobDetails.id)?.tracking_code || '-'}
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">รายละเอียดคิวงาน</h3>
              </div>
              <button 
                onClick={() => setViewingJobDetails(null)}
                className="text-slate-500 hover:text-white text-lg font-bold bg-slate-900 border border-slate-800 rounded-full w-7 h-7 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Client Profile */}
              <div className="bg-[#141414]/30 border border-slate-800/60 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[#d8b76c] border-b border-slate-800 pb-1">ข้อมูลลูกค้า</h4>
                <div className="space-y-1 text-slate-300">
                  <div><strong>ชื่อลูกค้า:</strong> {viewingJobDetails.client_name}</div>
                  <div><strong>เบอร์/ติดต่อ:</strong> {viewingJobDetails.contact || '-'}</div>
                  <div><strong>Gmail:</strong> {viewingJobDetails.email || 'ไม่ได้ระบุ'}</div>
                </div>
              </div>

              {/* Event Info */}
              <div className="bg-[#141414]/30 border border-slate-800/60 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[#d8b76c] border-b border-slate-800 pb-1">ข้อมูลการจ้างงาน</h4>
                <div className="space-y-1 text-slate-300">
                  <div><strong>วันที่จ้าง:</strong> <span className="text-amber-500 font-bold">{viewingJobDetails.event_date}</span></div>
                  <div><strong>ช่วงเวลา:</strong> {viewingJobDetails.start_time} - {viewingJobDetails.end_time} น.</div>
                  <div><strong>ประเภทงาน:</strong> {getJobTypeLabel(viewingJobDetails.job_type)}</div>
                </div>
              </div>

              {/* Location & Details */}
              <div className="md:col-span-2 bg-[#141414]/30 border border-slate-800/60 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[#d8b76c] border-b border-slate-800 pb-1">สถานที่ & รายละเอียดเพิ่มเติม</h4>
                <div className="space-y-1 text-slate-300">
                  <div><strong>สถานที่:</strong> {viewingJobDetails.location || '-'}</div>
                  <div className="pt-1 whitespace-pre-line text-slate-400"><strong>บรีฟ/หมายเหตุ:</strong> {viewingJobDetails.note || '-'}</div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="md:col-span-2 bg-[#1c1913]/30 border border-[#d8b76c]/20 p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">ราคางานทั้งหมด</div>
                  <div className="font-mono text-sm font-bold text-white">฿{Number(viewingJobDetails.price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">มัดจำแล้ว</div>
                  <div className="font-mono text-sm font-bold text-green-400">฿{Number(viewingJobDetails.deposit || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">ยอดเงินคงเหลือ</div>
                  <div className="font-mono text-sm font-bold text-amber-500">฿{Number((viewingJobDetails.price || 0) - (viewingJobDetails.deposit || 0)).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Slip image if uploaded */}
            {viewingJobDetails.slip_image && (
              <div className="space-y-2 border-t border-[#d8b76c]/10 pt-4">
                <div className="text-xs font-semibold text-slate-400 block text-center">หลักฐานสลิปมัดจำ</div>
                <div className="flex justify-center">
                  <a href={viewingJobDetails.slip_image} target="_blank" rel="noreferrer" title="คลิกเพื่อดูภาพขยาย">
                    <img 
                      src={viewingJobDetails.slip_image} 
                      alt="Payment Slip" 
                      className="max-h-48 rounded-lg border border-[#d8b76c]/20 shadow-md hover:opacity-90 transition cursor-pointer"
                    />
                  </a>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-[#d8b76c]/10 pt-4">
              <button
                onClick={() => { setSelectedBookingJobId(viewingJobDetails.id); setActiveTab('documents'); setViewingJobDetails(null); }}
                className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded-xl font-bold transition"
              >
                ดูใบจองคิวงาน
              </button>
              <button
                onClick={() => setViewingJobDetails(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Panel */}
      <aside className={`w-64 border-r border-[#d8b76c]/30 bg-gradient-to-b from-[#0d0c09] to-[#050505] flex flex-col justify-between shrink-0 h-screen fixed md:sticky md:top-0 inset-y-0 left-0 transition-transform duration-300 z-40 overflow-y-auto ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-[#d8b76c]/20">
            <svg className="w-8 h-8 text-[#d8b76c]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-4.5-2c-.83 0-1.5.67-1.5 1.5S6.67 15 7.5 15s1.5-.67 1.5-1.5S8.33 12 7.5 12zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-7.3-4.5c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.13-.5 1.13-1.13 0-.62-.5-1.12-1.13-1.12zm5.6 0c-.62 0-1.12.5-1.12 1.12 0 .63.5 1.13 1.12 1.13.63 0 1.12-.5 1.12-1.13 0-.62-.5-1.12-1.12-1.12z" />
            </svg>
            <div>
              <h1 className="font-bold text-sm tracking-widest text-[#d8b76c] uppercase font-display">ตีนแมวFoto</h1>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider">PHOTOGRAPHER HUB</span>
            </div>
          </div>

          <div className="m-4 p-4 bg-gradient-to-b from-[#d8b76c]/10 to-transparent border border-[#d8b76c]/10 rounded-xl space-y-2">
            <div className="text-[10px] font-bold text-[#f0d695] uppercase tracking-wider">Account Active</div>
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.displayName || 'Photographer'}</div>
            <div className="text-[10px] text-slate-500">{user?.username}</div>
          </div>

          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <span className="font-mono text-base">◉</span> },
              { id: 'queue', label: 'คิวงาน (Queue)', icon: <span className="font-mono text-base">▤</span> },
              { id: 'bookings', label: 'คำขอจอง (Bookings)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, badge: pendingRequests.length },
              { id: 'revenue', label: 'รายรับ (Revenue)', icon: <span className="font-mono text-base">◈</span> },
              { id: 'tax', label: 'โปรแกรมภาษี (Tax)', icon: <span className="font-mono text-base">▥</span> },
              { id: 'documents', label: 'ใบจอง (Documents)', icon: <span className="font-mono text-base">▧</span> },
              { id: 'gallery', label: 'จัดการผลงาน (Gallery)', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
              { id: 'settings', label: 'ตั้งค่า (Settings)', icon: <span className="font-mono text-base">◎</span> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                  activeTab === tab.id
                    ? 'bg-[#d8b76c]/10 text-[#d8b76c] border-[#d8b76c]/30 shadow-lg'
                    : 'text-slate-400 hover:bg-white/3 hover:text-white border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#d8b76c] flex items-center justify-center w-5 h-5">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {Boolean(tab.badge) && (
                  <span className="bg-[#d8b76c] text-[#161006] text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-[#d8b76c]/10">
          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#d8b76c]/20 hover:bg-[#d8b76c]/5 text-[#d8b76c] text-xs font-bold uppercase tracking-widest rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-grow overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-[#d8b76c]/10">
            <div>
              <h2 className="text-3xl font-bold text-white font-display uppercase tracking-wider">{activeTab === 'queue' ? 'คิวงานช่างภาพ' : activeTab === 'bookings' ? 'คำขอจองคิวงาน' : activeTab}</h2>
              <p className="text-slate-500 text-sm mt-1">ตีนแมวFoto photographer workspace system v0.3.1</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-[#121212] hover:bg-[#1c1c1c] border border-[#d8b76c]/20 rounded-xl text-xs font-bold text-[#d8b76c] tracking-widest transition"
            >
              ↻ Refresh Data
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="w-10 h-10 border-4 border-[#d8b76c]/20 border-t-[#d8b76c] rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm">Syncing with SQLite DB...</p>
            </div>
          ) : (
            <>
              {/* === A. DASHBOARD VIEW === */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Summary Metric Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="oracat-card p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full translate-x-6 -translate-y-6"></div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">งานเดือนนี้</span>
                      <h4 className="text-3xl font-bold mt-2 text-[#d8b76c] font-display">{getMonthlyJobsCount()}</h4>
                      <p className="text-xs text-slate-500 mt-1">คิวถ่ายภาพทั้งหมด</p>
                    </div>

                    <div className="oracat-card p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full translate-x-6 -translate-y-6"></div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">รายรับเดือนนี้</span>
                      <h4 className="text-3xl font-bold mt-2 text-white font-display">฿ {getCurrentMonthRevenue().toLocaleString()}</h4>
                      <p className="text-xs text-slate-500 mt-1">คำนวณตามจริง</p>
                    </div>

                    <div className="oracat-card p-6 rounded-2xl relative overflow-hidden border-[#d8b76c]/50">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full translate-x-6 -translate-y-6"></div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">รายรับปีนี้</span>
                      <h4 className="text-3xl font-bold mt-2 text-[#f0d695] font-display">฿ {getCurrentYearRevenue().toLocaleString()}</h4>
                      <p className="text-xs text-slate-500 mt-1">ยอดรวมปีภาษี {taxYear}</p>
                    </div>

                    <div className="oracat-card p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 rounded-full translate-x-6 -translate-y-6"></div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">งานรอดำเนินการ</span>
                      <h4 className="text-3xl font-bold mt-2 text-red-400 font-display">{pendingRequests.length}</h4>
                      <p className="text-xs text-slate-500 mt-1">คำขอคิวรอยืนยัน</p>
                    </div>
                  </div>

                  {/* Graph Overview and Upcoming lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SVG Chart */}
                    <div className="oracat-card p-6 rounded-2xl lg:col-span-2 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white font-display">รายรับรายเดือน ปี {taxYear}</h3>
                        <select 
                          value={taxYear}
                          onChange={e => setTaxYear(e.target.value)}
                          className="bg-[#050505] border border-[#d8b76c]/30 text-amber-500 text-xs font-bold rounded-xl px-3 py-1.5 outline-none transition"
                        >
                          {[2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="pt-4">
                        <MonthlyRevenueChart revenueData={getMonthlySums()} />
                      </div>
                    </div>

                    {/* Upcoming lists */}
                    <div className="oracat-card p-6 rounded-2xl space-y-4">
                      <h3 className="text-lg font-bold text-white font-display">งานคิวที่กำลังจะมาถึง</h3>
                      
                      {activeQueue.slice(0, 4).length === 0 ? (
                        <p className="text-slate-500 text-xs text-center py-12">ยังไม่มีงานคิวได้รับการจัดวางไว้</p>
                      ) : (
                        <div className="space-y-3">
                          {activeQueue.slice(0, 4).map(b => (
                            <div key={b.id} className="p-3 bg-[#050505]/40 border border-[#d8b76c]/10 rounded-xl space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-slate-200">{b.client_name}</span>
                                <span className="text-amber-500 font-semibold">{getJobTypeLabel(b.job_type)}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between">
                                <span>📅 {b.event_date}</span>
                                <span>📍 {b.location || 'ในสถานที่'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overdue alert and tax countdown panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Delivery Delay Overdue widget */}
                    <div className="oracat-card p-6 rounded-2xl space-y-4 border-red-500/20">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white font-display">แจ้งเตือนส่งงานล่าช้า <svg className="w-4 h-4 text-red-400 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></h3>
                        <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-lg">
                          เกินกำหนด {getOverdueJobs().length} งาน
                        </span>
                      </div>
                      
                      {getOverdueJobs().length === 0 ? (
                        <p className="text-slate-500 text-xs text-center py-8">ไม่มีคิวงานล่าช้ากว่ากำหนดจัดส่งตามข้อตกลง</p>
                      ) : (
                        <div className="space-y-3 overflow-y-auto max-h-48">
                          {getOverdueJobs().map(o => (
                            <div key={o.id} className="flex justify-between items-center p-3 bg-red-500/3 border border-red-500/10 rounded-xl">
                              <div>
                                <h4 className="text-xs font-bold text-slate-200">{o.client_name}</h4>
                                <span className="text-[10px] text-slate-500">วันถ่าย: {o.event_date} (รหัส: {o.tracking_code})</span>
                              </div>
                              <span className="text-xs text-red-400 font-bold">เกินดีล +{o.daysOver} วัน</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tax count and notification widget */}
                    <div className="oracat-card p-6 rounded-2xl bg-gradient-to-r from-[#17140e] to-[#0a0a0a] flex justify-between items-center gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Tax Payment Reminder</div>
                        <h3 className="text-xl font-bold text-white font-display">การจ่ายภาษีรายบุคคล</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          เตรียมความพร้อมสำหรับการยื่นภาษีรายได้ช่างภาพบุคคลธรรมดา ยื่นชำระผ่านช่องทางกรมสรรพากรออน์ไลน์
                        </p>
                        <a 
                          href="https://efiling.rd.go.th"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-[#d8b76c] text-[#161006] text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110 transition"
                        >
                          ไปหน้าชำระภาษี สรรพากร
                        </a>
                      </div>

                      <div className="w-24 h-24 rounded-2xl bg-[#050505]/60 border border-[#d8b76c]/30 flex flex-col justify-center items-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">เหลือเวลา</span>
                        <strong className="text-3xl font-bold text-[#d8b76c] mt-0.5">{getTaxCountdown()}</strong>
                        <span className="text-[9px] text-[#f0d695] font-semibold mt-0.5">วันยื่นภาษี</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === B. QUEUE (คิวงาน) VIEW === */}
              {activeTab === 'queue' && (
                <div className="space-y-6">
                  {/* Toolbar controls */}
                  <div className="oracat-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                      <input 
                        type="text" 
                        placeholder="ค้นหาชื่อลูกค้า, เบอร์..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] text-xs px-3.5 py-2.5 rounded-xl placeholder:text-slate-700 outline-none text-slate-200 w-52 transition"
                      />
                      
                      <select 
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] text-xs px-3 py-2.5 rounded-xl outline-none text-slate-400 font-semibold"
                      >
                        <option value="">ทุกเดือน</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
                        ))}
                      </select>

                      <select 
                        value={filterJobType}
                        onChange={e => setFilterJobType(e.target.value)}
                        className="bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] text-xs px-3 py-2.5 rounded-xl outline-none text-slate-400 font-semibold"
                      >
                        <option value="">ประเภทงานทั้งหมด</option>
                        {getJobTypesList().map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>

                      <select 
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] text-xs px-3 py-2.5 rounded-xl outline-none text-slate-400 font-semibold"
                      >
                        <option value="">สถานะความคืบหน้า</option>
                        <option value="briefed">Brief Received</option>
                        <option value="shooting">On Shooting</option>
                        <option value="editing">Post Processing</option>
                        <option value="completed">Delivered</option>
                      </select>
                    </div>

                    <button 
                      onClick={openAddJob}
                      className="oracat-gold-btn text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <span>+</span> เพิ่มคิวงานใหม่
                    </button>
                  </div>

                  {/* Table listing */}
                  <div className="oracat-card rounded-2xl overflow-hidden">
                    {filteredQueue.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-12">ไม่พบคิวงานในรายการจองปัจจุบัน</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#d8b76c]/10 text-slate-500 text-[10px] uppercase tracking-wider">
                              <th className="p-4 font-bold">วันที่</th>
                              <th className="p-4 font-bold">ลูกค้า</th>
                              <th className="p-4 font-bold">ประเภทงาน</th>
                              <th className="p-4 font-bold">สถานที่</th>
                              <th className="p-4 font-bold">ราคางาน</th>
                              <th className="p-4 font-bold">มัดจำแล้ว</th>
                              <th className="p-4 font-bold">รหัสลูกค้า</th>
                              <th className="p-4 font-bold">ความคืบหน้างาน</th>
                              <th className="p-4 font-bold text-center">ลิงก์งาน</th>
                              <th className="p-4 font-bold text-right">การจัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#d8b76c]/5 text-xs">
                            {filteredQueue.map(b => {
                              const relatedJob = jobs.find(j => j.booking_id === b.id);
                              return (
                                <tr key={b.id} className="hover:bg-white/1">
                                  <td className="p-4 font-mono font-bold text-amber-500 whitespace-nowrap">{b.event_date}</td>
                                  <td className="p-4 font-bold text-slate-100">{b.client_name}</td>
                                  <td className="p-4 font-semibold text-slate-300">{getJobTypeLabel(b.job_type)}</td>
                                  <td className="p-4 text-slate-400 max-w-[120px] truncate" title={b.location}>{b.location || '-'}</td>
                                  <td className="p-4 font-mono font-semibold text-[#f0d695]">฿ {Number(b.price || 0).toLocaleString()}</td>
                                  <td className="p-4 font-mono text-slate-400">฿ {Number(b.deposit || 0).toLocaleString()}</td>
                                  <td className="p-4">
                                    {relatedJob ? (
                                      <span className="font-mono text-[10px] bg-slate-900 border border-[#d8b76c]/30 text-amber-500 font-bold px-2 py-0.5 rounded">
                                        {relatedJob.tracking_code}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 italic">ไม่มี</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {relatedJob ? (
                                      <select 
                                        value={relatedJob.status}
                                        onChange={e => handleUpdateJobStatus(relatedJob.id, e.target.value)}
                                        className="bg-[#050505] border border-[#d8b76c]/10 text-[10px] font-bold rounded-lg px-2 py-1 outline-none text-amber-500"
                                      >
                                        <option value="briefed">Briefed</option>
                                        <option value="shooting">Shooting</option>
                                        <option value="editing">Editing</option>
                                        <option value="completed">Completed</option>
                                      </select>
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    {relatedJob ? (
                                      <input 
                                        type="text" 
                                        defaultValue={relatedJob.download_url || ''}
                                        placeholder="ลิงก์ไฟล์..."
                                        onBlur={e => handleUpdateJobUrl(relatedJob.id, e.target.value)}
                                        className="bg-[#050505] border border-[#d8b76c]/10 focus:border-[#d8b76c] rounded px-2 py-1 text-[10px] outline-none text-slate-300 w-24"
                                      />
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                    <button 
                                      onClick={() => setViewingJobDetails(b)}
                                      className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded font-semibold transition"
                                    >
                                      รายละเอียด
                                    </button>
                                    <button 
                                      onClick={() => { setSelectedBookingJobId(b.id); setActiveTab('documents'); }}
                                      className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded font-semibold transition"
                                    >
                                      ใบจอง
                                    </button>
                                    <button 
                                      onClick={() => openEditJob(b)}
                                      className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded font-semibold transition"
                                    >
                                      แก้ไข
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteJob(b.id)}
                                      className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded font-semibold transition"
                                    >
                                      ลบ
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === C. BOOKINGS (รายการจอง) VIEW === */}
              {activeTab === 'bookings' && (
                <div className="oracat-card rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-[#d8b76c]/10">
                    <h3 className="text-lg font-bold text-white font-display">คำขอจองคิวงานจากลูกค้าหน้าเว็บ</h3>
                  </div>

                  {bookings.filter(b => b.status === 'pending' || b.status === 'pending_deposit' || b.status === 'rejected').length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">ยังไม่มีคำขอจองคิวงานใหม่เข้ามา</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#d8b76c]/10 text-slate-500 text-[10px] uppercase tracking-wider">
                            <th className="p-4">ผู้ขอจอง</th>
                            <th className="p-4">ข้อมูลติดต่อ</th>
                            <th className="p-4">วันที่ & เวลาจอง</th>
                            <th className="p-4">รายละเอียด</th>
                            <th className="p-4">สถานะ</th>
                            <th className="p-4 text-right">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d8b76c]/5 text-xs">
                          {bookings.filter(b => b.status === 'pending' || b.status === 'pending_deposit' || b.status === 'rejected').map(b => (
                            <tr key={b.id} className="hover:bg-white/1">
                              <td className="p-4 font-bold text-slate-200">{b.client_name}</td>
                              <td className="p-4 text-slate-400 font-mono">{b.contact}</td>
                              <td className="p-4">
                                <div className="font-bold text-slate-300">{b.event_date}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{b.event_time}</div>
                              </td>
                              <td className="p-4 text-slate-500 max-w-xs truncate" title={b.details}>{b.details || '-'}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                  b.status === 'pending_deposit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                }`}>
                                  {b.status === 'pending' ? 'รอดำเนินการ' : 
                                   b.status === 'pending_deposit' ? 'รอชำระมัดจำ' : 'ปฏิเสธแล้ว'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                {b.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => openApproveModal(b)}
                                      className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 rounded font-semibold transition"
                                    >
                                      อนุมัติรับงาน
                                    </button>
                                    <button 
                                      onClick={() => handleBookingAction(b.id, 'rejected')}
                                      className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded font-semibold transition"
                                    >
                                      ปฏิเสธ
                                    </button>
                                  </>
                                )}
                                {b.status === 'pending_deposit' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-[10px] text-slate-500 italic">
                                      รหัสติดตาม: {jobs.find(j => j.booking_id === b.id)?.tracking_code || '-'}
                                    </span>
                                    <button 
                                      onClick={() => handleBookingAction(b.id, 'pending')}
                                      className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 rounded text-[10px] font-semibold transition"
                                    >
                                      ยกเลิกอนุมัติ
                                    </button>
                                  </div>
                                )}
                                {b.status === 'rejected' && (
                                  <button 
                                    onClick={() => handleBookingAction(b.id, 'pending')}
                                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 rounded font-semibold transition"
                                  >
                                    กู้คืนเป็นรอการตัดสินใจ
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* === D. REVENUE (รายรับ) VIEW === */}
              {activeTab === 'revenue' && (
                <div className="space-y-6">
                  {/* Revenue stats grid cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="oracat-card p-6 rounded-2xl text-center">
                      <span className="text-[#d8b76c] text-xs font-bold uppercase tracking-widest">ยอดรวมรายรับ ปี {taxYear}</span>
                      <h4 className="text-4xl font-bold mt-2 text-[#f0d695] font-display">฿ {getMonthlySums().reduce((a,b)=>a+b, 0).toLocaleString()}</h4>
                      <p className="text-xs text-slate-500 mt-1">คำนวณจากงานจัดคิวที่ยืนยันแล้ว</p>
                    </div>

                    <div className="oracat-card p-6 rounded-2xl text-center">
                      <span className="text-[#d8b76c] text-xs font-bold uppercase tracking-widest">จำนวนคิวงานจัดรับ</span>
                      <h4 className="text-4xl font-bold mt-2 text-white font-display">
                        {activeQueue.filter(b => b.event_date && new Date(b.event_date).getFullYear() === Number(taxYear)).length}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">คิวงานในปีภาษี {taxYear}</p>
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Monthly Sum Breakdown */}
                    <div className="oracat-card p-6 rounded-2xl space-y-4">
                      <h3 className="text-lg font-bold text-white font-display">สรุปรายรับแบ่งตามเดือน ({taxYear})</h3>
                      <div className="divide-y divide-[#d8b76c]/10 text-xs">
                        {getMonthlySums().map((val, idx) => {
                          const dateObj = new Date(taxYear, idx, 1);
                          return (
                            <div key={idx} className="flex justify-between py-3">
                              <span className="font-semibold text-slate-300">
                                {dateObj.toLocaleDateString('th-TH', { month: 'long' })}
                              </span>
                              <span className="font-mono font-bold text-amber-500">฿ {val.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Job Types Sum Breakdown */}
                    <div className="oracat-card p-6 rounded-2xl space-y-4">
                      <h3 className="text-lg font-bold text-white font-display">สรุปรายรับตามประเภทงาน ({taxYear})</h3>
                      <div className="divide-y divide-[#d8b76c]/10 text-xs">
                        {getJobTypesList().map(t => {
                          const typeSum = activeQueue
                            .filter(b => b.job_type === t.id && b.event_date && new Date(b.event_date).getFullYear() === Number(taxYear))
                            .reduce((sum, b) => sum + (b.price || 0), 0);
                          return (
                            <div key={t.id} className="flex justify-between py-3">
                              <span className="font-semibold text-slate-300">{t.label}</span>
                              <span className="font-mono font-bold text-amber-500">฿ {typeSum.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === E. TAX PLANNING VIEW === */}
              {activeTab === 'tax' && (
                <div className="space-y-6">
                  {/* Tax quick values banner */}
                  <div className="oracat-card p-6 rounded-2xl bg-gradient-to-r from-[#17140e] to-[#0a0a0a] flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-[#d8b76c] uppercase tracking-widest">Thai Personal Income Tax Plan</div>
                      <h2 className="text-3xl font-bold text-white font-display mt-1">โปรแกรมวางแผนคำนวณภาษี</h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg">
                        คำนวณภาษีเงินได้บุคคลธรรมดาเบื้องต้น (มาตรา 40(8) โสด) ตามเกณฑ์รายได้ปี {taxYear} นำส่งกรมสรรพากร
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <div className="text-center px-4 py-3 bg-[#050505]/60 border border-[#d8b76c]/20 rounded-xl min-w-28">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">รายได้รวมปีนี้</span>
                        <strong className="text-lg font-bold text-white font-mono mt-1 block">฿ {taxDetails.income.toLocaleString()}</strong>
                      </div>
                      <div className="text-center px-4 py-3 bg-[#d8b76c]/10 border border-[#d8b76c]/40 rounded-xl min-w-28">
                        <span className="text-[10px] text-[#f0d695] uppercase font-semibold block">ภาษีสะสมเบื้องต้น</span>
                        <strong className="text-lg font-bold text-[#d8b76c] font-mono mt-1 block">฿ {taxDetails.tax.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Settings and progressive detailed math */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Deduction configuration settings panel */}
                    <div className="oracat-card p-6 rounded-2xl space-y-4 h-fit">
                      <h3 className="text-lg font-bold text-white font-display">ตั้งค่าลดหย่อนภาษี</h3>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">หักลดหย่อนส่วนบุคคล (฿)</label>
                          <input 
                            type="number" 
                            value={taxDeductions.personal} 
                            onChange={e => setTaxDeductions({ ...taxDeductions, personal: Number(e.target.value) })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">ลดหย่อนบุตร (฿)</label>
                          <input 
                            type="number" 
                            value={taxDeductions.child} 
                            onChange={e => setTaxDeductions({ ...taxDeductions, child: Number(e.target.value) })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">ประกันสังคม (฿)</label>
                          <input 
                            type="number" 
                            value={taxDeductions.social_sec} 
                            onChange={e => setTaxDeductions({ ...taxDeductions, social_sec: Number(e.target.value) })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">ประกันชีวิต/สุขภาพ (฿)</label>
                          <input 
                            type="number" 
                            value={taxDeductions.insurance} 
                            onChange={e => setTaxDeductions({ ...taxDeductions, insurance: Number(e.target.value) })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">กองทุน RMF/SSF/ThaiESG (฿)</label>
                          <input 
                            type="number" 
                            value={taxDeductions.rmf_ltf} 
                            onChange={e => setTaxDeductions({ ...taxDeductions, rmf_ltf: Number(e.target.value) })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tax bracket calculations sheet */}
                    <div className="oracat-card p-6 rounded-2xl lg:col-span-2 space-y-4">
                      <h3 className="text-lg font-bold text-white font-display">สรุปการคำนวณเงินได้และลดหย่อน</h3>
                      <div className="divide-y divide-[#d8b76c]/10 text-xs">
                        <div className="flex justify-between py-3">
                          <span className="text-slate-400">รายได้รวมของปีภาษี:</span>
                          <span className="font-mono text-slate-200">฿ {taxDetails.income.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-3">
                          <span className="text-slate-400">หักค่าใช้จ่ายตามเกณฑ์ (50% ไม่เกิน 1 แสนบาท):</span>
                          <span className="font-mono text-red-400">- ฿ {taxDetails.expenses.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-3">
                          <span className="text-slate-400">หักค่าลดหย่อนและกองทุนรวมสะสม:</span>
                          <span className="font-mono text-red-400">- ฿ {taxDetails.deductions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm bg-white/1 px-2 rounded mt-1">
                          <span className="text-[#d8b76c]">เงินได้สุทธิสำหรับคิดภาษี:</span>
                          <span className="font-mono text-white">฿ {taxDetails.net.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm bg-[#d8b76c]/10 px-2 rounded mt-2">
                          <span className="text-[#f0d695]">ภาษีประมาณการที่ต้องจ่าย:</span>
                          <span className="font-mono text-[#d8b76c]">฿ {taxDetails.tax.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="bg-[#050505] p-4 rounded-xl border border-[#d8b76c]/10 mt-4 text-[10px] text-slate-500 leading-relaxed">
                        **หมายเหตุ:** โปรแกรมนี้ช่วยคำนวณเบื้องต้นสำหรับการยื่นภาษีเงินได้ประเภท 40(8) ด้วยตนเอง โปรดใช้เอกสารแสดงรายได้และใบเสร็จลดหย่อนฉบับจริงจากสถาบันการเงินยืนยันก่อนยื่นแบบแสดงรายการภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 90/91) กับกรมสรรพากรอีกครั้ง
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === F. DOCUMENTS (ใบจอง JPG) VIEW === */}
              {activeTab === 'documents' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Select parameters */}
                  <div className="oracat-card p-6 rounded-2xl space-y-4 h-fit">
                    <h3 className="text-lg font-bold text-white font-display">สร้างใบจองคิวงาน</h3>
                    
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1.5">เลือกคิวงานหลัก</label>
                        <select 
                          value={selectedBookingJobId}
                          onChange={e => setSelectedBookingJobId(e.target.value)}
                          className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-3 py-2.5 text-slate-200 outline-none"
                        >
                          {activeQueue.length === 0 ? (
                            <option value="">ยังไม่มีคิวงานที่ยืนยันการจัดงาน</option>
                          ) : (
                            activeQueue.map(b => (
                              <option key={b.id} value={b.id}>{b.event_date} - {b.client_name} ({getJobTypeLabel(b.job_type)})</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5">แนบรูปภาพสลิปเงินมัดจำ</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleSlipFileChange}
                          className="w-full bg-[#050505] border border-[#d8b76c]/10 rounded-xl px-3 py-2 text-slate-400 block file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#d8b76c]/10 file:text-[#d8b76c] hover:file:bg-[#d8b76c]/20 text-[10px]"
                        />
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          onClick={downloadBookingJpg}
                          className="flex-1 oracat-gold-btn text-xs font-bold py-2.5 rounded-xl text-center shadow"
                        >
                          ดาวน์โหลดไฟล์ภาพ .JPG
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Canvas */}
                  <div className="lg:col-span-2 oracat-card p-6 rounded-2xl flex flex-col items-center">
                    <h3 className="text-lg font-bold text-white font-display mb-4 self-start">ตัวอย่างไฟล์รูปภาพ (Preview)</h3>
                    
                    <div className="w-full overflow-hidden border border-[#d8b76c]/20 rounded-xl shadow-inner bg-[#0a0a0a] flex items-center justify-center p-4">
                      <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-[500px] object-contain rounded shadow-lg shadow-black/60"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* === G. GALLERY PORTFOLIO MANAGER VIEW === */}
              {activeTab === 'gallery' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Upload new photo form */}
                  <div className="oracat-card p-6 rounded-2xl h-fit space-y-4">
                    <h3 className="text-lg font-bold text-white font-display">อัปโหลดรูปภาพผลงาน</h3>
                    <form onSubmit={handleAddPhoto} className="space-y-4 text-xs">
                      {photoError && <div className="text-xs text-red-400 flex items-center gap-1"><svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> {photoError}</div>}
                      
                      <div>
                        <label className="block text-slate-400 mb-1">ชื่อรูปผลงาน</label>
                        <input
                          type="text"
                          required
                          value={photoTitle}
                          onChange={e => setPhotoTitle(e.target.value)}
                          placeholder="เช่น พอร์ตเทรตโทนอุ่นสวนหลวง"
                          className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">หมวดหมู่ผลงาน</label>
                        <select
                          value={photoCategory}
                          onChange={e => setPhotoCategory(e.target.value)}
                          className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none font-semibold text-slate-300"
                        >
                          {getJobTypesList().map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">ที่มารูปภาพ</label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="w-full bg-[#050505] border border-[#d8b76c]/10 rounded-xl px-3 py-2 text-slate-400 block file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#d8b76c]/10 file:text-[#d8b76c] hover:file:bg-[#d8b76c]/20 text-[10px]"
                          />
                          <div className="text-center text-[10px] text-slate-600">หรือ วางลิงก์รูปภาพเว็บภายนอก</div>
                          <input
                            type="text"
                            value={photoUrl.startsWith('data:') ? '' : photoUrl}
                            onChange={e => setPhotoUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="visibleCheck"
                          checked={photoVisible}
                          onChange={e => setPhotoVisible(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-[#d8b76c] border-[#d8b76c]/30 bg-[#050505]"
                        />
                        <label htmlFor="visibleCheck" className="text-[#d8b76c] font-semibold">แสดงผลบนหน้าบ้านลูกค้า</label>
                      </div>

                      <button
                        type="submit"
                        disabled={uploadingPhoto}
                        className="w-full oracat-gold-btn py-2.5 rounded-xl transition text-xs shadow"
                      >
                        {uploadingPhoto ? 'กำลังอ่านไฟล์...' : 'เพิ่มรูปภาพเข้าคลังผลงาน'}
                      </button>
                    </form>
                  </div>

                  {/* Grid items layout */}
                  <div className="lg:col-span-2 oracat-card p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-bold text-white font-display">จัดการคลังรูปภาพ ({photos.length} รูป)</h3>
                    {photos.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-12">ยังไม่มีรูปผลงานช่างภาพในพอร์ตโฟลิโอ</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                        {photos.map(p => (
                          <div key={p.id} className="bg-[#050505]/40 border border-[#d8b76c]/10 rounded-2xl overflow-hidden flex flex-col justify-between">
                            <div className="relative aspect-video bg-slate-950">
                              <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                              <span className="absolute top-2 left-2 bg-[#050505]/80 text-[#d8b76c] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {getJobTypeLabel(p.category)}
                              </span>
                            </div>
                            <div className="p-4 space-y-3">
                              <h4 className="font-bold text-slate-200 text-xs truncate" title={p.title}>{p.title}</h4>
                              
                              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#d8b76c]/10">
                                <button
                                  onClick={() => handleToggleVisibility(p.id, p.is_visible)}
                                  className={`px-2.5 py-1 rounded font-bold transition ${
                                    p.is_visible 
                                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                      : 'bg-slate-800 text-slate-500 border border-transparent'
                                  }`}
                                >
                                  {p.is_visible ? '● แสดงปกติ' : '○ ซ่อนไว้'}
                                </button>
                                <button
                                  onClick={() => handleDeletePhoto(p.id)}
                                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 rounded font-bold transition"
                                >
                                  ลบรูป
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === H. SETTINGS (ตั้งค่า) VIEW === */}
              {activeTab === 'settings' && (
                <div className="oracat-card p-6 rounded-2xl max-w-4xl space-y-8">
                  <h3 className="text-xl font-bold text-white font-display">ตั้งค่าโปรแกรมและข้อมูลช่างภาพ</h3>
                  
                  <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
                    {/* General layout welcome messages */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-[#d8b76c] font-display border-b border-[#d8b76c]/10 pb-2">1. ข้อความทักทายหน้าบ้าน (Portfolio Welcome)</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-slate-400 mb-1.5">หัวข้อคำทักทายหลัก (Welcome Title)</label>
                          <input
                            type="text"
                            value={settingsForm.welcome_title}
                            onChange={e => setSettingsForm({ ...settingsForm, welcome_title: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-slate-400 mb-1.5">คำอธิบายเพิ่มเติม (Welcome Subtitle)</label>
                          <textarea
                            rows={2}
                            value={settingsForm.welcome_subtitle}
                            onChange={e => setSettingsForm({ ...settingsForm, welcome_subtitle: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Studio business details */}
                    <div className="space-y-4 pt-4">
                      <h4 className="text-sm font-bold text-[#d8b76c] font-display border-b border-[#d8b76c]/10 pb-2">2. ข้อมูลสตูดิโอ & ธุรกิจรับงาน</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-1.5">ชื่อสตูดิโอ / ช่างภาพ</label>
                          <input
                            type="text"
                            value={settingsForm.studio_name}
                            onChange={e => setSettingsForm({ ...settingsForm, studio_name: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">เบอร์ติดต่อ</label>
                          <input
                            type="text"
                            value={settingsForm.business_phone}
                            onChange={e => setSettingsForm({ ...settingsForm, business_phone: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">อีเมลติดต่อธุรกิจ</label>
                          <input
                            type="email"
                            value={settingsForm.business_email}
                            onChange={e => setSettingsForm({ ...settingsForm, business_email: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">ลิงก์หน้าแฟนเพจ Facebook</label>
                          <input
                            type="text"
                            value={settingsForm.business_facebook}
                            onChange={e => setSettingsForm({ ...settingsForm, business_facebook: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">หมายเลข PromptPay (เบอร์มือถือ/เลขประจำตัวประชาชน) สำหรับรับเงินมัดจำ</label>
                          <input
                            type="text"
                            value={settingsForm.promptpay_id || ''}
                            onChange={e => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                            placeholder="เช่น 0938106998"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">Thunder Solution API Token (สำหรับตรวจสอบสลิปอัตโนมัติ)</label>
                          <input
                            type="password"
                            value={settingsForm.thunder_token || ''}
                            onChange={e => setSettingsForm({ ...settingsForm, thunder_token: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                            placeholder="กรอก token ลับสำหรับตรวจสอบสลิป..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-slate-400 mb-1.5">เงื่อนไข/ข้อกำหนดมัดจำ (แสดงผลท้ายเอกสารใบจองคิว)</label>
                          <textarea
                            rows={3}
                            value={settingsForm.booking_terms}
                            onChange={e => setSettingsForm({ ...settingsForm, booking_terms: e.target.value })}
                            className="w-full bg-[#050505] border border-[#d8b76c]/20 focus:border-[#d8b76c] rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Job Types config */}
                    <div className="space-y-4 pt-4">
                      <h4 className="text-sm font-bold text-[#d8b76c] font-display border-b border-[#d8b76c]/10 pb-2">3. จัดการประเภทงาน & วันจัดส่งดีล</h4>
                      
                      <div className="space-y-3 bg-[#050505]/40 border border-[#d8b76c]/10 p-4 rounded-xl">
                        <div className="flex flex-col gap-2">
                          {getJobTypesList().map(t => (
                            <div key={t.id} className="flex flex-wrap md:flex-nowrap gap-3 items-center justify-between p-2.5 bg-[#050505]/60 border border-slate-900 rounded-lg text-[11px]">
                              <div className="flex flex-grow gap-3 items-center w-full md:w-auto">
                                <div className="flex-grow">
                                  <label className="block text-slate-500 text-[10px] mb-0.5">ประเภทงาน</label>
                                  <input 
                                    type="text"
                                    value={t.label}
                                    onChange={e => handleUpdateJobType(t.id, { label: e.target.value })}
                                    className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 outline-none font-semibold"
                                  />
                                </div>
                                <div className="w-20">
                                  <label className="block text-slate-500 text-[10px] mb-0.5">วันส่งงาน</label>
                                  <input 
                                    type="number"
                                    value={t.days}
                                    onChange={e => handleUpdateJobType(t.id, { days: Number(e.target.value) || 0 })}
                                    className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
                                  />
                                </div>
                                <div className="w-24">
                                  <label className="block text-slate-500 text-[10px] mb-0.5">เงินมัดจำ (บาท)</label>
                                  <input 
                                    type="number"
                                    value={t.deposit || 0}
                                    onChange={e => handleUpdateJobType(t.id, { deposit: Number(e.target.value) || 0 })}
                                    className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 outline-none font-mono"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteJobType(t.id)}
                                className="text-red-400 hover:text-red-500 font-bold text-xs shrink-0 self-end md:self-center bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20"
                              >
                                ลบออก
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-[#d8b76c]/10 flex flex-wrap md:flex-nowrap gap-3">
                          <input 
                            type="text" 
                            id="newTypeLabel" 
                            placeholder="ประเภทงานใหม่..."
                            className="bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-1.5 text-slate-200 outline-none flex-grow text-[11px]"
                          />
                          <input 
                            type="number" 
                            id="newTypeDays" 
                            placeholder="ดีลส่งงาน (วัน)..."
                            className="bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-1.5 text-slate-200 outline-none w-28 text-[11px]"
                          />
                          <input 
                            type="number" 
                            id="newTypeDeposit" 
                            placeholder="เงินมัดจำ (บาท)..."
                            className="bg-[#050505] border border-[#d8b76c]/20 rounded-lg px-3 py-1.5 text-slate-200 outline-none w-28 text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const labelEl = document.getElementById('newTypeLabel');
                              const daysEl = document.getElementById('newTypeDays');
                              const depositEl = document.getElementById('newTypeDeposit');
                              if (labelEl && daysEl && depositEl) {
                                handleAddJobType(labelEl.value, daysEl.value, depositEl.value);
                                labelEl.value = '';
                                daysEl.value = '';
                                depositEl.value = '';
                              }
                            }}
                            className="bg-[#d8b76c]/10 border border-[#d8b76c]/30 text-[#d8b76c] font-bold px-4 py-1.5 rounded-lg hover:bg-[#d8b76c]/20 transition text-[11px] whitespace-nowrap"
                          >
                            + เพิ่มประเภท
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Packages & Pricing config */}
                    <div className="space-y-4 pt-4">
                      <h4 className="text-sm font-bold text-[#d8b76c] font-display border-b border-[#d8b76c]/10 pb-2">4. จัดการแพ็กเกจ & ราคา (Packages & Pricing)</h4>
                      
                      <div className="space-y-6">
                        {getPackagesList().map(pkg => (
                          <div key={pkg.id} className="p-4 bg-[#050505]/60 border border-[#d8b76c]/10 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-[#d8b76c]/10 pb-2">
                              <span className="font-bold text-xs text-[#f0d695]">แพ็กเกจ: {pkg.name || 'ไม่มีชื่อ'}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="text-red-400 hover:text-red-500 font-bold text-[10px] bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20"
                              >
                                ลบแพ็กเกจนี้
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-slate-400 mb-1">ชื่อแพ็กเกจ</label>
                                <input
                                  type="text"
                                  value={pkg.name}
                                  onChange={e => handleUpdatePackage(pkg.id, { name: e.target.value })}
                                  className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                  placeholder="ชื่อแพ็กเกจ"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">ราคาเริ่มต้น (บาท)</label>
                                <input
                                  type="text"
                                  value={pkg.price}
                                  onChange={e => handleUpdatePackage(pkg.id, { price: e.target.value })}
                                  className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                  placeholder="3,500"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">ป้ายกำกับพิเศษ (Badge)</label>
                                <input
                                  type="text"
                                  value={pkg.badge || ''}
                                  onChange={e => handleUpdatePackage(pkg.id, { badge: e.target.value })}
                                  className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                  placeholder="เช่น ยอดฮิต, แนะนำ"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-slate-400 mb-1">รายละเอียด / คุณสมบัติแพ็กเกจ (บรรทัดละ 1 ข้อกำหนด)</label>
                                <textarea
                                  rows={4}
                                  value={pkg.features ? pkg.features.join('\n') : ''}
                                  onChange={e => handleUpdatePackage(pkg.id, { features: e.target.value.split('\n') })}
                                  className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px] leading-relaxed font-mono"
                                  placeholder="ช่างภาพ 1 ท่าน&#10;ระยะเวลา 2 ชั่วโมง&#10;ส่งงานด่วน..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add new package form */}
                        <div className="p-4 bg-slate-900/10 border border-slate-800/80 rounded-xl space-y-4">
                          <h5 className="font-bold text-[#d8b76c] text-[11px] uppercase tracking-wider">+ เพิ่มแพ็กเกจบริการใหม่</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-slate-500 mb-1">ชื่อแพ็กเกจ</label>
                              <input
                                type="text"
                                id="newPkgName"
                                className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                placeholder="เช่น พอร์ตเทรตกลุ่ม"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1">ราคาเริ่มต้น (บาท)</label>
                              <input
                                type="text"
                                id="newPkgPrice"
                                className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                placeholder="เช่น 5,000"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 mb-1">ป้ายกำกับ (Badge)</label>
                              <input
                                type="text"
                                id="newPkgBadge"
                                className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px]"
                                placeholder="เช่น มาใหม่"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-slate-500 mb-1">คุณสมบัติแพ็กเกจ (บรรทัดละ 1 ข้อกำหนด)</label>
                              <textarea
                                rows={3}
                                id="newPkgFeatures"
                                className="w-full bg-[#050505] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-[11px] leading-relaxed font-mono"
                                placeholder="ช่างภาพ 1 ท่าน&#10;ระยะเวลา 3 ชั่วโมง"
                              />
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const nameEl = document.getElementById('newPkgName');
                              const priceEl = document.getElementById('newPkgPrice');
                              const badgeEl = document.getElementById('newPkgBadge');
                              const featuresEl = document.getElementById('newPkgFeatures');
                              if (nameEl && nameEl.value.trim()) {
                                handleAddPackage(
                                  nameEl.value.trim(),
                                  priceEl ? priceEl.value.trim() : '',
                                  badgeEl ? badgeEl.value.trim() : '',
                                  featuresEl ? featuresEl.value : ''
                                );
                                nameEl.value = '';
                                if (priceEl) priceEl.value = '';
                                if (badgeEl) badgeEl.value = '';
                                if (featuresEl) featuresEl.value = '';
                              } else {
                                showNotification('กรุณากรอกชื่อแพ็กเกจก่อนเพิ่ม', 'error');
                              }
                            }}
                            className="bg-[#d8b76c]/10 border border-[#d8b76c]/30 text-[#d8b76c] font-bold px-4 py-2 rounded-lg hover:bg-[#d8b76c]/20 transition text-[11px]"
                          >
                            + เพิ่มแพ็กเกจเข้าตาราง
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="oracat-gold-btn text-xs font-bold py-3 px-6 rounded-xl shadow-xl transition-all"
                    >
                      บันทึกการตั้งค่าทั้งหมด
                    </button>
                  </form>

                  {/* Google Calendar Connection Section */}
                  <div className="space-y-4 pt-6 border-t border-[#d8b76c]/20">
                    <h4 className="text-sm font-bold text-[#d8b76c] font-display flex items-center gap-2">
                      <span>📅 การเชื่อมต่อ Google Calendar (ปฏิทินของช่างภาพ)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      เชื่อมต่อปฏิทิน Google ของคุณเพื่อบันทึกคิวงานถ่ายภาพที่ได้รับการอนุมัติแล้ว (Approved) ลงปฏิทินโดยอัตโนมัติ 
                      ช่วยให้คุณเช็คตารางงานผ่านมือถือและอุปกรณ์อื่น ๆ ได้สะดวกและรวดเร็ว
                    </p>
                    
                    <div className="bg-[#050505]/40 border border-[#d8b76c]/10 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-semibold">สถานะการเชื่อมต่อ:</span>
                          {calendarConnected ? (
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              เชื่อมต่อแล้ว
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-bold bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                              ยังไม่ได้เชื่อมต่อ
                            </span>
                          )}
                        </div>
                        
                        {calendarConnected && (
                          <div className="text-xs font-semibold text-slate-300">
                            บัญชี Google: <span className="font-mono text-[#d8b76c]">{calendarEmail}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {calendarConnected ? (
                          <>
                            <button
                              type="button"
                              disabled={calendarLoading}
                              onClick={handleSyncCalendarBookings}
                              className="bg-[#d8b76c] hover:brightness-110 text-[#161006] font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-[#d8b76c]/10"
                            >
                              {calendarLoading ? 'กำลังดำเนินการ...' : '🔄 ซิงก์คิวงานย้อนหลัง'}
                            </button>
                            <button
                              type="button"
                              disabled={calendarLoading}
                              onClick={handleDisconnectCalendar}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 hover:border-red-500/30 px-4 py-2.5 rounded-xl transition text-xs disabled:opacity-50"
                            >
                              {calendarLoading ? 'กำลังดำเนินการ...' : 'ยกเลิกการเชื่อมต่อ'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={calendarLoading}
                            onClick={handleConnectCalendar}
                            className="bg-[#d8b76c] hover:brightness-110 text-[#161006] font-bold px-5 py-2.5 rounded-xl transition text-xs shadow-lg shadow-[#d8b76c]/10 flex items-center gap-2 disabled:opacity-50"
                          >
                            {calendarLoading ? (
                              'กำลังโหลด...'
                            ) : (
                              <>
                                <svg className="w-4 h-4 text-[#d8b76c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2 4a5 5 0 110-10 5 5 0 010 10zM19 9h2m-2 2h-1m-1 0H9" />
                                </svg>
                                <span>เชื่อมต่อกับ Google Calendar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Change Password form */}
                  <div className="space-y-4 pt-6 border-t border-[#d8b76c]/20">
                    <h4 className="text-sm font-bold text-[#d8b76c] font-display">6. เปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ (Change Admin Password)</h4>
                    <p className="text-[11px] text-slate-500">คุณสามารถเปลี่ยนรหัสผ่านเพื่อความปลอดภัยในการเข้าใช้งาน Oracat Manager Dashboard</p>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">รหัสผ่านปัจจุบัน</label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#050505] border border-slate-800 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-slate-400 mb-1">รหัสผ่านใหม่</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#050505] border border-slate-800 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-slate-400 mb-1">ยืนยันรหัสผ่านใหม่</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#050505] border border-slate-800 focus:border-[#d8b76c] rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={changePasswordLoading}
                        className="oracat-gold-btn text-xs font-bold py-2.5 px-6 rounded-xl shadow-xl transition-all disabled:opacity-50"
                      >
                        {changePasswordLoading ? 'กำลังอัปเดตรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* JOB CREATION/EDIT MODAL OVERLAY */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-gradient-to-b from-[#17140e] to-[#070706] border border-[#d8b76c]/30 rounded-2xl shadow-2xl p-6 relative animate-fade-in text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white font-display mb-6">
              {editingJob ? 'แก้ไขคิวงานช่างภาพ' : 'เพิ่มคิวถ่ายภาพใหม่'}
            </h3>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">ชื่อลูกค้า *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.client_name}
                    onChange={e => setJobForm({ ...jobForm, client_name: e.target.value })}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ข้อมูลติดต่อลูกค้า</label>
                  <input
                    type="text"
                    value={jobForm.contact}
                    onChange={e => setJobForm({ ...jobForm, contact: e.target.value })}
                    placeholder="เช่น เบอร์โทรศัพท์ / LINE ID"
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">วันที่ถ่ายภาพ *</label>
                  <input
                    type="date"
                    required
                    value={jobForm.event_date}
                    onChange={e => setJobForm({ ...jobForm, event_date: e.target.value })}
                    onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                    onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ประเภทงานจ้าง *</label>
                  <select
                    value={jobForm.job_type}
                    onChange={e => setJobForm({ ...jobForm, job_type: e.target.value })}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none font-semibold text-slate-300"
                  >
                    {getJobTypesList().map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">เวลาเริ่มถ่าย</label>
                  <input
                    type="time"
                    value={jobForm.start_time}
                    onChange={e => setJobForm({ ...jobForm, start_time: e.target.value })}
                    onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                    onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={jobForm.end_time}
                    onChange={e => setJobForm({ ...jobForm, end_time: e.target.value })}
                    onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                    onFocus={e => { try { e.target.showPicker(); } catch (err) {} }}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ราคางานจ้างทั้งหมด (฿)</label>
                  <input
                    type="number"
                    value={jobForm.price}
                    onChange={e => setJobForm({ ...jobForm, price: Number(e.target.value) })}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">มัดจำแล้ว (฿)</label>
                  <input
                    type="number"
                    value={jobForm.deposit}
                    onChange={e => setJobForm({ ...jobForm, deposit: Number(e.target.value) })}
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">สถานที่จ้างงาน</label>
                  <input
                    type="text"
                    value={jobForm.location}
                    onChange={e => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="เช่น สวนหลวง ร.9 / สตูดิโอบ้านสามเสน"
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                  <textarea
                    rows={2}
                    value={jobForm.note}
                    onChange={e => setJobForm({ ...jobForm, note: e.target.value })}
                    placeholder="คำอธิบายสไตล์ โทนสี หรือเงื่อนไขเพิ่มเติมที่ลูกค้าจดแจ้ง..."
                    className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl px-4 py-2.5 text-slate-200 outline-none"
                  />
                </div>

                {/* Gmail field */}
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">
                    Gmail ลูกค้า
                    <span className="ml-1 text-slate-600 font-normal">(ไม่ระบุได้ — ใช้ส่งอีเมลอัปเดตงาน)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></span>
                    <input
                      type="email"
                      value={jobForm.email || ''}
                      onChange={e => setJobForm({ ...jobForm, email: e.target.value })}
                      placeholder="example@gmail.com"
                      className="w-full bg-[#050505] border border-[#d8b76c]/20 rounded-xl pl-8 pr-4 py-2.5 text-slate-200 outline-none"
                    />
                  </div>
                </div>

                {/* Slip image upload */}
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">
                    สลิปมัดจำ
                    <span className="ml-1 text-slate-600 font-normal">(ไม่ระบุได้)</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="job-slip-upload"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setJobForm(f => ({ ...f, slip_image: ev.target.result }));
                        reader.readAsDataURL(file);
                      }}
                    />
                    <label
                      htmlFor="job-slip-upload"
                      className="flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-[#050505] border border-dashed border-[#d8b76c]/20 hover:border-[#d8b76c]/50 rounded-xl text-slate-500 hover:text-slate-300 transition text-xs"
                    >
                      <span><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></span>
                      <span>{jobForm.slip_image ? 'เปลี่ยนรูปสลิป' : 'อัปโหลดสลิปมัดจำ'}</span>
                    </label>
                    {jobForm.slip_image && (
                      <div className="relative inline-block">
                        <img src={jobForm.slip_image} alt="slip preview" className="h-28 rounded-xl border border-[#d8b76c]/20 object-cover" />
                        <button
                          type="button"
                          onClick={() => setJobForm(f => ({ ...f, slip_image: '' }))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center hover:bg-red-400"
                        >✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 oracat-gold-btn rounded-xl shadow-lg shadow-[#d8b76c]/5 font-bold"
                >
                  {editingJob ? 'บันทึกการแก้ไข' : 'เพิ่มคิวงานจัดเก็บ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyRevenueChart({ revenueData }) {
  const maxRevenue = Math.max(...revenueData, 20000); // Scale guide min 20,000
  const monthsTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  return (
    <div className="w-full h-64 flex flex-col justify-between">
      <div className="flex-grow flex items-end justify-between gap-1.5 px-1 pt-4">
        {revenueData.map((val, idx) => {
          const heightPercent = (val / maxRevenue) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 bg-[#121212] border border-[#d8b76c]/40 text-[#d8b76c] text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 font-bold font-mono">
                ฿ {val.toLocaleString()}
              </div>
              
              {/* Bar */}
              <div 
                className="w-full bg-gradient-to-t from-[#9e7937]/50 to-[#d8b76c] rounded-t transition-all duration-700 ease-out cursor-pointer hover:brightness-110 shadow"
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
              ></div>
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between border-t border-[#d8b76c]/10 pt-2 px-1">
        {monthsTH.map((m, idx) => (
          <div key={idx} className="flex-1 text-[9px] text-slate-500 text-center font-bold">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

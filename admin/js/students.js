import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let db;

const studentsGrid = document.getElementById('students-grid');
const searchInput = document.getElementById('student-search');
const tabsContainer = document.getElementById('admin-tabs');

// Count elements
const totalStudentsEl = document.getElementById('total-students');
const totalMalesEl = document.getElementById('total-males');
const totalFemalesEl = document.getElementById('total-females');

let allStudents = [];
let allAdults = [];
let activeDivision = 'صغار';
let activeGender = 'ذكر';
let selectedTeam = null;

/**
 * دالة مساعدة لتنسيق رقم الهاتف وضمان إظهار الصفر في البداية
 */
function formatPhone(phone) {
  if (phone === undefined || phone === null) return '';
  let str = String(phone).trim();
  if (str.length === 9 && /^[567]/.test(str)) {
    str = '0' + str;
  }
  return str;
}

/**
 * تهيئة وإدارة لوحة الطلاب
 */
async function init() {
  if (!window.DB || !window.DB.db) {
    console.warn("[Students] DB not ready yet, retrying init in 50ms...");
    setTimeout(init, 50);
    return;
  }
  db = window.DB.db;

  console.log("[Students] Loading registration lists dynamically in real-time...");
  renderSkeletons();
  initTeamsPanel();
  
  // Wire a live Firestore onSnapshot listener for children
  onSnapshot(collection(db, "students"), (snapshot) => {
    const rawStudents = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      rawStudents.push({
        docId: docSnap.id,
        id: data.id || docSnap.id,
        name: data["سليماني ياني :اسم الطالب كامل"] || data.name || "",
        gender: (data["الجنس"] === "أنثى" || data.gender === "أنثى") ? "أنثى" : "ذكر",
        age: Number(data["السن"]) || Number(data.age) || 0,
        ageGroup: data["الفئة العمرية"] || data.ageGroup || "",
        quranLevel: data["المستوى القرآني"] || data.quranLevel || "",
        studyLevel: data["المستوى الدراسي"] || data.studyLevel || "",
        parentName: data["سليماني سمير (التصوير: نعم) : اسم ولي الأمر"] || data.parentName || "",
        phone: data["رقم الهاتف"] || data.phone || "",
        backupPhone: data["رقم احتياطي"] || data.backupPhone || "",
        regDate: data["تاريخ التسجيل"] || data.regDate || "",
        status: data["حالة الطلب"] || data.status || "قيد المراجعة",
        cumulativeStars: Number(data["النجوم التراكمية"]) || Number(data.cumulativeStars) || 0,
        level: data["المستوى"] || data.level || "بذرة المسجد",
        initialStars: Number(data["النجوم الابتدائية"]) || Number(data.initialStars) || 0,
        initialSurah: data["آخر سورة"] || data.initialSurah || "",
        initialToVerse: data["آخر آية"] || data.initialToVerse || "",
        initialAttendanceRate: Number(data["نسبة الحضور التقريبية"]) || Number(data.initialAttendanceRate) || 0,
        teamName: data.teamName || ""
      });
    });

    allStudents = rawStudents
      .filter(s => s && s.id && s.name && String(s.name).trim() !== '')
      .map(s => ({
        ...s,
        name: s.name ? String(s.name) : '',
        parentName: s.parentName ? String(s.parentName) : '',
        phone: formatPhone(s.phone),
        backupPhone: formatPhone(s.backupPhone)
      }));

    console.log("[Students] Live onSnapshot updated. Students count:", allStudents.length);
    renderStats(allStudents);
    filterAndRender();
  }, (err) => {
    console.error("[Students] Live onSnapshot listener failed:", err);
  });

  // Wire a live Firestore onSnapshot listener for adult participants
  onSnapshot(collection(db, "adult_participants"), (snapshot) => {
    const rawAdults = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      rawAdults.push({
        docId: docSnap.id,
        id: data.id || docSnap.id,
        name: data.name || "",
        gender: data.section === "نساء" ? "أنثى" : "ذكر",
        section: data.section || "رجال",
        phone: formatPhone(data.phone),
        age: Number(data.age) || 0,
        quranLevel: data.quranLevel || "",
        lastSurah: data.lastSurah || "",
        lastVerse: Number(data.lastVerse) || 0,
        status: data.status || "قيد المراجعة",
        target: Number(data.target) || 30,
        regDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString("ar-DZ") : "",
        teamName: data.teamName || ""
      });
    });

    allAdults = rawAdults.filter(a => a && a.id && a.name && String(a.name).trim() !== '');
    console.log("[Students] Live adult_participants updated. Adults count:", allAdults.length);
    
    // Refresh general stats
    renderStats(allStudents);
    filterAndRender();
  }, (err) => {
    console.error("[Students] Live adult_participants listener failed:", err);
  });
  
  setupTabs();
}

function renderSkeletons() {
  if (!studentsGrid) return;
  studentsGrid.innerHTML = Array(4).fill(0).map(() => `
    <div class="member-list-item skeleton-row" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; background: rgba(255,255,255,0.5); border-radius: 12px; height: 75px;">
      <div style="flex: 2; text-align: right;">
        <div class="spinner-circle" style="width: 20px; height: 20px; border-width: 2px;"></div>
      </div>
    </div>
  `).join('');
}

/**
 * إعداد أزرار التبويب (قيد المراجعة | مقبول | مرفوض)
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.div-tab-btn, .gender-tab-btn');
  tabButtons.forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      
      const targetContainer = this.parentElement;
      targetContainer.querySelectorAll('.div-tab-btn, .gender-tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.classList.contains('div-tab-btn')) {
          b.style.borderBottomColor = 'transparent';
          b.style.color = 'var(--text-muted)';
          b.style.fontWeight = '700';
        } else {
          b.style.background = 'none';
          b.style.borderColor = 'transparent';
          b.style.color = 'var(--text-muted)';
          b.style.fontWeight = '700';
        }
      });
      
      this.classList.add('active');
      if (this.classList.contains('div-tab-btn')) {
        this.style.borderBottomColor = 'var(--gold)';
        this.style.color = 'var(--green-dark)';
        this.style.fontWeight = '800';
        activeDivision = this.dataset.division;
        
        const teamsSection = document.getElementById("teams-management-section");
        if (teamsSection) {
          teamsSection.style.display = (activeDivision === 'صغار') ? 'block' : 'none';
        }
        renderStats(allStudents);
      } else {
        this.style.background = 'rgba(13, 92, 70, 0.05)';
        this.style.borderColor = 'rgba(13, 92, 70, 0.15)';
        this.style.color = 'var(--green-dark)';
        this.style.fontWeight = '800';
        activeGender = this.dataset.gender;
      }
      
      // Instantly sync the local memory filter scope and re-render the underlying data arrays
      if (typeof window.filterAndRender === 'function') {
        window.filterAndRender();
      } else {
        filterAndRender();
      }
    };
  });
}

/**
 * حساب الإحصائيات العامة للتسجيلات
 */
function renderStats(students) {
  let total = students.length;
  let males = 0;
  let females = 0;

  students.forEach(s => {
    const gender = s.gender || s["الجنس"] || 'ذكر';
    if (gender === 'ذكر') males++;
    else if (gender === 'أنثى') females++;
  });

  // Count adult stats
  let adultMales = 0;
  let adultFemales = 0;
  allAdults.forEach(a => {
    if (a.section === "رجال") adultMales++;
    else if (a.section === "نساء") adultFemales++;
  });

  // تحديث الإحصائيات في الصفحة الرئيسية
  if (totalStudentsEl) totalStudentsEl.textContent = total + allAdults.length;
  if (totalMalesEl) totalMalesEl.textContent = males + adultMales;
  if (totalFemalesEl) totalFemalesEl.textContent = females + adultFemales;

  // تحديث كشاف الأقسام
  const divCountChildren = document.getElementById('div-count-children');
  const divCountAdults = document.getElementById('div-count-adults');
  if (divCountChildren) divCountChildren.textContent = total;
  if (divCountAdults) divCountAdults.textContent = allAdults.length;

  // تحديث كشاف الأجناس الفرعي بناء على القسم النشط
  const genderCountMale = document.getElementById('gender-count-male');
  const genderCountFemale = document.getElementById('gender-count-female');
  if (activeDivision === 'صغار') {
    if (genderCountMale) genderCountMale.textContent = males;
    if (genderCountFemale) genderCountFemale.textContent = females;
  } else {
    if (genderCountMale) genderCountMale.textContent = adultMales;
    if (genderCountFemale) genderCountFemale.textContent = adultFemales;
  }
}

/**
 * فلترة وعرض الطلاب
 */
window.filterAndRender = filterAndRender;
function filterAndRender() {
  if (!studentsGrid) return;
  const term = searchInput.value.toLowerCase().trim();

  const colHdrName = document.getElementById("col-hdr-name");
  const colHdrAge = document.getElementById("col-hdr-age");
  const colHdrParent = document.getElementById("col-hdr-parent");
  const colHdrPhone = document.getElementById("col-hdr-phone");
  const colHdrStatus = document.getElementById("col-hdr-status");

  if (activeDivision === 'كبار') {
    if (colHdrName) colHdrName.textContent = "اسم المشارك";
    if (colHdrAge) colHdrAge.textContent = "القسم";
    if (colHdrParent) colHdrParent.textContent = "المستوى القرآني";
    if (colHdrPhone) colHdrPhone.textContent = "رقم الهاتف";
    if (colHdrStatus) colHdrStatus.textContent = "حالة الطلب";

    const section = activeGender === 'ذكر' ? 'رجال' : 'نساء';
    const filtered = allAdults.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(term);
      const phoneMatch = a.phone && a.phone.includes(term);
      const levelMatch = a.quranLevel && a.quranLevel.toLowerCase().includes(term);
      return (nameMatch || phoneMatch || levelMatch) && (a.section === section);
    });
    renderStudents(filtered);
  } else {
    if (colHdrName) colHdrName.textContent = "اسم الطالب الكامل";
    if (colHdrAge) colHdrAge.textContent = "السن";
    if (colHdrParent) colHdrParent.textContent = "اسم ولي الأمر";
    if (colHdrPhone) colHdrPhone.textContent = "رقم الهاتف";
    if (colHdrStatus) colHdrStatus.textContent = "حالة الطلب";

    const gender = activeGender === 'ذكر' ? 'ذكر' : 'أنثى';
    const filtered = allStudents.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(term);
      const parentMatch = s.parentName && s.parentName.toLowerCase().includes(term);
      const phoneMatch = s.phone && s.phone.includes(term);
      const matchesTerm = nameMatch || parentMatch || phoneMatch;
      
      const g = s.gender || s["الجنس"] || 'ذكر';
      return matchesTerm && (g === gender);
    });
    renderStudents(filtered);
  }

  if (selectedTeam) {
    renderTeamMembers(selectedTeam);
  }
}

function renderStudents(studentsList) {
  if (studentsList.length === 0) {
    let emptyMsg = (activeDivision === 'كبار') ? 'قائمة طلبات الكبار فارغة حالياً' : (activeGender === 'ذكر' ? 'قائمة الذكور فارغة حالياً' : 'قائمة الإناث فارغة حالياً');

    studentsGrid.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <i class="ph-light ph-users" style="font-size: 3rem; color: var(--gold); display: block; margin-bottom: 1rem;"></i>
        <h3>${emptyMsg}</h3>
      </div>
    `;
    return;
  }

  // Reset header checkbox
  const selectAllCb = document.getElementById("select-all-students-cb");
  if (selectAllCb) selectAllCb.checked = false;

  if (activeDivision === 'كبار') {
    studentsGrid.innerHTML = studentsList.map(a => {
      let statusClass = 'badge-pending';
      if (a.status === 'مقبول') statusClass = 'badge-accepted';
      else if (a.status === 'مرفوض') statusClass = 'badge-rejected';

      const teamBadge = a.teamName ? `<span style="background: rgba(200, 161, 90, 0.12); color: var(--gold); border: 1px solid rgba(200, 161, 90, 0.25); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800; margin-right: 0.5rem;"><i class="ph ph-users-three" style="vertical-align: middle;"></i> ${a.teamName}</span>` : '';

      return `
        <div class="member-list-item view-profile-btn" data-id="${a.docId}" style="display: grid; grid-template-columns: 2fr 1fr 2fr 1.5fr 1fr; gap: 1rem; align-items: center; padding: 0.5rem 1rem;">
          <div class="student-info-group" style="display: flex; align-items: center; flex-wrap: wrap;">
            <div class="student-name-col" style="font-weight: 700;">${a.name}${teamBadge}</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${a.section || 'كبار'}</div>
          <div class="student-parent-col" style="font-size: 0.85rem; font-weight: 700; color: var(--green);">${a.quranLevel || '-'}</div>
          <div class="student-phone-col" dir="ltr" style="text-align: right;">${a.phone || '-'}</div>
          <div class="student-status-col">
            <span class="badge ${statusClass}">${a.status || 'قيد المراجعة'}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    studentsGrid.innerHTML = studentsList.map(s => {
      let statusClass = 'badge-pending';
      if (s.status === 'مقبول') statusClass = 'badge-accepted';
      else if (s.status === 'مرفوض') statusClass = 'badge-rejected';

      const teamBadge = s.teamName ? `<span style="background: rgba(200, 161, 90, 0.12); color: var(--gold); border: 1px solid rgba(200, 161, 90, 0.25); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800; margin-right: 0.5rem;"><i class="ph ph-users-three" style="vertical-align: middle;"></i> ${s.teamName}</span>` : '';

      return `
        <div class="member-list-item view-profile-btn" data-id="${s.docId}" style="display: grid; grid-template-columns: 2fr 1fr 2fr 1.5fr 1fr; gap: 1rem; align-items: center; padding: 0.5rem 1rem;">
          <div class="student-info-group" style="display: flex; align-items: center; flex-wrap: wrap;">
            <div class="student-name-col" style="font-weight: 700;">${s.name}${teamBadge}</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${s.age ? s.age + ' سنة' : '-'}</div>
          <div class="student-parent-col">${s.parentName || '-'}</div>
          <div class="student-phone-col" dir="ltr" style="text-align: right;">${s.phone || '-'}</div>
          <div class="student-status-col">
            <span class="badge ${statusClass}">${s.status || 'قيد المراجعة'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.onclick = () => {
      try {
        const id = btn.dataset.id;
        console.log("[Students] Clicked profile row. id:", id, "activeDivision:", activeDivision);
        if (activeDivision === 'كبار') {
          const adult = allAdults.find(a => a.docId === id || a.id === id);
          console.log("[Students] Found adult profile:", adult);
          if (adult) {
            openAdultProfileModal(adult);
          } else {
            console.warn("[Students] No adult participant matches id:", id);
            alert("لم يتم العثور على بيانات هذا المشارك في القائمة المحلية.");
          }
        } else {
          const student = allStudents.find(s => s.docId === id || s.id === id);
          console.log("[Students] Found student profile:", student);
          if (student) {
            openProfileModal(student);
          } else {
            console.warn("[Students] No child student matches id:", id);
            alert("لم يتم العثور على بيانات هذا الطالب في القائمة المحلية.");
          }
        }
      } catch (err) {
        console.error("[Students] Error in view-profile row click:", err);
        alert("حدث خطأ أثناء فتح الملف الشخصي: " + err.message);
      }
    };
  });
}

/**
 * فتح نافذة تفاصيل الطالب (KYC Modal)
 */
function openProfileModal(student) {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  
  // Toggle visibilities for children mode
  const childFieldsGroup = document.getElementById('pm-child-fields-group');
  const adultFieldsGroup = document.getElementById('pm-adult-fields-group');
  const backupPhoneRow = document.getElementById('pm-child-backup-phone-row');
  const rewardsBlock = document.getElementById('pm-child-rewards-block');
  const teamRow = document.getElementById('pm-team-row');
  
  if (childFieldsGroup) childFieldsGroup.style.display = 'block';
  if (adultFieldsGroup) adultFieldsGroup.style.display = 'none';
  if (backupPhoneRow) backupPhoneRow.style.display = 'block';
  if (rewardsBlock) rewardsBlock.style.display = 'block';
  if (teamRow) teamRow.style.display = 'flex';

  document.getElementById('pm-name').textContent = student.name;
  document.getElementById('pm-name-val').textContent = student.name;
  document.getElementById('pm-id').textContent = student.id;
  document.getElementById('pm-gender').textContent = student.gender || student["الجنس"] || 'غير حدد';
  const teamEl = document.getElementById('pm-team-name');
  if (teamEl) teamEl.textContent = student.teamName || 'غير معين لفريق';
  document.getElementById('pm-age-group').textContent = student.ageGroup || 'غير محدد';
  document.getElementById('pm-age').textContent = student.age ? `${student.age} سنة` : 'غير محدد';
  document.getElementById('pm-quran-level').textContent = student.quranLevel || 'غير محدد';
  document.getElementById('pm-study-level').textContent = student.studyLevel || 'غير محدد';
  document.getElementById('pm-parent-name').textContent = student.parentName || 'غير محدد';
  document.getElementById('pm-phone').textContent = student.phone || 'غير محدد';
  document.getElementById('pm-backup-phone').textContent = student.backupPhone || 'غير محدد';
  document.getElementById('pm-reg-date').textContent = student.regDate || 'غير محدد';
  
  // ملء بيانات التميز والبيانات الابتدائية للطلاب
  document.getElementById('pm-cumulative-stars').textContent = `${student.cumulativeStars || 0} نجمة (الابتدائية: ${student.initialStars || 0})`;
  document.getElementById('pm-level').textContent = student.level || 'برونزي';
  
  const lastSurahVal = student.initialSurah ? `سورة ${student.initialSurah} ${student.initialToVerse ? `(الآية ${student.initialToVerse})` : ''}` : 'غير محدد';
  document.getElementById('pm-last-surah').textContent = lastSurahVal;
  document.getElementById('pm-total-ayahs').textContent = `الآيات السابقة: ${student.initialToVerse || 0} آية`;
  document.getElementById('pm-attendance-rate').textContent = `${student.initialAttendanceRate || 0}%`;
  
  const statusSpan = document.getElementById('pm-status');
  statusSpan.textContent = student.status || 'قيد المراجعة';
  statusSpan.className = 'badge';
  if (student.status === 'مقبول') statusSpan.classList.add('badge-accepted');
  else if (student.status === 'مرفوض') statusSpan.classList.add('badge-rejected');
  else statusSpan.classList.add('badge-pending');

  modal.classList.add('active');

  // Close events
  document.getElementById('close-profile-btn').onclick = () => {
    modal.classList.remove('active');
  };

  // Action Buttons
  const deleteBtn = document.getElementById('pm-delete-btn');
  const editBtn = document.getElementById('pm-edit-btn');
  const acceptBtn = document.getElementById('pm-accept-btn');
  const rejectBtn = document.getElementById('pm-reject-btn');

  // Restore button labels and visibilities
  deleteBtn.textContent = 'حذف نهائياً';
  deleteBtn.disabled = false;
  editBtn.style.display = 'inline-flex';
  acceptBtn.textContent = 'تأكيد التسجيل';
  acceptBtn.disabled = false;
  rejectBtn.textContent = 'رفض الطلب';
  rejectBtn.disabled = false;

  const currentStatus = student.status || 'قيد المراجعة';
  if (currentStatus === 'مقبول') {
    acceptBtn.style.display = 'none';
    rejectBtn.style.display = 'inline-flex';
  } else if (currentStatus === 'مرفوض') {
    acceptBtn.style.display = 'inline-flex';
    rejectBtn.style.display = 'none';
  } else {
    acceptBtn.style.display = 'inline-flex';
    rejectBtn.style.display = 'inline-flex';
  }

  // تعديل البيانات
  editBtn.onclick = () => {
    modal.classList.remove('active');
    openEditModal(student);
  };

  // حذف الطالب
  deleteBtn.onclick = async () => {
    if (confirm(`هل أنت متأكد من حذف طلب تسجيل الطالب ${student.name} نهائياً؟`)) {
      try {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'جاري الحذف...';
        
        const success = await window.DB.deleteStudent(student.docId);
        if (success) {
          modal.classList.remove('active');
          alert('✅ تم حذف الطالب بنجاح');
          init();
        } else {
          alert('❌ فشل الحذف، حاول مرة أخرى');
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'حذف نهائياً';
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء الحذف، حاول مرة أخرى');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'حذف نهائياً';
      }
    }
  };

  // تأكيد التسجيل وقبول الطالب
  acceptBtn.onclick = async () => {
    try {
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'جاري التأكيد...';
      
      const updated = { ...student, status: 'مقبول' };
      const success = await window.DB.updateStudent(student.docId, updated);
      if (success) {
        modal.classList.remove('active');
        alert('✅ تم تأكيد تسجيل الطالب بنجاح وبات مقيداً في القائمة');
        init();
      } else {
        alert('❌ فشل تأكيد تسجيل الطالب');
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'تأكيد التسجيل';
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء تأكيد تسجيل الطالب');
      acceptBtn.disabled = false;
      acceptBtn.textContent = 'تأكيد التسجيل';
    }
  };

  // رفض الطلب
  rejectBtn.onclick = async () => {
    if (confirm(`هل تريد رفض طلب تسجيل الطالب ${student.name}؟`)) {
      try {
        rejectBtn.disabled = true;
        rejectBtn.textContent = 'جاري الرفض...';
        
        const updated = { ...student, status: 'مرفوض' };
        const success = await window.DB.updateStudent(student.docId, updated);
        if (success) {
          modal.classList.remove('active');
          alert('✅ تم رفض طلب الطالب بنجاح');
          init();
        } else {
          alert('❌ فشل تحديث حالة الرفض');
          rejectBtn.disabled = false;
          rejectBtn.textContent = 'رفض الطلب';
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء رفض الطلب');
        rejectBtn.disabled = false;
        rejectBtn.textContent = 'رفض الطلب';
      }
    }
  };
}

/**
 * فتح نافذة تفاصيل المشارك الكبار
 */
function openAdultProfileModal(adult) {
  const modal = document.getElementById('profile-modal');
  if (!modal) {
    console.error("[Students] Element #profile-modal not found!");
    alert("خطأ: لم يتم العثور على نافذة الملف الشخصي في الصفحة.");
    return;
  }

  try {
    // Toggle visibilities for adult mode
    const childFieldsGroup = document.getElementById('pm-child-fields-group');
    const adultFieldsGroup = document.getElementById('pm-adult-fields-group');
    const backupPhoneRow = document.getElementById('pm-child-backup-phone-row');
    const rewardsBlock = document.getElementById('pm-child-rewards-block');
    const teamRow = document.getElementById('pm-team-row');
    
    if (childFieldsGroup) childFieldsGroup.style.display = 'none';
    if (adultFieldsGroup) adultFieldsGroup.style.display = 'block';
    if (backupPhoneRow) backupPhoneRow.style.display = 'none';
    if (rewardsBlock) rewardsBlock.style.display = 'none';
    if (teamRow) teamRow.style.display = 'none';

    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
      else console.warn(`[Students] Element #${id} not found in profile modal!`);
    };

    setElText('pm-name', adult.name);
    setElText('pm-name-val', adult.name);
    setElText('pm-id', adult.id);
    setElText('pm-gender', "قسم الكبار (" + adult.section + ")");
    
    const teamEl = document.getElementById('pm-team-name');
    if (teamEl) teamEl.textContent = adult.teamName || 'غير معين لفريق';
    
    setElText('pm-phone', adult.phone || 'غير محدد');
    setElText('pm-reg-date', adult.regDate || 'غير محدد');
    setElText('pm-adult-quranLevel', adult.quranLevel || 'غير محدد');
    setElText('pm-adult-age', adult.age ? adult.age + ' سنة' : 'غير محدد');
    setElText('pm-adult-prior', adult.lastSurah ? `سورة ${adult.lastSurah} (آية ${adult.lastVerse || 1})` : 'لا يوجد حفظ سابق');

    const statusSpan = document.getElementById('pm-status');
    if (statusSpan) {
      statusSpan.textContent = adult.status || 'قيد المراجعة';
      statusSpan.className = 'badge';
      if (adult.status === 'مقبول') statusSpan.classList.add('badge-accepted');
      else if (adult.status === 'مرفوض') statusSpan.classList.add('badge-rejected');
      else statusSpan.classList.add('badge-pending');
    } else {
      console.warn("[Students] Element #pm-status not found in profile modal!");
    }

    modal.classList.add('active');
  } catch (err) {
    console.error("[Students] Error in openAdultProfileModal:", err);
    alert("حدث خطأ أثناء تحميل بيانات المشارك: " + err.message);
  }

  // Close events
  document.getElementById('close-profile-btn').onclick = () => {
    modal.classList.remove('active');
  };

  // Action Buttons
  const deleteBtn = document.getElementById('pm-delete-btn');
  const editBtn = document.getElementById('pm-edit-btn');
  const acceptBtn = document.getElementById('pm-accept-btn');
  const rejectBtn = document.getElementById('pm-reject-btn');

  // Set default button labels and visibilities
  deleteBtn.textContent = 'حذف نهائياً';
  deleteBtn.disabled = false;
  editBtn.style.display = 'none'; // Adults cannot be edited this way
  acceptBtn.textContent = 'تأكيد التسجيل';
  acceptBtn.disabled = false;
  rejectBtn.textContent = 'رفض الطلب';
  rejectBtn.disabled = false;

  const currentStatus = adult.status || 'قيد المراجعة';
  if (currentStatus === 'مقبول') {
    acceptBtn.style.display = 'none';
    rejectBtn.style.display = 'inline-flex';
  } else if (currentStatus === 'مرفوض') {
    acceptBtn.style.display = 'inline-flex';
    rejectBtn.style.display = 'none';
  } else {
    acceptBtn.style.display = 'inline-flex';
    rejectBtn.style.display = 'inline-flex';
  }

  // حذف المشارك
  deleteBtn.onclick = async () => {
    if (confirm(`هل أنت متأكد من حذف حساب المشارك ${adult.name} نهائياً مع كافة سجلاته؟`)) {
      try {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'جاري الحذف...';
        
        const success = await window.DB.deleteAdultParticipant(adult.id);
        if (success) {
          modal.classList.remove('active');
          alert('✅ تم حذف حساب المشارك بنجاح');
        } else {
          alert('❌ فشل الحذف، حاول مرة أخرى');
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'حذف نهائياً';
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء الحذف');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'حذف نهائياً';
      }
    }
  };

  // تأكيد التسجيل
  acceptBtn.onclick = async () => {
    try {
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'جاري التأكيد...';
      
      const success = await window.DB.updateAdultParticipantStatus(adult.id, 'مقبول');
      if (success) {
        modal.classList.remove('active');
        alert('✅ تم تأكيد انضمام المشارك لحلقات الكبار بنجاح');
      } else {
        alert('❌ فشل تأكيد التسجيل');
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'تأكيد التسجيل';
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء تأكيد تسجيل المشارك');
      acceptBtn.disabled = false;
      acceptBtn.textContent = 'تأكيد التسجيل';
    }
  };

  // رفض الطلب
  rejectBtn.onclick = async () => {
    if (confirm(`هل تريد رفض طلب تسجيل المشارك ${adult.name}؟`)) {
      try {
        rejectBtn.disabled = true;
        rejectBtn.textContent = 'جاري الرفض...';
        
        const success = await window.DB.updateAdultParticipantStatus(adult.id, 'مرفوض');
        if (success) {
          modal.classList.remove('active');
          alert('✅ تم رفض طلب تسجيل المشارك بنجاح');
        } else {
          alert('❌ فشل تحديث حالة الرفض');
          rejectBtn.disabled = false;
          rejectBtn.textContent = 'رفض الطلب';
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء رفض الطلب');
        rejectBtn.disabled = false;
        rejectBtn.textContent = 'رفض الطلب';
      }
    }
  };
}

/**
 * فتح نافذة تعديل بيانات الطالب
 */
function openEditModal(student) {
  const modal = document.getElementById('edit-modal');
  const form = document.getElementById('edit-student-form');
  if (!modal || !form) return;

  // تعبئة البيانات
  document.getElementById('edit-name').value = student.name;
  document.getElementById('edit-gender').value = student.gender || student["الجنس"] || 'ذكر';
  document.getElementById('edit-age-group').value = student.ageGroup || 'أشبال (6 - 11 سنة)';
  document.getElementById('edit-age').value = student.age || '';
  document.getElementById('edit-quran-level').value = student.quranLevel || 'مبتدئ (لم يبدأ الحفظ بعد)';
  document.getElementById('edit-study-level').value = student.studyLevel || '';
  document.getElementById('edit-parent-name').value = student.parentName || '';
  document.getElementById('edit-phone').value = student.phone || '';
  document.getElementById('edit-backup-phone').value = student.backupPhone || '';
  document.getElementById('edit-status').value = student.status || 'قيد المراجعة';

  // تعبئة البيانات الابتدائية التراكمية
  document.getElementById('edit-initial-stars').value = student.initialStars || 0;
  document.getElementById('edit-initial-level').value = student.level || 'برونزي';
  document.getElementById('edit-initial-surah').value = student.initialSurah || '';
  document.getElementById('edit-initial-to-verse').value = student.initialToVerse || '';
  document.getElementById('edit-initial-attendance').value = student.initialAttendanceRate || 0;

  modal.classList.add('active');

  document.getElementById('close-edit-btn').onclick = () => {
    modal.classList.remove('active');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري حفظ التغييرات...';

      const updatedData = {
        name: document.getElementById('edit-name').value.trim(),
        gender: document.getElementById('edit-gender').value,
        ageGroup: document.getElementById('edit-age-group').value,
        age: parseInt(document.getElementById('edit-age').value) || 0,
        quranLevel: document.getElementById('edit-quran-level').value,
        studyLevel: document.getElementById('edit-study-level').value.trim(),
        parentName: document.getElementById('edit-parent-name').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        backupPhone: document.getElementById('edit-backup-phone').value.trim(),
        status: document.getElementById('edit-status').value,
        regDate: student.regDate,
        
        // البيانات الابتدائية التراكمية المحررة
        initialStars: parseInt(document.getElementById('edit-initial-stars').value) || 0,
        level: document.getElementById('edit-initial-level').value,
        initialSurah: document.getElementById('edit-initial-surah').value.trim(),
        initialToVerse: parseInt(document.getElementById('edit-initial-to-verse').value) || '',
        initialAttendanceRate: parseInt(document.getElementById('edit-initial-attendance').value) || 0
      };

      const success = await window.DB.updateStudent(student.docId, updatedData);
      if (success) {
        modal.classList.remove('active');
        alert('✅ تم تحديث بيانات الطالب بنجاح');
        init();
      } else {
        alert('❌ فشل التحديث، يرجى المحاولة لاحقاً');
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ التغييرات';
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء تحديث بيانات الطالب');
      submitBtn.disabled = false;
      submitBtn.textContent = 'حفظ التغييرات';
    }
  };
}

// --- Add Student Modal Triggers & Form Submission ---
const addBtn = document.getElementById('add-student-btn');
const addModal = document.getElementById('add-modal');
const closeAddBtn = document.getElementById('close-add-btn');
const addForm = document.getElementById('add-student-form');

// عناصر التحكم بالصنف (صغير / كبير)
const addCategorySelect = document.getElementById('add-category');
const addChildFieldsWrapper = document.getElementById('add-child-fields-wrapper');
const addAdultPriorWrapper = document.getElementById('add-adult-prior-wrapper');
const addBackupPhoneWrapper = document.getElementById('add-backup-phone-wrapper');

// عناصر التحكم بنوع الطالب الصغير (جديد / قديم)
const addStudentTypeSelect = document.getElementById('add-student-type');
const oldStudentFields = document.getElementById('old-student-fields');
const addInitialStarsInput = document.getElementById('add-initial-stars');
const addInitialLevelSelect = document.getElementById('add-initial-level');
const addInitialSurahInput = document.getElementById('add-initial-surah');
const addInitialToVerseInput = document.getElementById('add-initial-to-verse');
const addInitialAttendanceInput = document.getElementById('add-initial-attendance');

if (addCategorySelect) {
  addCategorySelect.addEventListener('change', () => {
    const isAdult = addCategorySelect.value === 'كبير';
    if (isAdult) {
      if (addChildFieldsWrapper) addChildFieldsWrapper.style.display = 'none';
      if (addAdultPriorWrapper) addAdultPriorWrapper.style.display = 'block';
      if (addBackupPhoneWrapper) addBackupPhoneWrapper.style.display = 'none';
      
      // إزالة المتطلبات للحقول الخاصة بالصغار
      const inputs = addChildFieldsWrapper.querySelectorAll('input, select');
      inputs.forEach(el => el.required = false);
    } else {
      if (addChildFieldsWrapper) addChildFieldsWrapper.style.display = 'block';
      if (addAdultPriorWrapper) addAdultPriorWrapper.style.display = 'none';
      if (addBackupPhoneWrapper) addBackupPhoneWrapper.style.display = 'block';
      
      // استعادة المتطلبات
      const ageGroup = document.getElementById('add-age-group');
      if (ageGroup) ageGroup.required = true;
      const studyLevel = document.getElementById('add-study-level');
      if (studyLevel) studyLevel.required = true;
      const parentName = document.getElementById('add-parent-name');
      if (parentName) parentName.required = true;
    }
  });
}

if (addStudentTypeSelect && oldStudentFields) {
  addStudentTypeSelect.addEventListener('change', () => {
    if (addStudentTypeSelect.value === 'old') {
      oldStudentFields.style.display = 'block';
    } else {
      oldStudentFields.style.display = 'none';
      if (addInitialStarsInput) addInitialStarsInput.value = 0;
      if (addInitialLevelSelect) addInitialLevelSelect.value = 'برونزي';
      if (addInitialSurahInput) addInitialSurahInput.value = '';
      if (addInitialToVerseInput) addInitialToVerseInput.value = '';
      if (addInitialAttendanceInput) addInitialAttendanceInput.value = '';
    }
  });
}

// الاحتساب التلقائي للرتبة بناء على النجوم التراكمية
if (addInitialStarsInput && addInitialLevelSelect) {
  addInitialStarsInput.addEventListener('input', () => {
    const stars = parseInt(addInitialStarsInput.value) || 0;
    let level = 'بذرة المسجد';
    if (stars >= 151) level = 'فارس المسجد';
    else if (stars >= 91)  level = 'نجم المسجد';
    else if (stars >= 61)  level = 'شجرة المسجد';
    else if (stars >= 31)  level = 'نبتة المسجد';
    addInitialLevelSelect.value = level;
  });
}

if (addBtn && addModal) {
  addBtn.onclick = () => {
    addModal.classList.add('active');
  };
}

const resetAddForm = () => {
  if (addModal) addModal.classList.remove('active');
  if (addForm) addForm.reset();
  if (oldStudentFields) oldStudentFields.style.display = 'none';
  if (addChildFieldsWrapper) addChildFieldsWrapper.style.display = 'block';
  if (addAdultPriorWrapper) addAdultPriorWrapper.style.display = 'none';
  if (addBackupPhoneWrapper) addBackupPhoneWrapper.style.display = 'block';
  
  // استعادة المتطلبات الافتراضية
  const ageGroup = document.getElementById('add-age-group');
  if (ageGroup) ageGroup.required = true;
  const studyLevel = document.getElementById('add-study-level');
  if (studyLevel) studyLevel.required = true;
  const parentName = document.getElementById('add-parent-name');
  if (parentName) parentName.required = true;
};

if (closeAddBtn) {
  closeAddBtn.onclick = resetAddForm;
}

if (addForm) {
  addForm.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = addForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري إضافة الطالب...';

    const category = addCategorySelect ? addCategorySelect.value : 'صغير';

    if (category === 'كبير') {
      const adultData = {
        name: document.getElementById('add-name').value.trim(),
        gender: document.getElementById('add-gender').value,
        phone: document.getElementById('add-phone').value.trim(),
        age: parseInt(document.getElementById('add-age').value) || 0,
        quranLevel: document.getElementById('add-quran-level').value,
        lastSurah: document.getElementById('add-adult-last-surah').value.trim(),
        lastVerse: parseInt(document.getElementById('add-adult-last-verse').value) || 0
      };

      try {
        const res = await window.DB.registerAdultParticipant(adultData);
        if (res) {
          await window.DB.updateAdultParticipantStatus(res, "مقبول");
          resetAddForm();
          alert(`✅ تم إضافة المشارك الكبير بنجاح!\nالمعرف المولد: ${res}`);
          init();
        } else {
          alert('❌ فشل إضافة المشارك الكبير');
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء إضافة البيانات');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إضافة وتأكيد القبول';
      }
    } else {
      const isOld = addStudentTypeSelect ? (addStudentTypeSelect.value === 'old') : false;
      const initialStars = isOld && addInitialStarsInput ? (parseInt(addInitialStarsInput.value) || 0) : 0;
      const initialPoints = initialStars * 2;
      const initialLevel = isOld && addInitialLevelSelect ? addInitialLevelSelect.value : 'بذرة المسجد';
      const initialSurah = isOld && addInitialSurahInput ? addInitialSurahInput.value.trim() : '';
      const initialToVerse = isOld && addInitialToVerseInput ? (parseInt(addInitialToVerseInput.value) || '') : '';
      const initialAttendance = isOld && addInitialAttendanceInput ? (parseInt(addInitialAttendanceInput.value) || 0) : 0;

      const studentData = {
        name: document.getElementById('add-name').value.trim(),
        gender: document.getElementById('add-gender').value,
        ageGroup: document.getElementById('add-age-group').value,
        age: parseInt(document.getElementById('add-age').value),
        quranLevel: document.getElementById('add-quran-level').value,
        studyLevel: document.getElementById('add-study-level').value.trim(),
        parentName: document.getElementById('add-parent-name').value.trim(),
        phone: document.getElementById('add-phone').value.trim(),
        backupPhone: document.getElementById('add-backup-phone').value.trim(),
        
        initialStars: initialStars,
        initialPoints: initialPoints,
        level: initialLevel,
        initialSurah: initialSurah,
        initialToVerse: initialToVerse,
        initialAttendanceRate: initialAttendance
      };

      try {
        const res = await window.DB.registerStudent(studentData, true);
        if (res) {
          resetAddForm();
          alert(`✅ تم إضافة الطالب الصغير بنجاح!\nالمعرف المولد: ${res}`);
          init();
        } else {
          alert('❌ فشل إضافة الطالب');
        }
      } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء الاتصال بقاعدة البيانات');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إضافة وتأكيد القبول';
      }
    }
  };
}

if (searchInput) searchInput.oninput = filterAndRender;

// الاحتساب التلقائي للرتبة بناء على النجوم التراكمية في نموذج التعديل
const editInitialStarsInput = document.getElementById('edit-initial-stars');
const editInitialLevelSelect = document.getElementById('edit-initial-level');
if (editInitialStarsInput && editInitialLevelSelect) {
  editInitialStarsInput.addEventListener('input', () => {
    const stars = parseInt(editInitialStarsInput.value) || 0;
    let level = 'بذرة المسجد';
    if (stars >= 151) level = 'فارس المسجد';
    else if (stars >= 91)  level = 'نجم المسجد';
    else if (stars >= 61)  level = 'شجرة المسجد';
    else if (stars >= 31)  level = 'نبتة المسجد';
    editInitialLevelSelect.value = level;
  });
}

function renderTeamMembers(tName) {
  const teamMembersList = document.getElementById("team-members-list");
  if (!teamMembersList) return;

  const childMembers = allStudents.filter(s => s.teamName === tName);
  const adultMembers = allAdults.filter(a => a.teamName === tName);
  const allMembers = [...childMembers, ...adultMembers];

  teamMembersList.innerHTML = "";
  if (allMembers.length === 0) {
    teamMembersList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 1rem;">لا يوجد أعضاء في هذا الفريق.</p>`;
    return;
  }

  allMembers.forEach(m => {
    const div = document.createElement("div");
    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; background: rgba(0,0,0,0.02); border-radius: 4px; font-size: 0.85rem;";
    
    const span = document.createElement("span");
    span.textContent = `${m.name} (${m.id.startsWith("AD") ? "كبار" : "صغار"})`;
    div.appendChild(span);

    const rmBtn = document.createElement("button");
    rmBtn.style.cssText = "background: none; border: none; color: #ff4d4d; cursor: pointer; font-size: 0.8rem; font-weight: 800;";
    rmBtn.textContent = "إزالة";
    rmBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`هل أنت متأكد من إزالة ${m.name} من الفريق؟`)) {
        await window.DB.assignStudentsToTeam([m.id], "");
        renderTeamMembers(tName);
        filterAndRender();
      }
    };

    div.appendChild(rmBtn);
    teamMembersList.appendChild(div);
  });
}

async function initTeamsPanel() {
  const btnOpenModal = document.getElementById("btn-open-create-team-modal");
  const teamsListGroup = document.getElementById("teams-list-group");
  const teamAssignContainer = document.getElementById("team-assign-container");
  const teamNoSelection = document.getElementById("team-no-selection");
  const selectedTeamLbl = document.getElementById("selected-team-lbl");
  const btnDelete = document.getElementById("btn-delete-team");

  // Create Team Modal Elements
  const createTeamModal = document.getElementById("create-team-modal");
  const closeCreateTeamModal = document.getElementById("close-create-team-modal");
  const btnCancelCreateTeam = document.getElementById("btn-cancel-create-team");
  const createTeamForm = document.getElementById("create-team-form");
  const newTeamNameInput = document.getElementById("new-team-name");
  const teamStudentChecklist = document.getElementById("team-student-checklist");

  if (!btnOpenModal) return;

  const loadTeams = async () => {
    const teams = await window.DB.getTeams();
    teamsListGroup.innerHTML = "";
    if (teams.length === 0) {
      teamsListGroup.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">لا توجد فرق حالياً.</p>`;
      if (teamAssignContainer) teamAssignContainer.style.display = "none";
      if (teamNoSelection) teamNoSelection.style.display = "flex";
      selectedTeam = null;
      return;
    }

    teams.forEach(tName => {
      const div = document.createElement("div");
      div.className = "team-item";
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; transition: all 0.2s;";
      if (tName === selectedTeam) {
        div.style.borderColor = "var(--gold)";
        div.style.background = "rgba(200, 161, 90, 0.08)";
        div.style.fontWeight = "800";
      }
      
      const span = document.createElement("span");
      span.textContent = tName;
      div.appendChild(span);

      div.onclick = () => {
        selectedTeam = tName;
        loadTeams();
        showTeamDetails(tName);
      };

      teamsListGroup.appendChild(div);
    });
  };

  const showTeamDetails = (tName) => {
    if (selectedTeamLbl) selectedTeamLbl.textContent = tName;
    if (teamAssignContainer) teamAssignContainer.style.display = "block";
    if (teamNoSelection) teamNoSelection.style.display = "none";
    renderTeamMembers(tName);
  };

  btnOpenModal.onclick = () => {
    newTeamNameInput.value = "";
    teamStudentChecklist.innerHTML = "";
    
    const targetGender = activeGender === "ذكر" ? "ذكر" : "أنثى";
    const kids = allStudents.filter(s => s.status === "مقبول" && (s.gender === targetGender || s["الجنس"] === targetGender));
    
    if (kids.length === 0) {
      teamStudentChecklist.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">لا يوجد طلاب مقبولون في هذا القسم حالياً.</p>`;
    } else {
      kids.sort((a, b) => a.name.localeCompare(b.name));
      kids.forEach(s => {
        const label = document.createElement("label");
        label.style.cssText = "display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; font-size: 0.9rem;";
        
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = s.id;
        chk.className = "create-team-member-chk";
        chk.style.cssText = "width: 16px; height: 16px; accent-color: var(--green);";
        
        const span = document.createElement("span");
        span.innerHTML = `<strong>${s.name}</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(${s.id})</span>`;
        
        label.appendChild(chk);
        label.appendChild(span);
        teamStudentChecklist.appendChild(label);
      });
    }
    
    createTeamModal.classList.add("is-visible");
  };

  const closeModal = () => {
    createTeamModal.classList.remove("is-visible");
  };
  if (closeCreateTeamModal) closeCreateTeamModal.onclick = closeModal;
  if (btnCancelCreateTeam) btnCancelCreateTeam.onclick = closeModal;

  createTeamForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = newTeamNameInput.value.trim();
    if (!name) {
      alert("الرجاء إدخال اسم الفريق أولاً.");
      return;
    }

    const teams = await window.DB.getTeams();
    if (teams.includes(name)) {
      alert("هذا الفريق موجود بالفعل.");
      return;
    }

    const checked = teamStudentChecklist.querySelectorAll(".create-team-member-chk:checked");
    const ids = Array.from(checked).map(cb => cb.value);

    // Save team name
    teams.push(name);
    let success = await window.DB.saveTeams(teams);
    if (!success) {
      alert("فشل إنشاء الفريق في قاعدة البيانات.");
      return;
    }

    // Assign checked kids to team
    if (ids.length > 0) {
      success = await window.DB.assignStudentsToTeam(ids, name);
    }

    if (success) {
      alert(`✅ تم إنشاء الفريق "${name}" وتعيين ${ids.length} طلاب بنجاح!`);
      closeModal();
      selectedTeam = name;
      await loadTeams();
      showTeamDetails(name);
      filterAndRender();
    } else {
      alert("فشل تعيين الطلاب للفريق.");
    }
  };

  btnDelete.onclick = async () => {
    if (!selectedTeam) return;
    if (confirm(`هل أنت متأكد من حذف فريق "${selectedTeam}"؟ سيتم إزالة جميع الأعضاء منه.`)) {
      const teams = await window.DB.getTeams();
      const updated = teams.filter(t => t !== selectedTeam);
      
      const childMembers = allStudents.filter(s => s.teamName === selectedTeam);
      const adultMembers = allAdults.filter(a => a.teamName === selectedTeam);
      const memberIds = [...childMembers, ...adultMembers].map(m => m.id);
      
      if (memberIds.length > 0) {
        await window.DB.assignStudentsToTeam(memberIds, "");
      }

      const success = await window.DB.saveTeams(updated);
      if (success) {
        selectedTeam = null;
        await loadTeams();
        filterAndRender();
      } else {
        alert("فشل حذف الفريق.");
      }
    }
  };



  await loadTeams();
}

window.renderTeamMembers = renderTeamMembers;

// Run initialization
init();

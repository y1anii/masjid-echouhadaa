/**
 * مسجد الشهداء — إدارة الدروس الأسبوعية
 */

const DAYS_ORDER = [
  'يومياً',
  'من السبت إلى الخميس',
  'من الأحد إلى الخميس',
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
];

const lessonsGrid = document.getElementById('lessons-grid');
const lessonForm = document.getElementById('lesson-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('lesson-submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const lessonDaySelect = document.getElementById('lesson-day');
const customDayGroup = document.getElementById('custom-day-group');
const lessonDayCustomInput = document.getElementById('lesson-day-custom');

let allLessons = [];
let editingId = null;

/**
 * تهيئة صفحة الدروس
 */
async function initLessons() {
  console.log("[Lessons] Loading...");
  renderLoadingState();
  const rawLessons = await DB.getAllLessons();
  allLessons = rawLessons.filter(l => l && l.id && String(l.id).startsWith('LS') && l.title && String(l.title).trim() !== '');
  console.log("[Lessons] Loaded:", allLessons);
  renderLessons();
}

function renderLoadingState() {
  if (!lessonsGrid) return;
  lessonsGrid.innerHTML = `
    <div class="spinner-container">
      <div class="spinner-circle"></div>
      <p>جاري تحميل الدروس...</p>
    </div>
  `;
}

/**
 * عرض الدروس مجمعة حسب اليوم
 */
function renderLessons() {
  if (!lessonsGrid) return;

  if (allLessons.length === 0) {
    lessonsGrid.innerHTML = `
      <div class="empty-state">
        <i class="ph-light ph-book-open"></i>
        <h3>لا توجد دروس في هذه الفترة</h3>
        <p style="color: var(--text-muted);">استخدم النموذج أعلاه لإضافة الدروس الأسبوعية</p>
      </div>
    `;
    return;
  }

  // ترتيب الدروس حسب أيام الأسبوع والخيارات المحددة
  const sorted = [...allLessons].sort((a, b) => {
    let idxA = DAYS_ORDER.indexOf(a.day);
    let idxB = DAYS_ORDER.indexOf(b.day);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  lessonsGrid.innerHTML = sorted.map(lesson => {
    const isFeatured = lesson.featured === 'نعم';
    return `
      <div class="lesson-admin-card ${isFeatured ? 'lesson-admin-card--featured' : ''}" data-id="${lesson.id}">
        <div class="lesson-admin-card__header">
          <span class="lesson-admin-card__day">${lesson.day || ''}</span>
          ${isFeatured ? '<span class="badge badge-accepted" style="font-size: 0.7rem;">مميز</span>' : ''}
        </div>
        <h3 class="lesson-admin-card__title">${lesson.title || ''}</h3>
        <p class="lesson-admin-card__meta">
          <i class="ph ph-clock"></i> ${lesson.time || ''}
          ${lesson.speaker ? ` · <i class="ph ph-user"></i> ${lesson.speaker}` : ''}
        </p>
        ${lesson.description ? `<p class="lesson-admin-card__desc">${lesson.description}</p>` : ''}
        <div class="lesson-admin-card__actions">
          <button class="btn btn-secondary lesson-edit-btn" data-id="${lesson.id}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
            <i class="ph ph-pencil-simple"></i> تعديل
          </button>
          <button class="btn btn-outline lesson-delete-btn" data-id="${lesson.id}" style="padding: 0.5rem 1rem; font-size: 0.85rem; border-color: rgba(255,68,68,0.4); color: #ff4d4d;">
            <i class="ph ph-trash"></i> حذف
          </button>
        </div>
      </div>
    `;
  }).join('');

  attachLessonListeners();
}

/**
 * ربط أحداث التعديل والحذف
 */
function attachLessonListeners() {
  document.querySelectorAll('.lesson-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const lesson = allLessons.find(l => l.id == btn.dataset.id);
      if (lesson) startEdit(lesson);
    };
  });

  document.querySelectorAll('.lesson-delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const lesson = allLessons.find(l => l.id == btn.dataset.id);
      if (!lesson) return;
      if (confirm(`هل تريد حذف درس "${lesson.title}" نهائياً؟`)) {
        try {
          btn.disabled = true;
          btn.textContent = 'جاري الحذف...';
          const success = await DB.deleteLesson(lesson.id);
          if (success) {
            alert('تم حذف الدرس بنجاح');
            initLessons();
          } else {
            alert('فشل حذف الدرس');
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-trash"></i> حذف';
          }
        } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء حذف الدرس');
          btn.disabled = false;
          btn.innerHTML = '<i class="ph ph-trash"></i> حذف';
        }
      }
    };
  });
}

/**
 * تفعيل وضع التعديل
 */
function startEdit(lesson) {
  editingId = lesson.id;
  
  const dayValue = lesson.day || '';
  const selectHasOption = Array.from(lessonDaySelect.options).some(opt => opt.value === dayValue);
  
  if (dayValue && selectHasOption) {
    lessonDaySelect.value = dayValue;
    customDayGroup.style.display = 'none';
    lessonDayCustomInput.required = false;
    lessonDayCustomInput.value = '';
  } else {
    lessonDaySelect.value = 'custom';
    customDayGroup.style.display = 'block';
    lessonDayCustomInput.required = true;
    lessonDayCustomInput.value = dayValue;
  }

  document.getElementById('lesson-title').value = lesson.title || '';
  document.getElementById('lesson-time').value = lesson.time || '';
  document.getElementById('lesson-speaker').value = lesson.speaker || '';
  document.getElementById('lesson-desc').value = lesson.description || '';
  document.getElementById('lesson-featured').checked = (lesson.featured === 'نعم');

  formTitle.textContent = 'تعديل الدرس';
  submitBtn.textContent = 'حفظ التعديلات';
  cancelEditBtn.style.display = 'inline-flex';

  // انتقال سلس لأعلى النموذج
  lessonForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * إلغاء وضع التعديل
 */
function cancelEdit() {
  editingId = null;
  lessonForm.reset();
  customDayGroup.style.display = 'none';
  lessonDayCustomInput.required = false;
  formTitle.textContent = 'إضافة درس جديد';
  submitBtn.textContent = 'إضافة الدرس';
  cancelEditBtn.style.display = 'none';
}

/**
 * إرسال نموذج الإضافة/التعديل
 */
if (lessonForm) {
  lessonForm.onsubmit = async (e) => {
    e.preventDefault();

    const daySelectVal = lessonDaySelect.value;
    const dayVal = daySelectVal === 'custom' ? lessonDayCustomInput.value.trim() : daySelectVal;

    if (!dayVal) {
      alert('يرجى تحديد أو كتابة اليوم/الفترة');
      return;
    }

    const lessonData = {
      day: dayVal,
      title: document.getElementById('lesson-title').value.trim(),
      time: document.getElementById('lesson-time').value.trim(),
      speaker: document.getElementById('lesson-speaker').value.trim(),
      description: document.getElementById('lesson-desc').value.trim(),
      featured: document.getElementById('lesson-featured').checked ? 'نعم' : 'لا'
    };

    try {
      submitBtn.disabled = true;

      if (editingId) {
        // تعديل
        submitBtn.textContent = 'جاري الحفظ...';
        const success = await DB.updateLesson(editingId, lessonData);
        if (success) {
          alert('تم تحديث الدرس بنجاح');
          cancelEdit();
          initLessons();
        } else {
          alert('فشل التحديث');
        }
      } else {
        // إضافة
        submitBtn.textContent = 'جاري الإضافة...';
        const success = await DB.addLesson(lessonData);
        if (success) {
          alert('تم إضافة الدرس بنجاح');
          lessonForm.reset();
          customDayGroup.style.display = 'none';
          lessonDayCustomInput.required = false;
          initLessons();
        } else {
          alert('فشل إضافة الدرس');
        }
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ بيانات الدرس');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingId ? 'حفظ التعديلات' : 'إضافة الدرس';
    }
  };
}

if (cancelEditBtn) {
  cancelEditBtn.onclick = cancelEdit;
}

if (lessonDaySelect) {
  lessonDaySelect.onchange = () => {
    if (lessonDaySelect.value === 'custom') {
      customDayGroup.style.display = 'block';
      lessonDayCustomInput.required = true;
      lessonDayCustomInput.focus();
    } else {
      customDayGroup.style.display = 'none';
      lessonDayCustomInput.required = false;
      lessonDayCustomInput.value = '';
    }
  };
}

// تشغيل التهيئة
initLessons();

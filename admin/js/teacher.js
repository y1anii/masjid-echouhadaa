import { collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubscribeSessions = null;
let cachedArchivedSessions = [];

/**
 * مسجد الشهداء — لوحة تحكم المعلم (رصد الحلقة الصيفية والتقييم الديناميكي)
 */

function runWhenReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  // --- UI Elements ---
  const noSessionView = document.getElementById("no-session-view");
  const activeSessionView = document.getElementById("active-session-view");
  const startSessionBtn = document.getElementById("start-session-btn");
  const startSessionModal = document.getElementById("start-session-modal");
  const closeStartModal = document.getElementById("close-start-modal");
  const btnCancelStart = document.getElementById("btn-cancel-start");
  const startSessionForm = document.getElementById("start-session-form");
  const cancelSessionBtn = document.getElementById("cancel-session-btn");

  const sessionCircleName = document.getElementById("session-circle-name");
  const sessionDateVal = document.getElementById("session-date-val");

  const studentFilter = document.getElementById("student-filter");
  const ratedCount = document.getElementById("rated-count");
  const totalCount = document.getElementById("total-count");
  const loadingStudents = document.getElementById("loading-students");
  const studentsListGrid = document.getElementById("students-list-grid");

  const evalModal = document.getElementById("eval-modal");
  const closeEvalModal = document.getElementById("close-eval-modal");
  const btnCancelEval = document.getElementById("btn-cancel-eval");
  const evalForm = document.getElementById("eval-form");
  const evalStudentName = document.getElementById("eval-student-name");
  const evalStudentId = document.getElementById("eval-student-id");
  const evalAttendance = document.getElementById("eval-attendance");
  const evalDynamicFieldsContainer = document.getElementById("eval-dynamic-fields-container");

  // New session config elements
  const circleCategory = document.getElementById("circle-category");
  const circlePeriod = document.getElementById("circle-period");
  const circlePeriodWrapper = document.getElementById("circle-period-wrapper");
  const circleGroupType = document.getElementById("circle-group-type");
  const supervisorNameInput = document.getElementById("supervisor-name");
  const sessionDateInput = document.getElementById("session-date");
  
  // Daily Agenda Checkboxes & Sections
  const childrenAgendaSection = document.getElementById("children-agenda-section");
  const adultsAgendaSection = document.getElementById("adults-agenda-section");

  const agendaQuran = document.getElementById("agenda-quran");
  const agendaCreed = document.getElementById("agenda-creed");
  const agendaProphets = document.getElementById("agenda-prophets");
  const agendaCatchup = document.getElementById("agenda-catchup");
  const agendaCulture = document.getElementById("agenda-culture");
  const agendaHealth = document.getElementById("agenda-health");
  const agendaQuranComp = document.getElementById("agenda-quran-comp");
  const agendaSports = document.getElementById("agenda-sports");

  const agendaAdultQuran = document.getElementById("agenda-adult-quran");
  const agendaAdultTajweed = document.getElementById("agenda-adult-tajweed");
  const agendaAdultSharia = document.getElementById("agenda-adult-sharia");

  const sessionFloatingBar = document.getElementById("session-floating-bar");
  const submitBatchBtn = document.getElementById("submit-batch-btn");

  // --- State Variables ---
  let activeSession = null;
  let allStudents = []; // All confirmed students
  let reportsData = {};  // studentId -> evaluation object
  let currentEvalStudent = null;

  // --- Initialize App View ---
  if (window.DB && window.DB.db) {
    initSession();
  } else {
    const checkDB = setInterval(() => {
      if (window.DB && window.DB.db) {
        clearInterval(checkDB);
        initSession();
      }
    }, 50);
  }


  // --- Session Management ---
  function initSession() {
    const isActive = localStorage.getItem("masjid_session_active") === "true";
    if (isActive) {
      let restoredCourses = [];
      try {
        const savedCourses = localStorage.getItem("masjid_session_courses");
        if (savedCourses) restoredCourses = JSON.parse(savedCourses);
      } catch(e) {}

      activeSession = {
        sessionId: localStorage.getItem("masjid_session_id"),
        circleName: localStorage.getItem("masjid_session_circle"),
        date: localStorage.getItem("masjid_session_date"),
        time: localStorage.getItem("masjid_session_time"),
        supervisorName: localStorage.getItem("masjid_session_supervisor"),
        selectedCourses: restoredCourses
      };
      
      const savedReports = localStorage.getItem("masjid_session_reports");
      try {
        reportsData = savedReports ? JSON.parse(savedReports) : {};
      } catch (e) {
        console.warn("[Teacher] Failed to parse savedReports from localStorage:", e);
        reportsData = {};
      }

      showActiveSession();
      loadStudentsList();
    } else {
      showNoSession();
    }
  }

  function showNoSession() {
    noSessionView.style.display = "block";
    activeSessionView.style.display = "none";
    sessionFloatingBar.style.display = "none";
    const archiveCard = document.getElementById("sessions-archive-card");
    if (archiveCard) archiveCard.style.display = "block";
    activeSession = null;
    reportsData = {};
    
    // Clear editing mode if any
    localStorage.removeItem("masjid_session_is_editing");
    
    loadSessionsArchive();
  }

  function showActiveSession() {
    noSessionView.style.display = "none";
    activeSessionView.style.display = "block";
    sessionFloatingBar.style.display = "flex";
    const archiveCard = document.getElementById("sessions-archive-card");
    if (archiveCard) archiveCard.style.display = "none";

    const sessionCategoryVal = localStorage.getItem("masjid_session_category") || "الصغار";

    if (sessionCategoryVal === "الكبار") {
      if (childrenAgendaSection) childrenAgendaSection.style.display = "none";
      if (adultsAgendaSection) adultsAgendaSection.style.display = "grid";
    } else {
      if (childrenAgendaSection) childrenAgendaSection.style.display = "grid";
      if (adultsAgendaSection) adultsAgendaSection.style.display = "none";
    }

    const isEditing = localStorage.getItem("masjid_session_is_editing") === "true";
    if (isEditing) {
      sessionCircleName.textContent = `تعديل حلقة مؤرشفة (بإشراف: ${activeSession.supervisorName || '-'})`;
      submitBatchBtn.innerHTML = `<i class="ph-bold ph-floppy-disk"></i> حفظ تعديلات الحلقة وإرسال التقارير`;
      cancelSessionBtn.textContent = "الخروج من التعديل (دون حفظ)";
    } else {
      sessionCircleName.textContent = `${activeSession.circleName} (بإشراف: ${activeSession.supervisorName || '-'})`;
      submitBatchBtn.innerHTML = `<i class="ph-bold ph-cloud-arrow-up"></i> إنهاء الحلقة وإرسال التقارير`;
      cancelSessionBtn.textContent = "إلغاء الحلقة الحالية";
    }
    sessionDateVal.textContent = activeSession.date;

    // ── بطاقة ملخص الحلقة ──
    const summaryCard = document.getElementById('session-summary-card');
    const sumDayDate = document.getElementById('sum-day-date');
    const sumCircleType = document.getElementById('sum-circle-type');
    const sumSupervisor = document.getElementById('sum-supervisor');
    const sumCoursesTags = document.getElementById('sum-courses-tags');

    if (summaryCard) {
      // تكوين التاريخ واليوم بالعربي
      const arabicDays = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      let dayLabel = '';
      let dateLabel = activeSession.date || '';
      try {
        const d = new Date(activeSession.date);
        if (!isNaN(d)) {
          dayLabel = arabicDays[d.getDay()];
          const dd = String(d.getDate()).padStart(2,'0');
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const yyyy = d.getFullYear();
          dateLabel = `${dd}/${mm}/${yyyy}`;
        }
      } catch(e) {}
      if (sumDayDate) sumDayDate.textContent = dayLabel ? `${dayLabel} — ${dateLabel}` : dateLabel;

      // نوع الحلقة والفئة
      const circleLabel = activeSession.circleName || '—';
      const categoryLabel = sessionCategoryVal === 'الكبار' ? 'حلقة الكبار' : 'حلقة الصغار';
      if (sumCircleType) sumCircleType.textContent = `${categoryLabel} — ${circleLabel}`;

      // المشرف
      if (sumSupervisor) sumSupervisor.textContent = activeSession.supervisorName || '—';

      // المقررات كشارات
      if (sumCoursesTags) {
        const tagColors = [
          { bg: 'rgba(13,92,70,0.08)', color: 'var(--green-dark)', border: 'rgba(13,92,70,0.25)' },
          { bg: 'rgba(212,175,55,0.1)', color: '#7a5900', border: 'rgba(212,175,55,0.4)' },
          { bg: 'rgba(100,149,237,0.08)', color: '#2b4a8a', border: 'rgba(100,149,237,0.3)' },
        ];
        const agendaSavedStr = localStorage.getItem('masjid_session_agenda');
        let coursesList = [];
        if (activeSession.selectedCourses) {
          coursesList = Array.isArray(activeSession.selectedCourses)
            ? activeSession.selectedCourses
            : String(activeSession.selectedCourses).split('، ');
        }
        if (coursesList.length === 0 && agendaSavedStr) {
          // fallback: rebuild from agenda flags
          try {
            const ag = JSON.parse(agendaSavedStr);
            if (sessionCategoryVal === 'الكبار') {
              if (ag.adultQuran) coursesList.push('تحفيظ القرآن');
              if (ag.adultTajweed) coursesList.push('علوم التجويد');
              if (ag.adultSharia) coursesList.push('الدروس الشرعية');
            } else {
              if (ag.quran) coursesList.push('حفظ القرآن ومراجعته');
              if (ag.creed) coursesList.push('دروس في العقيدة والسلوك');
              if (ag.prophets) coursesList.push('قصص الأنبياء عليهم السلام');
              if (ag.catchup) coursesList.push('استدراك الحفظ ومراجعة القرآن');
              if (ag.culture) coursesList.push('مسابقات ثقافية');
              if (ag.health) coursesList.push('جلسات الصحة الجسمية');
              if (ag.quranComp) coursesList.push('مسابقات قرآنية');
              if (ag.sports) coursesList.push('نشاطات رياضية');
            }
          } catch(e) {}
        }
        const firstChild = sumCoursesTags.querySelector('span');
        sumCoursesTags.innerHTML = '<span style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">المقررات:</span>';
        coursesList.forEach((course, i) => {
          const c = tagColors[i % tagColors.length];
          const tag = document.createElement('span');
          tag.style.cssText = `background:${c.bg}; color:${c.color}; border:1px solid ${c.border}; border-radius:20px; padding:0.2rem 0.75rem; font-size:0.82rem; font-weight:800;`;
          tag.textContent = course.trim();
          sumCoursesTags.appendChild(tag);
        });
      }
    }

    // Load checkboxes state from sessionStorage
    const agendaSaved = localStorage.getItem("masjid_session_agenda");
    if (agendaSaved) {
      try {
        const agenda = JSON.parse(agendaSaved);
        if (sessionCategoryVal === "الكبار") {
          if (agendaAdultQuran) agendaAdultQuran.checked = !!agenda.adultQuran;
          if (agendaAdultTajweed) agendaAdultTajweed.checked = !!agenda.adultTajweed;
          if (agendaAdultSharia) agendaAdultSharia.checked = !!agenda.adultSharia;
        } else {
          agendaQuran.checked = !!agenda.quran;
          agendaCreed.checked = !!agenda.creed;
          agendaProphets.checked = !!agenda.prophets;
          agendaCatchup.checked = !!agenda.catchup;
          agendaCulture.checked = !!agenda.culture;
          agendaHealth.checked = !!agenda.health;
          agendaQuranComp.checked = !!agenda.quranComp;
          agendaSports.checked = !!agenda.sports;
        }
      } catch (e) {
        console.warn("[Teacher] Failed to parse agendaSaved from localStorage:", e);
      }
    }
  }

  function saveAgendaState() {
    const sessionCategoryVal = localStorage.getItem("masjid_session_category") || "الصغار";
    let agenda = {};
    let selectedCourses = [];

    if (sessionCategoryVal === "الكبار") {
      agenda = {
        adultQuran: agendaAdultQuran.checked,
        adultTajweed: agendaAdultTajweed.checked,
        adultSharia: agendaAdultSharia.checked
      };
      if (agendaAdultQuran.checked) selectedCourses.push("تحفيظ القرآن");
      if (agendaAdultTajweed.checked) selectedCourses.push("علوم التجويد");
      if (agendaAdultSharia.checked) selectedCourses.push("الدروس الشرعية");
      if (selectedCourses.length === 0) {
        selectedCourses.push("تحفيظ القرآن");
        agendaAdultQuran.checked = true;
        agenda.adultQuran = true;
      }
    } else {
      agenda = {
        quran: agendaQuran.checked,
        creed: agendaCreed.checked,
        prophets: agendaProphets.checked,
        catchup: agendaCatchup.checked,
        culture: agendaCulture.checked,
        health: agendaHealth.checked,
        quranComp: agendaQuranComp.checked,
        sports: agendaSports.checked
      };
      if (agendaQuran.checked) selectedCourses.push("حفظ القرآن ومراجعته");
      if (agendaCreed.checked) selectedCourses.push("دروس في العقيدة والسلوك");
      if (agendaProphets.checked) selectedCourses.push("قصص الأنبياء عليهم السلام");
      if (agendaCatchup.checked) selectedCourses.push("استدراك الحفظ ومراجعة القرآن");
      if (agendaCulture.checked) selectedCourses.push("مسابقات ثقافية");
      if (agendaHealth.checked) selectedCourses.push("جلسات الصحة الجسمية");
      if (agendaQuranComp.checked) selectedCourses.push("مسابقات قرآنية");
      if (agendaSports.checked) selectedCourses.push("نشاطات رياضية");
      if (selectedCourses.length === 0) {
        selectedCourses.push("حفظ القرآن ومراجعته");
        agendaQuran.checked = true;
        agenda.quran = true;
      }
    }
    localStorage.setItem("masjid_session_agenda", JSON.stringify(agenda));
    localStorage.setItem("masjid_session_courses", JSON.stringify(selectedCourses));
    if (activeSession) {
      activeSession.selectedCourses = selectedCourses;
    }
    const sumCoursesTags = document.getElementById("sum-courses-tags");
    if (sumCoursesTags) {
      const tagColors = [
        { bg: 'rgba(13,92,70,0.08)', color: 'var(--green-dark)', border: 'rgba(13,92,70,0.25)' },
        { bg: 'rgba(212,175,55,0.1)', color: '#7a5900', border: 'rgba(212,175,55,0.4)' },
        { bg: 'rgba(100,149,237,0.08)', color: '#2b4a8a', border: 'rgba(100,149,237,0.3)' },
      ];
      sumCoursesTags.innerHTML = '<span style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">المقررات:</span>';
      selectedCourses.forEach((course, i) => {
        const c = tagColors[i % tagColors.length];
        const tag = document.createElement('span');
        tag.style.cssText = `background:${c.bg}; color:${c.color}; border:1px solid ${c.border}; border-radius:20px; padding:0.2rem 0.75rem; font-size:0.82rem; font-weight:800;`;
        tag.textContent = course.trim();
        sumCoursesTags.appendChild(tag);
      });
    }
  }

  // Bind saveAgendaState to checkboxes
  [agendaQuran, agendaCreed, agendaProphets, agendaCatchup, agendaCulture, agendaHealth, agendaQuranComp, agendaSports, agendaAdultQuran, agendaAdultTajweed, agendaAdultSharia].forEach(cb => {
    if (cb) cb.addEventListener("change", saveAgendaState);
  });

  // Modal open/close
  startSessionBtn.addEventListener("click", () => {
    startSessionModal.classList.add("is-visible");
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    sessionDateInput.value = `${yyyy}-${mm}-${dd}`;
    
    // Reset category dropdown and trigger change event to align UI
    if (circleCategory) {
      circleCategory.value = "الصغار";
      circleCategory.dispatchEvent(new Event("change"));
    }
  });

  if (circleCategory) {
    circleCategory.addEventListener("change", () => {
      const val = circleCategory.value;
      if (val === "الكبار") {
        circleGroupType.innerHTML = `
          <option value="حلقة الكبار - ذكور" selected>حلقة الكبار - ذكور</option>
          <option value="حلقة الكبار - إناث">حلقة الكبار - إناث</option>
        `;
        if (circlePeriod) {
          circlePeriod.innerHTML = `
            <option value="حلقة الكبار" selected>حلقة الكبار</option>
          `;
        }
        if (circlePeriodWrapper) circlePeriodWrapper.style.display = "none";
        if (childrenAgendaSection) childrenAgendaSection.style.display = "none";
        if (adultsAgendaSection) adultsAgendaSection.style.display = "grid";
      } else {
        circleGroupType.innerHTML = `
          <option value="حلقة البراعم (مختلطة)" selected>حلقة البراعم (مختلطة)</option>
          <option value="حلقة الأشبال - ذكور">حلقة الأشبال - ذكور</option>
          <option value="حلقة الأشبال - إناث">حلقة الأشبال - إناث</option>
        `;
        if (circlePeriod) {
          circlePeriod.innerHTML = `
            <option value="حلقة صباحية" selected>حلقة صباحية</option>
            <option value="حلقة مسائية">حلقة مسائية</option>
          `;
        }
        if (circlePeriodWrapper) circlePeriodWrapper.style.display = "flex";
        if (childrenAgendaSection) childrenAgendaSection.style.display = "grid";
        if (adultsAgendaSection) adultsAgendaSection.style.display = "none";
      }
    });
  }

  const closeStartSession = () => {
    startSessionModal.classList.remove("is-visible");
    startSessionForm.reset();
  };
  closeStartModal.addEventListener("click", closeStartSession);
  btnCancelStart.addEventListener("click", closeStartSession);

  // Submit start session
  startSessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = circleCategory.value;
    const period = circlePeriod.value;
    const groupType = circleGroupType.value;
    const circle = groupType.includes("البراعم") || groupType.includes("الأشبال") || groupType.includes("الكبار") ? groupType : `${groupType} - ${period}`;
    const supervisor = supervisorNameInput.value.trim();
    const dateStr = sessionDateInput.value;

    if (!circle || !supervisor || !dateStr) {
      alert("يرجى تعبئة جميع الحقول المطلوبة لبدء الحلقة.");
      return;
    }

    // Get selected courses based on category
    const selectedCourses = [];
    let initialAgenda = {};

    if (category === "الكبار") {
      if (agendaAdultQuran.checked) selectedCourses.push("تحفيظ القرآن");
      if (agendaAdultTajweed.checked) selectedCourses.push("علوم التجويد");
      if (agendaAdultSharia.checked) selectedCourses.push("الدروس الشرعية");

      if (selectedCourses.length === 0) {
        selectedCourses.push("تحفيظ القرآن");
        agendaAdultQuran.checked = true;
      }
      initialAgenda = {
        adultQuran: agendaAdultQuran.checked,
        adultTajweed: agendaAdultTajweed.checked,
        adultSharia: agendaAdultSharia.checked
      };
    } else {
      if (agendaQuran.checked) selectedCourses.push("حفظ القرآن ومراجعته");
      if (agendaCreed.checked) selectedCourses.push("دروس في العقيدة والسلوك");
      if (agendaProphets.checked) selectedCourses.push("قصص الأنبياء عليهم السلام");
      if (agendaCatchup.checked) selectedCourses.push("استدراك الحفظ ومراجعة القرآن");
      if (agendaCulture.checked) selectedCourses.push("مسابقات ثقافية");
      if (agendaHealth.checked) selectedCourses.push("جلسات الصحة الجسمية");
      if (agendaQuranComp.checked) selectedCourses.push("مسابقات قرآنية");
      if (agendaSports.checked) selectedCourses.push("نشاطات رياضية");

      if (selectedCourses.length === 0) {
        selectedCourses.push("حفظ القرآن ومراجعته");
        agendaQuran.checked = true;
      }
      initialAgenda = {
        quran: agendaQuran.checked,
        creed: agendaCreed.checked,
        prophets: agendaProphets.checked,
        catchup: agendaCatchup.checked,
        culture: agendaCulture.checked,
        health: agendaHealth.checked,
        quranComp: agendaQuranComp.checked,
        sports: agendaSports.checked
      };
    }

    const submitBtn = startSessionForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "جاري إنشاء الحلقة...";

    // Call API to start session
    try {
      const res = await window.DB.startSession(supervisor, selectedCourses, circle, category, dateStr);
      if (res && res.success) {
        // Save session in sessionStorage
        localStorage.setItem("masjid_session_active", "true");
        localStorage.setItem("masjid_session_id", res.sessionId);
        localStorage.setItem("masjid_session_circle", circle);
        localStorage.setItem("masjid_session_date", dateStr);
        localStorage.setItem("masjid_session_time", "");
        localStorage.setItem("masjid_session_supervisor", supervisor);
        localStorage.setItem("masjid_session_category", category);
        
        localStorage.setItem("masjid_session_agenda", JSON.stringify(initialAgenda));
        localStorage.setItem("masjid_session_reports", JSON.stringify({}));
        localStorage.setItem("masjid_session_courses", JSON.stringify(selectedCourses));

        activeSession = {
          sessionId: res.sessionId,
          circleName: circle,
          date: dateStr,
          time: "",
          supervisorName: supervisor,
          selectedCourses: selectedCourses
        };
        reportsData = {};

        closeStartSession();
        showActiveSession();
        loadStudentsList();
      } else {
        alert("فشل إنشاء الجلسة: " + (res.error || "خطأ غير معروف"));
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في الشبكة أثناء بدء الحلقة. حاول مرة أخرى.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Cancel current session or exit edit
  cancelSessionBtn.addEventListener("click", async () => {
    const isEditing = localStorage.getItem("masjid_session_is_editing") === "true";
    
    if (isEditing) {
      if (confirm("هل تريد فعلاً الخروج من وضع تعديل الحلقة؟ لن يتم حفظ أي تعديلات أجريتها.")) {
        localStorage.removeItem("masjid_session_active");
        localStorage.removeItem("masjid_session_id");
        localStorage.removeItem("masjid_session_circle");
        localStorage.removeItem("masjid_session_date");
        localStorage.removeItem("masjid_session_time");
        localStorage.removeItem("masjid_session_supervisor");
        localStorage.removeItem("masjid_session_agenda");
        localStorage.removeItem("masjid_session_reports");
        localStorage.removeItem("masjid_session_courses");
        localStorage.removeItem("masjid_session_is_editing");
        showNoSession();
      }
    } else {
      if (confirm("هل تريد فعلاً إلغاء الحلقة الحالية؟ سيتم مسح جميع البيانات التي رصدتها مؤقتاً في هذه الجلسة.")) {
        const sessionId = localStorage.getItem("masjid_session_id");
        if (sessionId) {
          await window.DB.deleteSession(sessionId);
        }
        
        localStorage.removeItem("masjid_session_active");
        localStorage.removeItem("masjid_session_id");
        localStorage.removeItem("masjid_session_circle");
        localStorage.removeItem("masjid_session_date");
        localStorage.removeItem("masjid_session_time");
        localStorage.removeItem("masjid_session_supervisor");
        localStorage.removeItem("masjid_session_agenda");
        localStorage.removeItem("masjid_session_reports");
        localStorage.removeItem("masjid_session_courses");
        showNoSession();
      }
    }
  });

  // --- Students List Loading & Rendering ---
  async function loadStudentsList() {
    if (!window.DB || !window.DB.db) {
      console.warn("[Teacher] DB not ready yet, retrying loadStudentsList in 100ms...");
      setTimeout(loadStudentsList, 100);
      return;
    }
    loadingStudents.style.display = "block";
    studentsListGrid.style.display = "none";
    
    try {
      const sessionCategoryVal = localStorage.getItem("masjid_session_category") || "الصغار";
      const activeCircle = activeSession.circleName || "";
      
      let confirmedStudents = [];
      if (sessionCategoryVal === "الكبار") {
        let section = "رجال";
        if (activeCircle.includes("نساء") || activeCircle.includes("إناث")) {
          section = "نساء";
        }
        const adults = await window.DB.getAdultParticipants(section);
        confirmedStudents = adults.filter(a => a.status === "مقبول" && a.id);
      } else {
        const students = await window.DB.getAllStudents();
        confirmedStudents = students.filter(s => s.status === "مقبول" && s.id);
        
        // Filter by gender based on circleType
        if (activeCircle.includes("حلقة ذكور")) {
          confirmedStudents = confirmedStudents.filter(s => s.gender === "ذكر" || s["الجنس"] === "ذكر");
        } else if (activeCircle.includes("حلقة إناث")) {
          confirmedStudents = confirmedStudents.filter(s => s.gender === "أنثى" || s["الجنس"] === "أنثى");
        }
      }
      
      allStudents = confirmedStudents;
      renderStudentsGrid();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء جلب قائمة الطلاب. يرجى التحقق من اتصالك بالإنترنت.");
    } finally {
      loadingStudents.style.display = "none";
    }
  }

  function renderStudentsGrid() {
    studentsListGrid.innerHTML = "";
    
    const filterText = studentFilter.value.trim().toLowerCase();
    const filtered = allStudents.filter(s => s.name.toLowerCase().includes(filterText));
    
    if (filtered.length === 0) {
      studentsListGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">لا يوجد طلاب مقبولون يطابقون البحث حالياً.</div>`;
      studentsListGrid.style.display = "block";
      updateCounts();
      return;
    }



    filtered.forEach(s => {
      const card = document.createElement("div");
      card.className = "teacher-student-card";

      const rep = reportsData[s.id];
      let statusBadgeHtml = `<span class="status-badge" style="color: var(--text-muted);">⏳ قيد الانتظار</span>`;
      let starsHtml = "";

      if (rep) {
        if (rep.isNotParticipating) {
          card.style.opacity = "0.55";
          card.style.background = "#fafafa";
          card.style.borderColor = "#ddd";
          statusBadgeHtml = `<span class="status-badge" style="color: #999; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-minus-circle"></i> غير مشارك في الرحلة</span>`;
        } else if (rep.attendance.startsWith("غائب")) {
          card.classList.add("absent");
          statusBadgeHtml = `<span class="status-badge" style="color: #ff4d4d; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-x-circle"></i> غائب</span>`;
        } else {
          card.classList.add("provisional");
          statusBadgeHtml = `<span class="status-badge" style="color: var(--green); display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-check-circle"></i> رصد مؤقت</span>`;
          if (s.id && s.id.startsWith("AD")) {
            starsHtml = `<div class="stars-counter" style="color:var(--green);"><i class="ph-bold ph-check"></i> تم التقييم</div>`;
          } else {
            starsHtml = `<div class="stars-counter"><i class="ph-fill ph-star"></i> <span>${rep.totalStarsEarned}</span></div>`;
          }
        }
      }

      let levelClass = "level-seed";
      if (s.level === "فارس المسجد") levelClass = "level-knight";
      else if (s.level === "نجم المسجد") levelClass = "level-star";
      else if (s.level === "شجرة المسجد") levelClass = "level-tree";
      else if (s.level === "نبتة المسجد") levelClass = "level-sprout";

      card.innerHTML = `
        <div>
          <div class="student-card-header">
            <span class="student-card-name">${s.name}</span>
            <span class="student-card-level ${levelClass}">${s.level || 'برونزي'}</span>
          </div>
          <div class="student-card-meta">
            <span><strong>المعرف:</strong> ${s.id}</span>
            <span><strong>السن:</strong> ${s.age ? s.age + ' سنة' : '-'} | <strong>المستوى القرآني:</strong> ${s.quranLevel || '-'}</span>
          </div>
        </div>
        <div class="student-card-status">
          ${statusBadgeHtml}
          ${starsHtml}
        </div>
      `;

      card.addEventListener("click", () => {
        openEvaluationModal(s);
      });
      studentsListGrid.appendChild(card);
    });

    studentsListGrid.style.display = "grid";
    updateCounts();
  }

  function updateCounts() {
    totalCount.textContent = allStudents.length;
    const rated = Object.keys(reportsData).length;
    ratedCount.textContent = rated;
  }

  studentFilter.addEventListener("input", renderStudentsGrid);

  function openEvaluationModal(student) {
    currentEvalStudent = student;
    evalStudentName.textContent = student.name;
    evalStudentId.textContent = `المعرف: ${student.id} | السن: ${student.age || '-'} سنة | مستوى: ${student.quranLevel || '-'}`;

    const rep = reportsData[student.id];

    const rep = reportsData[student.id];

    // Build the dynamic UI
    buildDynamicForm();

    if (rep) {
      evalAttendance.value = rep.attendance.startsWith("غائب") ? "غائب" : rep.attendance;
      
      if (student.id && student.id.startsWith("AD")) {
        // Populate adult fields
        const adultTypeEl = document.getElementById("eval-adult-type");
        const adultSurahEl = document.getElementById("eval-adult-surah");
        const adultFromEl = document.getElementById("eval-adult-from");
        const adultToEl = document.getElementById("eval-adult-to");
        const adultNotesEl = document.getElementById("eval-adult-notes");

        if (adultTypeEl) {
          adultTypeEl.value = rep.activityType || "حفظ جديد";
          adultTypeEl.dispatchEvent(new Event("change"));
        }
        if (adultSurahEl) adultSurahEl.value = rep.surah || "";
        if (adultFromEl) adultFromEl.value = rep.fromVerse || "";
        if (adultToEl) adultToEl.value = rep.toVerse || "";
        if (adultNotesEl) adultNotesEl.value = rep.notes || "";

        if (rep.grades) {
          if (rep.activityType === "مراجعة") {
            const levelEl = document.getElementById("metric-adult-rev-level");
            if (levelEl) levelEl.value = rep.grades.revLevel || "ممتاز";
            const focusEl = document.getElementById("metric-adult-rev-focus");
            if (focusEl) focusEl.value = rep.grades.focus || "ممتاز";
            const tajweedEl = document.getElementById("metric-adult-rev-tajweed");
            if (tajweedEl) tajweedEl.value = rep.grades.tajweed || "ممتاز";
          } else {
            const qtyEl = document.getElementById("metric-adult-hifz-qty");
            if (qtyEl) qtyEl.value = rep.grades.qty || "ممتاز";
            const focusEl = document.getElementById("metric-adult-hifz-focus");
            if (focusEl) focusEl.value = rep.grades.focus || "ممتاز";
            const tajweedEl = document.getElementById("metric-adult-hifz-tajweed");
            if (tajweedEl) tajweedEl.value = rep.grades.tajweed || "ممتاز";
          }
        }
      } else {
        // Populate child fields
        if (rep.generalCriteria) {
          setStarValue("behavior", rep.generalCriteria["السلوك"] || 0);
          setStarValue("discipline", rep.generalCriteria["الانضباط"] || 0);
        }
        
        const genNotesInput = document.getElementById("metric-notes-general");
        if (genNotesInput) genNotesInput.value = rep.notes || "";

        // Populate quran progress (if active)
        if (rep.quranProgress && agendaQuran.checked) {
          const surahEl = document.getElementById("eval-quran-surah");
          const fromEl = document.getElementById("eval-quran-from");
          const toEl = document.getElementById("eval-quran-to");
          const countEl = document.getElementById("eval-quran-count");
          const typeEl = document.getElementById("eval-quran-type");
          const notesEl = document.getElementById("metric-notes-quran");

          if (surahEl) surahEl.value = rep.quranProgress.surah || "";
          if (fromEl) fromEl.value = rep.quranProgress.fromVerse || "";
          if (toEl) toEl.value = rep.quranProgress.toVerse || "";
          if (fromEl && toEl && countEl) {
            countEl.value = (parseInt(toEl.value) - parseInt(fromEl.value) + 1) || "";
          }
          if (typeEl) {
            typeEl.value = rep.quranProgress.type || "حفظ جديد";
            typeEl.dispatchEvent(new Event("change"));
          }
          if (notesEl) notesEl.value = rep.quranProgress.notes || "";

          // Populate Quran stars
          if (rep.courseEvaluations && Array.isArray(rep.courseEvaluations)) {
            const qEval = rep.courseEvaluations.find(c => c.courseName === "حفظ القرآن ومراجعته");
            if (qEval && qEval.criteria) {
              const qtyRevVal = qEval.criteria["مقدار الحفظ / مستوى المراجعة"] || 0;
              const focusVal = qEval.criteria["التركيز"] || 0;
              const tajweedVal = qEval.criteria["التجويد"] || 0;

              if (rep.quranProgress.type === "مراجعة") {
                setStarValue("quran-مستوى المراجعة", qtyRevVal);
                setStarValue("quran-التركيز-مراجعة", focusVal);
                setStarValue("quran-التجويد-مراجعة", tajweedVal);
              } else {
                setStarValue("quran-مقدار الحفظ", qtyRevVal);
                setStarValue("quran-التركيز", focusVal);
                setStarValue("quran-التجويد", tajweedVal);
              }
            }
          }
        }

        // Populate other courses
        if (rep.courseEvaluations && Array.isArray(rep.courseEvaluations)) {
          // Scientific lessons
          if (agendaCreed.checked) {
            const cEval = rep.courseEvaluations.find(c => c.courseName === "الدروس العلمية");
            if (cEval) {
              const typeEl = document.getElementById("eval-creed-lesson-type");
              if (typeEl) typeEl.value = cEval.lessonType || "السلوك";
              const partEl = document.getElementById("eval-creed-participated");
              if (partEl) partEl.checked = cEval.participated || false;
              const notesEl = document.getElementById("metric-notes-creed");
              if (notesEl) notesEl.value = cEval.notes || "";
            }
          }

          // Cultural competitions
          if (agendaCulture.checked) {
            const cEval = rep.courseEvaluations.find(c => c.courseName === "المسابقات الثقافية");
            if (cEval) {
              const partEl = document.getElementById("eval-culture-participated");
              if (partEl) partEl.checked = cEval.participated || false;
              const notesEl = document.getElementById("metric-notes-culture");
              if (notesEl) notesEl.value = cEval.notes || "";
            }
          }
        }

        // Populate manual stars earned
        const starsEarnedInput = document.getElementById("eval-stars-earned");
        if (starsEarnedInput) {
          starsEarnedInput.value = rep.totalStarsEarned || 0;
        }
      }
    }
    const attendanceRow = document.getElementById("eval-attendance-row");
    if (attendanceRow) attendanceRow.style.display = "block";

    handleAttendanceToggle();
    updatePointsSummary();
  })
        if (rep.quranProgress && agendaQuran.checked) {
          document.getElementById("eval-quran-surah").value = rep.quranProgress.surah || "";
          document.getElementById("eval-quran-from").value = rep.quranProgress.fromVerse || "";
          document.getElementById("eval-quran-to").value = rep.quranProgress.toVerse || "";
          document.getElementById("eval-quran-count").value = (parseInt(rep.quranProgress.toVerse) - parseInt(rep.quranProgress.fromVerse) + 1) || "";
          document.getElementById("eval-quran-type").value = rep.quranProgress.type || "حفظ جديد";
          document.getElementById("metric-notes-quran").value = rep.quranProgress.notes || "";
        }

        // Populate course sub-metrics stars
        if (rep.courseEvaluations && Array.isArray(rep.courseEvaluations)) {
          rep.courseEvaluations.forEach(cEval => {
            const coursePrefix = getCoursePrefix(cEval.courseName);
            Object.keys(cEval.criteria).forEach(metricName => {
              const safeMetricKey = `${coursePrefix}-${metricName}`;
              setStarValue(safeMetricKey, cEval.criteria[metricName]);
            });
            const notesEl = document.getElementById(`metric-notes-${coursePrefix}`);
            if (notesEl) notesEl.value = cEval.notes || "";
          });
        }

        // Populate badges
        if (rep.badgesGranted && Array.isArray(rep.badgesGranted)) {
          rep.badgesGranted.forEach(badge => {
            const chk = document.querySelector(`input[name="badges-chk"][value="${badge}"]`);
            if (chk) chk.checked = true;
          });
        }
      }
    }
    const attendanceRow = document.getElementById("eval-attendance-row");
    if (attendanceRow) attendanceRow.style.display = "block";

    handleAttendanceToggle();
    updatePointsSummary();

    evalModal.classList.add("is-visible");
  }

  const closeEval = () => {
    evalModal.classList.remove("is-visible");
    currentEvalStudent = null;
  };
  closeEvalModal.addEventListener("click", closeEval);
  btnCancelEval.addEventListener("click", closeEval);

  // Toggle fields based on attendance status
  function handleAttendanceToggle() {
    const val = evalAttendance.value;
    if (val === "غائب") {
      evalDynamicFieldsContainer.classList.add("absent-fields-disabled");
    } else {
      evalDynamicFieldsContainer.classList.remove("absent-fields-disabled");
    }
  }
  evalAttendance.addEventListener("change", () => {
    handleAttendanceToggle();
    updatePointsSummary();
  });

  function renderAdultGradeSelect(label, metricKey) {
    return `
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${label}:</span>
        <select id="metric-${metricKey}" class="adult-grade-select" style="width: 100%; border: 1px solid rgba(200, 161, 90, 0.3); border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--green-dark);">
          <option value="ممتاز" selected>ممتاز</option>
          <option value="جيد جداً">جيد جداً</option>
          <option value="جيد">جيد</option>
          <option value="مقبول">مقبول</option>
          <option value="ضعيف">ضعيف</option>
        </select>
      </div>
    `;
  }

  function renderStarGroup(label, metricKey, maxStars = 3) {
    let starsHtml = "";
    for (let i = 1; i <= maxStars; i++) {
      starsHtml += `<i class="ph ph-star" data-value="${i}"></i>`;
    }
    return `
      <div class="stars-rating-group" data-metric="${metricKey}" style="display: flex; flex-direction: column; gap: 0.25rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${label}:</span>
        <div class="stars-stars-container" style="display: flex; gap: 0.25rem; font-size: 1.4rem; color: #ccc; cursor: pointer; direction: ltr; width: max-content;">
          ${starsHtml}
        </div>
        <input type="hidden" id="metric-${metricKey}" class="stars-hidden-val" value="0" />
      </div>
    `;
  }

  function buildDynamicForm() {
    let html = "";

    if (currentEvalStudent && currentEvalStudent.id && currentEvalStudent.id.startsWith("AD")) {
      // Adults form
      const memoDirection = currentEvalStudent.memoDirection || "من الفاتحة إلى الناس";
      
      html += `
        <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
            <i class="ph-bold ph-notebook" style="color:var(--gold);"></i> تفاصيل الحصة للكبار
          </h4>
          
          <div style="font-size:0.85rem; color:var(--green-dark); font-weight:800; margin-bottom:1.25rem; padding: 0.5rem; background: rgba(212, 175, 55, 0.07); border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="ph-bold ph-compass" style="color: var(--gold);"></i> 
            مسار الحفظ الحالي: <strong>${memoDirection}</strong>
          </div>

          <input type="hidden" id="eval-adult-course" value="تحفيظ القرآن" />

          <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
            <div class="form-group">
              <label>نوع الإنجاز:</label>
              <select id="eval-adult-type" style="width: 100%;">
                <option value="حفظ جديد" selected>حفظ جديد</option>
                <option value="مراجعة">مراجعة</option>
                <option value="استدراك">استدراك</option>
              </select>
            </div>
            <div class="form-group">
              <label>السورة:</label>
              <input type="text" id="eval-adult-surah" placeholder="اسم السورة..." style="width: 100%;" required />
            </div>
            <div class="form-group">
              <label>من آية:</label>
              <input type="number" id="eval-adult-from" min="1" placeholder="1" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label>إلى آية:</label>
              <input type="number" id="eval-adult-to" min="1" placeholder="10" style="width: 100%;" />
            </div>
          </div>

          <h5 style="color: var(--gold); font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; font-size: 0.95rem; border-bottom: 1px dashed rgba(200,161,90,0.3); padding-bottom: 0.25rem;">[ تقييم الأداء والتمكن ]</h5>
          
          <!-- Hifz specific evaluation grades -->
          <div id="adult-hifz-grades" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            ${renderAdultGradeSelect("مقدار الحفظ", "adult-hifz-qty")}
            ${renderAdultGradeSelect("التركيز أثناء التسميع", "adult-hifz-focus")}
            ${renderAdultGradeSelect("أحكام التجويد", "adult-hifz-tajweed")}
          </div>

          <!-- Revision specific evaluation grades -->
          <div id="adult-revision-grades" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            ${renderAdultGradeSelect("مستوى المراجعة", "adult-rev-level")}
            ${renderAdultGradeSelect("التركيز", "adult-rev-focus")}
            ${renderAdultGradeSelect("أحكام التجويد", "adult-rev-tajweed")}
          </div>

          <div class="form-group full-width" style="margin-top: 1.25rem;">
            <label>ملاحظات المشرف:</label>
            <input type="text" id="eval-adult-notes" placeholder="ملاحظات حول جودة الحفظ، التسميع أو الأخطاء..." style="width: 100%;" />
          </div>
        </div>
        
        <!-- stars total elements for adult page compatibility, but hidden -->
        <div style="display: none;">
          <span id="stars-total-val">0</span>
          <span id="points-total-val">0</span>
        </div>
      `;
      evalDynamicFieldsContainer.innerHTML = html;

      // Handle toggling adult grades based on type (حفظ جديد / استدراك vs مراجعة)
      const adultTypeSelect = document.getElementById("eval-adult-type");
      const hifzGrades = document.getElementById("adult-hifz-grades");
      const revisionGrades = document.getElementById("adult-revision-grades");

      const toggleAdultGrades = () => {
        const val = adultTypeSelect ? adultTypeSelect.value : "";
        if (val === "مراجعة") {
          if (hifzGrades) hifzGrades.style.display = "none";
          if (revisionGrades) revisionGrades.style.display = "grid";
        } else {
          if (hifzGrades) hifzGrades.style.display = "grid";
          if (revisionGrades) revisionGrades.style.display = "none";
        }
      };

      if (adultTypeSelect) {
        adultTypeSelect.addEventListener("change", toggleAdultGrades);
      }
      
      // Auto save on any input change
      const inputs = evalDynamicFieldsContainer.querySelectorAll("input, select");
      inputs.forEach(input => {
        input.addEventListener("input", triggerAutoSave);
        input.addEventListener("change", triggerAutoSave);
      });

      return;
    }

    // Children Form
    // 1. التقييم العام (السلوك والتربية، الانضباط والالتزام)
    html += `
      <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
          <i class="ph-bold ph-user-focus"></i> التقييم العام (ثابت لكل حلقة)
        </h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
          ${renderStarGroup("السلوك والتربية", "behavior", 3)}
          ${renderStarGroup("الانضباط والالتزام", "discipline", 3)}
        </div>
        <div class="form-group full-width">
          <label>ملاحظات المشرف:</label>
          <input type="text" id="metric-notes-general" placeholder="اكتب أي ملاحظات سلوكية عامة هنا..." style="width:100%;" />
        </div>
      </div>
    `;

    // 2. المقررات المحددة
    // حفظ القرآن ومراجعته
    if (agendaQuran.checked) {
      html += `
        <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
            <i class="ph-bold ph-book-open" style="color:var(--gold);"></i> مقرر القرآن الكريم (حفظ ومراجعة)
          </h4>
          
          <h5 style="color: var(--gold); font-weight: 800; margin-bottom: 0.75rem; font-size: 0.95rem;">[ تقدم الحفظ والتلاوة ]</h5>
          <div class="form-grid" style="margin-bottom: 1.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label>نوع الإنجاز:</label>
              <select id="eval-quran-type" style="width: 100%;">
                <option value="حفظ جديد" selected>حفظ جديد</option>
                <option value="مراجعة">مراجعة</option>
                <option value="استدراك">استدراك</option>
              </select>
            </div>
            <div class="form-group">
              <label>السورة الحالية:</label>
              <input type="text" id="eval-quran-surah" placeholder="اسم السورة..." style="width: 100%;" />
            </div>
            <div class="form-group" style="grid-column: span 2; display: flex; gap: 0.5rem;">
              <div style="flex: 1;">
                <label>من الآية:</label>
                <input type="number" id="eval-quran-from" min="1" style="width: 100%;" />
              </div>
              <div style="flex: 1;">
                <label>إلى الآية:</label>
                <input type="number" id="eval-quran-to" min="1" style="width: 100%;" />
              </div>
              <div style="flex: 1;">
                <label>عدد الآيات:</label>
                <input type="number" id="eval-quran-count" min="0" readonly style="width: 100%; background: #f5f5f5;" />
              </div>
            </div>
          </div>

          <h5 style="color: var(--gold); font-weight: 800; margin-bottom: 0.75rem; font-size: 0.95rem;">[ تقييم الأداء ]</h5>
          
          <!-- Hifz specific star ratings -->
          <div id="stars-quran-hifz-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            ${renderStarGroup("مقدار الحفظ", "quran-مقدار الحفظ", 3)}
            ${renderStarGroup("التركيز", "quran-التركيز", 3)}
            ${renderStarGroup("التجويد", "quran-التجويد", 3)}
          </div>

          <!-- Revision specific star ratings -->
          <div id="stars-quran-rev-container" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            ${renderStarGroup("مستوى المراجعة", "quran-مستوى المراجعة", 3)}
            ${renderStarGroup("التركيز", "quran-التركيز-مراجعة", 3)}
            ${renderStarGroup("التجويد", "quran-التجويد-مراجعة", 3)}
          </div>

          <div class="form-group full-width">
            <label>ملاحظات الحفظ:</label>
            <input type="text" id="metric-notes-quran" placeholder="ملاحظات حول جودة التسميع أو الأخطاء..." style="width:100%;" />
          </div>
        </div>
      `;
    }

    // الدروس العلمية
    if (agendaCreed.checked) {
      html += `
        <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
            <i class="ph-bold ph-chalkboard-teacher" style="color:var(--gold);"></i> مقرر الدروس العلمية
          </h4>
          <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center;">
            <div class="form-group">
              <label>نوع الدرس العلمي:</label>
              <select id="eval-creed-lesson-type" style="width: 100%;">
                <option value="السلوك" selected>السلوك</option>
                <option value="الأخلاق">الأخلاق</option>
                <option value="الفقه">الفقه</option>
                <option value="قصص الأنبياء">قصص الأنبياء</option>
                <option value="آداب المسلم">آداب المسلم</option>
                <option value="السيرة">السيرة</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.25rem;">
              <input type="checkbox" id="eval-creed-participated" checked style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--green);" />
              <label for="eval-creed-participated" style="font-weight: 800; color: var(--green-dark); cursor: pointer;">شارك بفاعلية في الدرس</label>
            </div>
          </div>
          <div class="form-group full-width" style="margin-top: 1rem;">
            <label>ملاحظات الدرس العلمي:</label>
            <input type="text" id="metric-notes-creed" placeholder="ملاحظات حول مدى الفهم والتفاعل..." style="width: 100%;" />
          </div>
        </div>
      `;
    }

    // المسابقات الثقافية
    if (agendaCulture.checked) {
      html += `
        <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
            <i class="ph-bold ph-trophy" style="color:var(--gold);"></i> مقرر المسابقات الثقافية
          </h4>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="eval-culture-participated" checked style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--green);" />
            <label for="eval-culture-participated" style="font-weight: 800; color: var(--green-dark); cursor: pointer;">شارك في المسابقة الثقافية</label>
          </div>
          <div class="form-group full-width" style="margin-top: 1rem;">
            <label>ملاحظات المسابقة الثقافية:</label>
            <input type="text" id="metric-notes-culture" placeholder="أداء الطالب في المسابقة ونشاطه..." style="width: 100%;" />
          </div>
        </div>
      `;
    }

    // 4. ملخص النقاط والنجوم المحصلة في أسفل المودال
    html += `
      <div style="background: rgba(13, 92, 70, 0.08); border: 1px dashed var(--gold); padding: 1.25rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-weight: 900; color: var(--green-dark); margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div>
            <span style="font-size: 0.85rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 0.25rem;">إجمالي النجوم:</span>
            <span style="font-size: 1.4rem; color: var(--gold); display: inline-flex; align-items: center; gap: 0.25rem;">
              <span id="stars-total-val">0</span> <i class="ph-fill ph-star"></i>
            </span>
          </div>
          <div style="border-right: 1px dashed rgba(200,161,90,0.3); padding-right: 1rem;">
            <label style="font-size: 0.85rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 0.25rem;">النجوم المستحقة (من 3):</label>
            <input type="number" id="eval-stars-earned" min="0" max="3" value="0" style="width: 70px; border: 1px solid var(--gold); border-radius: 6px; padding: 0.25rem; text-align: center; font-weight: 900; color: var(--gold); font-size: 1.1rem; background: white;" />
          </div>
        </div>
        <div style="text-align: left;">
          <span style="font-size: 0.85rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 0.25rem;">النقاط التلقائية المحسوبة (النجمة = 2 نقاط):</span>
          <span style="font-size: 1.6rem; color: var(--green); display: inline-flex; align-items: center; gap: 0.25rem;">
            <span id="points-total-val">0</span> نقطة
          </span>
        </div>
      </div>
    `;

    evalDynamicFieldsContainer.innerHTML = html;

    // تفعيل أحداث الضغط على النجوم التفاعلية
    activateStarsInteractive();
    
    // تفعيل دالة الحساب التلقائي لعدد آيات القرآن
    if (agendaQuran.checked) {
      const qFrom = document.getElementById("eval-quran-from");
      const qTo = document.getElementById("eval-quran-to");
      const qCount = document.getElementById("eval-quran-count");
      
      const calcQuranAyahs = () => {
        const fromVal = parseInt(qFrom.value);
        const toVal = parseInt(qTo.value);
        if (!isNaN(fromVal) && !isNaN(toVal) && toVal >= fromVal) {
          qCount.value = (toVal - fromVal) + 1;
        } else {
          qCount.value = "";
        }
      };
      
      qFrom.addEventListener("input", calcQuranAyahs);
      qTo.addEventListener("input", calcQuranAyahs);
    }
  }

  function renderStarGroup(label, metricKey) {
    return `
      <div class="stars-rating-group" data-metric="${metricKey}" style="display: flex; flex-direction: column; gap: 0.25rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${label}:</span>
        <div class="stars-stars-container" style="display: flex; gap: 0.25rem; font-size: 1.4rem; color: #ccc; cursor: pointer; direction: ltr; width: max-content;">
          <i class="ph ph-star" data-value="1"></i>
          <i class="ph ph-star" data-value="2"></i>
          <i class="ph ph-star" data-value="3"></i>
          <i class="ph ph-star" data-value="4"></i>
          <i class="ph ph-star" data-value="5"></i>
        </div>
        <input type="hidden" id="metric-${metricKey}" class="stars-hidden-val" value="0" />
      </div>
    `;
  }

  function renderCourseSection(title, prefix, metrics) {
    const starsGrid = metrics.map(m => renderStarGroup(m, `${prefix}-${m}`)).join("");
    return `
      <div class="eval-card-section" style="background: rgba(13, 92, 70, 0.02); border: 1px solid rgba(200, 161, 90, 0.2); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
        <h4 style="color: var(--green-dark); font-size: 1.15rem; border-right: 3px solid var(--gold); padding-right: 0.5rem; margin-bottom: 1rem; font-weight: 900; display: flex; align-items: center; gap: 0.35rem;">
          <i class="ph-bold ph-chalkboard-teacher" style="color:var(--gold);"></i> مقرر ${title}
        </h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
          ${starsGrid}
        </div>
        <div class="form-group full-width">
          <label>ملاحظات المقرر:</label>
          <input type="text" id="metric-notes-${prefix}" placeholder="ملاحظات الأداء أو التقدم في النشاط..." style="width:100%;" />
        </div>
      </div>
    `;
  }

  function renderBadgeCheckbox(badgeName) {
    return `
      <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; color: var(--green-dark); cursor: pointer; background: #fff; border: 1px solid rgba(200,161,90,0.2); padding: 0.4rem 0.6rem; border-radius: 6px; box-shadow: var(--shadow-sm);">
        <input type="checkbox" name="badges-chk" value="${badgeName}" style="width:16px; height:16px; accent-color: var(--gold);" />
        <span>${badgeName}</span>
      </label>
    `;
  }

  function getCoursePrefix(courseName) {
    if (courseName === "حفظ القرآن ومراجعته") return "quran";
    if (courseName === "دروس في العقيدة والسلوك") return "creed";
    if (courseName === "قصص الأنبياء عليهم السلام") return "prophets";
    if (courseName === "استدراك الحفظ ومراجعة القرآن") return "catchup";
    if (courseName === "مسابقات ثقافية") return "culture";
    if (courseName === "جلسات الصحة الجسمية") return "health";
    if (courseName === "رحلات ترفيهية" || courseName === "جلسة رحلة ترفيهية") return "trip";
    if (courseName === "مسابقات قرآنية") return "qurancomp";
    if (courseName === "نشاطات رياضية") return "sports";
    return "course";
  }

  /**
   * تفعيل الأحداث على النجوم التفاعلية في المودال
   */
  function activateStarsInteractive() {
    const starContainers = evalDynamicFieldsContainer.querySelectorAll(".stars-stars-container");
    starContainers.forEach(container => {
      const stars = container.querySelectorAll("i");
      const hiddenInput = container.nextElementSibling;
      const metricName = container.parentElement.getAttribute("data-metric");

      stars.forEach(star => {
        // حدث الماوس فوق النجوم
        star.addEventListener("mouseenter", () => {
          if (evalAttendance.value === "غائب") return;
          const val = parseInt(star.getAttribute("data-value"));
          highlightStars(stars, val);
        });

        // حدث الماوس يغادر الحاوية
        star.addEventListener("mouseleave", () => {
          if (evalAttendance.value === "غائب") return;
          const val = parseInt(hiddenInput.value);
          highlightStars(stars, val);
        });

        // حدث الضغط على النجمة
        star.addEventListener("click", () => {
          if (evalAttendance.value === "غائب") return;
          const val = parseInt(star.getAttribute("data-value"));
          hiddenInput.value = val;
          highlightStars(stars, val);
          
          // تشغيل قواعد المنح التلقائي للشارات
          runAutoBadgeRules(metricName, val);
          
          // تحديث إجمالي النجوم والشرائح
          updatePointsSummary();
        });
      });
    });
  }

  function highlightStars(starsList, activeValue) {
    starsList.forEach(s => {
      const val = parseInt(s.getAttribute("data-value"));
      if (val <= activeValue) {
        s.className = "ph-fill ph-star";
        s.style.color = "var(--gold)";
      } else {
        s.className = "ph ph-star";
        s.style.color = "#ccc";
      }
    });
  }

  function setStarValue(metricKey, value) {
    const input = document.getElementById(`metric-${metricKey}`);
    if (input) {
      input.value = value;
      const container = input.previousElementSibling;
      if (container && container.classList.contains("stars-stars-container")) {
        const stars = container.querySelectorAll("i");
        highlightStars(stars, value);
      }
    }
  }

  /**
   * قواعد منح الشارات تلقائياً بناءً على تقييم النجوم
   */
  function runAutoBadgeRules(metricName, val) {
    if (val < 5) return; // الشارة تمنح تلقائياً فقط عند الحصول على 5 نجوم (الحد الأقصى)
    
    const behaviorEl = document.getElementById("metric-behavior");
    if (!behaviorEl) return; // Skip if children criteria don't exist (e.g. for adults)
    
    let badgeToGrant = "";
    if (metricName === "behavior") {
      badgeToGrant = "أفضل سلوك";
    } else if (metricName === "discipline") {
      badgeToGrant = "الأكثر انضباطاً";
    } else if (metricName === "participation") {
      badgeToGrant = "الأكثر مشاركة";
    } else if (metricName === "quran-مقدار الحفظ") {
      badgeToGrant = "حافظ متميز";
    } else if (metricName === "quran-أحكام التجويد" || metricName === "qurancomp-التجويد") {
      badgeToGrant = "متفوق في التجويد";
    }

    // تحقق من شارة نجم الحلقة والطالب المثالي
    const behaviorVal = parseInt(document.getElementById("metric-behavior").value) || 0;
    const disciplineVal = parseInt(document.getElementById("metric-discipline").value) || 0;
    const respectVal = parseInt(document.getElementById("metric-respect").value) || 0;
    const partVal = parseInt(document.getElementById("metric-participation").value) || 0;

    if (behaviorVal === 5 && disciplineVal === 5 && respectVal === 5 && partVal === 5) {
      checkBadgeCheckbox("الطالب المثالي");
      checkBadgeCheckbox("نجم الحلقة");
    }

    if (badgeToGrant) {
      checkBadgeCheckbox(badgeToGrant);
    }
  }

  function checkBadgeCheckbox(badgeName) {
    const chk = document.querySelector(`input[name="badges-chk"][value="${badgeName}"]`);
    if (chk) {
      chk.checked = true;
    }
  }

  function calculateOverallStarsAndPointsFromUI() {
    if (currentEvalStudent && currentEvalStudent.id && currentEvalStudent.id.startsWith("AD")) {
      return { stars: 0, points: 0 };
    } else {
      // Children calculation
      const sectionAverages = [];

      // 1. التقييم العام
      const behaviorEl = document.getElementById("metric-behavior");
      if (behaviorEl) {
        const behavior = parseInt(behaviorEl.value) || 0;
        const discipline = parseInt(document.getElementById("metric-discipline").value) || 0;
        const genStarsSum = behavior + discipline;
        const genStarsAvg = genStarsSum / 2;
        sectionAverages.push(genStarsAvg);
      }

      // 2. مقرر القرآن الكريم
      if (agendaQuran.checked) {
        const qTypeSelect = document.getElementById("eval-quran-type");
        const qType = qTypeSelect ? qTypeSelect.value : "حفظ جديد";
        
        let p1 = 0;
        let p2 = 0;
        let p3 = 0;
        
        if (qType === "مراجعة") {
          p1 = parseInt(document.getElementById("metric-quran-مستوى المراجعة").value) || 0;
          p2 = parseInt(document.getElementById("metric-quran-التركيز-مراجعة").value) || 0;
          p3 = parseInt(document.getElementById("metric-quran-التجويد-مراجعة").value) || 0;
        } else {
          p1 = parseInt(document.getElementById("metric-quran-مقدار الحفظ").value) || 0;
          p2 = parseInt(document.getElementById("metric-quran-التركيز").value) || 0;
          p3 = parseInt(document.getElementById("metric-quran-التجويد").value) || 0;
        }
        
        const qStarsSum = p1 + p2 + p3;
        const qStarsAvg = qStarsSum / 3;
        sectionAverages.push(qStarsAvg);
      }

      const overallStars = sectionAverages.length > 0 ? (sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length) : 0;
      let totalStars = Math.min(3, Math.max(0, Math.round(overallStars)));

      // Check for manual override in the UI
      const starsEarnedInput = document.getElementById("eval-stars-earned");
      if (starsEarnedInput && document.activeElement === starsEarnedInput) {
        totalStars = Math.min(3, Math.max(0, parseInt(starsEarnedInput.value) || 0));
      }

      let totalPoints = totalStars * 2;

      // Add participation bonuses
      const creedPart = document.getElementById("eval-creed-participated");
      if (creedPart && creedPart.checked) {
        totalPoints += 1;
      }
      const culturePart = document.getElementById("eval-culture-participated");
      if (culturePart && culturePart.checked) {
        totalPoints += 1;
      }

      return { stars: totalStars, points: totalPoints };
    }
  }

  let autoSaveTimeout = null;
  function triggerAutoSave() {
    if (!currentEvalStudent) return;
    
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    const indicator = document.getElementById("autosave-indicator");
    if (indicator) {
      indicator.innerHTML = `<i class="ph-bold ph-spinner-gap" style="color: #fbbf24; animation: spin 1s linear infinite;"></i> <span>جارٍ الحفظ تلقائياً...</span>`;
    }
    
    autoSaveTimeout = setTimeout(() => {
      try {
        const attendanceVal = evalAttendance.value;
        const isAbsent = (attendanceVal === "غائب");
        let draftObj;

        if (currentEvalStudent.id && currentEvalStudent.id.startsWith("AD")) {
          // Adults
          if (isAbsent) {
            draftObj = {
              studentId: currentEvalStudent.id,
              studentName: currentEvalStudent.name,
              attendance: "غائب",
              activityType: "حفظ",
              surah: "",
              fromVerse: 0,
              toVerse: 0,
              notes: "غائب عن الحضور",
              courseName: "تحفيظ القرآن",
              stars: 0,
              points: 0,
              grades: null
            };
          } else {
            const type = document.getElementById("eval-adult-type")?.value || "حفظ جديد";
            const surah = document.getElementById("eval-adult-surah")?.value.trim() || "";
            const fromVerse = Number(document.getElementById("eval-adult-from")?.value) || 0;
            const toVerse = Number(document.getElementById("eval-adult-to")?.value) || 0;
            const notes = document.getElementById("eval-adult-notes")?.value.trim() || "";
            
            let grades = {};
            if (type === "مراجعة") {
              grades = {
                revLevel: document.getElementById("metric-adult-rev-level")?.value || "ممتاز",
                focus: document.getElementById("metric-adult-rev-focus")?.value || "ممتاز",
                tajweed: document.getElementById("metric-adult-rev-tajweed")?.value || "ممتاز"
              };
            } else {
              grades = {
                qty: document.getElementById("metric-adult-hifz-qty")?.value || "ممتاز",
                focus: document.getElementById("metric-adult-hifz-focus")?.value || "ممتاز",
                tajweed: document.getElementById("metric-adult-hifz-tajweed")?.value || "ممتاز"
              };
            }

            draftObj = {
              studentId: currentEvalStudent.id,
              studentName: currentEvalStudent.name,
              attendance: "حاضر",
              activityType: type,
              surah: surah,
              fromVerse: fromVerse,
              toVerse: toVerse,
              notes: notes,
              courseName: "تحفيظ القرآن",
              stars: 0,
              points: 0,
              grades: grades
            };
          }
        } else {
          // Kids
          let totalStars = 0;
          let totalPoints = 0;
          let generalCriteria = {};
          let courseEvaluations = [];
          let quranProgress = null;
          const notesStr = isAbsent ? "" : (document.getElementById("metric-notes-general")?.value || "");

          if (!isAbsent) {
            const behavior = parseInt(document.getElementById("metric-behavior")?.value) || 0;
            const discipline = parseInt(document.getElementById("metric-discipline")?.value) || 0;
            
            generalCriteria = {
              "السلوك": behavior,
              "الانضباط": discipline
            };

            if (agendaQuran.checked) {
              const qSurah = document.getElementById("eval-quran-surah")?.value.trim() || "";
              const qFrom = Number(document.getElementById("eval-quran-from")?.value) || 0;
              const qTo = Number(document.getElementById("eval-quran-to")?.value) || 0;
              const qType = document.getElementById("eval-quran-type")?.value || "حفظ جديد";
              const qNotes = document.getElementById("metric-notes-quran")?.value.trim() || "";

              let p1 = 0, p2 = 0, p3 = 0;
              if (qType === "مراجعة") {
                p1 = parseInt(document.getElementById("metric-quran-مستوى المراجعة")?.value) || 0;
                p2 = parseInt(document.getElementById("metric-quran-التركيز-مراجعة")?.value) || 0;
                p3 = parseInt(document.getElementById("metric-quran-التجويد-مراجعة")?.value) || 0;
              } else {
                p1 = parseInt(document.getElementById("metric-quran-مقدار الحفظ")?.value) || 0;
                p2 = parseInt(document.getElementById("metric-quran-التركيز")?.value) || 0;
                p3 = parseInt(document.getElementById("metric-quran-التجويد")?.value) || 0;
              }

              courseEvaluations.push({
                courseName: "حفظ القرآن ومراجعته",
                criteria: {
                  "مقدار الحفظ / مستوى المراجعة": p1,
                  "التركيز": p2,
                  "التجويد": p3
                },
                points: (p1 + p2 + p3) * 2,
                notes: qNotes
              });

              if (qSurah) {
                quranProgress = {
                  surah: qSurah,
                  fromVerse: qFrom,
                  toVerse: qTo,
                  type: qType,
                  notes: qNotes
                };
              }
            }

            if (agendaCreed.checked) {
              const lessonType = document.getElementById("eval-creed-lesson-type")?.value || "السلوك";
              const participated = document.getElementById("eval-creed-participated")?.checked || false;
              const creedNotes = document.getElementById("metric-notes-creed")?.value.trim() || "";
              
              courseEvaluations.push({
                courseName: "الدروس العلمية",
                lessonType: lessonType,
                participated: participated,
                points: participated ? 1 : 0,
                notes: creedNotes
              });
            }

            if (agendaCulture.checked) {
              const participated = document.getElementById("eval-culture-participated")?.checked || false;
              const cultureNotes = document.getElementById("metric-notes-culture")?.value.trim() || "";
              
              courseEvaluations.push({
                courseName: "المسابقات الثقافية",
                participated: participated,
                points: participated ? 1 : 0,
                notes: cultureNotes
              });
            }

            const score = calculateOverallStarsAndPointsFromUI();
            totalStars = score.stars;
            totalPoints = score.points;
          }

          draftObj = {
            studentId: currentEvalStudent.id,
            studentName: currentEvalStudent.name,
            attendance: attendanceVal,
            generalCriteria: generalCriteria,
            generalPoints: (generalCriteria["السلوك"] ? ((generalCriteria["السلوك"] + generalCriteria["الانضباط"]) * 2) : 0),
            courseEvaluations: courseEvaluations,
            quranProgress: quranProgress,
            badgesGranted: [],
            totalPointsEarned: totalPoints,
            totalStarsEarned: totalStars,
            notes: notesStr
          };
        }

        reportsData[currentEvalStudent.id] = draftObj;
        localStorage.setItem("masjid_session_reports", JSON.stringify(reportsData));
        
        if (indicator) {
          if (navigator.onLine) {
            indicator.innerHTML = `<i class="ph-bold ph-check-circle" style="color: #10b981;"></i> <span>تم حفظ التعديلات</span>`;
          } else {
            indicator.innerHTML = `<i class="ph-bold ph-check-circle" style="color: #3b82f6;"></i> <span>تم الحفظ محلياً (دون اتصال)</span>`;
          }
        }
      } catch (err) {
        console.error("[AutoSave] Error during auto saving:", err);
      }
    }, 300);
  }

  /**
   * حساب إجمالي النجوم والنقاط وتحديث الملخص
   */
  function updatePointsSummary() {
    if (evalAttendance.value === "غائب") {
      const totalStarsVal = document.getElementById("stars-total-val");
      const totalPointsVal = document.getElementById("points-total-val");
      if (totalStarsVal) totalStarsVal.textContent = "0";
      if (totalPointsVal) totalPointsVal.textContent = "0";
      return;
    }

    const { stars, points } = calculateOverallStarsAndPointsFromUI();

    const totalStarsVal = document.getElementById("stars-total-val");
    const totalPointsVal = document.getElementById("points-total-val");
    const starsEarnedInput = document.getElementById("eval-stars-earned");

    if (starsEarnedInput && document.activeElement !== starsEarnedInput) {
      starsEarnedInput.value = stars;
    }
    
    if (totalStarsVal) totalStarsVal.textContent = stars;
    if (totalPointsVal) totalPointsVal.textContent = points;
  }

  // Save student provisional report
  evalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentEvalStudent) return;

    const attendanceVal = evalAttendance.value;
    const isAbsent = (attendanceVal === "غائب");

    let reportObj;

    if (currentEvalStudent.id && currentEvalStudent.id.startsWith("AD")) {
      // Adult evaluation mapping
      if (isAbsent) {
        reportObj = {
          studentId: currentEvalStudent.id,
          studentName: currentEvalStudent.name,
          attendance: "غائب",
          activityType: "حفظ",
          surah: "",
          fromVerse: 0,
          toVerse: 0,
          notes: "غائب عن الحضور",
          courseName: "تحفيظ القرآن",
          stars: 0,
          points: 0,
          grades: null
        };
      } else {
        const type = document.getElementById("eval-adult-type").value;
        const surah = document.getElementById("eval-adult-surah").value.trim();
        const fromVerse = Number(document.getElementById("eval-adult-from").value) || 0;
        const toVerse = Number(document.getElementById("eval-adult-to").value) || 0;
        const notes = document.getElementById("eval-adult-notes").value.trim();
        
        let grades = {};
        if (type === "مراجعة") {
          grades = {
            revLevel: document.getElementById("metric-adult-rev-level")?.value || "ممتاز",
            focus: document.getElementById("metric-adult-rev-focus")?.value || "ممتاز",
            tajweed: document.getElementById("metric-adult-rev-tajweed")?.value || "ممتاز"
          };
        } else {
          grades = {
            qty: document.getElementById("metric-adult-hifz-qty")?.value || "ممتاز",
            focus: document.getElementById("metric-adult-hifz-focus")?.value || "ممتاز",
            tajweed: document.getElementById("metric-adult-hifz-tajweed")?.value || "ممتاز"
          };
        }

        reportObj = {
          studentId: currentEvalStudent.id,
          studentName: currentEvalStudent.name,
          attendance: "حاضر",
          activityType: type,
          surah: surah,
          fromVerse: fromVerse,
          toVerse: toVerse,
          notes: notes,
          courseName: "تحفيظ القرآن",
          stars: 0,
          points: 0,
          grades: grades
        };
      }
    } else {
      // Children evaluation mapping
      let totalStars = 0;
      let totalPoints = 0;
      let generalCriteria = {};
      let courseEvaluations = [];
      let quranProgress = null;
      const notesStr = isAbsent ? "" : (document.getElementById("metric-notes-general").value || "");

      if (!isAbsent) {
        // 1. التقييم العام (السلوك والتربية، الانضباط والالتزام)
        const behavior = parseInt(document.getElementById("metric-behavior").value) || 0;
        const discipline = parseInt(document.getElementById("metric-discipline").value) || 0;
        
        generalCriteria = {
          "السلوك": behavior,
          "الانضباط": discipline
        };

        // 2. القرآن الكريم
        if (agendaQuran.checked) {
          const qSurah = document.getElementById("eval-quran-surah").value.trim();
          const qFrom = Number(document.getElementById("eval-quran-from").value) || 0;
          const qTo = Number(document.getElementById("eval-quran-to").value) || 0;
          const qType = document.getElementById("eval-quran-type").value;
          const qNotes = document.getElementById("metric-notes-quran").value.trim();

          let p1 = 0, p2 = 0, p3 = 0;
          if (qType === "مراجعة") {
            p1 = parseInt(document.getElementById("metric-quran-مستوى المراجعة").value) || 0;
            p2 = parseInt(document.getElementById("metric-quran-التركيز-مراجعة").value) || 0;
            p3 = parseInt(document.getElementById("metric-quran-التجويد-مراجعة").value) || 0;
          } else {
            p1 = parseInt(document.getElementById("metric-quran-مقدار الحفظ").value) || 0;
            p2 = parseInt(document.getElementById("metric-quran-التركيز").value) || 0;
            p3 = parseInt(document.getElementById("metric-quran-التجويد").value) || 0;
          }

          courseEvaluations.push({
            courseName: "حفظ القرآن ومراجعته",
            criteria: {
              "مقدار الحفظ / مستوى المراجعة": p1,
              "التركيز": p2,
              "التجويد": p3
            },
            points: (p1 + p2 + p3) * 2,
            notes: qNotes
          });

          if (qSurah) {
            quranProgress = {
              surah: qSurah,
              fromVerse: qFrom,
              toVerse: qTo,
              type: qType,
              notes: qNotes
            };
          }
        }

        // 3. الدروس العلمية
        if (agendaCreed.checked) {
          const lessonType = document.getElementById("eval-creed-lesson-type").value;
          const participated = document.getElementById("eval-creed-participated").checked;
          const creedNotes = document.getElementById("metric-notes-creed")?.value.trim() || "";
          
          courseEvaluations.push({
            courseName: "الدروس العلمية",
            lessonType: lessonType,
            participated: participated,
            points: participated ? 1 : 0,
            notes: creedNotes
          });
        }

        // 4. المسابقات الثقافية
        if (agendaCulture.checked) {
          const participated = document.getElementById("eval-culture-participated").checked;
          const cultureNotes = document.getElementById("metric-notes-culture")?.value.trim() || "";
          
          courseEvaluations.push({
            courseName: "المسابقات الثقافية",
            participated: participated,
            points: participated ? 1 : 0,
            notes: cultureNotes
          });
        }

        // Read total stars and points from calculation helper
        const score = calculateOverallStarsAndPointsFromUI();
        totalStars = score.stars;
        totalPoints = score.points;
      }

      reportObj = {
        studentId: currentEvalStudent.id,
        studentName: currentEvalStudent.name,
        attendance: attendanceVal,
        generalCriteria: generalCriteria,
        generalPoints: (generalCriteria["السلوك"] ? ((generalCriteria["السلوك"] + generalCriteria["الانضباط"]) * 2) : 0),
        courseEvaluations: courseEvaluations,
        quranProgress: quranProgress,
        badgesGranted: [],
        totalPointsEarned: totalPoints,
        totalStarsEarned: totalStars,
        notes: notesStr
      };
    }

    reportsData[currentEvalStudent.id] = reportObj;
    
    // Save to sessionStorage
    localStorage.setItem("masjid_session_reports", JSON.stringify(reportsData));

    // Reset indicator to saved successfully
    const indicator = document.getElementById("autosave-indicator");
    if (indicator) {
      if (navigator.onLine) {
        indicator.innerHTML = `<i class="ph-bold ph-check-circle" style="color: #10b981;"></i> <span>تم الحفظ تلقائياً</span>`;
      } else {
        indicator.innerHTML = `<i class="ph-bold ph-check-circle" style="color: #3b82f6;"></i> <span>تم الحفظ محلياً (دون اتصال)</span>`;
      }
    }

    closeEval();
    renderStudentsGrid();
  });

  // --- Send Batch Reports to Database ---
  submitBatchBtn.addEventListener("click", async () => {
    // 1. Validation check
    if (!allStudents || allStudents.length === 0) {
      alert("خطأ: لم يتم تحميل قائمة الطلاب بعد، أو لا يوجد طلاب مقبولون في هذه الحلقة لإرسال رصدهم.");
      return;
    }

    const missingStudents = [];
    allStudents.forEach(s => {
      const rep = reportsData[s.id];
      if (!rep) {
        missingStudents.push(s.name);
      } else if (!rep.attendance.startsWith("غائب")) {
        if (s.id && s.id.startsWith("AD")) {
          // No star rating verification needed for adults
          return;
        }
        const g = rep.generalCriteria || {};
        const behavior = g["السلوك"] || 0;
        const discipline = g["الانضباط"] || 0;

        if (behavior === 0 || discipline === 0) {
          missingStudents.push(s.name);
        }
      }
    });

    if (missingStudents.length > 0) {
      alert(`الطلاب:\n- ${missingStudents.join("\n- ")}\nلم يتم تقييمهم بعد.`);
      return;
    }

    const isEditing = localStorage.getItem("masjid_session_is_editing") === "true";

    // 2. Confirmation
    const evaluationsArray = Object.values(reportsData);
    const count = evaluationsArray.length;
    const confirmMsg = isEditing 
      ? `هل أنت متأكد من حفظ التعديلات على هذه الحلقة لـ (${count}) طلاب؟`
      : `هل أنت متأكد من إنهاء الحلقة التعليمية الحالية وحفظ تقارير التقييم لـ (${count}) طلاب؟`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    // 3. Submit
    submitBatchBtn.disabled = true;
    const originalText = submitBatchBtn.innerHTML;
    submitBatchBtn.innerHTML = `<i class="ph-bold ph-spinner-gap animate-spin"></i> جاري حفظ البيانات في قاعدة البيانات...`;

    try {
      let success = false;
      if (isEditing) {
        const category = localStorage.getItem("masjid_session_category") || "الصغار";
        const selectedCourses = [];
        if (category === "الكبار") {
          if (agendaAdultQuran && agendaAdultQuran.checked) selectedCourses.push("تحفيظ القرآن");
          if (agendaAdultTajweed && agendaAdultTajweed.checked) selectedCourses.push("علوم التجويد");
          if (agendaAdultSharia && agendaAdultSharia.checked) selectedCourses.push("الدروس الشرعية");
        } else {
          if (agendaQuran.checked) selectedCourses.push("حفظ القرآن ومراجعته");
          if (agendaCreed.checked) selectedCourses.push("دروس في العقيدة والسلوك");
          if (agendaProphets.checked) selectedCourses.push("قصص الأنبياء عليهم السلام");
          if (agendaCatchup.checked) selectedCourses.push("استدراك الحفظ ومراجعة القرآن");
          if (agendaCulture.checked) selectedCourses.push("مسابقات ثقافية");
          if (agendaHealth.checked) selectedCourses.push("جلسات الصحة الجسمية");
          if (agendaQuranComp.checked) selectedCourses.push("مسابقات قرآنية");
          if (agendaSports.checked) selectedCourses.push("نشاطات رياضية");
        }

        const archiveCircleType = localStorage.getItem("masjid_session_circle") || "حلقة صباحية";
        success = await window.DB.updateSession(
          activeSession.sessionId,
          activeSession.date,
          activeSession.supervisorName,
          selectedCourses,
          evaluationsArray,
          archiveCircleType
        );
      } else {
        const category = localStorage.getItem("masjid_session_category") || "الصغار";
        const liveSelectedCourses = [];
        if (category === "الكبار") {
          if (agendaAdultQuran && agendaAdultQuran.checked) liveSelectedCourses.push("تحفيظ القرآن");
          if (agendaAdultTajweed && agendaAdultTajweed.checked) liveSelectedCourses.push("علوم التجويد");
          if (agendaAdultSharia && agendaAdultSharia.checked) liveSelectedCourses.push("الدروس الشرعية");
        } else {
          if (agendaQuran.checked) liveSelectedCourses.push("حفظ القرآن ومراجعته");
          if (agendaCreed.checked) liveSelectedCourses.push("دروس في العقيدة والسلوك");
          if (agendaProphets.checked) liveSelectedCourses.push("قصص الأنبياء عليهم السلام");
          if (agendaCatchup.checked) liveSelectedCourses.push("استدراك الحفظ ومراجعة القرآن");
          if (agendaCulture.checked) liveSelectedCourses.push("مسابقات ثقافية");
          if (agendaHealth.checked) liveSelectedCourses.push("جلسات الصحة الجسمية");
          if (agendaQuranComp.checked) liveSelectedCourses.push("مسابقات قرآنية");
          if (agendaSports.checked) liveSelectedCourses.push("نشاطات رياضية");
        }
        success = await window.DB.endSession(activeSession.sessionId, evaluationsArray, liveSelectedCourses);
      }

      if (success) {
        if (success.offline) {
          alert("⚠️ تعذر الاتصال بالإنترنت حالياً. تم حفظ الحلقة والتقييمات محلياً في المتصفح بنجاح! سيتم إرسالها تلقائياً عند عودة الاتصال.");
        } else {
          alert(isEditing ? "✅ تم حفظ تعديلات الحلقة بنجاح وتحديث النقاط في Sheets!" : "✅ تم تسجيل وإغلاق الحلقة بنجاح! تم حفظ كافة البيانات وتحديث النقاط في Sheets.");
        }
        
        // Clear session
        localStorage.removeItem("masjid_session_active");
        localStorage.removeItem("masjid_session_id");
        localStorage.removeItem("masjid_session_circle");
        localStorage.removeItem("masjid_session_date");
        localStorage.removeItem("masjid_session_time");
        localStorage.removeItem("masjid_session_supervisor");
        localStorage.removeItem("masjid_session_agenda");
        localStorage.removeItem("masjid_session_reports");
        localStorage.removeItem("masjid_session_courses");
        localStorage.removeItem("masjid_session_is_editing");
        
        showNoSession();
      } else {
        throw new Error("API failure");
      }
    } catch (error) {
      console.error(error);
      alert("❌ حدث خطأ غير متوقع أثناء رصد أو حفظ بيانات الحلقة.");
    } finally {
      submitBatchBtn.disabled = false;
      submitBatchBtn.innerHTML = originalText;
    }
  });

  // --- Finished Sessions Archive Logic ---
  // --- Finished Sessions Archive Logic ───
  function renderArchiveSessions(sessions) {
    const listContainer = document.getElementById("archive-sessions-list");
    if (!listContainer) return;
    
    if (sessions.length === 0) {
      listContainer.innerHTML = "<div style='text-align:center; padding: 2.5rem; color: var(--text-muted); font-weight: 700;'>لا توجد حلقات مطابقة للبحث في الأرشيف.</div>";
      return;
    }
    
    listContainer.innerHTML = sessions.map(s => {
      const isAdults = s.category === "الكبار";
      const circleLabel = s.circleType || "حلقة";
      let iconClass = "ph-users";
      let displayLabel = "الكبار";
      
      if (!isAdults) {
        iconClass = circleLabel.includes("مسائية") ? "ph-moon" : "ph-sun";
        displayLabel = circleLabel;
      }
      
      return `
        <div class="about-card" style="margin: 0; padding: 1.25rem; background: #fff; border: 1px solid rgba(200, 161, 90, 0.15); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-radius: 12px;">
          <div style="flex: 1; min-width: 250px;">
            <h4 style="color: var(--green-dark); font-weight: 800; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="ph-bold ${iconClass}" style="color: var(--gold); font-size: 1.15rem;"></i>
              <span>جلسة يوم ${s.date} — </span>
              <span class="badge" style="background: ${isAdults ? 'rgba(212, 175, 55, 0.15)' : 'rgba(13, 92, 70, 0.08)'}; color: ${isAdults ? '#7a5900' : 'var(--green-dark)'}; padding: 0.2rem 0.6rem; font-size: 0.78rem; border-radius: 30px; font-weight: 800;">
                ${displayLabel}
              </span>
            </h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
              <strong>المشرف:</strong> ${s.supervisor} | 
              <strong>المقررات:</strong> ${s.courses}
            </p>
          </div>
          const actionsHtml = window.DB.hasFullAccess() ? `
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn edit-archive-btn" data-id="${s.id}" style="padding: 0.4rem 1rem; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 12px;">
                <i class="ph-bold ph-pencil"></i> تعديل
              </button>
              <button class="btn delete-archive-btn" data-id="${s.id}" style="background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff4d4d; padding: 0.4rem 1rem; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 12px;">
                <i class="ph-bold ph-trash"></i> حذف
              </button>
            </div>
          ` : '';

          return `
            <div class="about-card" style="margin: 0; padding: 1.25rem; background: #fff; border: 1px solid rgba(200, 161, 90, 0.15); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-radius: 12px;">
              <div style="flex: 1; min-width: 250px;">
                <h4 style="color: var(--green-dark); font-weight: 800; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.4rem;">
                  <i class="ph-bold ${iconClass}" style="color: var(--gold); font-size: 1.15rem;"></i>
                  <span>جلسة يوم ${s.date} — </span>
                  <span class="badge" style="background: ${isAdults ? 'rgba(212, 175, 55, 0.15)' : 'rgba(13, 92, 70, 0.08)'}; color: ${isAdults ? '#7a5900' : 'var(--green-dark)'}; padding: 0.2rem 0.6rem; font-size: 0.78rem; border-radius: 30px; font-weight: 800;">
                    ${displayLabel}
                  </span>
                </h4>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
                  <strong>المشرف:</strong> ${s.supervisor} | 
                  <strong>المقررات:</strong> ${s.courses}
                </p>
              </div>
              ${actionsHtml}
            </div>
          `;
      `;
    }).join("");
    
    // Bind event listeners
    listContainer.querySelectorAll(".edit-archive-btn").forEach(btn => {
      btn.onclick = () => editArchivedSession(btn.getAttribute("data-id"));
    });
    listContainer.querySelectorAll(".delete-archive-btn").forEach(btn => {
      btn.onclick = () => deleteArchivedSession(btn.getAttribute("data-id"));
    });
  }

  async function loadSessionsArchive() {
    const listContainer = document.getElementById("archive-sessions-list");
    const loadingIndicator = document.getElementById("archive-loading-text");
    if (!listContainer) return;
    
    if (unsubscribeSessions) {
      unsubscribeSessions();
      unsubscribeSessions = null;
    }
    
    if (loadingIndicator) {
      loadingIndicator.style.display = "block";
    }
    
    if (!window.DB || !window.DB.db) {
      console.warn("[Teacher] DB not ready yet, retrying archive load in 100ms...");
      setTimeout(loadSessionsArchive, 100);
      return;
    }

    function formatFirestoreDate(val) {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (val.seconds) {
        try {
          const d = new Date(val.seconds * 1000);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (e) {}
      }
      if (typeof val.toDate === "function") {
        try {
          const d = val.toDate();
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (e) {}
      }
      return String(val);
    }

    function toComparableDate(dateStr) {
      if (!dateStr || typeof dateStr !== "string") return "";
      if (dateStr.indexOf("-") === 4) return dateStr;
      const parts = dateStr.split("-");
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    }
    
    const db = window.DB.db;

    // Helper function to process document snapshots
    function processSnapshot(snapshot) {
      const loadingIndicator = document.getElementById("archive-loading-text");
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
      const finished = [];
      snapshot.forEach(docSnap => {
        try {
          const data = docSnap.data();
          if (data["الحالة"] === "منتهية" || data.status === "منتهية") {
            const rawDate = data["التاريخ"] || data.date || "";
            finished.push({
              id: docSnap.id,
              SessionID: data.SessionID || docSnap.id,
              date: formatFirestoreDate(rawDate),
              supervisor: data["اسم المشرف"] || data.supervisor || "",
              courses: Array.isArray(data["المقررات المختارة"]) ? data["المقررات المختارة"].join("، ") : (data["المقررات المختارة"] || data.courses || ""),
              circleType: String(data["اسم الحلقة"] || data["نوع الحلقة"] || data.circleType || "حلقة"),
              status: data["الحالة"] || data.status || "منتهية",
              category: data["الفئة"] || data.category || "الصغار"
            });
          }
        } catch (itemErr) {
          console.error("[Teacher] Error parsing archived session item:", docSnap.id, itemErr);
        }
      });
      
      // Sort newest first
      finished.sort((a, b) => {
        const compA = toComparableDate(a.date);
        const compB = toComparableDate(b.date);
        return compB.localeCompare(compA);
      });

      cachedArchivedSessions = finished;
      
      applyArchiveFilters();
    }

    // Load instantly using getDocs
    try {
      const snap = await getDocs(collection(db, "sessions"));
      processSnapshot(snap);
    } catch (err) {
      console.error("[Teacher] Instantly loading archive from getDocs failed, waiting for listener:", err);
    }

    // Attach real-time onSnapshot listener
    try {
      unsubscribeSessions = onSnapshot(collection(db, "sessions"), (snapshot) => {
        processSnapshot(snapshot);
      }, (err) => {
        console.error("[Teacher] Error listening to sessions:", err);
        const loadingIndicator = document.getElementById("archive-loading-text");
        if (loadingIndicator) loadingIndicator.style.display = "none";
        // Only set error message if archive is still empty
        if (cachedArchivedSessions.length === 0) {
          listContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ff4d4d;">❌ فشل تحميل الأرشيف من السيرفر.</div>`;
        }
      });
    } catch (err) {
      console.error("[Teacher] Failed to setup onSnapshot sessions listener:", err);
    }
  }

  async function editArchivedSession(sessionId) {
    if (!confirm("هل تريد تعديل هذه الحلقة؟ سيتم تحميل تقييمات الطلاب وتعديلها.")) return;
    
    // Show a loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.style = "position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 10000; color: white; font-weight: 800;";
    loadingOverlay.innerHTML = `<div><span class="spinner-circle" style="width:24px; height:24px; border-width:2px; display:inline-block; vertical-align:middle; margin-left:0.5rem;"></span> جاري تحميل بيانات التقييم...</div>`;
    document.body.appendChild(loadingOverlay);
    
    try {
      const sessions = await window.DB.getAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        alert("فشل العثور على الجلسة المطلوبة.");
        loadingOverlay.remove();
        return;
      }
      
      const evals = await window.DB.getSessionEvaluations(sessionId);
      
      const sessionCategoryVal = session.category || session["الفئة"] || "الصغار";
      
      localStorage.setItem("masjid_session_active", "true");
      localStorage.setItem("masjid_session_id", sessionId);
      localStorage.setItem("masjid_session_circle", session.circleType || "حلقة صباحية");
      localStorage.setItem("masjid_session_date", session.date);
      localStorage.setItem("masjid_session_supervisor", session.supervisor);
      localStorage.setItem("masjid_session_category", sessionCategoryVal);
      
      // Parse agenda from session courses
      const coursesStr = session.courses || "";
      let agenda = {};
      
      if (sessionCategoryVal === "الكبار") {
        agenda = {
          adultQuran: coursesStr.includes("تحفيظ القرآن"),
          adultTajweed: coursesStr.includes("علوم التجويد") || coursesStr.includes("علم التجويد"),
          adultSharia: coursesStr.includes("الدروس الشرعية")
        };
      } else {
        agenda = {
          quran: coursesStr.includes("حفظ القرآن"),
          creed: coursesStr.includes("العقيدة والسلوك"),
          prophets: coursesStr.includes("قصص الأنبياء"),
          catchup: coursesStr.includes("استدراك الحفظ"),
          culture: coursesStr.includes("مسابقات ثقافية"),
          health: coursesStr.includes("جلسات الصحة"),
          trip: coursesStr.includes("رحلات ترفيهية") || coursesStr.includes("جلسة رحلة ترفيهية"),
          quranComp: coursesStr.includes("مسابقات قرآنية"),
          sports: coursesStr.includes("نشاطات رياضية")
        };
      }
      localStorage.setItem("masjid_session_agenda", JSON.stringify(agenda));
      
      // Parse and restore session courses in localStorage
      let restoredCoursesList = [];
      if (sessionCategoryVal === "الكبار") {
        if (agenda.adultQuran) restoredCoursesList.push("تحفيظ القرآن");
        if (agenda.adultTajweed) restoredCoursesList.push("علوم التجويد");
        if (agenda.adultSharia) restoredCoursesList.push("الدروس الشرعية");
      } else {
        if (agenda.quran) restoredCoursesList.push("حفظ القرآن ومراجعته");
        if (agenda.creed) restoredCoursesList.push("دروس في العقيدة والسلوك");
        if (agenda.prophets) restoredCoursesList.push("قصص الأنبياء عليهم السلام");
        if (agenda.catchup) restoredCoursesList.push("استدراك الحفظ ومراجعة القرآن");
        if (agenda.culture) restoredCoursesList.push("مسابقات ثقافية");
        if (agenda.health) restoredCoursesList.push("جلسات الصحة الجسمية");
        if (agenda.quranComp) restoredCoursesList.push("مسابقات قرآنية");
        if (agenda.sports) restoredCoursesList.push("نشاطات رياضية");
      }
      localStorage.setItem("masjid_session_courses", JSON.stringify(restoredCoursesList));
      
      // Ensure allStudents is loaded
      if (allStudents.length === 0) {
        const sessionCategoryVal = session.category || session["الفئة"] || localStorage.getItem("masjid_session_category") || "الصغار";
        if (sessionCategoryVal === "الكبار") {
          let section = "رجال";
          if (session.circleType && (session.circleType.includes("نساء") || session.circleType.includes("إناث"))) {
            section = "نساء";
          }
          const adults = await window.DB.getAdultParticipants(section);
          allStudents = adults.filter(a => a.status === "مقبول" && a.id);
        } else {
          const students = await window.DB.getAllStudents();
          let confirmedStudents = students.filter(s => s.status === "مقبول" && s.id);
          if (session.circleType && session.circleType.includes("حلقة ذكور")) {
            confirmedStudents = confirmedStudents.filter(s => s.gender === "ذكر" || s["الجنس"] === "ذكر");
          } else if (session.circleType && session.circleType.includes("حلقة إناث")) {
            confirmedStudents = confirmedStudents.filter(s => s.gender === "أنثى" || s["الجنس"] === "أنثى");
          }
          allStudents = confirmedStudents;
        }
      }

      // Build reportsData map
      const reports = {};
      allStudents.forEach(s => {
        const ev = evals.find(e => e.studentId === s.id);
        if (ev) {
          reports[s.id] = ev;
        }
      });
      localStorage.setItem("masjid_session_reports", JSON.stringify(reports));
      localStorage.setItem("masjid_session_is_editing", "true");
      
      loadingOverlay.remove();
      
      // Re-initialize session view
      initSession();
      
    } catch (err) {
      console.error(err);
      alert("❌ فشل تحميل بيانات الحلقة. تحقق من الاتصال بالإنترنت.");
      loadingOverlay.remove();
    }
  }

  async function deleteArchivedSession(sessionId) {
    if (!confirm("⚠️ هل أنت متأكد تماماً من حذف هذه الحلقة نهائياً؟ سيتم إزالة حضور وتقييمات الطلاب ونقاطهم المرتبطة بها ولا يمكن التراجع عن هذا الإجراء.")) return;
    
    try {
      const success = await window.DB.deleteSession(sessionId);
      if (success) {
        alert("✅ تم حذف الحلقة وكافة تقييماتها بنجاح!");
        loadSessionsArchive();
      } else {
        alert("❌ فشل حذف الحلقة من قاعدة البيانات.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ حدث خطأ أثناء الاتصال بالسيرفر لحذف الحلقة.");
    }
  }
  
  // Bind archive filters and search input
  let archiveCategoryFilter = "all";
  const archiveSearchInput = document.getElementById("archive-search-input");

  function applyArchiveFilters() {
    const queryText = archiveSearchInput ? archiveSearchInput.value.trim().toLowerCase() : "";
    let filtered = cachedArchivedSessions;

    // 1. Category Filter
    if (archiveCategoryFilter === "kids") {
      filtered = filtered.filter(s => s.category !== "الكبار");
    } else if (archiveCategoryFilter === "adults") {
      filtered = filtered.filter(s => s.category === "الكبار");
    }

    // 2. Search Text Filter
    if (queryText) {
      filtered = filtered.filter(s => {
        const supervisor = String(s.supervisor || "").toLowerCase();
        const circleType = String(s.circleType || "").toLowerCase();
        const date = String(s.date || "");
        const courses = String(s.courses || "").toLowerCase();
        return supervisor.includes(queryText) ||
               circleType.includes(queryText) ||
               date.includes(queryText) ||
               courses.includes(queryText);
      });
    }

    renderArchiveSessions(filtered);
  }

  const filterAllBtn = document.getElementById("archive-filter-all");
  const filterKidsBtn = document.getElementById("archive-filter-kids");
  const filterAdultsBtn = document.getElementById("archive-filter-adults");

  const setFilterActive = (activeBtn, otherBtns) => {
    activeBtn.style.background = "var(--green)";
    activeBtn.style.color = "#fff";
    activeBtn.style.borderColor = "var(--green)";
    
    otherBtns.forEach(btn => {
      if (btn) {
        btn.style.background = "rgba(13, 92, 70, 0.05)";
        btn.style.color = "var(--green-dark)";
        btn.style.borderColor = "rgba(13, 92, 70, 0.15)";
      }
    });
  };

  if (filterAllBtn) {
    filterAllBtn.onclick = () => {
      archiveCategoryFilter = "all";
      setFilterActive(filterAllBtn, [filterKidsBtn, filterAdultsBtn]);
      applyArchiveFilters();
    };
  }
  if (filterKidsBtn) {
    filterKidsBtn.onclick = () => {
      archiveCategoryFilter = "kids";
      setFilterActive(filterKidsBtn, [filterAllBtn, filterAdultsBtn]);
      applyArchiveFilters();
    };
  }
  if (filterAdultsBtn) {
    filterAdultsBtn.onclick = () => {
      archiveCategoryFilter = "adults";
      setFilterActive(filterAdultsBtn, [filterAllBtn, filterKidsBtn]);
      applyArchiveFilters();
    };
  }

  if (archiveSearchInput) {
    archiveSearchInput.addEventListener("input", applyArchiveFilters);
  }

  // Expose archive callbacks globally for inline HTML onclick handlers
  window.editArchivedSession = editArchivedSession;
  window.deleteArchivedSession = deleteArchivedSession;

  // Load initial archive on boot unconditionally
  loadSessionsArchive();
});

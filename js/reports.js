/**
 * مسجد الشهداء — خدمة التقارير الأسبوعية وشهادات التخرج
 */

document.addEventListener("DOMContentLoaded", () => {
  // Check if student session is active
  const studentId = sessionStorage.getItem("masjid_parent_student_id");
  const phone = sessionStorage.getItem("masjid_parent_phone");

  if (!studentId || !phone) {
    // Redirect to login page if no active session
    window.location.replace("parent-portal.html");
    return;
  }

  // Reveal the body now that session check passed
  document.body.style.display = "block";

  // --- UI Elements ---
  const reportStudentNameHeader = document.getElementById("report-student-name-header");
  const reportsTabContainer = document.getElementById("reports-tab-container");
  const weeklyTabContent = document.getElementById("weekly-tab-content");
  const certificateTabContent = document.getElementById("certificate-tab-content");
  const weeklyReportsList = document.getElementById("weekly-reports-list");
  const certificateWrapper = document.getElementById("certificate-wrapper");

  // Print Elements
  const printStudentName = document.getElementById("print-student-name");
  const printStudentId = document.getElementById("print-student-id");
  const printWeek = document.getElementById("print-week");
  const printOverallGrade = document.getElementById("print-overall-grade");
  const printLevel = document.getElementById("print-level");
  const printCumStars = document.getElementById("print-cum-stars");
  const printStatAttendance = document.getElementById("print-stat-attendance");
  const printStatStars = document.getElementById("print-stat-stars");
  const printStatAyahs = document.getElementById("print-stat-ayahs");
  const printStatPoints = document.getElementById("print-stat-points");

  // Certificate Print Elements
  const certStudentName = document.getElementById("cert-student-name");
  const certTotalAyahs = document.getElementById("cert-total-ayahs");
  const certOverallGrade = document.getElementById("cert-overall-grade");
  const certFinalStars = document.getElementById("cert-final-stars");
  const certFinalLevel = document.getElementById("cert-final-level");

  // State
  let portalDataCache = null;

  // --- Helpers for Date Parsing and Formatting ---
  function parseDateStr(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    // Case 1: YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split('T')[0].split('-');
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    // Case 2: DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
      const parts = dateStr.split('-');
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    // General fallback
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function toISODateOnly(dateObj) {
    if (!dateObj) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateOnly(dateStr) {
    const parsed = parseDateStr(dateStr);
    return parsed ? toISODateOnly(parsed) : "";
  }

  // --- Helpers: Calculate Grades ---
  function getWeeklyGrade(present, total, stars) {
    if (total === 0) return "لا توجد حصص";
    const rate = present / total;
    if (rate >= 0.9 && stars >= 7) return "ممتاز 🌟";
    if (rate >= 0.8 && stars >= 5) return "جيد جداً ✨";
    if (rate >= 0.6) return "جيد";
    return "مقبول";
  }

  function getMonthlyGrade(present, total, stars) {
    if (total === 0) return "لا توجد حصص";
    const rate = present / total;
    if (rate >= 0.9 && stars >= 27) return "ممتاز 🌟";
    if (rate >= 0.8 && stars >= 18) return "جيد جداً ✨";
    if (rate >= 0.6) return "جيد";
    return "مقبول";
  }

  const arabicWeeks = {
    1: "الأسبوع الأول",
    2: "الأسبوع الثاني",
    3: "الأسبوع الثالث",
    4: "الأسبوع الرابع",
    5: "الأسبوع الخامس",
    6: "الأسبوع السادس",
    7: "الأسبوع السابع",
    8: "الأسبوع الثامن",
    9: "الأسبوع التاسع",
    10: "الأسبوع العاشر"
  };

  const arabicMonths = {
    1: "الشهر الأول",
    2: "الشهر الثاني",
    3: "الشهر الثالث",
    4: "الشهر الرابع"
  };

  // --- Load Data ---
  async function loadReportsData() {
    try {
      const result = await window.DB.readParentPortal(studentId, phone);
      if (result.success) {
        portalDataCache = result;
        reportStudentNameHeader.textContent = result.student.name;

        // Populate print area elements
        if (printStudentName) printStudentName.textContent = result.student.name;
        if (printStudentId) printStudentId.textContent = result.student.id;
        if (printLevel) printLevel.textContent = result.student.level || "بذرة المسجد";
        if (printCumStars) printCumStars.textContent = result.rewards.stars || 0;

        // Populate certificate elements
        if (certStudentName) certStudentName.textContent = result.student.name;
        const totalAyahs = parseInt(result.quran.totalAyahs) || 0;
        if (certTotalAyahs) certTotalAyahs.textContent = totalAyahs;
        const labelEl = document.getElementById("cert-ayahs-label");
        if (labelEl) {
          if (totalAyahs >= 3 && totalAyahs <= 10) {
            labelEl.textContent = "آيات كريمة";
          } else {
            labelEl.textContent = "آية كريمة";
          }
        }

        const finalAttRate = parseFloat(result.attendance.rate) || 0;
        const finalStars = result.rewards.stars || 0;
        let finalGrade = "مقبول";
        if (finalAttRate >= 90 && finalStars >= 24) finalGrade = "ممتاز مع مرتبة الشرف (تميز مطلق)";
        else if (finalAttRate >= 80 && finalStars >= 15) finalGrade = "ممتاز (أداء عالي)";
        else if (finalAttRate >= 70 && finalStars >= 9) finalGrade = "جيد جداً (مستوى رائع)";
        else if (finalAttRate >= 50) finalGrade = "جيد";

        if (certOverallGrade) certOverallGrade.textContent = finalGrade;
        if (certFinalStars) certFinalStars.textContent = finalStars;
        if (certFinalLevel) certFinalLevel.textContent = result.student.level || "بذرة المسجد";
        
        // Render sections
        renderWeeklyReports();
      } else {
        alert("فشل في تحميل البيانات. سيتم إعادتك للبوابة الرئيسية.");
        window.location.href = "parent-portal.html";
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
    }
  }

  // --- Helper Functions to build detailed weekly/monthly log blocks ---
  function buildPeriodEvaluationHtml(evaluations, periodName) {
    const filteredEvals = evaluations ? evaluations.filter(ev => ev.activityType !== "حفظ القرآن" && ev.activityType !== "مراجعة القرآن") : [];
    if (filteredEvals.length === 0) {
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-clipboard-text" style="font-size: 1.8rem; color: var(--gold); display: block; margin-bottom: 0.5rem; opacity: 0.6;"></i>
          <span>لم يسجل المشرف أي تقييم سلوكي تفصيلي خلال هذا ${periodName}.</span>
        </div>
      `;
    }

    // Helper: render N read-only stars out of 3
    function renderReadOnlyStars(value) {
      let html = "";
      for (let i = 1; i <= 3; i++) {
        html += i <= value
          ? `<i class="ph-fill ph-star" style="color:var(--gold);font-size:1.1rem;"></i>`
          : `<i class="ph-bold ph-star" style="color:#ddd;font-size:1.1rem;"></i>`;
      }
      return html;
    }

    // Group evaluations by sessionId (each session = one set of sections)
    const sessionMap = new Map();
    filteredEvals.forEach(ev => {
      const key = ev.sessionId || ev.date || "unknown";
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key).push(ev);
    });

    let allBlocks = "";

    sessionMap.forEach((sessionEvals, sessionKey) => {
      // ── Calculate session-level total (same formula as recalculateStudentRewards) ──
      const sectionAverages = sessionEvals.map(ev => {
        let criteriaObj = {};
        try { criteriaObj = JSON.parse(ev.criteria); } catch (e) {}
        const vals = Object.values(criteriaObj).map(v => parseInt(v) || 0);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }).filter(avg => avg > 0);

      const sessionStars = sectionAverages.length > 0
        ? Math.min(3, Math.max(0, Math.round(sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length)))
        : 0;
      const sessionPoints = sessionStars * 2;

      // Session date label (from first eval in session)
      const firstEv = sessionEvals[0];
      const sessionDateLabel = firstEv.date || "";
      const sessionCircle = firstEv.circleType ? `(${firstEv.circleType.split('،')[0]})` : "";

      let sectionCards = "";
      sessionEvals.forEach(ev => {
        let criteriaObj = {};
        try { criteriaObj = JSON.parse(ev.criteria); } catch (e) {}
        const criteriaKeys = Object.keys(criteriaObj);

        const gridItemsHtml = criteriaKeys.map(key => {
          const val = parseInt(criteriaObj[key]) || 0;
          return `
            <div style="display:flex;flex-direction:column;gap:0.25rem;background:rgba(13,92,70,0.025);padding:0.45rem 0.6rem;border-radius:7px;border:1px solid rgba(200,161,90,0.1);">
              <span style="font-size:0.73rem;color:var(--text-muted);font-weight:700;line-height:1.2;">${key}</span>
              <div style="display:flex;gap:0.08rem;">${renderReadOnlyStars(val)}</div>
            </div>
          `;
        }).join("");

        const notesHtml = ev.notes ? `
          <div style="margin-top:0.45rem;padding-top:0.4rem;border-top:1px dashed rgba(200,161,90,0.13);font-size:0.75rem;color:var(--text-muted);line-height:1.5;">
            <strong style="color:var(--gold);">ملاحظة:</strong> ${ev.notes}
          </div>
        ` : "";

        const isGeneral = ev.activityType === "التقييم العام";
        const iconClass = isGeneral ? "ph-user-focus" : "ph-book-open";
        const pillColor = isGeneral
          ? "background:rgba(13,92,70,0.08);color:var(--green-dark);"
          : "background:rgba(200,161,90,0.1);color:#8b6914;";

        sectionCards += `
          <div style="background:#fff;border:1px solid rgba(200,161,90,0.15);border-radius:9px;padding:0.75rem 0.9rem;margin-bottom:0.55rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="margin-bottom:0.55rem;">
              <span style="${pillColor}border-radius:20px;padding:0.18rem 0.6rem;font-size:0.75rem;font-weight:800;display:inline-flex;align-items:center;gap:0.25rem;">
                <i class="ph-bold ${iconClass}" style="font-size:0.8rem;"></i> ${ev.activityType}
              </span>
            </div>
            ${criteriaKeys.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.35rem;">${gridItemsHtml}</div>` : ""}
            ${notesHtml}
          </div>
        `;
      });

      // ── Session block wrapper ─────────────────────────────────────────────
      allBlocks += `
        <div style="margin-bottom:1rem;border:1px solid rgba(200,161,90,0.2);border-radius:10px;overflow:hidden;">
          <!-- Session header -->
          <div style="background:rgba(13,92,70,0.04);padding:0.5rem 0.9rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(200,161,90,0.15);">
            <span style="font-size:0.8rem;font-weight:800;color:var(--green-dark);display:flex;align-items:center;gap:0.35rem;">
              <i class="ph-bold ph-calendar-blank" style="color:var(--gold);"></i>
              ${sessionDateLabel} ${sessionCircle}
            </span>
            <span style="font-size:0.78rem;color:var(--green-dark);font-weight:900;background:rgba(13,92,70,0.1);padding:0.15rem 0.5rem;border-radius:6px;">
              +${sessionPoints} نقطة
            </span>
          </div>
          <!-- Section cards -->
          <div style="padding:0.7rem 0.8rem 0.4rem;">
            ${sectionCards}
            <!-- Session stars total -->
            <div style="padding:0.45rem 0.7rem;background:linear-gradient(135deg,rgba(13,92,70,0.07),rgba(13,92,70,0.02));border:1px solid rgba(13,92,70,0.1);border-radius:7px;display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:0.76rem;color:var(--green-dark);font-weight:800;display:flex;align-items:center;gap:0.3rem;">
                <i class="ph-bold ph-trophy" style="color:var(--gold);"></i> إجمالي الحصة
              </span>
              <div style="display:flex;align-items:center;gap:0.4rem;">
                <div style="display:flex;gap:0.08rem;">${renderReadOnlyStars(sessionStars)}</div>
                <span style="font-size:0.82rem;font-weight:900;color:var(--green-dark);">+${sessionPoints} نقطة</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    return allBlocks;
  }

  function formatAyahCount(count) {
    count = parseInt(count) || 0;
    if (count === 0) return "0 آية";
    if (count === 1) return "آية واحدة";
    if (count === 2) return "آيتان";
    if (count >= 3 && count <= 10) return `${count} آيات`;
    return `${count} آية`;
  }

  function buildPeriodQuranHtml(quranLogs, periodName) {
    const validQuran = (quranLogs || []).filter(item => item && item.surah && item.surah.trim() !== "");

    if (validQuran.length === 0) {
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-book-open" style="font-size: 1.8rem; color: var(--gold); display: block; margin-bottom: 0.5rem; opacity: 0.6;"></i>
          <span>لم يسجل الطالب أي تقدم قرآني خلال هذا ${periodName}.</span>
        </div>
      `;
    }

    let qBlocks = "";
    validQuran.forEach(item => {
      const fromV = parseInt(item.fromVerse) || 0;
      const toV = parseInt(item.toVerse) || 0;
      const count = (toV >= fromV && fromV > 0) ? (toV - fromV + 1) : 0;

      let typeColor = "var(--green)";
      if (item.type === "مراجعة") typeColor = "var(--gold)";
      else if (item.type === "استدراك") typeColor = "var(--green-dark)";

      const rangeText = (fromV > 0 && toV > 0) ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-right: 0.5rem;">(من ${item.fromVerse} إلى ${item.toVerse}) [${formatAyahCount(count)}]</span>` : "";

      qBlocks += `
        <div class="quran-log-item" style="margin-bottom: 0.4rem; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid rgba(200, 161, 90, 0.1);">
          <div style="font-size: 0.85rem;">
            <span style="font-weight: 850; color: var(--green-dark);">سورة ${item.surah}</span>
            ${rangeText}
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
              <strong>التاريخ:</strong> ${item.date}
              ${item.notes ? ` | <strong style="color:var(--gold);">ملاحظة:</strong> ${item.notes}` : ""}
            </div>
          </div>
          <div style="text-align: left; min-width: 65px;">
            <span style="background: ${typeColor}; color: #fff; padding: 0.1rem 0.3rem; border-radius: 4px; font-weight: 800; font-size: 0.7rem; display: block; text-align: center;">${item.type}</span>
          </div>
        </div>
      `;
    });
    return qBlocks;
  }

  function buildPeriodNotesAndRecommendationsHtml(evaluations, grade, periodName) {
    const noteEvals = evaluations.filter(ev => ev.notes && ev.notes.trim() !== "");
    let notesListHtml = "";
    if (noteEvals.length > 0) {
      notesListHtml = `
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: var(--gold); font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">ملاحظات المشرفين خلال هذه الفترة:</strong>
          <ul style="padding-right: 1.25rem; margin: 0; line-height: 1.6; font-size: 0.85rem; color: var(--text); list-style-type: disc;">
            ${noteEvals.map(ev => `<li><strong>حصة ${ev.date}:</strong> ${ev.notes}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    let recommendationText = "";
    const cleanGrade = String(grade).trim();
    if (cleanGrade.includes("ممتاز")) {
      recommendationText = "نوصي الأسرة الكريمة بمواصلة تقديم الدعم المعنوي والتشجيع للطالب، والحرص الكامل على تعزيز حفظه المتميز ومراجعته المستمرة للمحافظة على هذا المستوى الاستثنائي.";
    } else if (cleanGrade.includes("جيد جداً")) {
      recommendationText = "نشيد بجهود الطالب الملحوظة ونوصي بالاستمرار في تعزيز الحفظ المنزلي اليومي والتركيز على ضبط مخارج الحروف، مع تثمين نقاط تفوقه.";
    } else if (cleanGrade.includes("جيد")) {
      recommendationText = "يُبدي الطالب تقدماً طيباً، ونحثه على زيادة ساعات الحفظ والمراجعة في البيت والالتزام التام بمواعيد حضور حلقات المسجد للرقي للمستويات العليا.";
    } else {
      recommendationText = "نوصي الأسرة بمتابعة الطالب بشكل مكثف وحثه على تكثيف مراجعته اليومية وتجنب الغيابات، لضمان استرجاع الحصص الفائتة وتحقيق الفائدة الكاملة.";
    }

    const recommendationHtml = `
      <div style="border-top: 1px dashed rgba(200, 161, 90, 0.15); padding-top: 0.6rem; margin-top: 0.6rem;">
        <strong style="color: var(--green-dark); font-size: 0.9rem; display: block; margin-bottom: 0.3rem;">التوصية التربوية العامة:</strong>
        <p style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted); margin: 0;">${recommendationText}</p>
      </div>
    `;

    return (notesListHtml || `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0; margin-bottom: 0.5rem; font-style: italic;">لم يتم تسجيل أي ملاحظات سلوكية من المشرفين خلال هذا ${periodName}.</p>`) + recommendationHtml;
  }

  // --- Process and Render Weekly & Monthly reports timeline ---
  function renderWeeklyReports() {
    if (!portalDataCache) return;

    const algerianMonths = [
      "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
      "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    
    // We will render everything in reports-timeline-list
    const timelineList = document.getElementById("reports-timeline-list");
    if (!timelineList) return;
    timelineList.innerHTML = "";

    const evaluations = portalDataCache.evaluations || [];
    const attHistory = (portalDataCache.attendance && portalDataCache.attendance.history) || [];
    const quranHistory = (portalDataCache.quran && portalDataCache.quran.history) || [];

    // Find the absolute first recorded date across all categories to set as the baseline course start date
    const allDates = [];
    attHistory.forEach(att => {
      const p = parseDateStr(att.date);
      if (p) allDates.push(p);
    });
    evaluations.forEach(ev => {
      const p = parseDateStr(ev.date);
      if (p) allDates.push(p);
    });
    quranHistory.forEach(q => {
      const p = parseDateStr(q.date);
      if (p) allDates.push(p);
    });

    if (allDates.length === 0) {
      timelineList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted); background: rgba(13,92,70,0.02); border-radius: 8px; border: 1px dashed rgba(200,161,90,0.25);">
          <i class="ph-bold ph-info" style="font-size: 2rem; color: var(--gold); display: block; margin-bottom: 0.75rem;"></i>
          <span>لا تتوفر أي تقارير لعدم وجود حصص مسجلة للطالب.</span>
        </div>
      `;
      return;
    }

    // Sort dates ascending to get the absolute first recorded date
    allDates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = allDates[0];

    // Find the course start Friday
    let startDayDiff = startDate.getDay() - 5;
    if (startDayDiff < 0) startDayDiff += 7;
    const courseStartFriday = new Date(startDate);
    courseStartFriday.setDate(startDate.getDate() - startDayDiff);
    courseStartFriday.setHours(0, 0, 0, 0);

    const weeks = {};
    const months = {};

    // Helper to get Friday-to-Thursday week info
    function getWeekInfo(dateObj) {
      let dayDiff = dateObj.getDay() - 5;
      if (dayDiff < 0) dayDiff += 7;
      
      const fridayDate = new Date(dateObj);
      fridayDate.setDate(dateObj.getDate() - dayDiff);
      fridayDate.setHours(0, 0, 0, 0);
      
      const thursdayDate = new Date(fridayDate);
      thursdayDate.setDate(fridayDate.getDate() + 6);
      thursdayDate.setHours(23, 59, 59, 999);
      
      const timeDiff = fridayDate.getTime() - courseStartFriday.getTime();
      const weeksDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24 * 7));
      const weekIndex = weeksDiff + 1;

      return {
        key: toISODateOnly(fridayDate),
        startStr: toISODateOnly(fridayDate),
        endStr: toISODateOnly(thursdayDate),
        weekNum: weekIndex,
        fridayDate: fridayDate
      };
    }

    // Helper to get Calendar Month info
    function getMonthInfo(dateObj) {
      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth(); // 0-11
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      
      const firstDay = new Date(year, monthIndex, 1);
      const lastDay = new Date(year, monthIndex + 1, 0);

      return {
        key: key,
        startStr: toISODateOnly(firstDay),
        endStr: toISODateOnly(lastDay),
        monthIndex: monthIndex,
        year: year,
        monthName: algerianMonths[monthIndex]
      };
    }

    // Process Attendance
    attHistory.forEach(sess => {
      const parsed = parseDateStr(sess.date);
      if (!parsed) return;
      
      const wInfo = getWeekInfo(parsed);
      const mInfo = getMonthInfo(parsed);

      // Initialize Week
      if (!weeks[wInfo.key]) {
        weeks[wInfo.key] = {
          name: arabicWeeks[wInfo.weekNum] || `الأسبوع ${wInfo.weekNum}`,
          label: `الأسبوع ${wInfo.weekNum}`,
          weekNum: wInfo.weekNum,
          startStr: wInfo.startStr,
          endStr: wInfo.endStr,
          fridayDate: wInfo.fridayDate,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }

      // Initialize Month
      if (!months[mInfo.key]) {
        months[mInfo.key] = {
          name: `شهر ${mInfo.monthName}`,
          label: `شهر ${mInfo.monthName}`,
          monthKey: mInfo.key,
          startStr: mInfo.startStr,
          endStr: mInfo.endStr,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }

      // Add to week
      weeks[wInfo.key].sessionsCount++;
      if (sess.status === "حاضر" || sess.status.startsWith("متأخر") || sess.status === "حاظر") {
        weeks[wInfo.key].presentCount++;
      }
      if (!weeks[wInfo.key].dates.includes(sess.date)) {
        weeks[wInfo.key].dates.push(sess.date);
      }

      // Add to month
      months[mInfo.key].sessionsCount++;
      if (sess.status === "حاضر" || sess.status.startsWith("متأخر") || sess.status === "حاظر") {
        months[mInfo.key].presentCount++;
      }
      if (!months[mInfo.key].dates.includes(sess.date)) {
        months[mInfo.key].dates.push(sess.date);
      }
    });

    // Process Evaluations
    evaluations.forEach(ev => {
      const parsedDate = parseDateStr(ev.date);
      if (!parsedDate) return;

      const wInfo = getWeekInfo(parsedDate);
      const mInfo = getMonthInfo(parsedDate);

      let evStars = 0;
      try {
        const criteriaObj = JSON.parse(ev.criteria);
        Object.values(criteriaObj).forEach(val => {
          evStars += parseInt(val) || 0;
        });
      } catch(e) {}

      // Ensure week exists
      if (!weeks[wInfo.key]) {
        weeks[wInfo.key] = {
          name: arabicWeeks[wInfo.weekNum] || `الأسبوع ${wInfo.weekNum}`,
          label: `الأسبوع ${wInfo.weekNum}`,
          weekNum: wInfo.weekNum,
          startStr: wInfo.startStr,
          endStr: wInfo.endStr,
          fridayDate: wInfo.fridayDate,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }
      weeks[wInfo.key].points += ev.points || 0;
      weeks[wInfo.key].stars += evStars;
      weeks[wInfo.key].evaluations.push(ev);
      if (!weeks[wInfo.key].dates.includes(ev.date)) {
        weeks[wInfo.key].dates.push(ev.date);
      }

      // Ensure month exists
      if (!months[mInfo.key]) {
        months[mInfo.key] = {
          name: `شهر ${mInfo.monthName}`,
          label: `شهر ${mInfo.monthName}`,
          monthKey: mInfo.key,
          startStr: mInfo.startStr,
          endStr: mInfo.endStr,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }
      months[mInfo.key].points += ev.points || 0;
      months[mInfo.key].stars += evStars;
      months[mInfo.key].evaluations.push(ev);
      if (!months[mInfo.key].dates.includes(ev.date)) {
        months[mInfo.key].dates.push(ev.date);
      }
    });

    // Process Quran Logs
    quranHistory.forEach(q => {
      const parsedDate = parseDateStr(q.date);
      if (!parsedDate) return;

      const wInfo = getWeekInfo(parsedDate);
      const mInfo = getMonthInfo(parsedDate);

      const fromV = parseInt(q.fromVerse) || 0;
      const toV = parseInt(q.toVerse) || 0;
      let ayahsCount = 0;
      if (toV >= fromV && fromV > 0) {
        ayahsCount = (toV - fromV + 1);
      }

      // Ensure week exists
      if (!weeks[wInfo.key]) {
        weeks[wInfo.key] = {
          name: arabicWeeks[wInfo.weekNum] || `الأسبوع ${wInfo.weekNum}`,
          label: `الأسبوع ${wInfo.weekNum}`,
          weekNum: wInfo.weekNum,
          startStr: wInfo.startStr,
          endStr: wInfo.endStr,
          fridayDate: wInfo.fridayDate,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }
      weeks[wInfo.key].ayahs += ayahsCount;
      weeks[wInfo.key].quranLogs.push(q);
      if (!weeks[wInfo.key].dates.includes(q.date)) {
        weeks[wInfo.key].dates.push(q.date);
      }

      // Ensure month exists
      if (!months[mInfo.key]) {
        months[mInfo.key] = {
          name: `شهر ${mInfo.monthName}`,
          label: `شهر ${mInfo.monthName}`,
          monthKey: mInfo.key,
          startStr: mInfo.startStr,
          endStr: mInfo.endStr,
          sessionsCount: 0,
          presentCount: 0,
          points: 0,
          stars: 0,
          ayahs: 0,
          dates: [],
          evaluations: [],
          quranLogs: []
        };
      }
      months[mInfo.key].ayahs += ayahsCount;
      months[mInfo.key].quranLogs.push(q);
      if (!months[mInfo.key].dates.includes(q.date)) {
        months[mInfo.key].dates.push(q.date);
      }
    });

    // Sort evaluations, logs, and dates chronologically (oldest first)
    Object.keys(weeks).forEach(w => {
      weeks[w].evaluations.sort((a, b) => {
        const dA = parseDateStr(a.date);
        const dB = parseDateStr(b.date);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
      weeks[w].quranLogs.sort((a, b) => {
        const dA = parseDateStr(a.date);
        const dB = parseDateStr(b.date);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
      weeks[w].dates.sort((a, b) => {
        const dA = parseDateStr(a);
        const dB = parseDateStr(b);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
    });

    Object.keys(months).forEach(m => {
      months[m].evaluations.sort((a, b) => {
        const dA = parseDateStr(a.date);
        const dB = parseDateStr(b.date);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
      months[m].quranLogs.sort((a, b) => {
        const dA = parseDateStr(a.date);
        const dB = parseDateStr(b.date);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
      months[m].dates.sort((a, b) => {
        const dA = parseDateStr(a);
        const dB = parseDateStr(b);
        return (dA ? dA.getTime() : 0) - (dB ? dB.getTime() : 0);
      });
    });

    // Build Combined Timeline List
    const timelineItems = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.keys(weeks).forEach(w => {
      const releaseDate = new Date(weeks[w].fridayDate);
      releaseDate.setDate(weeks[w].fridayDate.getDate() + 7); // Friday after week ends
      const isCompleted = today.getTime() >= releaseDate.getTime();
      
      if (isCompleted && weeks[w].sessionsCount > 0) {
        timelineItems.push({
          type: "week",
          key: w,
          releaseTime: releaseDate.getTime(),
          data: weeks[w]
        });
      }
    });

    Object.keys(months).forEach(m => {
      const [year, month] = m.split("-").map(Number);
      const releaseDate = new Date(year, month, 1); // 1st of next month
      const isCompleted = today.getTime() >= releaseDate.getTime();

      if (isCompleted && months[m].sessionsCount > 0) {
        timelineItems.push({
          type: "month",
          key: m,
          releaseTime: releaseDate.getTime(),
          data: months[m]
        });
      }
    });

    // Sort by releaseTime descending (newest first)
    timelineItems.sort((a, b) => b.releaseTime - a.releaseTime);

    let renderedCount = 0;

    timelineItems.forEach((item, index) => {
      renderedCount++;
      const data = item.data;
      const dateRangeStr = `من ${data.startStr} إلى ${data.endStr}`;

      const accordionItem = document.createElement("div");
      accordionItem.className = "accordion-item";
      
      const isOpen = (index === 0);
      if (isOpen) {
        accordionItem.classList.add("is-open");
      }

      let headerHtml = "";
      let contentHtml = "";

      if (item.type === "week") {
        const grade = getWeeklyGrade(data.presentCount, data.sessionsCount, data.stars);
        
        headerHtml = `
          <button class="accordion-trigger" type="button" aria-expanded="${isOpen ? 'true' : 'false'}">
            <div class="accordion-title-group">
              <i class="ph-bold ph-calendar-check" style="color: var(--gold); font-size: 1.4rem;"></i>
              <span class="accordion-title">${data.name}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">(${dateRangeStr})</span>
            </div>
            <i class="ph-bold ph-caret-down accordion-arrow"></i>
          </button>
        `;

        contentHtml = `
          <div class="accordion-content" style="display: ${isOpen ? 'block' : 'none'}; padding: 1.25rem 1.75rem;">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 700; border-bottom: 1px dashed rgba(200,161,90,0.15); padding-bottom: 0.5rem; margin-top: 1rem;">
              <i class="ph ph-info" style="vertical-align: middle;"></i> تفاصيل التقرير الأسبوعي للأسبوع ${data.weekNum} (عدد الحصص: ${data.sessionsCount})
            </p>
            
            <div class="report-details-grid">
              <!-- 1. التقييم الأسبوعي العام -->
              <div class="report-section-card" style="grid-column: 1 / -1; background: rgba(13, 92, 70, 0.03); border: 2.5px solid var(--gold); border-radius: 10px; padding: 1.5rem; text-align: center;">
                <h4 style="justify-content: center;"><i class="ph-bold ph-seal-check"></i> التقييم الأسبوعي العام</h4>
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--green-dark); margin-top: 0.5rem;">
                  التقدير الإجمالي: <span style="color: var(--green); font-size: 1.45rem; border-bottom: 2px dashed var(--gold); padding-bottom: 2px;">${grade}</span>
                </div>
              </div>

              <!-- 2. حصاد النقاط والنجوم -->
              <div class="report-section-card">
                <h4><i class="ph-bold ph-sketch-logo"></i> حصاد النقاط والنجوم</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: center; margin-top: 0.75rem;">
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green-dark); display: block;">${data.points}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">النقاط المحصلة</span>
                  </div>
                  <div style="background: var(--white); border: 1px solid rgba(212, 175, 55, 0.3); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--gold); display: block;">${data.stars} <i class="ph-fill ph-star" style="font-size: 0.82em; vertical-align: middle;"></i></span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">النجوم التراكمية</span>
                  </div>
                </div>
              </div>

              <!-- 3. ملخص الحضور -->
              <div class="report-section-card">
                <h4><i class="ph-bold ph-calendar-check"></i> ملخص الحضور والغياب</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: center; margin-top: 0.75rem;">
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green); display: block;">${data.presentCount}/${data.sessionsCount}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">حضور الحصص</span>
                  </div>
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green-dark); display: block;">${Math.round((data.presentCount / (data.sessionsCount || 1)) * 100)}%</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">نسبة الحضور</span>
                  </div>
                </div>
              </div>

              <!-- 4. ملخص الحفظ والمراجعة -->
              <div class="report-section-card" style="grid-column: 1 / -1;">
                <h4><i class="ph-bold ph-book-open"></i> ملخص الحفظ والمراجعة</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700; margin-bottom: 0.75rem; margin-top: 0;">
                  إجمالي الآيات المنجزة في الحفظ والمراجعة: <strong style="color: var(--green-light); font-size: 1rem;">${formatAyahCount(data.ayahs)}</strong>
                </p>
                <div style="max-height: 250px; overflow-y: auto; background: var(--white); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(200, 161, 90, 0.12);">
                  ${buildPeriodQuranHtml(data.quranLogs, "الأسبوع")}
                </div>
              </div>

              <!-- 5. ملاحظات وتوصيات -->
              <div class="report-section-card" style="grid-column: 1 / -1;">
                <h4><i class="ph-bold ph-chat-centered-text"></i> ملاحظات وتوصيات تربوية</h4>
                <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.12); padding: 1rem; border-radius: 6px;">
                  ${buildPeriodNotesAndRecommendationsHtml(data.evaluations, grade, "الأسبوع")}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        const mGrade = getMonthlyGrade(data.presentCount, data.sessionsCount, data.stars);
        accordionItem.style.cssText = "border: 1.5px solid var(--gold); background: #fffdf8;";
        
        headerHtml = `
          <button class="accordion-trigger" type="button" aria-expanded="${isOpen ? 'true' : 'false'}">
            <div class="accordion-title-group">
              <i class="ph-bold ph-award" style="color: var(--gold); font-size: 1.4rem;"></i>
              <span class="accordion-title" style="color: var(--green-dark); font-weight: 950;">${data.name} (تراكمي)</span>
              <span style="font-size: 0.8rem; color: var(--gold); font-weight: 800; background: rgba(212,175,55,0.1); padding: 0.15rem 0.4rem; border-radius: 4px;">تقرير شهري</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">(${dateRangeStr})</span>
            </div>
            <i class="ph-bold ph-caret-down accordion-arrow"></i>
          </button>
        `;

        contentHtml = `
          <div class="accordion-content" style="display: ${isOpen ? 'block' : 'none'}; padding: 1.25rem 1.75rem; border-top-color: rgba(212,175,55,0.3);">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 700; border-bottom: 1px dashed rgba(212,175,55,0.25); padding-bottom: 0.5rem; margin-top: 1rem;">
              <i class="ph ph-info" style="vertical-align: middle;"></i> تفاصيل التقرير الشهري التراكمي لـ ${data.name} (عدد الحصص: ${data.sessionsCount})
            </p>
            
            <div class="report-details-grid">
              <!-- 1. التقييم الشهري العام -->
              <div class="report-section-card" style="grid-column: 1 / -1; background: rgba(212, 175, 55, 0.03); border: 2.5px solid var(--gold); border-radius: 10px; padding: 1.5rem; text-align: center;">
                <h4 style="justify-content: center;"><i class="ph-bold ph-seal-check"></i> التقييم الشهري العام</h4>
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--green-dark); margin-top: 0.5rem;">
                  التقدير الإجمالي للشهر: <span style="color: var(--green); font-size: 1.45rem; border-bottom: 2px dashed var(--gold); padding-bottom: 2px;">${mGrade}</span>
                </div>
              </div>

              <!-- 2. حصاد النقاط والنجوم -->
              <div class="report-section-card">
                <h4><i class="ph-bold ph-sketch-logo"></i> حصاد النقاط والنجوم</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: center; margin-top: 0.75rem;">
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green-dark); display: block;">${data.points}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">النقاط المحصلة</span>
                  </div>
                  <div style="background: var(--white); border: 1px solid rgba(212, 175, 55, 0.3); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--gold); display: block;">${data.stars} <i class="ph-fill ph-star" style="font-size: 0.82em; vertical-align: middle;"></i></span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">النجوم التراكمية</span>
                  </div>
                </div>
              </div>

              <!-- 3. ملخص الحضور -->
              <div class="report-section-card">
                <h4><i class="ph-bold ph-calendar-check"></i> ملخص الحضور والغياب</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: center; margin-top: 0.75rem;">
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green); display: block;">${data.presentCount}/${data.sessionsCount}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">حضور الحصص</span>
                  </div>
                  <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.15); padding: 0.75rem; border-radius: 6px;">
                    <span style="font-size: 1.4rem; font-weight: 900; color: var(--green-dark); display: block;">${Math.round((data.presentCount / (data.sessionsCount || 1)) * 100)}%</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">نسبة الحضور</span>
                  </div>
                </div>
              </div>

              <!-- 4. ملخص الحفظ والمراجعة -->
              <div class="report-section-card" style="grid-column: 1 / -1;">
                <h4><i class="ph-bold ph-book-open"></i> ملخص الحفظ والمراجعة</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700; margin-bottom: 0.75rem; margin-top: 0;">
                  إجمالي الآيات المنجزة في الحفظ والمراجعة: <strong style="color: var(--green-light); font-size: 1rem;">${formatAyahCount(data.ayahs)}</strong>
                </p>
                <div style="max-height: 250px; overflow-y: auto; background: var(--white); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(200, 161, 90, 0.12);">
                  ${buildPeriodQuranHtml(data.quranLogs, "الشهر")}
                </div>
              </div>

              <!-- 5. ملاحظات وتوصيات -->
              <div class="report-section-card" style="grid-column: 1 / -1;">
                <h4><i class="ph-bold ph-chat-centered-text"></i> ملاحظات وتوصيات تربوية</h4>
                <div style="background: var(--white); border: 1px solid rgba(200, 161, 90, 0.12); padding: 1rem; border-radius: 6px;">
                  ${buildPeriodNotesAndRecommendationsHtml(data.evaluations, mGrade, "الشهر")}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      accordionItem.innerHTML = headerHtml + contentHtml;
      timelineList.appendChild(accordionItem);

      // Wire accordion toggle listener
      const trigger = accordionItem.querySelector(".accordion-trigger");
      const content = accordionItem.querySelector(".accordion-content");
      trigger.onclick = () => {
        const opened = accordionItem.classList.contains("is-open");
        if (opened) {
          accordionItem.classList.remove("is-open");
          content.style.display = "none";
          trigger.setAttribute("aria-expanded", "false");
        } else {
          accordionItem.classList.add("is-open");
          content.style.display = "block";
          trigger.setAttribute("aria-expanded", "true");
        }
      };
    });

    if (renderedCount === 0) {
      timelineList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted); background: rgba(13,92,70,0.02); border-radius: 8px; border: 1px dashed rgba(200,161,90,0.25);">
          <i class="ph-bold ph-info" style="font-size: 2rem; color: var(--gold); display: block; margin-bottom: 0.75rem;"></i>
          <span>تظهر التقارير الأسبوعية والشهرية التراكمية تلقائياً عند اكتمال نهاية كل فترة (كل 7 أيام للأسبوع وكل 30 يوماً للشهر من تاريخ أول حصة للطالب).</span>
        </div>
      `;
    }
  }

  // Load Data on Startup
  loadReportsData();
});

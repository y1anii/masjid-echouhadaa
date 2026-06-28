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
    if (rate >= 0.9 && stars >= 12) return "ممتاز 🌟";
    if (rate >= 0.8 && stars >= 8) return "جيد جداً ✨";
    if (rate >= 0.6) return "جيد";
    return "مقبول";
  }

  function getMonthlyGrade(present, total, stars) {
    if (total === 0) return "لا توجد حصص";
    const rate = present / total;
    if (rate >= 0.9 && stars >= 45) return "ممتاز 🌟";
    if (rate >= 0.8 && stars >= 30) return "جيد جداً ✨";
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
        if (finalAttRate >= 90 && finalStars >= 40) finalGrade = "ممتاز مع مرتبة الشرف (تميز مطلق)";
        else if (finalAttRate >= 80 && finalStars >= 25) finalGrade = "ممتاز (أداء عالي)";
        else if (finalAttRate >= 70 && finalStars >= 15) finalGrade = "جيد جداً (مستوى رائع)";
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
    if (!evaluations || evaluations.length === 0) {
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-clipboard-text" style="font-size: 1.8rem; color: var(--gold); display: block; margin-bottom: 0.5rem; opacity: 0.6;"></i>
          <span>لم يسجل المشرف أي تقييم سلوكي تفصيلي خلال هذا ${periodName}.</span>
        </div>
      `;
    }

    let evBlocks = "";
    evaluations.forEach(ev => {
      let criteriaObj = {};
      try { criteriaObj = JSON.parse(ev.criteria); } catch (e) {}

      let starsDetails = Object.keys(criteriaObj).map(key => {
        return `${key}: <strong>${criteriaObj[key]} <i class="ph-fill ph-star" style="color: var(--gold); vertical-align: middle;"></i></strong>`;
      }).join(" | ");

      evBlocks += `
        <div class="details-block" style="margin-bottom: 0.75rem;">
          <div class="details-block-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.2rem;">
            <span style="font-weight: 800; font-size: 0.9rem; color: var(--green-dark);"><i class="ph ph-calendar-blank" style="vertical-align: middle; color: var(--gold);"></i> ${ev.date} — ${ev.activityType}</span>
            ${ev.circleType ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">(${ev.circleType.split('،')[0]})</span>` : ''}
          </div>
          <div class="details-block-val" style="font-size: 0.82rem;">
            ${starsDetails}
            ${ev.notes ? `<br><strong style="color: var(--gold);">ملاحظة:</strong> ${ev.notes}` : ""}
            <br><strong style="color: var(--green);">النقاط المحصلة:</strong> ${ev.points} نقطة
          </div>
        </div>
      `;
    });
    return evBlocks;
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
    if (!quranLogs || quranLogs.length === 0) {
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-book-open" style="font-size: 1.8rem; color: var(--gold); display: block; margin-bottom: 0.5rem; opacity: 0.6;"></i>
          <span>لم يسجل الطالب أي تقدم قرآني خلال هذا ${periodName}.</span>
        </div>
      `;
    }

    let qBlocks = "";
    quranLogs.forEach(item => {
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

    // Helper to get week/month relative to course start date
    function getWeekAndMonth(dateObj) {
      const diffTime = dateObj.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekNum = diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
      const monthNum = diffDays < 0 ? 1 : Math.floor(diffDays / 30) + 1;
      return { weekNum, monthNum };
    }

    const weeks = {};
    const months = {};

    // Group Attendance
    attHistory.forEach(sess => {
      const parsed = parseDateStr(sess.date);
      if (!parsed) return;
      const { weekNum, monthNum } = getWeekAndMonth(parsed);
      
      if (!weeks[weekNum]) {
        weeks[weekNum] = {
          name: arabicWeeks[weekNum] || `الأسبوع ${weekNum}`,
          label: `الأسبوع ${weekNum}`,
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
      
      if (!months[monthNum]) {
        months[monthNum] = {
          name: arabicMonths[monthNum] || `الشهر ${monthNum}`,
          label: `الشهر ${monthNum}`,
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
      weeks[weekNum].sessionsCount++;
      if (sess.status === "حاضر" || sess.status.startsWith("متأخر") || sess.status === "حاظر") {
        weeks[weekNum].presentCount++;
      }
      if (!weeks[weekNum].dates.includes(sess.date)) {
        weeks[weekNum].dates.push(sess.date);
      }

      // Add to month
      months[monthNum].sessionsCount++;
      if (sess.status === "حاضر" || sess.status.startsWith("متأخر") || sess.status === "حاظر") {
        months[monthNum].presentCount++;
      }
      if (!months[monthNum].dates.includes(sess.date)) {
        months[monthNum].dates.push(sess.date);
      }
    });

    // Group Evaluations
    evaluations.forEach(ev => {
      const parsedDate = parseDateStr(ev.date);
      if (!parsedDate) return;
      const { weekNum, monthNum } = getWeekAndMonth(parsedDate);
      
      let evStars = 0;
      try {
        const criteriaObj = JSON.parse(ev.criteria);
        Object.values(criteriaObj).forEach(val => {
          evStars += parseInt(val) || 0;
        });
      } catch(e) {}

      // Ensure week exists
      if (!weeks[weekNum]) {
        weeks[weekNum] = {
          name: arabicWeeks[weekNum] || `الأسبوع ${weekNum}`,
          label: `الأسبوع ${weekNum}`,
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
      weeks[weekNum].points += ev.points || 0;
      weeks[weekNum].stars += evStars;
      weeks[weekNum].evaluations.push(ev);
      if (!weeks[weekNum].dates.includes(ev.date)) {
        weeks[weekNum].dates.push(ev.date);
      }

      // Ensure month exists
      if (!months[monthNum]) {
        months[monthNum] = {
          name: arabicMonths[monthNum] || `الشهر ${monthNum}`,
          label: `الشهر ${monthNum}`,
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
      months[monthNum].points += ev.points || 0;
      months[monthNum].stars += evStars;
      months[monthNum].evaluations.push(ev);
      if (!months[monthNum].dates.includes(ev.date)) {
        months[monthNum].dates.push(ev.date);
      }
    });

    // Group Quran Progress
    quranHistory.forEach(q => {
      const parsedDate = parseDateStr(q.date);
      if (!parsedDate) return;
      const { weekNum, monthNum } = getWeekAndMonth(parsedDate);
      
      const fromV = parseInt(q.fromVerse) || 0;
      const toV = parseInt(q.toVerse) || 0;
      let ayahsCount = 0;
      if (toV >= fromV && fromV > 0) {
        ayahsCount = (toV - fromV + 1);
      }

      // Ensure week exists
      if (!weeks[weekNum]) {
        weeks[weekNum] = {
          name: arabicWeeks[weekNum] || `الأسبوع ${weekNum}`,
          label: `الأسبوع ${weekNum}`,
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
      weeks[weekNum].ayahs += ayahsCount;
      weeks[weekNum].quranLogs.push(q);
      if (!weeks[weekNum].dates.includes(q.date)) {
        weeks[weekNum].dates.push(q.date);
      }

      // Ensure month exists
      if (!months[monthNum]) {
        months[monthNum] = {
          name: arabicMonths[monthNum] || `الشهر ${monthNum}`,
          label: `الشهر ${monthNum}`,
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
      months[monthNum].ayahs += ayahsCount;
      months[monthNum].quranLogs.push(q);
      if (!months[monthNum].dates.includes(q.date)) {
        months[monthNum].dates.push(q.date);
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

    Object.keys(weeks).forEach(w => {
      const wNum = parseInt(w);
      timelineItems.push({
        type: "week",
        number: wNum,
        endDay: wNum * 7,
        data: weeks[w]
      });
    });

    Object.keys(months).forEach(m => {
      const mNum = parseInt(m);
      timelineItems.push({
        type: "month",
        number: mNum,
        endDay: mNum * 30,
        data: months[m]
      });
    });

    // Sort by endDay descending (newest first)
    timelineItems.sort((a, b) => b.endDay - a.endDay);

    // Calculate calendar days elapsed from first session to today
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Filter to show only completed periods
    const completedItems = timelineItems.filter(item => {
      return item.data.sessionsCount > 0 && daysElapsed >= item.endDay;
    });

    let renderedCount = 0;

    completedItems.forEach((item, index) => {
      renderedCount++;
      const data = item.data;
      const dateRangeStr = data.dates.length > 0 
        ? `من ${data.dates[0]} إلى ${data.dates[data.dates.length - 1]}`
        : "";

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
              <i class="ph ph-info" style="vertical-align: middle;"></i> تفاصيل التقرير الأسبوعي للأسبوع ${item.number} (عدد الحصص: ${data.sessionsCount})
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
              <i class="ph ph-info" style="vertical-align: middle;"></i> تفاصيل التقرير الشهري التراكمي للشهر ${item.number} (عدد الحصص: ${data.sessionsCount})
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

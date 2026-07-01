/**
 * مسجد الشهداء — التقرير اليومي الشامل ودفتر الإنجازات المدمج
 */

document.addEventListener("DOMContentLoaded", () => {
  const studentId = sessionStorage.getItem("masjid_parent_student_id");
  const phone = sessionStorage.getItem("masjid_parent_phone");

  if (!studentId || !phone) {
    window.location.replace("parent-portal.html");
    return;
  }

  // Reveal the body now that session check passed
  document.body.style.display = "block";

  // --- UI Elements ---
  const studentNameHeader = document.getElementById("student-name-header");
  const statAttendanceRate = document.getElementById("stat-attendance-rate");
  const statQuranAyahs = document.getElementById("stat-quran-ayahs");
  const statQuranSurah = document.getElementById("stat-quran-surah");
  const dailyTimelineList = document.getElementById("daily-timeline-list");

  function formatDateOnly(dateStr) {
    if (!dateStr) return '';
    
    // Normalize DD-MM-YYYY to YYYY-MM-DD
    const match = dateStr.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    
    if (dateStr.includes('T')) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {}
      return dateStr.split('T')[0];
    }
    if (dateStr.includes(' ')) return dateStr.split(' ')[0];
    return dateStr;
  }

  function parseDateStr(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split('T')[0].split('-');
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
      const parts = dateStr.split('-');
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatAyahCount(count) {
    count = parseInt(count) || 0;
    if (count === 0) return "0 آية";
    if (count === 1) return "آية واحدة";
    if (count === 2) return "آيتان";
    if (count >= 3 && count <= 10) return `${count} آيات`;
    return `${count} آية`;
  }

  // --- Load and Process Data ---
  async function loadDailyArchive() {
    try {
      const result = await window.DB.readParentPortal(studentId, phone);
      if (result.success) {
        // 1. Populate Header
        studentNameHeader.textContent = result.student.name;

        // 2. Populate Combined statistics banner
        const attRate = (result.attendance && result.attendance.rate) || 0;
        statAttendanceRate.textContent = `${attRate}%`;

        const quranData = result.quran || { totalAyahs: 0, lastSurah: "-", lastToVerse: "" };
        statQuranAyahs.textContent = formatAyahCount(quranData.totalAyahs);
        const lastToV = quranData.lastToVerse ? `(الآية ${quranData.lastToVerse})` : "";
        statQuranSurah.textContent = quranData.lastSurah !== "-" ? `سورة ${quranData.lastSurah} ${lastToV}` : "-";

        // 3. Merging timeline rendering
        renderMergedTimeline(result.evaluations, result.attendance.history, quranData.history || []);
      } else {
        alert("فشل في تحميل البيانات. سيتم إعادتك للبوابة الرئيسية.");
        window.location.href = "parent-portal.html";
      }
    } catch (err) {
      console.error(err);
      dailyTimelineList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;"><i class="ph ph-warning-circle" style="font-size: 1.5rem; color: #ff4d4d; display: block; margin-bottom: 0.5rem;"></i> حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.</p>`;
    }
  }

  function renderMergedTimeline(evaluations, attHistory, quranHistory) {
    dailyTimelineList.innerHTML = "";

    if (evaluations.length === 0 && attHistory.length === 0 && quranHistory.length === 0) {
      dailyTimelineList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;"><i class="ph ph-note-pencil" style="font-size: 1.5rem; color: var(--gold); display: block; margin-bottom: 0.5rem;"></i> لا يوجد أي حضور أو تقارير مسجلة للطالب.</p>`;
      return;
    }

    // Extract all unique dates and sort them in descending order (newest first)
    const uniqueDatesSet = new Set();
    evaluations.forEach(ev => uniqueDatesSet.add(formatDateOnly(ev.date)));
    attHistory.forEach(att => uniqueDatesSet.add(formatDateOnly(att.date)));
    quranHistory.forEach(q => uniqueDatesSet.add(formatDateOnly(q.date)));

    const sortedDates = Array.from(uniqueDatesSet).sort((a, b) => b.localeCompare(a));

    let timelineIndex = 0;
    sortedDates.forEach((dateStr) => {
      // Filter logs for this specific date
      const dateAttRecords = attHistory.filter(att => formatDateOnly(att.date) === dateStr);
      const dateEvaluations = evaluations.filter(ev => formatDateOnly(ev.date) === dateStr);
      const dateQuranLogs = quranHistory.filter(q => formatDateOnly(q.date) === dateStr);

      // Group by sessionId to separate morning/evening
      const sessionIds = new Set();
      dateAttRecords.forEach(a => { if (a.sessionId) sessionIds.add(a.sessionId); });
      dateEvaluations.forEach(e => { if (e.sessionId) sessionIds.add(e.sessionId); });
      dateQuranLogs.forEach(q => { if (q.sessionId) sessionIds.add(q.sessionId); });

      if (sessionIds.size === 0) {
        // No sessionId info, render as single session
        renderDailyAccordionItem(dateStr, dateAttRecords[0] || null, dateEvaluations, dateQuranLogs, timelineIndex, null);
        timelineIndex++;
      } else {
        const sessionsArr = Array.from(sessionIds);
        // Sort sessions: evening first (newest on top)
        const getAttForSession = (sId) => dateAttRecords.find(a => a.sessionId === sId);
        sessionsArr.sort((a, b) => {
          const circleA = (getAttForSession(a) || {}).circleType || "";
          const circleB = (getAttForSession(b) || {}).circleType || "";
          const isMorningA = circleA.includes("صباحية") ? 0 : 1;
          const isMorningB = circleB.includes("صباحية") ? 0 : 1;
          return isMorningB - isMorningA;
        });

        sessionsArr.forEach(sId => {
          const attRec = getAttForSession(sId) || null;
          const sessEvals = dateEvaluations.filter(e => e.sessionId === sId);
          const sessQuran = dateQuranLogs.filter(q => q.sessionId === sId);
          renderDailyAccordionItem(dateStr, attRec, sessEvals, sessQuran, timelineIndex, null);
          timelineIndex++;
        });
      }
    });
  }

  function renderMultiSessionAccordionItem(dateStr, sessionIds, getAttForSession, dateEvaluations, dateQuranLogs, index) {
    const item = document.createElement("div");
    item.className = "accordion-item";
    if (index === 0) item.classList.add("is-open");

    const localDate = new Date();
    const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    const isToday = (dateStr === todayStr);

    const reportTitle = isToday ? `تقرير حصص اليوم (${sessionIds.length} حصص)` : `سجل يوم ${dateStr} — ${sessionIds.length} حصص`;

    // Build inner session cards
    let sessionsHtml = "";
    sessionIds.forEach((sId, sIdx) => {
      const attRec = getAttForSession(sId);
      const sessEvals = dateEvaluations.filter(e => e.sessionId === sId);
      const sessQuran = dateQuranLogs.filter(q => q.sessionId === sId);

      const circleType = (attRec && attRec.circleType) || "حلقة صباحية";
      const isMorning = circleType.includes("صباحية");
      const sessionLabel = isMorning ? "الحصة الصباحية" : "الحصة المسائية";
      const sessionIcon = isMorning ? "ph-sun" : "ph-moon";
      const sessionBorderColor = isMorning ? "var(--green)" : "#6B50C2";

      const attStatus = attRec ? attRec.status : "حاضر (تلقائي)";
      const isAbsent = attRec ? attRec.status.startsWith("غائب") : false;

      let attBadgeStyle = "background: rgba(13, 92, 70, 0.08); color: var(--green); border: 1px solid rgba(13, 92, 70, 0.15);";
      if (attRec) {
        if (attRec.status.startsWith("غائب")) attBadgeStyle = "background: rgba(255, 68, 68, 0.08); color: #ff4d4d; border: 1px solid rgba(255, 68, 68, 0.15);";
        else if (attRec.status.startsWith("متأخر")) attBadgeStyle = "background: rgba(212, 175, 55, 0.1); color: var(--gold); border: 1px solid rgba(212, 175, 55, 0.2);";
      }

      const evaluationHtml = buildEvaluationHtml(isAbsent, sessEvals);
      const quranHtml = buildQuranHtml(isAbsent, sessQuran, attRec ? attRec.courses : null);

      let coursesLine = "";
      if (attRec && attRec.courses && attRec.courses !== "-") {
        coursesLine = `<span><strong>المقررات:</strong> ${attRec.courses}</span>`;
      }

      sessionsHtml += `
        <div style="border: 1px solid ${sessionBorderColor}; border-right: 4px solid ${sessionBorderColor}; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; background: ${isMorning ? 'rgba(13,92,70,0.02)' : 'rgba(107,80,194,0.03)'};">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h5 style="color: ${isMorning ? 'var(--green-dark)' : '#6B50C2'}; font-weight: 900; font-size: 1rem; display: flex; align-items: center; gap: 0.4rem; margin: 0;">
              <i class="ph-bold ${sessionIcon}" style="font-size: 1.1rem;"></i> ${sessionLabel}
              ${attRec && attRec.supervisor ? `<span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-right: 0.5rem;">(${attRec.supervisor})</span>` : ''}
            </h5>
            <span style="${attBadgeStyle} font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;">
              <i class="ph-bold ph-user-check"></i> الحضور: ${attStatus}
            </span>
          </div>
          ${coursesLine ? `<div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">${coursesLine}</div>` : ''}
          <div class="daily-merged-grid">
            <div class="daily-col-block">
              <div class="daily-block-title">
                <i class="ph-bold ph-activity" style="color: var(--gold);"></i>
                <span>التقييم والسلوك</span>
              </div>
              ${evaluationHtml}
            </div>
            <div class="daily-col-block">
              <div class="daily-block-title">
                <i class="ph-bold ph-book" style="color: var(--gold);"></i>
                <span>الإنجازات القرآنية</span>
              </div>
              ${quranHtml}
            </div>
          </div>
        </div>
      `;
    });

    item.innerHTML = `
      <button class="accordion-trigger" type="button" aria-expanded="${index === 0 ? 'true' : 'false'}">
        <div class="accordion-title-group" style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
          <span class="accordion-title">${reportTitle}</span>
          ${isToday ? `<span style="background: rgba(13,92,70,0.08); color: var(--green); border: 1px solid rgba(13,92,70,0.2); font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="ph-bold ph-check-circle"></i> رصد نهائي</span>` : ''}
          <span style="background: rgba(212,175,55,0.1); color: var(--gold); border: 1px solid rgba(212,175,55,0.2); font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="ph-bold ph-clock-afternoon"></i> حصتان في يوم واحد
          </span>
        </div>
        <i class="ph-bold ph-caret-down accordion-arrow"></i>
      </button>
      <div class="accordion-content" style="display: ${index === 0 ? 'block' : 'none'}; padding: 1.25rem 1.75rem;">
        ${sessionsHtml}
      </div>
    `;

    const trigger = item.querySelector(".accordion-trigger");
    const content = item.querySelector(".accordion-content");
    trigger.onclick = () => {
      const isOpen = item.classList.contains("is-open");
      if (isOpen) {
        item.classList.remove("is-open");
        content.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("is-open");
        content.style.display = "block";
        trigger.setAttribute("aria-expanded", "true");
      }
    };

    dailyTimelineList.appendChild(item);
  }

  function buildEvaluationHtml(isAbsent, dateEvals) {
    if (isAbsent) {
      return `
        <div style="text-align: center; color: #ff4d4d; padding: 1.5rem 0;">
          <i class="ph-bold ph-user-minus" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
          <span>كان الطالب غائباً في هذه الحصة</span>
        </div>
      `;
    }

    const filteredEvals = dateEvals.filter(ev => ev.activityType !== "حفظ القرآن" && ev.activityType !== "مراجعة القرآن");

    if (filteredEvals.length === 0) {
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-clipboard-text" style="font-size: 2rem; color: var(--gold); display: block; margin-bottom: 0.5rem;"></i>
          <span>لم يسجل المشرف أي تقييم سلوكي تفصيلي لهذه الحصة بعد.</span>
        </div>
      `;
    }

    // Helper: render N read-only stars out of 5
    function renderReadOnlyStars(value) {
      let html = "";
      for (let i = 1; i <= 3; i++) {
        html += i <= value
          ? `<i class="ph-fill ph-star" style="color:var(--gold);font-size:1.25rem;"></i>`
          : `<i class="ph-bold ph-star" style="color:#ddd;font-size:1.25rem;"></i>`;
      }
      return html;
    }

    // ── Calculate SESSION-LEVEL total using same formula as recalculateStudentRewards ──
    // Average of section averages → round → cap 3 → ×2
    const sectionAverages = filteredEvals.map(ev => {
      let criteriaObj = {};
      try { criteriaObj = JSON.parse(ev.criteria); } catch (e) {}
      const vals = Object.values(criteriaObj).map(v => parseInt(v) || 0);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }).filter(avg => avg > 0);

    const sessionStars = sectionAverages.length > 0
      ? Math.min(3, Math.max(0, Math.round(sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length)))
      : 0;
    const sessionPoints = sessionStars * 2;

    let evBlocks = "";
    filteredEvals.forEach(ev => {
      let criteriaObj = {};
      try { criteriaObj = JSON.parse(ev.criteria); } catch (e) {}

      const criteriaKeys = Object.keys(criteriaObj);

      // ── Criteria grid ─────────────────────────────────────────────────────
      const gridItemsHtml = criteriaKeys.map(key => {
        const val = parseInt(criteriaObj[key]) || 0;
        return `
          <div style="display:flex;flex-direction:column;gap:0.25rem;background:rgba(13,92,70,0.025);padding:0.5rem 0.65rem;border-radius:7px;border:1px solid rgba(200,161,90,0.1);">
            <span style="font-size:0.75rem;color:var(--text-muted);font-weight:700;line-height:1.2;">${key}</span>
            <div style="display:flex;gap:0.1rem;">${renderReadOnlyStars(val)}</div>
          </div>
        `;
      }).join("");

      // ── Badges ────────────────────────────────────────────────────────────
      const badgesGranted = Array.isArray(ev.badgesGranted) ? ev.badgesGranted : [];
      const badgesHtml = badgesGranted.length > 0 ? `
        <div style="margin-top:0.6rem;padding-top:0.45rem;border-top:1px dashed rgba(200,161,90,0.18);display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;">
          <span style="font-size:0.72rem;color:var(--gold);font-weight:800;">الشارات:</span>
          ${badgesGranted.map(b => `<span style="background:rgba(200,161,90,0.1);color:var(--gold);border:1.5px solid rgba(200,161,90,0.28);border-radius:20px;padding:0.15rem 0.5rem;font-size:0.72rem;font-weight:800;">🏅 ${b}</span>`).join("")}
        </div>
      ` : "";

      // ── Notes ─────────────────────────────────────────────────────────────
      const notesHtml = ev.notes ? `
        <div style="margin-top:0.5rem;padding-top:0.45rem;border-top:1px dashed rgba(200,161,90,0.13);font-size:0.77rem;color:var(--text-muted);line-height:1.55;">
          <strong style="color:var(--gold);">ملاحظة:</strong> ${ev.notes}
        </div>
      ` : "";

      // ── Section type pill (no per-section points shown) ───────────────────
      const isGeneral = ev.activityType === "التقييم العام";
      const iconClass  = isGeneral ? "ph-user-focus" : "ph-book-open";
      const pillColor  = isGeneral
        ? "background:rgba(13,92,70,0.08);color:var(--green-dark);"
        : "background:rgba(200,161,90,0.1);color:#8b6914;";

      evBlocks += `
        <div style="background:#fff;border:1px solid rgba(200,161,90,0.18);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.75rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <!-- header pill only — no per-section points -->
          <div style="margin-bottom:0.65rem;">
            <span style="${pillColor}border-radius:20px;padding:0.2rem 0.65rem;font-size:0.78rem;font-weight:800;display:inline-flex;align-items:center;gap:0.3rem;">
              <i class="ph-bold ${iconClass}" style="font-size:0.85rem;"></i> ${ev.activityType}
            </span>
          </div>
          <!-- criteria grid -->
          ${criteriaKeys.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.4rem;">${gridItemsHtml}</div>` : ""}
          ${badgesHtml}
          ${notesHtml}
        </div>
      `;
    });

    // ── Session total footer (matches recalculateStudentRewards exactly) ───
    const sessionTotalHtml = `
      <div style="margin-top:0.25rem;padding:0.6rem 1rem;background:linear-gradient(135deg,rgba(13,92,70,0.07),rgba(13,92,70,0.03));border:1px solid rgba(13,92,70,0.12);border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <i class="ph-bold ph-trophy" style="color:var(--gold);font-size:1rem;"></i>
          <span style="font-size:0.8rem;color:var(--green-dark);font-weight:800;">إجمالي نقاط هذه الحصة</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="display:flex;gap:0.1rem;">${renderReadOnlyStars(sessionStars)}</div>
          <span style="font-size:0.9rem;color:var(--green-dark);font-weight:900;background:rgba(13,92,70,0.1);padding:0.2rem 0.6rem;border-radius:6px;">+${sessionPoints} نقطة</span>
        </div>
      </div>
    `;

    return evBlocks + sessionTotalHtml;
  }

  function buildQuranHtml(isAbsent, dateQuran, sessionCourses) {
    if (isAbsent) {
      return `
        <div style="text-align: center; color: #ff4d4d; padding: 1.5rem 0;">
          <i class="ph-bold ph-user-minus" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
          <span>كان الطالب غائباً في هذه الحصة</span>
        </div>
      `;
    }

    const validQuran = (dateQuran || []).filter(item => item && item.surah && item.surah.trim() !== "");

    if (validQuran.length === 0) {
      const coursesStr = sessionCourses || "";
      const hasQuran = !sessionCourses || 
        coursesStr.includes("قرآن") || 
        coursesStr.includes("قران") || 
        coursesStr.includes("حفظ") || 
        coursesStr.includes("مراجعة") || 
        coursesStr.includes("تجويد");
        
      if (!hasQuran) {
        return "";
      }
      return `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
          <i class="ph-bold ph-book-open" style="font-size: 2rem; color: var(--gold); display: block; margin-bottom: 0.5rem;"></i>
          <span>لم يسجل الطالب أي تقدم قرآني في هذه الحصة.</span>
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

      const rangeText = (fromV > 0 && toV > 0) ? `<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; margin-right: 0.5rem;">(من الآية ${item.fromVerse} إلى ${item.toVerse}) [${formatAyahCount(count)}]</span>` : "";

      qBlocks += `
        <div class="quran-log-item">
          <div>
            <span style="font-weight: 850; color: var(--green-dark); font-size: 0.95rem;">سورة ${item.surah}</span>
            ${rangeText}
            ${item.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;"><strong style="color:var(--gold);">ملاحظة:</strong> ${item.notes}</div>` : ''}
          </div>
          <div style="text-align: left; min-width: 80px;">
            <span style="background: ${typeColor}; color: #fff; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 800; font-size: 0.75rem; display: block; margin-bottom: 0.15rem; text-align: center;">${item.type}</span>
          </div>
        </div>
      `;
    });
    return qBlocks;
  }

  function renderDailyAccordionItem(dateStr, attRecord, dateEvals, dateQuran, index, circleTypeOverride) {
    const item = document.createElement("div");
    item.className = "accordion-item";
    if (index === 0) {
      item.classList.add("is-open");
    }

    const daysOfWeek = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const parsedDate = parseDateStr(dateStr);
    const arabicDay = parsedDate ? daysOfWeek[parsedDate.getDay()] : "";

    // Determine if date matches today's date
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const isToday = (dateStr === todayStr);

    const circleType = circleTypeOverride || (attRecord && attRecord.circleType) || "";
    
    let periodLabel = "الفترة الصباحية";
    if (circleType.includes("مسائية") || circleType.includes("مساء")) {
      periodLabel = "الفترة المسائية";
    } else if (circleType.includes("صباحية") || circleType.includes("صباح")) {
      periodLabel = "الفترة الصباحية";
    } else if (circleType) {
      periodLabel = circleType;
    }

    // Determine Courses
    const coursesSet = new Set();
    dateEvals.forEach(ev => {
      if (ev.activityType === "حفظ القرآن" || ev.activityType === "مراجعة القرآن") {
        return;
      }
      if (ev.activityType && ev.activityType !== "التقييم العام") {
        coursesSet.add(ev.activityType);
      }
    });
    
    if (dateQuran.length > 0) {
      coursesSet.add("حفظ القرآن ومراجعته");
    }
    
    if (attRecord && attRecord.courses && attRecord.courses !== "-") {
      attRecord.courses.split(/[،,]/).forEach(c => {
        const trimmed = c.trim();
        if (trimmed) coursesSet.add(trimmed);
      });
    }
    
    const finalCoursesList = coursesSet.size > 0 
      ? Array.from(coursesSet).join("، ") 
      : ((attRecord && attRecord.courses && attRecord.courses !== "-") ? attRecord.courses : "حفظ القرآن ومراجعته");

    let reportTitle = `يوم ${arabicDay} ${dateStr} — ${periodLabel} — المقرر: ${finalCoursesList}`;
    let liveBadge = "";
    if (isToday) {
      reportTitle = `تقرير حصة اليوم ${dateStr} — ${periodLabel} — المقرر: ${finalCoursesList}`;
      liveBadge = `
        <span style="background: rgba(13,92,70,0.08); color: var(--green); border: 1px solid rgba(13,92,70,0.2); font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i class="ph-bold ph-check-circle"></i> رصد نهائي
        </span>
      `;
    }

    // Determine Attendance Badge Styling
    let attStatus = "حاضر (تلقائي)";
    let badgeStyle = "background: rgba(13, 92, 70, 0.08); color: var(--green); border: 1px solid rgba(13, 92, 70, 0.15);";

    if (attRecord) {
      attStatus = attRecord.status;
      if (attRecord.status.startsWith("غائب")) {
        badgeStyle = "background: rgba(255, 68, 68, 0.08); color: #ff4d4d; border: 1px solid rgba(255, 68, 68, 0.15);";
      } else if (attRecord.status.startsWith("متأخر")) {
        badgeStyle = "background: rgba(212, 175, 55, 0.1); color: var(--gold); border: 1px solid rgba(212, 175, 55, 0.2);";
      }
    }

    const isAbsent = attRecord ? attRecord.status.startsWith("غائب") : false;

    const evaluationHtml = buildEvaluationHtml(isAbsent, dateEvals);
    const quranHtml = buildQuranHtml(isAbsent, dateQuran, attRecord ? attRecord.courses : null);

    // --- Supervisor Info & Courses ---
    let extraHeaderInfo = "";
    if (attRecord) {
      extraHeaderInfo = `
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.75rem; border-top: 1px dashed rgba(200, 161, 90, 0.15); padding-top: 0.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; width: 100%;">
          <span><strong>المشرف:</strong> ${attRecord.supervisor}</span>
          <span><strong>المقررات والأنشطة:</strong> ${finalCoursesList}</span>
        </div>
      `;
    }

    item.innerHTML = `
      <button class="accordion-trigger" type="button" aria-expanded="${index === 0 ? 'true' : 'false'}">
        <div class="accordion-title-group" style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
          <span class="accordion-title" style="font-size: 0.95rem;">${reportTitle}</span>
          ${liveBadge}
          <span style="${badgeStyle} font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="ph-bold ph-user-check"></i> الحضور: ${attStatus}
          </span>
        </div>
        <i class="ph-bold ph-caret-down accordion-arrow"></i>
      </button>
      <div class="accordion-content" style="display: ${index === 0 ? 'block' : 'none'}; padding: 1.25rem 1.75rem;">
        <div class="daily-merged-grid">
          <div class="daily-col-block">
            <div class="daily-block-title">
              <i class="ph-bold ph-activity" style="color: var(--gold);"></i>
              <span>التقييم اليومي والسلوك</span>
            </div>
            ${evaluationHtml}
          </div>
          <div class="daily-col-block">
            <div class="daily-block-title">
              <i class="ph-bold ph-book" style="color: var(--gold);"></i>
              <span>الإنجازات</span>
            </div>
            ${quranHtml}
          </div>
        </div>
        ${extraHeaderInfo}
      </div>
    `;

    // Accordion Toggle Event Listener
    const trigger = item.querySelector(".accordion-trigger");
    const content = item.querySelector(".accordion-content");
    trigger.onclick = () => {
      const isOpen = item.classList.contains("is-open");
      if (isOpen) {
        item.classList.remove("is-open");
        content.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("is-open");
        content.style.display = "block";
        trigger.setAttribute("aria-expanded", "true");
      }
    };

    dailyTimelineList.appendChild(item);
  }

  // Load Daily Archive on Startup
  loadDailyArchive();
});

/**
 * مسجد الشهداء — خدمة لوحة الإحصائيات والتحليلات العامة (Dashboard)
 */

function runWhenReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

runWhenReady(() => {
  const totalSessionsEl = document.getElementById("dash-total-sessions");
  const attendanceRateEl = document.getElementById("dash-attendance-rate");
  
  let dashboardDataCache = null;

  async function loadDashboard() {
    if (!totalSessionsEl || !attendanceRateEl) return;

    // إظهار واجهة التحميل اللطيفة
    totalSessionsEl.innerHTML = `<span class="spinner-circle" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle;"></span>`;
    attendanceRateEl.innerHTML = `<span class="spinner-circle" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle;"></span>`;

    try {
      // Load course ended setting natively
      const courseEndedVal = await window.DB.getSetting("courseEnded");
      localStorage.setItem("masjid_course_ended", courseEndedVal === "true" ? "true" : "false");
      updateToggleUI();

      // التشغيل التلقائي لبناء كشاف استعادة المعرفات لمرة واحدة
      try {
        const recoveryBuilt = await window.DB.getSetting("recovery_index_built_v1");
        if (recoveryBuilt !== "true") {
          const success = await window.DB.rebuildRecoveryIndex();
          if (success) {
            await window.DB.setSetting("recovery_index_built_v1", "true");
          }
        }
      } catch (recoveryErr) {
        console.warn("[Dashboard] Could not check or rebuild recovery index:", recoveryErr);
      }

      const data = await window.DB.readDashboardData();
      if (!data) throw new Error("Null stats data");
      
      dashboardDataCache = data;

      // 1. تحديث العدادات
      totalSessionsEl.textContent = data.totalSessions;
      attendanceRateEl.textContent = `${data.attendanceRate}%`;

      // 2. تفعيل التبديل بين قوائم المتفوقين
      setupDashboardLeaderboards();
      
      // 3. عرض جدول الترتيب العام
      renderRanksTable(data.allRanks);

      // 4. عرض شهادات التقدير (إن كانت الدورة منتهية)
      renderAppreciationList();

      // 5. تحميل بيانات لوحة الشرف الأسبوعية
      loadWeeklyHonorBoardData();

    } catch (err) {
      console.error("[Dashboard] Error loading stats:", err);
      totalSessionsEl.textContent = "0";
      attendanceRateEl.textContent = "0%";
      renderRanksTable([]);
      setupDashboardLeaderboards();
      renderAppreciationList();
    }
  }

  function setupDashboardLeaderboards() {
    const pointsBtn = document.getElementById("leader-points-btn");
    const quranBtn = document.getElementById("leader-quran-btn");
    const behaviorBtn = document.getElementById("leader-behavior-btn");
    const subTabBtns = [pointsBtn, quranBtn, behaviorBtn];

    subTabBtns.forEach(btn => {
      if (!btn) return;
      btn.onclick = () => {
        subTabBtns.forEach(b => {
          b.classList.remove("active");
          b.style.borderBottomColor = "transparent";
          b.style.fontWeight = "700";
          b.style.color = "var(--text-muted)";
        });
        btn.classList.add("active");
        btn.style.borderBottomColor = "var(--gold)";
        btn.style.fontWeight = "800";
        btn.style.color = "var(--green-dark)";

        const listType = btn.id.replace("leader-", "").replace("-btn", "");
        renderLeaderboardList(listType);
      };
    });

    // العرض الافتراضي
    renderLeaderboardList("points");
  }

  function renderLeaderboardList(type) {
    const container = document.getElementById("leaderboard-list");
    if (!container) return;

    if (!dashboardDataCache) {
      container.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا تتوفر إحصائيات لهذه الفئة حالياً.</div>`;
      return;
    }

    let list = [];
    let unit = "";
    let icon = "";

    if (type === "points") {
      list = dashboardDataCache.leaderboardPoints || [];
      unit = "نقطة";
      icon = `<i class="ph-fill ph-trophy" style="color:var(--gold);"></i>`;
    } else if (type === "quran") {
      list = dashboardDataCache.leaderboardQuran || [];
      unit = "آية كريمة";
      icon = `<i class="ph-fill ph-book-open" style="color:var(--green);"></i>`;
    } else { // behavior
      list = dashboardDataCache.leaderboardBehavior || [];
      unit = "نجوم معدل";
      icon = `<i class="ph-fill ph-star" style="color:var(--gold);"></i>`;
    }

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا تتوفر إحصائيات لهذه الفئة حالياً.</div>`;
      return;
    }

    container.innerHTML = list.map((item, index) => {
      let badgeNum = "";
      if (index === 0) badgeNum = `<i class="ph-fill ph-medal" style="color: #d4af37; font-size: 1.25rem; vertical-align: middle;"></i>`;
      else if (index === 1) badgeNum = `<i class="ph-fill ph-medal" style="color: #c0c0c0; font-size: 1.25rem; vertical-align: middle;"></i>`;
      else if (index === 2) badgeNum = `<i class="ph-fill ph-medal" style="color: #cd7f32; font-size: 1.25rem; vertical-align: middle;"></i>`;
      else badgeNum = `<span style="color: var(--text-muted); font-size: 0.9rem;">#${index + 1}</span>`;

      const scoreVal = type === "behavior" ? item.avgBehavior : (type === "quran" ? item.totalAyahs : item.points);

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(13, 92, 70, 0.03); border: 1px solid rgba(200, 161, 90, 0.12); padding: 0.6rem 1rem; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-weight: 800; font-size: 1.05rem; color: var(--green-dark);">${badgeNum}</span>
            <span style="font-weight: 800; color: var(--green-dark);">${item.studentName}</span>
          </div>
          <div style="font-weight: 900; color: var(--gold); display: flex; align-items: center; gap: 0.25rem;">
            <span>${scoreVal}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">${unit}</span>
            ${icon}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderRanksTable(ranksList) {
    const tbody = document.getElementById("dash-ranks-tbody");
    if (!tbody) return;

    if (!ranksList || ranksList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا توجد أي تقارير أو تقييمات منتهية لحساب الترتيب العام.</td></tr>`;
      return;
    }

    tbody.innerHTML = ranksList.map((item, index) => {
      return `
        <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;">
          <td style="padding: 1.1rem 0.75rem; font-weight: 800; color: var(--green-dark); text-align: center; vertical-align: middle;">
            ${index === 0 ? `<i class="ph-fill ph-trophy" style="color: var(--gold); vertical-align: middle; margin-left: 0.25rem;"></i> الأول` : (index + 1)}
          </td>
          <td style="padding: 1.1rem 0.75rem; font-weight: 700; text-align: center; vertical-align: middle;">${item.studentName}</td>
          <td style="padding: 1.1rem 0.75rem; text-align: center; font-weight: 800; color: var(--green); vertical-align: middle;">${item.points}</td>
          <td style="padding: 1.1rem 0.75rem; text-align: center; font-weight: 800; color: var(--gold); vertical-align: middle;">${item.stars} <i class="ph-fill ph-star" style="vertical-align: middle; margin-right: 0.15rem;"></i></td>
          <td style="padding: 1.1rem 0.75rem; text-align: center; vertical-align: middle;">
            <span style="background: rgba(212,175,55,0.1); color: var(--gold); padding: 0.35rem 0.75rem; border-radius: 12px; font-weight: 800; font-size: 0.8rem; display: inline-block;">
              ${item.badgesCount} شارات
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  // --- شهادات الشكر والتقدير ---
  async function renderAppreciationList() {
    const tbody = document.getElementById("appreciation-certificates-tbody");
    if (!tbody) return;

    const isEnded = localStorage.getItem("masjid_course_ended") === "true";
    const section = document.getElementById("admin-certificates-section");
    if (!section) return;

    if (!isEnded) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);"><span class="spinner-circle" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle;"></span> جاري تحميل قائمة الطلاب...</td></tr>`;

    try {
      const students = await window.DB.getAllStudents();
      const acceptedStudents = students.filter(s => s.status === "مقبول");
      const allRanks = (dashboardDataCache && dashboardDataCache.allRanks) ? dashboardDataCache.allRanks : [];

      if (acceptedStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">لا يوجد طلاب مقبولون لعرض شهاداتهم.</td></tr>`;
        return;
      }

      const studentsWithScores = acceptedStudents.map(student => {
        const rankInfo = allRanks.find(r => r.studentId === student.id);
        const points = rankInfo ? rankInfo.points : 0;
        const stars = rankInfo ? rankInfo.stars : (parseInt(student.cumulativeStars) || 0);
        let level = "بذرة المسجد";
        if (stars >= 160) level = "فارس المسجد";
        else if (stars >= 120) level = "نجم المسجد";
        else if (stars >= 80) level = "شجرة المسجد";
        else if (stars >= 40) level = "نبتة المسجد";

        return {
          id: student.id,
          name: student.name,
          points: points,
          stars: stars,
          level: level
        };
      });

      // Sort by points descending
      studentsWithScores.sort((a, b) => b.points - a.points);

      tbody.innerHTML = studentsWithScores.map(student => {
        let levelBadge = "";
        if (student.level === "فارس المسجد") {
          levelBadge = `<span style="background: rgba(156, 39, 176, 0.12); color: #9c27b0; border: 1px solid rgba(156, 39, 176, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-shield" style="font-size: 0.95em;"></i> فارس المسجد</span>`;
        } else if (student.level === "نجم المسجد") {
          levelBadge = `<span style="background: rgba(0, 168, 204, 0.12); color: #00a8cc; border: 1px solid rgba(0, 168, 204, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-star" style="font-size: 0.95em;"></i> نجم المسجد</span>`;
        } else if (student.level === "شجرة المسجد") {
          levelBadge = `<span style="background: rgba(212, 175, 55, 0.12); color: var(--gold); border: 1px solid rgba(212, 175, 55, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-leaf" style="font-size: 0.95em;"></i> شجرة المسجد</span>`;
        } else if (student.level === "نبتة المسجد") {
          levelBadge = `<span style="background: rgba(46, 204, 113, 0.12); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-plant" style="font-size: 0.95em;"></i> نبتة المسجد</span>`;
        } else {
          levelBadge = `<span style="background: rgba(230, 126, 34, 0.12); color: #d35400; border: 1px solid rgba(230, 126, 34, 0.25); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="ph-bold ph-seedling" style="font-size: 0.95em;"></i> بذرة المسجد</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--green-dark);">${student.name}</td>
            <td style="padding: 0.75rem 0.5rem; text-align: center; font-weight: 800; color: var(--green);">${student.points}</td>
            <td style="padding: 0.75rem 0.5rem; text-align: center; font-weight: 800; color: var(--gold);">${student.stars} <i class="ph-fill ph-star" style="vertical-align: middle;"></i></td>
            <td style="padding: 0.75rem 0.5rem; text-align: center;">${levelBadge}</td>
            <td style="padding: 0.75rem 0.5rem; text-align: center;">
              <button onclick="printAppreciationCertificate('${student.name.replace(/'/g, "\\'")}')" class="btn" style="background: var(--green); color: var(--white); border: none; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 800; border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                <i class="ph-bold ph-printer" style="vertical-align: middle; margin-left: 0.2rem;"></i> طباعة الشهادة
              </button>
            </td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.error("Error rendering appreciation list:", err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--red);">حدث خطأ أثناء تحميل قائمة الطلاب.</td></tr>`;
    }
  }

  window.printAppreciationCertificate = function(studentName) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("الرجاء السماح للنوافذ المنبثقة لطباعة الشهادة.");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>شهادة شكر وتقدير - ${studentName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --green-dark: #0c4a3b;
      --green-light: #0d5c46;
      --gold: #c8a15a;
      --gold-light: #d4af37;
      --bg: #fffdf6;
      --pattern: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23c8a15a' stroke-opacity='0.05' stroke-width='0.85'%3E%3Crect x='19' y='19' width='22' height='22'/%3E%3Crect x='19' y='19' width='22' height='22' transform='rotate(45 30 30)'/%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3Crect x='-6' y='-6' width='12' height='12'/%3E%3Crect x='-6' y='-6' width='12' height='12' transform='rotate(45 0 0)'/%3E%3Crect x='54' y='-6' width='12' height='12'/%3E%3Crect x='54' y='-6' width='12' height='12' transform='rotate(45 60 0)'/%3E%3Crect x='-6' y='54' width='12' height='12'/%3E%3Crect x='-6' y='54' width='12' height='12' transform='rotate(45 0 60)'/%3E%3Crect x='54' y='54' width='12' height='12'/%3E%3Crect x='54' y='54' width='12' height='12' transform='rotate(45 60 60)'/%3E%3Cline x1='30' y1='30' x2='0' y2='0'/%3E%3Cline x1='30' y1='30' x2='60' y2='0'/%3E%3Cline x1='30' y1='30' x2='0' y2='60'/%3E%3Cline x1='30' y1='30' x2='60' y2='60'/%3E%3Cline x1='30' y1='0' x2='30' y2='60'/%3E%3Cline x1='0' y1='30' x2='60' y2='30'/%3E%3C/g%3E%3C/svg%3E");
    }
    body {
      background: var(--bg);
      margin: 0;
      padding: 0;
      font-family: 'Cairo', sans-serif;
      direction: rtl;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #certificate-container {
      background: var(--bg);
      background-image: var(--pattern);
      border: 8px double var(--gold);
      padding: 3rem 2.5rem;
      border-radius: 15px;
      outline: 3px solid var(--green-dark);
      outline-offset: -16px;
      text-align: center;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    /* Elegant corners */
    .corner-ornament {
      position: absolute;
      width: 45px;
      height: 45px;
      border: 2px solid var(--gold);
      z-index: 10;
      pointer-events: none;
    }
    .top-left {
      top: 24px;
      left: 24px;
      border-right: none;
      border-bottom: none;
    }
    .top-right {
      top: 24px;
      right: 24px;
      border-left: none;
      border-bottom: none;
    }
    .bottom-left {
      bottom: 24px;
      left: 24px;
      border-right: none;
      border-top: none;
    }
    .bottom-right {
      bottom: 24px;
      right: 24px;
      border-left: none;
      border-top: none;
    }
    
    .corner-ornament::before {
      content: "";
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--gold);
      border-radius: 50%;
    }
    .top-left::before { right: -4px; bottom: -4px; }
    .top-right::before { left: -4px; bottom: -4px; }
    .bottom-left::before { right: -4px; top: -4px; }
    .bottom-right::before { left: -4px; top: -4px; }

    h1 {
      color: var(--green-dark);
      font-family: 'Amiri', serif;
      font-weight: 900;
      font-size: 2.8rem;
      margin: 0.25rem 0 0 0;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.05);
      letter-spacing: 1px;
    }
    .subtitle {
      color: var(--gold);
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
      font-family: 'Cairo', sans-serif;
    }
    .content {
      margin: 1.5rem 0;
      font-size: 1.35rem;
      line-height: 2.3;
      color: #2c3e50;
      font-family: 'Amiri', serif;
      padding: 0 1.5rem;
    }
    .student-name {
      font-size: 2.2rem;
      color: var(--green-dark);
      font-family: 'Amiri', serif;
      font-weight: 900;
      border-bottom: 2px dashed var(--gold);
      padding: 0.1rem 2.5rem;
      display: inline-block;
      margin: 0.75rem 0;
      background: rgba(13, 92, 70, 0.02);
      border-radius: 4px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 1rem;
      padding: 0 4rem;
      text-align: center;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 150px;
    }
    .sig-title {
      font-weight: 800;
      color: var(--green-dark);
      font-size: 1.1rem;
      display: block;
      margin-bottom: 3.5rem;
      font-family: 'Cairo', sans-serif;
    }
    .sig-line {
      font-size: 0.85rem;
      color: #7f8c8d;
      display: block;
      width: 160px;
      border-top: 1.5px dashed var(--gold);
    }
    .stamp-block {
      border: 2px dashed rgba(200, 161, 90, 0.5);
      border-radius: 50%;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      color: #95a5a6;
      font-weight: 700;
      background: rgba(200, 161, 90, 0.02);
      font-family: 'Cairo', sans-serif;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        background: var(--bg) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #certificate-container {
        width: 210mm;
        height: 297mm;
        max-height: 297mm;
        border-radius: 0;
        border-width: 8px;
        box-sizing: border-box;
        page-break-inside: avoid;
        page-break-after: avoid;
        overflow: hidden;
        box-shadow: none;
      }
    }
    .no-print:hover {
      background: #083b2d !important;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <button onclick="window.opener ? window.close() : window.location.href='index.html'" class="no-print" style="position: fixed; top: 20px; right: 20px; padding: 0.75rem 1.5rem; background: #0d5c46; color: #ffffff; border: 2px solid #c8a15a; border-radius: 8px; font-weight: 800; font-family: 'Cairo', sans-serif; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 9999; transition: all 0.2s;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg); margin-left: 0.25rem;">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
    <span>الرجوع إلى لوحة التحكم</span>
  </button>

  <div id="certificate-container">
    <div class="corner-ornament top-left"></div>
    <div class="corner-ornament top-right"></div>
    <div class="corner-ornament bottom-left"></div>
    <div class="corner-ornament bottom-right"></div>

    <div style="margin-top: 1rem;">
      <span style="font-family: 'Amiri', serif; font-size: 1.4rem; color: var(--green-dark); display: block; margin-bottom: 0.5rem; font-weight: 700;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
      <div style="width: 90px; height: 90px; margin: 0 auto 0.75rem; background: white; border-radius: 50%; border: 3px solid var(--gold); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
        <img id="logo-img" src="" alt="مسجد الشهداء" style="width: 70px; height: 70px; object-fit: contain;" />
      </div>
      <h1>شَهَادَةُ شُكْرٍ وَتَقْدِيرٍ</h1>
      <div style="width: 150px; height: 2px; background: linear-gradient(90deg, transparent, var(--gold) 50%, transparent); margin: 0.5rem auto 0.25rem;"></div>
      <p class="subtitle">يتقدم بها مسجد الشهداء بقرية إيباشيرن</p>
    </div>
    
    <div class="content">
      تَتَقَدَّمُ إِدَارَةُ مَسْجِدِ الشُّهَدَاءِ بِأَخْلَصِ عِبَارَاتِ الشُّكْرِ وَالْعِرْفَانِ لِلطَّالِبِ(ة):<br>
      <div style="margin: 0.5rem 0;">
        <span class="student-name">${studentName}</span>
      </div>
      نَظِيرَ مَجْهُودَاتِهِ المُمَيَّزَةِ، وَانْضِبَاطِهِ الطَّيِّبِ، وَتَفَوُّقِهِ فِي حِفْظِ وَمُرَاجَعَةِ القُرْآنِ الكَرِيمِ<br>
      خِلَالَ الدَّوْرَةِ القُرْآنِيَّةِ الصَّيْفِيَّةِ لِعَامِ 2026م، سَائِلِينَ اللهَ لَهُ المَزِيدَ مِنَ التَّوْفِيقِ وَالسَّدَادِ.
    </div>

    <div class="signatures">
      <div class="sig-block">
        <span class="sig-title">إمضاء إمام المسجد</span>
        <span class="sig-line"></span>
      </div>
      <div class="sig-block" style="margin-top: 0.5rem;">
        <span style="font-weight: 800; color: var(--green-dark); font-size: 1.1rem; display: block; margin-bottom: 0.5rem; font-family: 'Cairo', sans-serif;">ختم المسجد</span>
        <div class="stamp-block">محل الختم</div>
      </div>
    </div>
  </div>
  <script>
    document.getElementById("logo-img").src = window.opener ? window.opener.location.origin + "/images/masjidlogo.png" : "../images/masjidlogo.png";
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- إدارة حالة الدورة (نهاية الدورة) ---
  const toggleCourseBtn = document.getElementById("toggle-course-btn");
  const toggleIcon = document.getElementById("toggle-icon");
  const toggleText = document.getElementById("toggle-text");

  function updateToggleUI() {
    if (!toggleCourseBtn || !toggleIcon || !toggleText) return;
    const isEnded = localStorage.getItem("masjid_course_ended") === "true";
    if (isEnded) {
      toggleCourseBtn.style.background = "var(--green)";
      toggleCourseBtn.style.color = "var(--white)";
      toggleCourseBtn.style.borderColor = "var(--green)";
      toggleIcon.className = "ph-bold ph-toggle-right";
      toggleText.textContent = "إلغاء إعلان نهاية الدورة (مفعل حالياً)";
    } else {
      toggleCourseBtn.style.background = "transparent";
      toggleCourseBtn.style.color = "var(--gold)";
      toggleCourseBtn.style.borderColor = "var(--gold)";
      toggleIcon.className = "ph-bold ph-toggle-left";
      toggleText.textContent = "تفعيل نهاية الدورة وإصدار الشهادات";
    }
  }

  if (toggleCourseBtn) {
    toggleCourseBtn.onclick = async () => {
      const isEnded = localStorage.getItem("masjid_course_ended") === "true";
      const newValue = isEnded ? "false" : "true";
      localStorage.setItem("masjid_course_ended", newValue);
updateToggleUI();
      renderAppreciationList();
      
      // Sync the course ended state to Firestore natively
      try {
        await window.DB.setSetting("courseEnded", newValue);
        console.log("[Dashboard] Course ended state synced to server:", newValue);
      } catch (err) {
        console.warn("[Dashboard] Failed to sync course ended state to server:", err);
      }
    };
  }

  // --- Weekly Honor Board Admin Logic ---
  let activeHonorGender = "males";
  let wizardAcceptedStudents = [];
  let isWeeklySaving = false; // Prevent double submit

  const toggleMalesBoard = document.getElementById("toggle-males-board");
  const toggleFemalesBoard = document.getElementById("toggle-females-board");
  const wizardContainer = document.getElementById("honor-wizard-container");
  const wizardTitle = document.getElementById("wizard-title");

  // Update status text on toggle cards
  function updateWeeklyTogglesUI() {
    const malesStatus = document.getElementById("toggle-males-status");
    const femalesStatus = document.getElementById("toggle-females-status");
    
    if (toggleMalesBoard && malesStatus) {
      if (toggleMalesBoard.checked) {
        malesStatus.textContent = "مفعل";
        malesStatus.classList.add("active");
      } else {
        malesStatus.textContent = "غير مفعل";
        malesStatus.classList.remove("active");
      }
    }
    
    if (toggleFemalesBoard && femalesStatus) {
      if (toggleFemalesBoard.checked) {
        femalesStatus.textContent = "مفعل";
        femalesStatus.classList.add("active");
      } else {
        femalesStatus.textContent = "غير مفعل";
        femalesStatus.classList.remove("active");
      }
    }
  }

  const wizardWeekName = document.getElementById("wizard-week-name");
  const selectRank1Winner = document.getElementById("select-rank1-winner");
  const selectRank2Winner = document.getElementById("select-rank2-winner");
  const selectRank3Winner = document.getElementById("select-rank3-winner");
  const wizardDistinguishedTeam = document.getElementById("wizard-distinguished-team");
  const wizardNotes = document.getElementById("wizard-notes");
  const btnSaveWizardHonor = document.getElementById("btn-save-wizard-honor");

  // Helper to populate student select options
  function populateStudentDropdowns() {
    [selectRank1Winner, selectRank2Winner, selectRank3Winner].forEach(selectEl => {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      
      selectEl.innerHTML = `<option value="">-- اختر طالباً --</option>`;
      
      wizardAcceptedStudents.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = s.name;
        if (s.name === currentVal) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });
    });
  }

  const tabEditMales = document.getElementById("tab-edit-males");
  const tabEditFemales = document.getElementById("tab-edit-females");

  if (tabEditMales) {
    tabEditMales.addEventListener("click", () => {
      initWizard("males", false);
    });
  }
  if (tabEditFemales) {
    tabEditFemales.addEventListener("click", () => {
      initWizard("females", false);
    });
  }

  const initWizard = async (gender, smoothScroll = true) => {
    activeHonorGender = gender;
    
    // Update tab active state classes
    if (gender === "males") {
      if (tabEditMales) tabEditMales.classList.add("active");
      if (tabEditFemales) tabEditFemales.classList.remove("active");
    } else {
      if (tabEditFemales) tabEditFemales.classList.add("active");
      if (tabEditMales) tabEditMales.classList.remove("active");
    }
    
    // Show container
    if (wizardContainer) {
      wizardContainer.style.display = "block";
      if (smoothScroll) {
        wizardContainer.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (wizardTitle) {
      wizardTitle.textContent = gender === "females" ? "تحديد نجوم الأسبوع (البنات)" : "تحديد نجوم الأسبوع (البنين)";
    }

    const skeleton = document.getElementById("honor-skeleton-loader");
    const emptyState = document.getElementById("wizard-empty-state");
    const centeredLayout = document.querySelector(".honor-centered-layout");
    
    if (skeleton) skeleton.style.display = "block";
    if (emptyState) emptyState.style.display = "none";
    if (centeredLayout) centeredLayout.style.display = "none";

    // Fetch accepted students for dropdowns
    try {
      const studentsList = await window.DB.getAllStudents();
      const targetGender = gender === "females" ? "أنثى" : "ذكر";
      wizardAcceptedStudents = studentsList.filter(s => s.status === "مقبول" && s.gender === targetGender);
    } catch (e) {
      console.error("Error loading students for dropdown:", e);
      wizardAcceptedStudents = [];
    }

    // Hide skeleton
    if (skeleton) skeleton.style.display = "none";

    // Handle empty state
    if (wizardAcceptedStudents.length === 0) {
      if (emptyState) emptyState.style.display = "block";
      if (centeredLayout) centeredLayout.style.display = "none";
      return;
    }

    // Show form layout
    if (emptyState) emptyState.style.display = "none";
    if (centeredLayout) centeredLayout.style.display = "block";

    populateStudentDropdowns();

    // Load any previously saved data for this gender
    try {
      const savedData = await window.DB.getWeeklyHonorBoard(gender);
      if (savedData) {
        if (wizardWeekName) wizardWeekName.value = savedData.weekName || "الأسبوع الأول";
        if (selectRank1Winner) selectRank1Winner.value = savedData.rank1 || savedData.memorizationChampion || "";
        if (selectRank2Winner) selectRank2Winner.value = savedData.rank2 || savedData.behaviorChampion || "";
        if (selectRank3Winner) selectRank3Winner.value = savedData.rank3 || savedData.participationChampion || "";
        if (wizardDistinguishedTeam) wizardDistinguishedTeam.value = savedData.distinguishedTeam || "";
        if (wizardNotes) wizardNotes.value = savedData.notes || "";
      } else {
        if (selectRank1Winner) selectRank1Winner.value = "";
        if (selectRank2Winner) selectRank2Winner.value = "";
        if (selectRank3Winner) selectRank3Winner.value = "";
        if (wizardDistinguishedTeam) wizardDistinguishedTeam.value = "";
        if (wizardNotes) wizardNotes.value = "";
      }
    } catch (e) {
      console.warn("Error loading weekly honor board data:", e);
    }
  };

  if (toggleMalesBoard) {
    toggleMalesBoard.addEventListener("change", async () => {
      const isActive = toggleMalesBoard.checked;
      await window.DB.setSetting("weekly_honor_board_males_active", isActive ? "true" : "false");
      updateWeeklyTogglesUI();
      
      const femalesActive = toggleFemalesBoard ? toggleFemalesBoard.checked : false;
      if (isActive || femalesActive) {
        initWizard(activeHonorGender, true);
      } else {
        wizardContainer.style.display = "none";
      }
    });
  }

  if (toggleFemalesBoard) {
    toggleFemalesBoard.addEventListener("change", async () => {
      const isActive = toggleFemalesBoard.checked;
      await window.DB.setSetting("weekly_honor_board_females_active", isActive ? "true" : "false");
      updateWeeklyTogglesUI();
      
      const malesActive = toggleMalesBoard ? toggleMalesBoard.checked : false;
      if (isActive || malesActive) {
        initWizard(activeHonorGender, true);
      } else {
        wizardContainer.style.display = "none";
      }
    });
  }

  if (btnSaveWizardHonor) {
    btnSaveWizardHonor.addEventListener("click", async (e) => {
      e.preventDefault();
      
      if (isWeeklySaving) return; // Prevent double submit
      
      const weekName = wizardWeekName.value;
      const rank1 = selectRank1Winner.value;
      const rank2 = selectRank2Winner.value;
      const rank3 = selectRank3Winner.value;
      
      if (!rank1 || !rank2 || !rank3) {
        alert("يرجى اختيار الطلاب للمراكز الثلاثة أولاً.");
        return;
      }

      const distinguishedTeam = wizardDistinguishedTeam.value.trim() || "لا يوجد هذا الأسبوع";
      const notes = wizardNotes.value.trim() || "";

      isWeeklySaving = true;
      btnSaveWizardHonor.disabled = true;
      const originalHtml = btnSaveWizardHonor.innerHTML;
      btnSaveWizardHonor.innerHTML = `<i class="ph-bold ph-spinner-gap animate-spin"></i> جاري الحفظ...`;

      const boardData = {
        weekName,
        memorizationChampion: rank1,
        behaviorChampion: rank2,
        participationChampion: rank3,
        rank1,
        rank2,
        rank3,
        distinguishedTeam,
        notes
      };

      try {
        const success = await window.DB.saveWeeklyHonorBoard(boardData, activeHonorGender);
        if (success) {
          alert("✅ تم حفظ وتحديث نجوم الأسبوع بنجاح!");
        } else {
          alert("❌ فشل في حفظ نجوم الأسبوع.");
        }
      } catch (err) {
        console.error(err);
        alert("❌ حدث خطأ أثناء محاولة حفظ البيانات.");
      } finally {
        isWeeklySaving = false;
        btnSaveWizardHonor.disabled = false;
        btnSaveWizardHonor.innerHTML = originalHtml;
      }
    });
  }

  async function loadWeeklyHonorBoardData() {
    try {
      const malesActive = await window.DB.getSetting("weekly_honor_board_males_active") === "true";
      const femalesActive = await window.DB.getSetting("weekly_honor_board_females_active") === "true";

      if (toggleMalesBoard) toggleMalesBoard.checked = malesActive;
      if (toggleFemalesBoard) toggleFemalesBoard.checked = femalesActive;
      
      updateWeeklyTogglesUI();

      if (malesActive || femalesActive) {
        const defaultGender = malesActive ? "males" : "females";
        await initWizard(defaultGender, false);
      }
    } catch (err) {
      console.warn("[Dashboard] Could not load weekly honor board settings:", err);
    }
  }

  // تحديث حالة الزر فور التحميل
  updateToggleUI();

  // Load Dashboard Data
  loadDashboard();

  setTimeout(adjustPosterScale, 150);
});

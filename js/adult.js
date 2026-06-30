/**
 * مسجد الشهداء — بوابة متابعة الكبار (التعليم القرآني والشرعي)
 */

import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const auth = window.DB.auth;
  const db = window.DB.db;

  // --- UI Elements ---
  const portalLoginView = document.getElementById("portal-login-view");
  const portalDashboardView = document.getElementById("portal-dashboard-view");
  const loginForm = document.getElementById("adult-login-form");
  const loginSubmitBtn = document.getElementById("btn-login-submit");
  const adultIdInput = document.getElementById("adult-id");
  const adultPhoneInput = document.getElementById("adult-phone");

  const welcomeAdultName = document.getElementById("welcome-adult-name");
  const badgeAdultId = document.getElementById("badge-adult-id");
  const badgeAdultSection = document.getElementById("badge-adult-section");
  const badgeAdultPhone = document.getElementById("badge-adult-phone");
  const badgeAdultQuranLevel = document.getElementById("badge-adult-quranLevel");
  const badgeAdultPriorBlock = document.getElementById("badge-adult-prior-block");
  const badgeAdultPrior = document.getElementById("badge-adult-prior");

  const adultTargetHizbSelect = document.getElementById("adult-target-hizb");
  const dirFrontRadio = document.getElementById("adult-memo-direction-front");
  const dirBackRadio  = document.getElementById("adult-memo-direction-back");
  const dirFrontLabel = document.getElementById("dir-front-label");
  const dirBackLabel  = document.getElementById("dir-back-label");
  const progressDirectionLabel = document.getElementById("progress-direction-label");
  
  const statMemorizedVerses = document.getElementById("stat-memorized-verses");
  const statTargetVerses = document.getElementById("stat-target-verses");
  const statAttendanceCount = document.getElementById("stat-attendance-count");
  
  const adultHistoryList = document.getElementById("adult-history-list");
  const noHistoryMsg = document.getElementById("no-history-msg");
  const adultLogoutBtn = document.getElementById("adult-logout-btn");

  // --- State ---
  let activeAdultId = null;
  let activeAdultPhone = null;
  let cachedProfileData = null;

  // --- Boot Check ---
  checkAdultSession();

  function checkAdultSession() {
    const isLogged = sessionStorage.getItem("masjid_adult_logged") === "true";
    if (isLogged) {
      activeAdultId = sessionStorage.getItem("masjid_adult_id");
      activeAdultPhone = sessionStorage.getItem("masjid_adult_phone");
      
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          fetchAndLoadAdultPortal(activeAdultId, activeAdultPhone, false);
        } else {
          try {
            await signInAnonymously(auth);
            fetchAndLoadAdultPortal(activeAdultId, activeAdultPhone, false);
          } catch (err) {
            console.warn("[Adult Portal] Anonymous auth failed, attempting layout load anyway:", err);
            fetchAndLoadAdultPortal(activeAdultId, activeAdultPhone, false);
          }
        }
      });
    } else {
      portalLoginView.style.display = "block";
      portalDashboardView.style.display = "none";
    }
  }

  // --- Login Form Submit ---
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const adultId = adultIdInput.value.trim().toUpperCase();
    const phone = adultPhoneInput.value.trim();

    if (!adultId || !phone) {
      alert("يرجى ملء كافة الحقول المطلوبة.");
      return;
    }

    fetchAndLoadAdultPortal(adultId, phone, true);
  });

  async function fetchAndLoadAdultPortal(adultId, phone, isManualLogin) {
    if (isManualLogin) {
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.innerHTML = `<i class="ph-bold ph-spinner-gap animate-spin"></i> جاري التحقق من البيانات...`;
    }

    try {
      if (isManualLogin) {
        let uid = null;
        try {
          const userCredential = await signInAnonymously(auth);
          uid = userCredential.user.uid;
        } catch (authErr) {
          console.warn("[Adult Portal] Anonymous sign-in failed during login:", authErr);
        }

        if (uid) {
          try {
            await setDoc(doc(db, "adult_sessions", uid), {
              adultId: adultId,
              phone: phone,
              createdAt: serverTimestamp()
            });
          } catch (sessionErr) {
            console.warn("[Adult Portal] Session logger failed:", sessionErr);
          }
        }
      }

      const result = await window.DB.readAdultProfile(adultId, phone);
      if (result.success) {
        cachedProfileData = result;
        activeAdultId = adultId;
        activeAdultPhone = phone;

        sessionStorage.setItem("masjid_adult_logged", "true");
        sessionStorage.setItem("masjid_adult_id", adultId);
        sessionStorage.setItem("masjid_adult_phone", phone);

        populateDashboard();
        
        portalLoginView.style.display = "none";
        portalDashboardView.style.display = "block";

        if (isManualLogin && typeof confetti === "function") {
          // Play confetti on successful manual login
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } else {
        alert(result.error || "عذراً، فشل التحقق من هويتك. يرجى مراجعة البيانات.");
        if (isManualLogin) {
          logoutAdult();
        }
      }
    } catch (error) {
      console.error(error);
      alert("فشل الاتصال بالسيرفر للتحقق من الحساب.");
      if (isManualLogin) {
        logoutAdult();
      }
    } finally {
      if (isManualLogin) {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.innerHTML = `<i class="ph-bold ph-sign-in"></i> تسجيل الدخول`;
      }
    }
  }

  // --- Populate Dashboard ---
  function populateDashboard() {
    const p = cachedProfileData.participant;
    const logs = cachedProfileData.progressLogs || [];

    // Set Welcome info
    welcomeAdultName.textContent = p.name;
    badgeAdultId.textContent = p.id;
    badgeAdultSection.textContent = p.section === "نساء" ? "قسم النساء (إناث)" : "قسم الرجال (ذكور)";
    badgeAdultPhone.textContent = p.phone;
    if (badgeAdultQuranLevel) {
      badgeAdultQuranLevel.textContent = p.quranLevel || "غير محدد";
    }
    if (p.lastSurah) {
      if (badgeAdultPriorBlock) badgeAdultPriorBlock.style.display = "flex";
      if (badgeAdultPrior) badgeAdultPrior.textContent = `سورة ${p.lastSurah} (آية ${p.lastVerse || 1})`;
    } else {
      if (badgeAdultPriorBlock) badgeAdultPriorBlock.style.display = "none";
    }

    // Set Target Selector Dropdown
    adultTargetHizbSelect.value = String(p.target || 60);

    // Set Memorization Direction
    const savedDir = p.memoDirection || "front";
    if (dirFrontRadio) dirFrontRadio.checked = (savedDir === "front");
    if (dirBackRadio)  dirBackRadio.checked  = (savedDir === "back");
    updateDirectionUI(savedDir);

    // Compute progress & stats
    updateProgressAndStats();

    // Render list
    renderHistoryList(logs);
  }

  function parseStartingHizbs(quranLevel) {
    if (!quranLevel) return 0;
    const clean = quranLevel.trim();
    if (clean.includes("60") || clean.includes("كامل")) return 60;
    if (clean.includes("45")) return 45;
    if (clean.includes("30") || clean.includes("نصف")) return 30;
    if (clean.includes("20")) return 20;
    if (clean.includes("15")) return 15;
    if (clean.includes("10")) return 10;
    if (clean.includes("5")) return 5;
    if (clean.includes("2") || clean.includes("حزبين")) return 2;
    if (clean.includes("1") || clean.includes("حزب")) return 1;
    const match = clean.match(/\d+/);
    if (match) return parseInt(match[0]) || 0;
    return 0;
  }

  // --- Direction UI Helper ---
  function updateDirectionUI(dir) {
    const isBack = (dir === "back");
    const activeStyle  = "border-color: var(--green); background: rgba(13,92,70,0.06);";
    const inactiveStyle = "border-color: rgba(200,161,90,0.3); background: white;";
    if (dirFrontLabel) dirFrontLabel.style.cssText += isBack ? inactiveStyle : activeStyle;
    if (dirBackLabel)  dirBackLabel.style.cssText  += isBack ? activeStyle  : inactiveStyle;
    if (progressDirectionLabel) {
      progressDirectionLabel.textContent = isBack
        ? "← من سورة الناس"
        : "من سورة البقرة ←";
    }
  }

  function updateProgressAndStats() {
    const p = cachedProfileData.participant;
    const dir = p.memoDirection || "front";
    const targetHizb = parseInt(adultTargetHizbSelect.value) || 60;
    const logs = cachedProfileData.progressLogs || [];

    // Update direction badge
    updateDirectionUI(dir);

    // Total verses count mapping for targets
    const targetVersesCount = Math.round(targetHizb * (6236 / 60));

    // Calculate starting verses
    const startingHizbs = parseStartingHizbs(p.quranLevel);
    const startingVersesCount = Math.round(startingHizbs * (6236 / 60));

    // Calculate unique verses from "حفظ" logs
    const uniqueVerses = new Set();
    let presentCount = 0;

    logs.forEach(log => {
      if (log.attendance === "حاضر") {
        presentCount++;
        const isQuran = (log.courseName === "تحفيظ القرآن" || log.courseName === "حفظ القرآن ومراجعته" || log.activityType === "حفظ" || log.activityType === "مراجعة");
        if (isQuran && (log.activityType === "حفظ" || log.activityType === "حفظ جديد")) {
          const surah = (log.surah || "").trim();
          const from = Number(log.fromVerse) || 0;
          const to = Number(log.toVerse) || 0;
          if (surah && from > 0 && to >= from) {
            for (let i = from; i <= to; i++) {
              uniqueVerses.add(`${surah}:${i}`);
            }
          }
        }
      }
    });

    const memorizedCount = startingVersesCount + uniqueVerses.size;
    const percentage = targetVersesCount > 0 ? Math.min(100, Math.round((memorizedCount / targetVersesCount) * 100)) : 0;

    // Update UI Stats
    statMemorizedVerses.textContent = `${memorizedCount} آية`;
    statTargetVerses.textContent = `${targetVersesCount} آية`;
    statAttendanceCount.textContent = `${presentCount} حصة`;

    // Animate Progress Circle
    const isBack = (dir === "back");
    const progressCircleFill = document.getElementById("progress-circle-fill");
    const progressCirclePercent = document.getElementById("progress-circle-percent");
    if (progressCircleFill) {
      const circumference = 439.82;
      const offset = circumference - (percentage / 100) * circumference;
      progressCircleFill.style.strokeDashoffset = offset;
      progressCircleFill.parentElement.style.transform = isBack ? "rotate(90deg)" : "rotate(-90deg)";
    }
    if (progressCirclePercent) {
      progressCirclePercent.textContent = `${percentage}%`;
    }
  }

  // --- Handle Target Selector Change ---
  adultTargetHizbSelect.addEventListener("change", async () => {
    const newTarget = parseInt(adultTargetHizbSelect.value) || 60;
    cachedProfileData.participant.target = newTarget;
    updateProgressAndStats();
    try {
      await window.DB.updateAdultParticipantTarget(activeAdultId, newTarget);
    } catch (err) {
      console.error("[Adult Portal] Saving new target failed:", err);
    }
  });

  // --- Handle Memorization Direction Change ---
  function handleDirectionChange(newDir) {
    cachedProfileData.participant.memoDirection = newDir;
    updateProgressAndStats();
    window.DB.updateAdultParticipantDirection(activeAdultId, newDir)
      .catch(err => console.error("[Adult Portal] Saving direction failed:", err));
  }
  if (dirFrontRadio) dirFrontRadio.addEventListener("change", () => { if (dirFrontRadio.checked) handleDirectionChange("front"); });
  if (dirBackRadio)  dirBackRadio.addEventListener("change",  () => { if (dirBackRadio.checked)  handleDirectionChange("back"); });

  // --- Render History Logs ---
  // Helper: render N read-only stars out of 5
  function renderReadOnlyStars(value) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      html += i <= value
        ? `<i class="ph-fill ph-star" style="color:var(--gold);font-size:1.25rem;"></i>`
        : `<i class="ph-bold ph-star" style="color:#ddd;font-size:1.25rem;"></i>`;
    }
    return html;
  }

  function renderHistoryList(logs) {
    adultHistoryList.innerHTML = "";
    
    if (logs.length === 0) {
      noHistoryMsg.style.display = "block";
      return;
    }
    
    noHistoryMsg.style.display = "none";
    
    logs.forEach(log => {
      const isAbsent = (log.attendance === "غائب");
      
      let badgeClass = "type-quran";
      if (log.activityType === "فقه" || log.courseName === "علوم الفقه") {
        badgeClass = "type-fiqh";
      } else if (log.activityType === "تفسير" || log.courseName === "تفسير القرآن") {
        badgeClass = "type-tafsir";
      }

      let mainContentHTML = "";
      if (isAbsent) {
        mainContentHTML = `
          <div style="text-align:center;color:#ff4d4d;padding:1rem 0;font-weight:800;">
            <i class="ph-bold ph-user-minus" style="font-size:1.8rem;display:block;margin-bottom:0.4rem;"></i>
            غائب عن الحضور
          </div>
        `;
      } else {
        // Parse criteria if available
        let criteriaObj = {};
        try { criteriaObj = JSON.parse(log.criteria || "{}"); } catch (e) {}
        const criteriaKeys = Object.keys(criteriaObj);

        // Surah/range block
        const surahVal = log.surah || "";
        const fromVal = Number(log.fromVerse) || 0;
        const toVal   = Number(log.toVerse)   || 0;
        const rangeText = (fromVal > 0 && toVal >= fromVal) ? ` (الآيات: ${fromVal} إلى ${toVal})` : "";
        const contentLine = surahVal
          ? `<div style="font-size:0.85rem;color:var(--green-dark);font-weight:700;margin-bottom:${criteriaKeys.length ? '0.75rem' : '0'}"><strong>المحتوى:</strong> ${surahVal}${rangeText}</div>`
          : "";

        // Criteria grid (same premium card as children)
        const gridItemsHtml = criteriaKeys.map(key => {
          const val = parseInt(criteriaObj[key]) || 0;
          return `
            <div style="display:flex;flex-direction:column;gap:0.3rem;background:rgba(13,92,70,0.02);padding:0.6rem 0.75rem;border-radius:8px;border:1px solid rgba(200,161,90,0.12);">
              <span style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">${key}</span>
              <div style="display:flex;gap:0.15rem;">${renderReadOnlyStars(val)}</div>
            </div>
          `;
        }).join("");

        // Notes
        const notesHtml = log.notes ? `
          <div style="margin-top:0.6rem;padding-top:0.5rem;border-top:1px dashed rgba(200,161,90,0.15);font-size:0.8rem;color:var(--text-muted);">
            <strong style="color:var(--gold);">ملاحظات المشرف:</strong> ${log.notes}
          </div>
        ` : "";

        // Stars + points footer
        const starsFooter = (log.stars > 0) ? `
          <div style="margin-top:0.7rem;padding-top:0.5rem;border-top:1px solid rgba(13,92,70,0.06);display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;gap:0.15rem;">${renderReadOnlyStars(log.stars)}</div>
            <span style="font-size:0.88rem;color:var(--green-dark);font-weight:900;background:rgba(13,92,70,0.07);padding:0.2rem 0.6rem;border-radius:6px;">+${log.points || (log.stars * 2)} نقاط</span>
          </div>
        ` : "";

        mainContentHTML = `
          ${contentLine}
          ${criteriaKeys.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem;">${gridItemsHtml}</div>` : ""}
          ${notesHtml}
          ${starsFooter}
        `;
      }

      const itemHTML = `
        <div class="history-item" style="${isAbsent ? 'background:rgba(255,68,68,0.01);border-color:rgba(255,68,68,0.15);' : ''}">
          <div class="history-item-header">
            <span class="history-date"><i class="ph-bold ph-calendar-check" style="color:var(--gold);vertical-align:middle;margin-left:0.25rem;"></i> حصة يوم ${log.date}</span>
            <span class="history-type-badge ${badgeClass}">${log.activityType || log.courseName || "تسميع"}</span>
          </div>
          <div style="margin-top:0.6rem;">${mainContentHTML}</div>
        </div>
      `;
      adultHistoryList.insertAdjacentHTML("beforeend", itemHTML);
    });
  }

  // --- Logout ---
  function logoutAdult() {
    sessionStorage.removeItem("masjid_adult_logged");
    sessionStorage.removeItem("masjid_adult_id");
    sessionStorage.removeItem("masjid_adult_phone");
    activeAdultId = null;
    activeAdultPhone = null;
    cachedProfileData = null;

    portalLoginView.style.display = "block";
    portalDashboardView.style.display = "none";
    loginForm.reset();
  }

  adultLogoutBtn.addEventListener("click", () => {
    if (confirm("هل تريد تسجيل الخروج من بوابة المتابعة؟")) {
      logoutAdult();
    }
  });
});

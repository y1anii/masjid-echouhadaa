/**
 * مسجد الشهداء — لوحة تحكم ولي الأمر (بوابة المتابعة الشاملة)
 */

import { collection, query, where, getDocs, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth } from "../admin/js/db.js?v=60";

function normalizeArabic(text) {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\u0640/g, "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ");
}

// --- UI Elements ---
  const portalLoginView = document.getElementById("portal-login-view");
  const portalDashboardView = document.getElementById("portal-dashboard-view");
  
  const loginForm = document.getElementById("parent-login-form");
  const loginSubmitBtn = document.getElementById("btn-login-submit");
  const parentStudentIdInput = document.getElementById("parent-student-id");
  const parentPhoneInput = document.getElementById("parent-phone");

  const welcomeStudentName = document.getElementById("welcome-student-name");
  const badgeStudentId = document.getElementById("badge-student-id");
  const badgePointsTotal = document.getElementById("badge-points-total");
  const badgeStarsCum = document.getElementById("badge-stars-cum");
  const badgeRank = document.getElementById("badge-rank");
  const badgeLevel = document.getElementById("badge-level");

  const studentBadgesGalleryCard = document.getElementById("student-badges-gallery-card");
  const badgesGalleryList = document.getElementById("badges-gallery-list");

  const parentLogoutBtn = document.getElementById("parent-logout-btn");

  // Certificate Print Elements
  const certStudentName = document.getElementById("cert-student-name");
  const certTotalAyahs = document.getElementById("cert-total-ayahs");
  const certOverallGrade = document.getElementById("cert-overall-grade");
  const certFinalStars = document.getElementById("cert-final-stars");
  const certFinalLevel = document.getElementById("cert-final-level");

  // --- State Variables ---
  let portalDataCache = null;

  // --- Helper Functions ---
  function formatDateOnly(dateStr) {
    if (!dateStr) return '';
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

  // --- Initialize Session ---
  checkParentSession();

  function checkParentSession() {
    const isLogged = sessionStorage.getItem("masjid_parent_logged") === "true";
    if (isLogged) {
      const studentId = sessionStorage.getItem("masjid_parent_student_id");
      const phone = sessionStorage.getItem("masjid_parent_phone");
      
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          fetchAndLoadParentPortal(studentId, phone, false);
        } else {
          try {
            await signInAnonymously(auth);
            fetchAndLoadParentPortal(studentId, phone, false);
          } catch (err) {
            console.warn("Failed to re-authenticate parent anonymously, proceeding anyway:", err);
            fetchAndLoadParentPortal(studentId, phone, false);
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
    const studentId = parentStudentIdInput.value.trim();
    const phone = parentPhoneInput.value.trim();

    if (!studentId || !phone) {
      alert("يرجى تعبئة كافة الحقول المطلوبة لتسجيل الدخول.");
      return;
    }

    fetchAndLoadParentPortal(studentId, phone, true);
  });

  async function fetchAndLoadParentPortal(studentId, phone, isManualLogin) {
    loginSubmitBtn.disabled = true;
    const originalText = loginSubmitBtn.innerHTML;
    if (isManualLogin) {
      loginSubmitBtn.innerHTML = `<i class="ph-bold ph-spinner-gap animate-spin"></i> جاري التحقق من الهوية...`;
    }

    try {
      if (isManualLogin) {
        let uid = null;
        try {
          const userCredential = await signInAnonymously(auth);
          uid = userCredential.user.uid;
        } catch (authErr) {
          console.warn("[Parent Portal] Anonymous sign-in failed during login, proceeding unauthenticated:", authErr);
        }
        
        const normalizedStudentId = studentId.trim().toUpperCase();
        
        if (uid) {
          try {
            // Write parent session matching student existence and phone rules
            await setDoc(doc(db, "parent_sessions", uid), {
              studentId: normalizedStudentId,
              phone: phone.trim(),
              createdAt: serverTimestamp()
            });
          } catch (sessionErr) {
            console.warn("[Parent Portal] Writing parent session doc failed:", sessionErr);
          }
        }

        sessionStorage.setItem("masjid_parent_logged", "true");
        sessionStorage.setItem("masjid_parent_student_id", normalizedStudentId);
        sessionStorage.setItem("masjid_parent_phone", phone.trim());
      }
      
      const currentStudentId = sessionStorage.getItem("masjid_parent_student_id") || studentId.trim().toUpperCase();
      const currentPhone = sessionStorage.getItem("masjid_parent_phone") || phone.trim();

      const result = await window.DB.readParentPortal(currentStudentId, currentPhone);
      if (result.success) {
        portalDataCache = result;
        populateDashboard();
        
        portalLoginView.style.display = "none";
        portalDashboardView.style.display = "block";
      } else {
        alert(result.error || "فشل التحقق من الهوية. يرجى التأكد من البيانات المدخلة.");
        if (isManualLogin) {
          logoutParent();
        }
      }
    } catch (err) {
      console.error(err);
      alert("فشل التحقق من الهوية. يرجى التأكد من معرف الطالب ورقم هاتف ولي الأمر بدقة.");
      if (isManualLogin) {
        logoutParent();
      }
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = originalText;
    }
  }

  // --- Populate Dashboard ---
  function populateDashboard() {
    const student = portalDataCache.student;
    const rewards = portalDataCache.rewards;
    
    // 1. Badges & Welcome Text
    welcomeStudentName.textContent = student.name;
    badgeStudentId.textContent = student.id;
    badgePointsTotal.textContent = rewards.points;
    badgeStarsCum.innerHTML = `${rewards.stars} <i class="ph-fill ph-star" style="color: var(--gold); vertical-align: middle;"></i>`;
    badgeRank.textContent = portalDataCache.rank;
    badgeLevel.textContent = student.level || "بذرة المسجد";

    // Dynamic Team display
    const teamBadgeEl = document.getElementById("student-portal-team-badge");
    const teamNameEl = document.getElementById("student-portal-team-name");
    if (teamBadgeEl && teamNameEl) {
      if (student.teamName) {
        teamNameEl.textContent = student.teamName;
        teamBadgeEl.style.display = "inline-flex";
      } else {
        teamBadgeEl.style.display = "none";
      }
    }

    // ID Badge Student Team display
    const badgeTeamContainer = document.getElementById("badge-student-team-container");
    const badgeTeamName = document.getElementById("badge-student-team-name");
    if (badgeTeamContainer && badgeTeamName) {
      if (student.teamName) {
        badgeTeamName.textContent = student.teamName;
        badgeTeamContainer.style.display = "flex";
      } else {
        badgeTeamContainer.style.display = "none";
      }
    }

    // ملء نسبة الحضور العامة
    const badgeAttendanceRate = document.getElementById("badge-attendance-rate");
    if (badgeAttendanceRate && portalDataCache.attendance) {
      badgeAttendanceRate.textContent = `${portalDataCache.attendance.rate}%`;
    }

    let lvlClass = "level-seed";
    if (student.level === "فارس المسجد") lvlClass = "level-knight";
    else if (student.level === "نجم المسجد") lvlClass = "level-star";
    else if (student.level === "شجرة المسجد") lvlClass = "level-tree";
    else if (student.level === "نبتة المسجد") lvlClass = "level-sprout";
    badgeLevel.className = `student-badge-val student-card-level ${lvlClass}`;

    // 2. Render Badges Gallery
    renderBadgesGallery(rewards.badges);

    // 3. Certificate Banner State — only show if admin has ended the course
    const certArea = document.getElementById("certificate-print-area");
    
    if (certArea) {
      const courseEnded = portalDataCache.courseEnded === true;
      if (courseEnded) {
        fillCertificateFields();
        certArea.style.display = "block";
        certArea.classList.add("cert-reveal-animation");

        // Trigger premium scrolling and confetti celebration
        setTimeout(() => {
          certArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Confetti celebration function
          setTimeout(() => {
            if (typeof confetti === 'function') {
              // Left side burst
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { x: 0.1, y: 0.85 }
              });
              // Right side burst
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { x: 0.9, y: 0.85 }
              });
              
              // Spray loop for 3.5 seconds
              let duration = 3.5 * 1000;
              let end = Date.now() + duration;

              (function frame() {
                confetti({
                  particleCount: 3,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0.1, y: 0.8 }
                });
                confetti({
                  particleCount: 3,
                  angle: 120,
                  spread: 55,
                  origin: { x: 0.9, y: 0.8 }
                });

                if (Date.now() < end) {
                  requestAnimationFrame(frame);
                }
              }());
            }
          }, 800);
        }, 1200);
      } else {
        certArea.style.display = "none";
        certArea.classList.remove("cert-reveal-animation");
      }
    }

    initWeeklyStars();
    checkStudentWeeklyStarBanner();
  }

  async function checkStudentWeeklyStarBanner() {
    const bannerEl = document.getElementById('weekly-star-banner');
    if (bannerEl) bannerEl.style.display = 'none';
  }

  async function initWeeklyStars() {
    const btnStars = document.getElementById("btn-show-weekly-stars");
    if (btnStars) btnStars.style.display = "none";
  }

  function renderBadgesGallery(badges) {
    if (!badges || badges.length === 0 || badges[0] === "") {
      studentBadgesGalleryCard.style.display = "none";
      return;
    }

    studentBadgesGalleryCard.style.display = "block";
    badgesGalleryList.innerHTML = badges.map(badge => {
      let icon = `<i class="ph-fill ph-award" style="color: var(--gold);"></i>`;
      if (badge === "حافظ متميز") icon = `<i class="ph-fill ph-book-open" style="color: #4caf50;"></i>`;
      else if (badge === "أفضل سلوك") icon = `<i class="ph-fill ph-smiley" style="color: #ff9800;"></i>`;
      else if (badge === "الأكثر انضباطاً") icon = `<i class="ph-fill ph-clock" style="color: #2196f3;"></i>`;
      else if (badge === "الطالب المثالي") icon = `<i class="ph-fill ph-crown" style="color: var(--gold);"></i>`;
      else if (badge === "نجم الحلقة") icon = `<i class="ph-fill ph-star" style="color: var(--gold);"></i>`;
      else if (badge === "متفوق في التجويد") icon = `<i class="ph-fill ph-award" style="color: #e91e63;"></i>`;
      else if (badge === "الأكثر مشاركة") icon = `<i class="ph-fill ph-users" style="color: #9c27b0;"></i>`;
      else if (badge === "قائد الفريق") icon = `<i class="ph-fill ph-shield" style="color: #00bcd4;"></i>`;

      return `
        <span class="badge level-gold" style="font-size: 0.9rem; font-weight: 800; padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; cursor: default;">
          ${icon} ${badge}
        </span>
      `;
    }).join("");
  }

  // --- Fill Graduation Certificate Fields ---
  function fillCertificateFields() {
    if (!portalDataCache) return;
    const student = portalDataCache.student;
    const finalAttRate = parseFloat(portalDataCache.attendance.rate) || 0;
    const finalStars = portalDataCache.rewards.stars || 0;
    let finalGrade = "مقبول";
    if (finalAttRate >= 90 && finalStars >= 40) finalGrade = "ممتاز مع مرتبة الشرف (تميز مطلق)";
    else if (finalAttRate >= 80 && finalStars >= 25) finalGrade = "ممتاز (أداء عالي)";
    else if (finalAttRate >= 70 && finalStars >= 15) finalGrade = "جيد جداً (مستوى رائع)";
    else if (finalAttRate >= 50) finalGrade = "جيد";

    if (certStudentName) certStudentName.textContent = student.name;
    const totalAyahs = parseInt(portalDataCache.quran.totalAyahs) || 0;
    if (certTotalAyahs) certTotalAyahs.textContent = totalAyahs;
    
    const labelEl = document.getElementById("cert-ayahs-label");
    if (labelEl) {
      if (totalAyahs >= 3 && totalAyahs <= 10) {
        labelEl.textContent = "آيات كريمة";
      } else {
        labelEl.textContent = "آية كريمة";
      }
    }
    
    if (certOverallGrade) certOverallGrade.textContent = finalGrade;
    if (certFinalStars) certFinalStars.textContent = finalStars;
    if (certFinalLevel) certFinalLevel.textContent = student.level || "بذرة المسجد";
  }



  // --- Parent Logout ---
  if (parentLogoutBtn) {
    parentLogoutBtn.addEventListener("click", () => {
      logoutParent();
    });
  }

  function logoutParent() {
    sessionStorage.removeItem("masjid_parent_logged");
    sessionStorage.removeItem("masjid_parent_student_id");
    sessionStorage.removeItem("masjid_parent_phone");
    
    try {
      auth.signOut();
    } catch (e) {
      console.warn("Auth signOut failed:", e);
    }
    
    const override = document.getElementById("session-override");
    if (override) override.remove();

    portalLoginView.style.display = "block";
    portalDashboardView.style.display = "none";
    portalDataCache = null;
  }

  // --- PWA Installation Logic ---
  const pwaInstallContainer = document.getElementById("pwa-install-container");
  const pwaInstallBtn = document.getElementById("pwa-install-btn-portal");
  const iosPwaModal = document.getElementById("ios-pwa-modal");
  const closeIosPwaModal = document.getElementById("close-ios-pwa-modal");
  const closeIosPwaModalBtn = document.getElementById("close-ios-pwa-modal-btn");
  
  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  // If iOS and not running in standalone, show the install button
  if (isIOS && !isStandalone) {
    if (pwaInstallContainer) pwaInstallContainer.style.display = "block";
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (pwaInstallContainer && !isStandalone) {
      pwaInstallContainer.style.display = "block";
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener("click", async () => {
      if (isIOS) {
        // Show iOS Guide Modal
        if (iosPwaModal) iosPwaModal.style.display = "flex";
      } else if (deferredPrompt) {
        // Show the native install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again
        deferredPrompt = null;
        // Hide the install button
        if (pwaInstallContainer) pwaInstallContainer.style.display = "none";
      } else {
        // Fallback for other browsers where event didn't fire, or iOS detection fallback
        if (iosPwaModal) iosPwaModal.style.display = "flex";
      }
    });
  }

  // Close iOS modal handlers
  if (closeIosPwaModal) {
    closeIosPwaModal.onclick = () => {
      iosPwaModal.style.display = "none";
    };
  }
  if (closeIosPwaModalBtn) {
    closeIosPwaModalBtn.onclick = () => {
      iosPwaModal.style.display = "none";
    };
  }
  window.addEventListener("appinstalled", (evt) => {
    console.log("App was successfully installed!");
    if (pwaInstallContainer) pwaInstallContainer.style.display = "none";
  });

  // --- Forgot ID Recovery Hub ---
  const forgotIdLink = document.getElementById("forgot-id-link");
  const forgotIdModal = document.getElementById("forgot-id-modal");
  const closeForgotModal = document.getElementById("close-forgot-modal");
  const forgotIdForm = document.getElementById("forgot-id-form");
  const recoveryPhoneInput = document.getElementById("recovery-phone");
  const recoveryNameInput = document.getElementById("recovery-name");
  const recoveryError = document.getElementById("recovery-error");
  const recoveryResults = document.getElementById("recovery-results");
  const recoveryResultsList = document.getElementById("recovery-results-list");

  if (forgotIdLink) {
    forgotIdLink.onclick = (e) => {
      e.preventDefault();
      forgotIdModal.style.display = "flex";
      recoveryError.style.display = "none";
      recoveryResults.style.display = "none";
      forgotIdForm.reset();
    };
  }

  if (closeForgotModal) {
    closeForgotModal.onclick = () => {
      forgotIdModal.style.display = "none";
    };
  }

  if (forgotIdForm) {
    forgotIdForm.onsubmit = async (e) => {
      e.preventDefault();
      const phone = recoveryPhoneInput.value.trim();
      const inputName = recoveryNameInput.value.trim();
      
      const submitBtn = document.getElementById("btn-recovery-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "جاري البحث...";
      recoveryError.style.display = "none";
      recoveryResults.style.display = "none";
      recoveryResultsList.innerHTML = ""; // Target list explicitly reset before loop execution

      try {
        // تأكيد تسجيل الدخول مجهول الهوية لتجاوز شروط Firestore Security Rules (إن كان متاحاً)
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (authErr) {
            console.warn("[Parent Portal] Anonymous auth failed/disabled, proceeding unauthenticated:", authErr);
          }
        }
        
        const cleanPhone = phone.trim();
        const docRef = doc(db, "student_recovery", cleanPhone);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          recoveryError.textContent = "لم يتم العثور على أي طالب مسجل بهذا الرقم.";
          recoveryError.style.display = "block";
          return;
        }

        const studentsList = docSnap.data().students || [];
        const matches = [];
        const seenIds = new Set();
        
        studentsList.forEach(s => {
          const studentName = s.name || "";
          const studentId = s.id || "";
          
          if (!studentId || !studentName || studentName.trim() === "") return;
          const normalizedId = studentId.trim().toLowerCase();
          if (seenIds.has(normalizedId)) return;
          
          if (normalizeArabic(studentName) === normalizeArabic(inputName)) {
            seenIds.add(normalizedId);
            matches.push({
              name: studentName,
              id: studentId
            });
          }
        });

        if (matches.length === 0) {
          recoveryError.textContent = "اسم الطالب لا يطابق البيانات المسجلة تحت هذا الهاتف.";
          recoveryError.style.display = "block";
        } else {
          recoveryResultsList.innerHTML = matches.map(m => `
            <div style="background: rgba(13, 92, 70, 0.05); border: 1.5px solid var(--gold); border-radius: 6px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style="font-weight: 700; color: var(--green-dark);">الابن: ${m.name}</div>
              <div style="font-weight: 950; color: var(--green-dark); display: flex; align-items: center; gap: 0.5rem;">
                <span>المعرف: <code style="background: var(--green-dark); color: var(--gold); padding: 0.2rem 0.5rem; border-radius: 4px; font-family: monospace; font-size: 1rem; letter-spacing: 0.5px;">${m.id}</code></span>
                <button type="button" class="btn-copy-id" data-copyid="${m.id}" style="background: none; border: none; color: var(--gold); cursor: pointer; font-size: 1.15rem; display: flex; align-items: center; justify-content: center; padding: 0.2rem;"><i class="ph ph-copy"></i></button>
              </div>
            </div>
          `).join("");
          
          // Wire copy button listeners
          recoveryResultsList.querySelectorAll(".btn-copy-id").forEach(btn => {
            btn.onclick = () => {
              const textToCopy = btn.getAttribute("data-copyid");
              navigator.clipboard.writeText(textToCopy);
              alert("تم نسخ المعرف بنجاح: " + textToCopy);
            };
          });
          
          recoveryResults.style.display = "block";
        }
      } catch (err) {
        console.error(err);
        recoveryError.textContent = "حدث خطأ أثناء محاولة الاتصال بقاعدة البيانات.";
        recoveryError.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "البحث عن المعرف";
      }
    };
  }

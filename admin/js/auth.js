/**
 * مسجد الشهداء — التحقق من تسجيل الدخول وإدارة الجلسة
 */

import { auth, db } from "./db.js?v=52";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Helper function to safely run code when DOM is loaded and ready
function runWhenReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

// Prevent content flashing (UX check) by hiding body until authorized
const blocker = document.createElement("style");
blocker.id = "auth-blocker";
blocker.innerHTML = "body { display: none !important; }";
document.head.appendChild(blocker);

function displayRoleBadge(role) {
  runWhenReady(() => {
    const brand = document.querySelector(".navbar-brand");
    if (!brand || document.getElementById("admin-role-badge")) return;

    const badge = document.createElement("span");
    badge.id = "admin-role-badge";
    
    let label = "مسؤول";
    let iconClass = "ph-bold ph-shield-star";
    let style = "background: rgba(13,92,70,0.08); color: var(--green-dark); border: 1.5px solid rgba(13,92,70,0.25);";

    if (role === "Imam" || role === "الإمام" || role === "Admin") {
      label = "الإمام";
      iconClass = "ph-bold ph-crown";
      style = "background: rgba(212,175,55,0.12); color: #7a5900; border: 1.5px solid var(--gold); font-weight: 900;";
    } else if (role === "Teacher" || role === "مدرس التعليم القرآني") {
      label = "مدرس قرآن";
      iconClass = "ph-bold ph-book-open";
      style = "background: rgba(13,92,70,0.08); color: var(--green-dark); border: 1.5px solid rgba(13,92,70,0.25); font-weight: 800;";
    } else if (role === "Guide" || role === "المرشدة الدينية") {
      label = "مرشدة دينية";
      iconClass = "ph-bold ph-user-focus";
      style = "background: rgba(13,92,70,0.08); color: var(--green-dark); border: 1.5px solid rgba(13,92,70,0.25); font-weight: 800;";
    }

    badge.innerHTML = `<i class="${iconClass}" style="font-size: 1rem; vertical-align: middle;"></i> ${label}`;
    badge.style.cssText = `${style} border-radius: 30px; padding: 0.25rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem; margin-inline-start: 1rem; vertical-align: middle; cursor: default; white-space: nowrap;`;

    brand.appendChild(badge);
    brand.style.display = "flex";
    brand.style.alignItems = "center";
  });
}

async function checkAuth(user) {
  const isLoginPage = window.location.pathname.endsWith("login.html");
  console.log("[Auth Debug] checkAuth triggered, isLoginPage:", isLoginPage, "user:", user ? user.uid : "null");
  
  if (user) {
    console.log("[Auth Debug] Session detected for user:", user.email);
    try {
      const userDocRef = doc(db, "users", user.uid);
      console.log("[Auth Debug] Fetching user doc for user:", user.uid);
      const userDocSnap = await Promise.race([
        getDoc(userDocRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      ]);
      console.log("[Auth Debug] User doc fetched, exists:", userDocSnap.exists());
      
      const role = userDocSnap.exists() ? userDocSnap.data().role : "";
      const isFallback = (user.uid === "wspQno67bPbz9u47xn5GgRl8MME3" || user.uid === "df6QPQBEZMWsyc7VHQ5K8ofLOzE2");
      const activeRole = role || (isFallback ? "Imam" : "Teacher");
      const validRoles = ["Admin", "Teacher", "Imam", "Guide", "الإمام", "مدرس التعليم القرآني", "المرشدة الدينية"];
      
      if (validRoles.includes(activeRole) || isFallback) {
        sessionStorage.setItem("masjid_auth", "true");
        localStorage.setItem("masjid_auth", "true");
        localStorage.setItem("adminUser", user.email || "");
        localStorage.setItem("adminRole", activeRole);
        console.log("[Auth Debug] Admin role validated:", activeRole, ". Removing blocker.");
        
        displayRoleBadge(activeRole);

        // Remove blocker to show content
        const el = document.getElementById("auth-blocker");
        if (el) el.remove();
        const earlyEl = document.getElementById("early-auth-blocker");
        if (earlyEl) earlyEl.remove();
        
        if (isLoginPage) {
          console.log("[Auth Debug] Redirecting authorized user from login page to index.html");
          window.location.href = "index.html";
        }
        return;
      }
    } catch (e) {
      console.error("[Auth] Error verifying user role:", e);
    }
  }
  
  console.log("[Auth Debug] User not authorized or not logged in.");
  // Clean up and redirect to login if not authorized
  sessionStorage.removeItem("masjid_auth");
  localStorage.removeItem("masjid_auth");
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminRole");
  
  if (!isLoginPage) {
    console.log("[Auth Debug] Redirecting unauthorized user to login.html");
    window.location.href = "login.html";
  } else {
    console.log("[Auth Debug] User on login.html, removing blocker.");
    // Show login page instantly
    const el = document.getElementById("auth-blocker");
    if (el) el.remove();
    const earlyEl = document.getElementById("early-auth-blocker");
    if (earlyEl) earlyEl.remove();
  }
}

// Track authentication status
onAuthStateChanged(auth, checkAuth);

async function logoutAdmin() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("[Auth] Signout failed:", err);
  }
  sessionStorage.removeItem("masjid_auth");
  localStorage.removeItem("masjid_auth");
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminRole");
  sessionStorage.removeItem("adminUser");
  window.location.href = "login.html";
}

let deferredPrompt;

runWhenReady(() => {
  // Attach logout and mobile navbar toggle listeners
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("هل تريد تسجيل الخروج فعلاً؟")) {
        logoutAdmin();
      }
    });
  }

  const logoutBtnMobile = document.getElementById("logout-btn-mobile");
  if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("هل تريد تسجيل الخروج فعلاً؟")) {
        logoutAdmin();
      }
    });
  }

  // Mobile navbar toggle for admin dashboard
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");
  if (navToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        closeMenu();
      }
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  // PWA Install Prompt handling
  const installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-block';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed.');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });

  // --- Offline Background Sync UI & Listeners ---
  function updateSyncStatusUI() {
    const queue = JSON.parse(localStorage.getItem("masjid_pending_sync") || "[]");
    const count = queue.length;
    
    let syncBar = document.getElementById("masjid-sync-bar");
    
    if (count === 0) {
      if (syncBar) {
        syncBar.style.opacity = "0";
        syncBar.style.transform = "translateY(10px)";
        setTimeout(() => {
          const currentQueue = JSON.parse(localStorage.getItem("masjid_pending_sync") || "[]");
          if (currentQueue.length === 0 && syncBar) {
            syncBar.remove();
          }
        }, 300);
      }
      return;
    }
    
    if (!syncBar) {
      syncBar = document.createElement("div");
      syncBar.id = "masjid-sync-bar";
      syncBar.style.position = "fixed";
      syncBar.style.bottom = "2rem";
      syncBar.style.left = "2rem";
      syncBar.style.zIndex = "10000";
      syncBar.style.background = "linear-gradient(135deg, #0d5c46, #083b2d)";
      syncBar.style.color = "#fff";
      syncBar.style.padding = "0.85rem 1.5rem";
      syncBar.style.borderRadius = "12px";
      syncBar.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
      syncBar.style.border = "1.5px solid #d4af37";
      syncBar.style.display = "flex";
      syncBar.style.alignItems = "center";
      syncBar.style.gap = "1rem";
      syncBar.style.fontWeight = "800";
      syncBar.style.fontSize = "0.9rem";
      syncBar.style.transition = "all 0.3s ease";
      syncBar.style.opacity = "0";
      syncBar.style.transform = "translateY(15px)";
      syncBar.style.direction = "rtl";
      
      document.body.appendChild(syncBar);
      syncBar.offsetHeight; // force reflow
      syncBar.style.opacity = "1";
      syncBar.style.transform = "translateY(0)";
    }
    
    syncBar.innerHTML = `
      <i class="ph-bold ph-arrows-clockwise animate-spin" style="color: #d4af37; font-size: 1.35rem; display: inline-block;"></i>
      <span>هناك ${count} حلقة/تقارير معلقة بانتظار المزامنة...</span>
      <button id="masjid-sync-now-btn" style="
        background: #d4af37;
        color: #083b2d;
        border: none;
        padding: 0.4rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 900;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        font-family: inherit;
        outline: none;
      ">مزامنة الآن</button>
    `;
    
    const syncBtn = document.getElementById("masjid-sync-now-btn");
    if (syncBtn) {
      syncBtn.addEventListener("mouseover", () => {
        syncBtn.style.background = "#f3c950";
        syncBtn.style.transform = "scale(1.03)";
      });
      syncBtn.addEventListener("mouseout", () => {
        syncBtn.style.background = "#d4af37";
        syncBtn.style.transform = "scale(1)";
      });
      syncBtn.addEventListener("click", () => {
        if (window.DB && window.DB.syncPendingQueue) {
          syncBtn.disabled = true;
          syncBtn.textContent = "جاري...";
          window.DB.syncPendingQueue().then(res => {
            if (res && res.success) {
              // Successfully synced
            } else {
              alert("فشلت المزامنة. يرجى التحقق من اتصالك بالإنترنت.");
              syncBtn.disabled = false;
              syncBtn.textContent = "مزامنة الآن";
            }
          });
        }
      });
    }
  }

  // Hook sync status events
  window.addEventListener("masjid_sync_status_changed", updateSyncStatusUI);
  window.addEventListener("online", () => {
    if (window.DB && window.DB.syncPendingQueue) {
      window.DB.syncPendingQueue();
    }
  });

  // Check periodically every 30 seconds
  setInterval(() => {
    if (navigator.onLine && window.DB && window.DB.syncPendingQueue) {
      window.DB.syncPendingQueue();
    }
  }, 30000);

  // Initial UI check on page load
  updateSyncStatusUI();
});

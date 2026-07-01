/**
 * مسجد الشهداء — خدمة الاتصال بقاعدة بيانات Cloud Firestore
 * تدعم الاتصال المباشر بقاعدة البيانات بمسجد الشهداء (masjid-chouhadaa)
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD39DP8lxZ1S7G9XbqcH5FPkc1mLzB1dI0",
  authDomain: "masjid-chouhadaa.firebaseapp.com",
  projectId: "masjid-chouhadaa",
  storageBucket: "masjid-chouhadaa.firebasestorage.app",
  messagingSenderId: "353527024801",
  appId: "1:353527024801:web:f3574f3e7119c3410274e0",
  measurementId: "G-J3T2ZNX4DZ"
};

// Check if Firebase is already initialized
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);

// دالة مساعدة لتحديث كشاف استعادة المعرفات (student_recovery) عند الإضافة أو التعديل
async function _updateRecoveryIndex(studentId, name, phone, oldPhone = null) {
  try {
    const cleanPhone = (phone || "").trim();
    const cleanOldPhone = (oldPhone || "").trim();
    const cleanName = (name || "").trim();

    if (cleanOldPhone && cleanOldPhone !== cleanPhone) {
      const oldDocRef = doc(db, "student_recovery", cleanOldPhone);
      const oldDocSnap = await getDoc(oldDocRef);
      if (oldDocSnap.exists()) {
        const oldList = oldDocSnap.data().students || [];
        const filteredList = oldList.filter(s => s.id !== studentId);
        if (filteredList.length === 0) {
          await deleteDoc(oldDocRef);
        } else {
          await setDoc(oldDocRef, { phone: cleanOldPhone, students: filteredList });
        }
      }
    }

    if (cleanPhone) {
      const docRef = doc(db, "student_recovery", cleanPhone);
      const docSnap = await getDoc(docRef);
      let list = [];
      if (docSnap.exists()) {
        list = docSnap.data().students || [];
      }
      list = list.filter(s => s.id !== studentId);
      list.push({ id: studentId, name: cleanName });
      await setDoc(docRef, { phone: cleanPhone, students: list });
    }
  } catch (err) {
    console.error("[DB] _updateRecoveryIndex failed:", err);
  }
}

// دالة مساعدة لحذف الطالب من كشاف استعادة المعرفات عند الحذف
async function _deleteRecoveryIndex(studentId, phone) {
  try {
    const cleanPhone = (phone || "").trim();
    if (cleanPhone) {
      const docRef = doc(db, "student_recovery", cleanPhone);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const list = docSnap.data().students || [];
        const filteredList = list.filter(s => s.id !== studentId);
        if (filteredList.length === 0) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { phone: cleanPhone, students: filteredList });
        }
      }
    }
  } catch (err) {
    console.error("[DB] _deleteRecoveryIndex failed:", err);
  }
}



// دالة مساعدة للحصول على تاريخ اليوم بتنسيق DD-MM-YYYY
function getCurrentDateStr() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// دالة مساعدة للتحقق مما إذا كان النشاط مرتبطاً بالقرآن الكريم
function isQuranActivity(act) {
  return act === "القرآن الكريم" || 
         act === "حفظ القرآن" || 
         act === "مراجعة القرآن" || 
         act === "حفظ القرآن الكريم";
}

// دالة مساعدة لربط الطالب من Firestore مع الحقول الإنجليزية والعربية
function mapStudentFromFirestore(data, docId) {
  return {
    docId: docId,
    id: data.id || docId,
    name: data["سليماني ياني :اسم الطالب كامل"] || data.name || "",
    gender: data["الجنس"] || data.gender || "",
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
    teamName: data.teamName || "",
    
    // الحفاظ على المفاتيح العربية للأنظمة الأخرى
    "سليماني ياني :اسم الطالب كامل": data["سليماني ياني :اسم الطالب كامل"] || data.name || "",
    "رقم الهاتف": data["رقم الهاتف"] || data.phone || "",
    "حالة الطلب": data["حالة الطلب"] || data.status || "قيد المراجعة",
    "النجوم التراكمية": Number(data["النجوم التراكمية"]) || Number(data.cumulativeStars) || 0,
    "المستوى": data["المستوى"] || data.level || "بذرة المسجد",
    "تاريخ التسجيل": data["تاريخ التسجيل"] || data.regDate || "",
    "الجنس": data["الجنس"] || data.gender || "",
    "السن": Number(data["السن"]) || Number(data.age) || 0,
    "الفئة العمرية": data["الفئة العمرية"] || data.ageGroup || "",
    "المستوى الدراسي": data["المستوى الدراسي"] || data.studyLevel || "",
    "المستوى القرآني": data["المستوى القرآني"] || data.quranLevel || "",
    "رقم احتياطي": data["رقم احتياطي"] || data.backupPhone || "",
    "سليماني سمير (التصوير: نعم) : اسم ولي الأمر": data["سليماني سمير (التصوير: نعم) : اسم ولي الأمر"] || data.parentName || "",
    "النجوم الابتدائية": Number(data["النجوم الابتدائية"]) || Number(data.initialStars) || 0,
    "آخر سورة": data["آخر سورة"] || data.initialSurah || "",
    "آخر آية": data["آخر آية"] || data.initialToVerse || "",
    "نسبة الحضور التقريبية": Number(data["نسبة الحضور التقريبية"]) || Number(data.initialAttendanceRate) || 0
  };
}

// دالة لإعادة احتساب نقاط ونجوم وشارات الطالب من Firestore
async function recalculateStudentRewards(studentId) {
  try {
    const ratingsQuery = query(collection(db, "Ratings"), where("StudentID", "==", studentId));
    const ratingsSnap = await getDocs(ratingsQuery);
    
    const badgesSet = new Set();
    const sessionsMap = {};

    ratingsSnap.forEach(d => {
      const data = d.data();
      const sId = data.SessionID || "";
      if (!sId) return;

      if (!sessionsMap[sId]) {
        sessionsMap[sId] = {
          general: null,
          courses: []
        };
      }

      if (data["نوع النشاط"] === "التقييم العام") {
        sessionsMap[sId].general = data;
      } else if (data["نوع الإنجاز"] === "تقييم مقرر") {
        sessionsMap[sId].courses.push(data);
      }

      if (data["نوع النشاط"] === "التقييم العام" && data["الشارات الممنوحة"]) {
        const badges = data["الشارات الممنوحة"];
        if (Array.isArray(badges)) {
          badges.forEach(b => {
            if (b && String(b).trim() !== "") {
              badgesSet.add(String(b).trim());
            }
          });
        }
      }
    });

    let totalPoints = 0;

    Object.keys(sessionsMap).forEach(sId => {
      const sess = sessionsMap[sId];
      const sectionAverages = [];

      if (sess.general) {
        try {
          const criteria = JSON.parse(sess.general["عناصر التقييم"] || "{}");
          const vals = Object.values(criteria).map(Number).filter(x => !isNaN(x));
          if (vals.length > 0) {
            const genStarsAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
            sectionAverages.push(genStarsAvg);
          }
        } catch (e) {
          console.error("Error parsing general criteria during recalculate:", e);
        }
      }

      if (sess.courses && sess.courses.length > 0) {
        sess.courses.forEach(c => {
          try {
            const criteria = JSON.parse(c["عناصر التقييم"] || "{}");
            const values = Object.values(criteria).map(Number).filter(x => !isNaN(x));
            if (values.length > 0) {
              const cStarsSum = values.reduce((a, b) => a + b, 0);
              const cStarsAvg = cStarsSum / values.length;
              sectionAverages.push(cStarsAvg);
            }
          } catch (e) {
            console.error("Error parsing course criteria during recalculate:", e);
          }
        });
      }

      if (sectionAverages.length > 0) {
        const overallStars = Math.round(sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length);
        const cappedStars = Math.min(3, Math.max(0, overallStars));
        totalPoints += cappedStars * 2;
      }
    });

    const pointDocRef = doc(db, "point", studentId);
    const studentDocRef = doc(db, "students", studentId);

    await runTransaction(db, async (transaction) => {
      const pointDocSnap = await transaction.get(pointDocRef);
      let initialPoints = 0;
      if (pointDocSnap.exists()) {
        const pData = pointDocSnap.data();
        initialPoints = Number(pData["النقاط الابتدائية"] || pData.initialPoints) || 0;
      }
      
      const finalPoints = totalPoints + initialPoints;
      const finalStars = Math.round(finalPoints / 2);
      const badgesList = Array.from(badgesSet);
      
      let level = "بذرة المسجد";
      if (finalStars >= 151) level = "فارس المسجد";
      else if (finalStars >= 91)  level = "نجم المسجد";
      else if (finalStars >= 61)  level = "شجرة المسجد";
      else if (finalStars >= 31)  level = "نبتة المسجد";
      
      transaction.set(pointDocRef, {
        StudentID: studentId,
        "النقاط الكلية": finalPoints,
        "عدد النجوم": finalStars,
        "الشارات": badgesList.join("، "),
        "عدد الشارات": badgesList.length
      }, { merge: true });
      
      transaction.set(studentDocRef, {
        "النجوم التراكمية": finalStars,
        "المستوى": level
      }, { merge: true });
      
      console.log(`[DB] Recalculated rewards for student ${studentId}: points=${finalPoints}, stars=${finalStars}, level=${level}, badges=${badgesList.length}`);
    });
  } catch (err) {
    console.error(`[DB] recalculateStudentRewards failed for ${studentId}:`, err);
  }
}

// --- IndexedDB Queue Helper Functions ---
function getOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("masjid_offline_db", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pending_sync")) {
        db.createObjectStore("pending_sync", { keyPath: "operationId" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function addOperationToQueue(type, data) {
  const operationId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : "op-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pending_sync"], "readwrite");
    const store = transaction.objectStore("pending_sync");
    const op = {
      operationId: operationId,
      type: type,
      data: data,
      timestamp: Date.now()
    };
    const request = store.add(op);
    request.onsuccess = () => {
      updateSyncStatusLocalStorage();
      resolve(operationId);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getQueuedOperations() {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pending_sync"], "readonly");
    const store = transaction.objectStore("pending_sync");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function removeOperationFromQueue(operationId) {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pending_sync"], "readwrite");
    const store = transaction.objectStore("pending_sync");
    const request = store.delete(operationId);
    request.onsuccess = () => {
      updateSyncStatusLocalStorage();
      resolve();
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

async function updateSyncStatusLocalStorage() {
  try {
    const ops = await getQueuedOperations();
    localStorage.setItem("masjid_pending_sync", JSON.stringify(ops));
    window.dispatchEvent(new CustomEvent("masjid_sync_status_changed"));
  } catch (e) {
    console.error("Failed to update sync localStorage status:", e);
  }
}

// دالة لحفظ جميع بيانات وتقييمات الجلسة/الحلقة
async function saveSessionData(sessionId, date, supervisorName, selectedCourses, evaluations, circleType, isEnd, bypassOfflineCheck = false) {
  if (!bypassOfflineCheck && !navigator.onLine) {
    const opId = await addOperationToQueue("saveSessionData", { sessionId, date, supervisorName, selectedCourses, evaluations, circleType, isEnd });
    return { success: true, offline: true, operationId: opId };
  }
  
  try {
    const sessionDocRef = doc(db, "sessions", sessionId);
    const sessionDoc = await getDoc(sessionDocRef);
    let category = "الصغار";
    if (sessionDoc.exists()) {
      category = sessionDoc.data()["الفئة"] || category;
    }
    
    let period = circleType || "حلقة صباحية";
    let groupType = "حلقة مشتركة";
    if (circleType && circleType.includes(" - ")) {
      const parts = circleType.split(" - ");
      groupType = parts[0];
      period = parts[1];
    }
    
    let standardDate = date || getCurrentDateStr();
    if (standardDate && standardDate.includes("-") && standardDate.indexOf("-") === 4) {
      const parts = standardDate.split("-");
      standardDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const sessionData = {
      SessionID: sessionId,
      "اسم المشرف": supervisorName,
      "التاريخ": standardDate,
      "الحالة": isEnd ? "منتهية" : "جارية",
      "المقررات المختارة": selectedCourses.join("، "),
      "الفترة": period,
      "نوع الحلقة": groupType,
      "اسم الحلقة": circleType || `${groupType} - ${period}`,
      "الفئة": category
    };
    await setDoc(sessionDocRef, sessionData, { merge: true });
    
    for (const ev of evaluations) {
      const studentId = ev.studentId;
      
      // If student is an adult, route evaluation directly to adult_progress
      if (studentId && studentId.startsWith("AD")) {
        const progressDocId = `AP_${sessionId}_${studentId}`;
        const progressDoc = {
          id: progressDocId,
          sessionId: sessionId,
          SessionID: sessionId,
          participantId: studentId,
          participantName: ev.studentName,
          section: groupType.includes("نساء") || groupType.includes("إناث") ? "نساء" : "رجال",
          date: standardDate,
          activityType: ev.activityType || "حفظ",
          surah: ev.surah || "",
          fromVerse: Number(ev.fromVerse) || 0,
          toVerse: Number(ev.toVerse) || 0,
          attendance: ev.attendance || "حاضر",
          notes: ev.notes || "",
          createdAt: Date.now(),
          courseName: ev.courseName || "تحفيظ القرآن",
          stars: Number(ev.stars) || 0,
          points: Number(ev.points) || 0
        };
        await setDoc(doc(db, "adult_progress", progressDocId), progressDoc);
        
        // Update participant's last memorized surah and verse only if activityType is "حفظ" or "حفظ جديد"
        if (ev.attendance !== "غائب" && (ev.activityType === "حفظ" || ev.activityType === "حفظ جديد") && ev.surah) {
          try {
            await setDoc(doc(db, "adult_participants", studentId), {
              lastSurah: ev.surah,
              lastVerse: Number(ev.toVerse) || 0
            }, { merge: true });
          } catch(err) {
            console.error("[DB] Failed to update adult participant lastSurah:", err);
          }
        }
        continue;
      }
      
      // حفظ حالة الحضور للأطفال
      const presenceDocId = `PR_${sessionId}_${studentId}`;
      await setDoc(doc(db, "Presence", presenceDocId), {
        SessionID: sessionId,
        StudentID: studentId,
        "حالة الحضور": ev.attendance
      });
      
      if (ev.attendance.startsWith("غائب")) {
        const ratingsQuery = query(collection(db, "Ratings"), where("SessionID", "==", sessionId), where("StudentID", "==", studentId));
        const ratingsSnap = await getDocs(ratingsQuery);
        for (const d of ratingsSnap.docs) {
          await deleteDoc(d.ref);
        }
        await recalculateStudentRewards(studentId);
        continue;
      }
      
      // حفظ التقييم العام للأطفال
      const genRatingId = `EV_${sessionId}_${studentId}_gen`;
      const genRatingDoc = {
        EvaluationID: genRatingId,
        SessionID: sessionId,
        StudentID: studentId,
        "التاريخ": date || getCurrentDateStr(),
        "نوع النشاط": "التقييم العام",
        "نوع الإنجاز": "تقييم عام",
        "عناصر التقييم": JSON.stringify(ev.generalCriteria || {}),
        "النقاط": Number(ev.generalPoints) || 0,
        "الملاحظات": ev.notes || ""
      };
      
      if (ev.badgesGranted && ev.badgesGranted.length > 0) {
        genRatingDoc["الشارات الممنوحة"] = ev.badgesGranted;
      }
      
      await setDoc(doc(db, "Ratings", genRatingId), genRatingDoc);
      
      // حفظ تقييمات المقررات الدراسية للأطفال
      if (ev.courseEvaluations && Array.isArray(ev.courseEvaluations)) {
        const oldCoursesQuery = query(collection(db, "Ratings"), where("SessionID", "==", sessionId), where("StudentID", "==", studentId));
        const oldCoursesSnap = await getDocs(oldCoursesQuery);
        for (const d of oldCoursesSnap.docs) {
          if (d.data()["نوع النشاط"] !== "التقييم العام") {
            await deleteDoc(d.ref);
          }
        }
        
        for (let i = 0; i < ev.courseEvaluations.length; i++) {
          const ce = ev.courseEvaluations[i];
          const courseRatingId = `EV_${sessionId}_${studentId}_c${i}`;
          const courseRatingDoc = {
            EvaluationID: courseRatingId,
            SessionID: sessionId,
            StudentID: studentId,
            "التاريخ": date || getCurrentDateStr(),
            "نوع النشاط": ce.courseName,
            "نوع الإنجاز": "تقييم مقرر",
            "عناصر التقييم": JSON.stringify(ce.criteria || {}),
            "النقاط": Number(ce.points) || 0,
            "الملاحظات": ce.notes || ""
          };
          await setDoc(doc(db, "Ratings", courseRatingId), courseRatingDoc);
        }
      }
      
      // حفظ تقدم القرآن الكريم للأطفال
      if (ev.quranProgress) {
        const quranRatingId = `EV_${sessionId}_${studentId}_quran`;
        const qType = ev.quranProgress.type || "حفظ جديد";
        const quranActivity = (qType === "حفظ جديد" || qType === "حفظ" || qType === "استدراك") ? "حفظ القرآن" : "مراجعة القرآن";
        const quranRatingDoc = {
          EvaluationID: quranRatingId,
          SessionID: sessionId,
          StudentID: studentId,
          "التاريخ": date || getCurrentDateStr(),
          "نوع النشاط": quranActivity,
          "السورة": ev.quranProgress.surah || "",
          "من الآية": Number(ev.quranProgress.fromVerse) || 0,
          "إلى الآية": Number(ev.quranProgress.toVerse) || 0,
          "عدد الآيات": (Number(ev.quranProgress.toVerse) >= Number(ev.quranProgress.fromVerse)) ? (Number(ev.quranProgress.toVerse) - Number(ev.quranProgress.fromVerse) + 1) : 0,
          "نوع الإنجاز": qType,
          "النقاط": 0,
          "الملاحظات": ev.quranProgress.notes || ""
        };
        await setDoc(doc(db, "Ratings", quranRatingId), quranRatingDoc);
      } else {
        await deleteDoc(doc(db, "Ratings", `EV_${sessionId}_${studentId}_quran`));
      }
      
      await recalculateStudentRewards(studentId);
    }
    return { success: true, offline: false };
  } catch (err) {
    console.warn("[DB] Online saveSessionData failed, queueing offline:", err);
    const opId = await addOperationToQueue("saveSessionData", { sessionId, date, supervisorName, selectedCourses, evaluations, circleType, isEnd });
    return { success: true, offline: true, operationId: opId };
  }
}

window.DB = {
  _webAppUrl: "",
  
  async loginAdmin(email, password) {
    console.log("[DB Debug] loginAdmin called for:", email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log("[DB Debug] signInWithEmailAndPassword success, uid:", uid);
      
      // Query the 'users' collection doc matching the authenticated UID to confirm the role
      const userDocRef = doc(db, "users", uid);
      console.log("[DB Debug] Fetching user doc for uid:", uid);
      const userDocSnap = await Promise.race([
        getDoc(userDocRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error("اتصال الشبكة بطيء أو مقطوع. انتهت مهلة طلب تسجيل الدخول.")), 5000))
      ]);
      console.log("[DB Debug] User doc fetched, exists:", userDocSnap.exists());
      
      const validRoles = ["Admin", "Teacher", "Imam", "Guide", "الإمام", "مدرس التعليم القرآني", "المرشدة الدينية"];

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData ? userData.role : "";
        console.log("[DB Debug] User data role:", role);
        if (userData && validRoles.includes(role)) {
          sessionStorage.setItem("masjid_auth", "true");
          localStorage.setItem("masjid_auth", "true");
          localStorage.setItem("adminUser", email);
          localStorage.setItem("adminRole", role);
          console.log("[DB Debug] loginAdmin returning true (authorized role):", role);
          return true;
        }
      }
      
      // Explicit fallback for the production admin UIDs
      if (uid === "wspQno67bPbz9u47xn5GgRl8MME3" || uid === "df6QPQBEZMWsyc7VHQ5K8ofLOzE2") {
        sessionStorage.setItem("masjid_auth", "true");
        localStorage.setItem("masjid_auth", "true");
        localStorage.setItem("adminUser", email);
        localStorage.setItem("adminRole", "Imam");
        console.log("[DB Debug] loginAdmin returning true (fallback UID match)");
        return true;
      }
      
      console.warn("[DB] User is authenticated but does not have an authorized role in Firestore.");
      console.log("[DB Debug] loginAdmin returning false (unauthorized)");
      return false;
    } catch (error) {
      console.error("[DB] Auth signIn failed:", error);
      console.log("[DB Debug] loginAdmin returning false due to error:", error.message);
      return false;
    }
  },

  async getAllStudents() {
    try {
      const snap = await getDocs(collection(db, "students"));
      const students = [];
      snap.forEach(docSnap => {
        students.push(mapStudentFromFirestore(docSnap.data(), docSnap.id));
      });
      return students;
    } catch (error) {
      console.error("[DB] getAllStudents failed:", error);
      return [];
    }
  },

  async updateStudent(id, studentData) {
    try {
      const docRef = doc(db, "students", id);
      const oldSnap = await getDoc(docRef);
      let oldPhone = "";
      if (oldSnap.exists()) {
        oldPhone = oldSnap.data()["رقم الهاتف"] || oldSnap.data().phone || "";
      }

      const dataToSave = {
        id: id,
        "سليماني ياني :اسم الطالب كامل": studentData.name || studentData["سليماني ياني :اسم الطالب كامل"] || "",
        "رقم الهاتف": studentData.phone || studentData["رقم الهاتف"] || "",
        "حالة الطلب": studentData.status || studentData["حالة الطلب"] || "قيد المراجعة",
        "تاريخ التسجيل": studentData.regDate || studentData["تاريخ التسجيل"] || "",
        "الجنس": studentData.gender || studentData["الجنس"] || "",
        "السن": Number(studentData.age) || Number(studentData["السن"]) || 0,
        "الفئة العمرية": studentData.ageGroup || studentData["الفئة العمرية"] || "",
        "المستوى الدراسي": studentData.studyLevel || studentData["المستوى الدراسي"] || "",
        "المستوى القرآني": studentData.quranLevel || studentData["المستوى القرآني"] || "",
        "رقم احتياطي": studentData.backupPhone || studentData["رقم احتياطي"] || "",
        "سليماني سمير (التصوير: نعم) : اسم ولي الأمر": studentData.parentName || studentData["سليماني سمير (التصوير: نعم) : اسم ولي الأمر"] || "",
        
        // تحديث الحقول الابتدائية بدقة ومنع NaN
        "النجوم الابتدائية": Number(studentData.initialStars) || 0,
        "آخر سورة": studentData.initialSurah || "",
        "آخر آية": studentData.initialToVerse !== undefined ? studentData.initialToVerse : "",
        "نسبة الحضور التقريبية": Number(studentData.initialAttendanceRate) || 0
      };
      
      // حفظ بيانات الطالب الأساسية
      await setDoc(docRef, dataToSave, { merge: true });

      // تحديث مستند النقاط بالنقاط والنجوم الابتدائية المعدلة
      const pointDocRef = doc(db, "point", id);
      await setDoc(pointDocRef, {
        "النقاط الابتدائية": (Number(studentData.initialStars) || 0) * 2,
        "النجوم الابتدائية": Number(studentData.initialStars) || 0
      }, { merge: true });

      // تشغيل دالة إعادة الاحتساب الفوري لتزامن رصيد النجوم والرتبة
      await recalculateStudentRewards(id);
      
      // تحديث كشاف استعادة المعرفات
      const newPhone = studentData.phone || studentData["رقم الهاتف"] || "";
      const newName = studentData.name || studentData["سليماني ياني :اسم الطالب كامل"] || "";
      await _updateRecoveryIndex(id, newName, newPhone, oldPhone);
      
      return true;
    } catch (error) {
      console.error("[DB] updateStudent failed:", error);
      return false;
    }
  },

  async deleteStudent(id) {
    try {
      // Get student phone first for recovery index cleanup
      const studentDocRef = doc(db, "students", id);
      const studentSnap = await getDoc(studentDocRef);
      let studentPhone = "";
      if (studentSnap.exists()) {
        studentPhone = studentSnap.data()["رقم الهاتف"] || studentSnap.data().phone || "";
      }

      const batch = writeBatch(db);
      
      // Delete student profile document
      batch.delete(doc(db, "students", id));
      
      // Delete student gamification point document
      batch.delete(doc(db, "point", id));
      
      // Query and delete student ratings records
      const ratingsQuery = query(collection(db, "Ratings"), where("StudentID", "==", id));
      const ratingsSnap = await getDocs(ratingsQuery);
      ratingsSnap.forEach(d => {
        batch.delete(d.ref);
      });
      
      // Query and delete student presence records
      const presenceQuery = query(collection(db, "Presence"), where("StudentID", "==", id));
      const presenceSnap = await getDocs(presenceQuery);
      presenceSnap.forEach(d => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
      console.log(`[DB] Cascade deleted student ${id} and all related gamification points, ratings and presence logs.`);
      
      // حذف الطالب من كشاف استعادة المعرفات
      await _deleteRecoveryIndex(id, studentPhone);
      
      return true;
    } catch (error) {
      console.error("[DB] deleteStudent failed:", error);
      return false;
    }
  },

  async registerStudent(studentData, isSupervisor) {
    try {
      let studentId = "";
      let exists = true;
      let attempts = 0;
      
      while (exists && attempts < 15) {
        studentId = "ST" + Math.floor(10000 + Math.random() * 90000);
        const docRef = doc(db, "students", studentId);
        const docSnap = await getDoc(docRef);
        exists = docSnap.exists();
        attempts++;
      }
      
      if (exists) {
        throw new Error("تعذر إنشاء معرف فريد للطالب بعد عدة محاولات.");
      }
      
      const regDate = getCurrentDateStr();
      const status = isSupervisor ? "مقبول" : "قيد المراجعة";

      // التوجيه التلقائي للمجموعات والحلقات
      let assignedCircle = "غير محدد";
      let category = "أشبال";
      const age = Number(studentData.age) || 0;
      const gender = studentData.gender || "";

      if (age >= 4 && age <= 7) {
        assignedCircle = "حلقة البراعم (مختلطة)";
        category = "براعم";
      } else if (age >= 8 && age <= 14) {
        category = "أشبال";
        assignedCircle = gender === "أنثى" ? "حلقة الأشبال - إناث" : "حلقة الأشبال - ذكور";
      } else {
        category = "كبار";
        assignedCircle = gender === "أنثى" ? "حلقة الكبار - إناث" : "حلقة الكبار - ذكور";
      }
      
      const studentDoc = {
        id: studentId,
        "سليماني ياني :اسم الطالب كامل": studentData.name || "",
        "رقم الهاتف": studentData.phone || "",
        "حالة الطلب": status,
        "النجوم التراكمية": Number(studentData.initialStars) || 0,
        "المستوى": studentData.level || "بذرة المسجد",
        "تاريخ التسجيل": regDate,
        "الجنس": gender,
        "السن": age,
        "الفئة العمرية": category,
        "الحلقة": assignedCircle,
        "المستوى الدراسي": studentData.studyLevel || "",
        "المستوى القرآني": studentData.quranLevel || "",
        "رقم احتياطي": studentData.backupPhone || "",
        "سليماني سمير (التصوير: نعم) : اسم ولي الأمر": studentData.parentName || "",
        "النجوم الابتدائية": Number(studentData.initialStars) || 0,
        "آخر سورة": studentData.initialSurah || "",
        "آخر آية": studentData.initialToVerse || "",
        "نسبة الحضور التقريبية": Number(studentData.initialAttendanceRate) || 0
      };
      
      await setDoc(doc(db, "students", studentId), studentDoc);
      
      const pointDoc = {
        StudentID: studentId,
        "النقاط الكلية": Number(studentData.initialPoints) || 0,
        "عدد النجوم": Number(studentData.initialStars) || 0,
        "النقاط الابتدائية": Number(studentData.initialPoints) || 0,
        "النجوم الابتدائية": Number(studentData.initialStars) || 0,
        "الشارات": "",
        "عدد الشارات": 0
      };
      await setDoc(doc(db, "point", studentId), pointDoc);
      
      // تحديث كشاف استعادة المعرفات
      await _updateRecoveryIndex(studentId, studentDoc["سليماني ياني :اسم الطالب كامل"], studentDoc["رقم الهاتف"]);
      
      // سجل العمليات
      await this.writeAuditLog("تسجيل طالب جديد", null, { id: studentId, name: studentData.name, category, assignedCircle });

      return studentId;
    } catch (error) {
      console.error("[DB] registerStudent failed:", error);
      throw error;
    }
  },

  async getAllLessons() {
    try {
      const snap = await getDocs(collection(db, "lessons"));
      const lessons = [];
      snap.forEach(d => {
        const data = d.data();
        const speakerVal = data["الملقي"] || data.teacher || data.speaker || "";
        lessons.push({
          id: d.id,
          title: data["عنوان الدرس"] || data.title || "",
          day: data["اليوم"] || data.day || "",
          teacher: speakerVal,
          speaker: speakerVal,
          time: data["التوقيت"] || data.time || "",
          description: data.description || "",
          featured: data.featured || data["مميز"] || "لا"
        });
      });
      return lessons;
    } catch (error) {
      console.error("[DB] getAllLessons failed:", error);
      return [];
    }
  },

  async addLesson(lessonData) {
    try {
      const lessonId = lessonData.id || "LS" + Date.now();
      const speakerVal = lessonData.speaker || lessonData.teacher || "";
      const docData = {
        id: lessonId,
        "عنوان الدرس": lessonData.title || "",
        "اليوم": lessonData.day || "",
        "الملقي": speakerVal,
        teacher: speakerVal,
        speaker: speakerVal,
        "التوقيت": lessonData.time || "",
        description: lessonData.description || "",
        featured: lessonData.featured || "لا",
        "مميز": lessonData.featured || "لا"
      };
      await setDoc(doc(db, "lessons", lessonId), docData);
      return true;
    } catch (error) {
      console.error("[DB] addLesson failed:", error);
      return false;
    }
  },

  async updateLesson(id, lessonData) {
    try {
      const docRef = doc(db, "lessons", id);
      const speakerVal = lessonData.speaker || lessonData.teacher || "";
      const docData = {
        "عنوان الدرس": lessonData.title || "",
        "اليوم": lessonData.day || "",
        "الملقي": speakerVal,
        teacher: speakerVal,
        speaker: speakerVal,
        "التوقيت": lessonData.time || "",
        description: lessonData.description || "",
        featured: lessonData.featured || "لا",
        "مميز": lessonData.featured || "لا"
      };
      await setDoc(docRef, docData, { merge: true });
      return true;
    } catch (error) {
      console.error("[DB] updateLesson failed:", error);
      return false;
    }
  },

  async deleteLesson(id) {
    try {
      await deleteDoc(doc(db, "lessons", id));
      return true;
    } catch (error) {
      console.error("[DB] deleteLesson failed:", error);
      return false;
    }
  },

  async startSession(supervisorName, selectedCourses, circleType, category = "الصغار", date = null) {
    const sessionId = "SE" + Date.now();
    try {
      let dateStr = date || getCurrentDateStr();
      if (dateStr && dateStr.includes("-") && dateStr.indexOf("-") === 4) {
        const parts = dateStr.split("-");
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      let period = circleType || "حلقة صباحية";
      let groupType = "حلقة مشتركة";
      if (circleType && circleType.includes(" - ")) {
        const parts = circleType.split(" - ");
        groupType = parts[0];
        period = parts[1];
      }
      
      // Safety Check: check if session already exists for same day, same period, same group gender, and same category
      const q = query(
        collection(db, "sessions"),
        where("التاريخ", "==", dateStr),
        where("الفترة", "==", period),
        where("نوع الحلقة", "==", groupType),
        where("الفئة", "==", category)
      );
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return { success: false, error: "تنبيه: توجد بالفعل حلقة مسجلة اليوم لهذه المجموعة في نفس الفترة." };
      }
      
      const docData = {
        SessionID: sessionId,
        "اسم المشرف": supervisorName,
        "التاريخ": dateStr,
        "الحالة": "جارية",
        "المقررات المختارة": selectedCourses.join("، "),
        "الفترة": period,
        "نوع الحلقة": groupType,
        "اسم الحلقة": circleType || `${groupType} - ${period}`,
        "الفئة": category
      };
      await setDoc(doc(db, "sessions", sessionId), docData);
      return { success: true, sessionId: sessionId };
    } catch (error) {
      console.error("[DB] startSession failed:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteSession(sessionId, bypassOfflineCheck = false) {
    if (!bypassOfflineCheck && !navigator.onLine) {
      const opId = await addOperationToQueue("deleteSession", { sessionId });
      return true;
    }
    try {
      await deleteDoc(doc(db, "sessions", sessionId));
      
      const ratingQuery = query(collection(db, "Ratings"), where("SessionID", "==", sessionId));
      const ratingSnap = await getDocs(ratingQuery);
      const studentIdsToRecalculate = new Set();
      
      for (const docSnap of ratingSnap.docs) {
        studentIdsToRecalculate.add(docSnap.data().StudentID);
        await deleteDoc(docSnap.ref);
      }
      
      const presenceQuery = query(collection(db, "Presence"), where("SessionID", "==", sessionId));
      const presenceSnap = await getDocs(presenceQuery);
      for (const docSnap of presenceSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      
      for (const studentId of studentIdsToRecalculate) {
        await recalculateStudentRewards(studentId);
      }

      // Delete adult progress logs for this session
      const adultProgressQuery = query(collection(db, "adult_progress"), where("sessionId", "==", sessionId));
      const adultProgressSnap = await getDocs(adultProgressQuery);
      for (const docSnap of adultProgressSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      
      // Fallback/Legacy adult progress deletion (by document ID prefix)
      const allAdultProgressSnap = await getDocs(collection(db, "adult_progress"));
      for (const d of allAdultProgressSnap.docs) {
        if (d.id.startsWith(`AP_${sessionId}_`)) {
          await deleteDoc(d.ref);
        }
      }
      
      return true;
    } catch (error) {
      console.error("[DB] deleteSession failed:", error);
      return false;
    }
  },

  async getAllSessions() {
    try {
      const snap = await getDocs(collection(db, "sessions"));
      const sessions = [];
      snap.forEach(d => {
        const data = d.data();
        sessions.push({
          id: d.id,
          SessionID: data.SessionID || d.id,
          date: data["التاريخ"] || "",
          supervisor: data["اسم المشرف"] || "",
          courses: data["المقررات المختارة"] || "",
          circleType: data["اسم الحلقة"] || data["الفترة"] || "حلقة صباحية",
          status: data["الحالة"] || "منتهية",
          category: data["الفئة"] || data.category || "الصغار"
        });
      });
      return sessions;
    } catch (error) {
      console.error("[DB] getAllSessions failed:", error);
      return [];
    }
  },

  async getSessionEvaluations(sessionId) {
    try {
      const studentEvals = {};

      // 1. Fetch kids evaluations (Ratings & Presence)
      const ratingsQuery = query(collection(db, "Ratings"), where("SessionID", "==", sessionId));
      const ratingsSnap = await getDocs(ratingsQuery);
      
      const presenceQuery = query(collection(db, "Presence"), where("SessionID", "==", sessionId));
      const presenceSnap = await getDocs(presenceQuery);
      
      const attendanceMap = {};
      presenceSnap.forEach(d => {
        attendanceMap[d.data().StudentID] = d.data()["حالة الحضور"];
      });
      
      ratingsSnap.forEach(d => {
        const data = d.data();
        const studentId = data.StudentID;
        if (!studentEvals[studentId]) {
          studentEvals[studentId] = {
            studentId: studentId,
            attendance: attendanceMap[studentId] || "حاضر",
            generalCriteria: {},
            generalPoints: 0,
            courseEvaluations: [],
            quranProgress: null,
            totalPointsEarned: 0,
            totalStarsEarned: 0,
            notes: ""
          };
        }
        
        const ev = studentEvals[studentId];
        const activityType = data["نوع النشاط"];
        
        if (activityType === "التقييم العام") {
          try {
            ev.generalCriteria = JSON.parse(data["عناصر التقييم"] || "{}");
          } catch(e) {
            ev.generalCriteria = {};
          }
          ev.generalPoints = data["النقاط"] || 0;
          ev.notes = data["الملاحظات"] || "";
          ev.totalPointsEarned += ev.generalPoints;
          ev.totalStarsEarned += Math.round(ev.generalPoints / 2);
        } else if (!isQuranActivity(activityType)) {
          let criteria = {};
          try {
            criteria = JSON.parse(data["عناصر التقييم"] || "{}");
          } catch(e) {}
          
          ev.courseEvaluations.push({
            courseName: activityType,
            criteria: criteria,
            points: data["النقاط"] || 0,
            notes: data["الملاحظات"] || ""
          });
          ev.totalPointsEarned += data["النقاط"] || 0;
          ev.totalStarsEarned += Math.round((data["النقاط"] || 0) / 2);
        }
        
        if (data["السورة"]) {
          ev.quranProgress = {
            surah: data["السورة"] || "",
            fromVerse: data["من الآية"] || "",
            toVerse: data["إلى الآية"] || "",
            type: data["نوع الإنجاز"] || "",
            notes: data["الملاحظات"] || ""
          };
        }
      });
      
      Object.keys(attendanceMap).forEach(studentId => {
        if (!studentEvals[studentId]) {
          studentEvals[studentId] = {
            studentId: studentId,
            attendance: attendanceMap[studentId],
            generalCriteria: {},
            generalPoints: 0,
            courseEvaluations: [],
            quranProgress: null,
            totalPointsEarned: 0,
            totalStarsEarned: 0,
            notes: ""
          };
        }
      });

      // Recalculate capped session stars and points for child students
      Object.keys(studentEvals).forEach(studentId => {
        const ev = studentEvals[studentId];
        if (studentId.startsWith("AD")) return;
        
        if (ev.attendance.startsWith("غائب")) {
          ev.totalStarsEarned = 0;
          ev.totalPointsEarned = 0;
          return;
        }

        const sectionAverages = [];

        // 1. التقييم العام
        if (ev.generalCriteria && Object.keys(ev.generalCriteria).length > 0) {
          const values = Object.values(ev.generalCriteria).map(Number).filter(x => !isNaN(x));
          if (values.length > 0) {
            const genStarsAvg = values.reduce((a, b) => a + b, 0) / values.length;
            sectionAverages.push(genStarsAvg);
          }
        }

        // 2. المقررات الاختيارية
        if (ev.courseEvaluations && ev.courseEvaluations.length > 0) {
          ev.courseEvaluations.forEach(c => {
            const values = Object.values(c.criteria).map(Number).filter(x => !isNaN(x));
            if (values.length > 0) {
              const cStarsSum = values.reduce((a, b) => a + b, 0);
              const cStarsAvg = cStarsSum / values.length;
              sectionAverages.push(cStarsAvg);
            }
          });
        }

        if (sectionAverages.length > 0) {
          const overallStars = Math.round(sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length);
          const cappedStars = Math.min(3, Math.max(0, overallStars));
          ev.totalStarsEarned = cappedStars;
          ev.totalPointsEarned = cappedStars * 2;
        } else {
          ev.totalStarsEarned = 0;
          ev.totalPointsEarned = 0;
        }
      });

      // 2. Fetch adult evaluations (adult_progress)
      const adultProgressQuery = query(collection(db, "adult_progress"), where("sessionId", "==", sessionId));
      const adultProgressSnap = await getDocs(adultProgressQuery);
      
      const processedAdultIds = new Set();
      adultProgressSnap.forEach(d => {
        const data = d.data();
        const studentId = data.participantId;
        processedAdultIds.add(studentId);
        studentEvals[studentId] = {
          studentId: studentId,
          studentName: data.participantName || "",
          attendance: data.attendance || "حاضر",
          activityType: data.activityType || "حفظ",
          surah: data.surah || "",
          fromVerse: data.fromVerse || 0,
          toVerse: data.toVerse || 0,
          notes: data.notes || "",
          courseName: data.courseName || "تحفيظ القرآن",
          stars: data.stars || 0,
          points: data.points || 0,
          totalStarsEarned: data.stars || 0,
          totalPointsEarned: data.points || 0
        };
      });

      // Fallback/Legacy adult progress (checking by doc ID prefix)
      const allAdultProgressSnap = await getDocs(collection(db, "adult_progress"));
      allAdultProgressSnap.forEach(d => {
        if (d.id.startsWith(`AP_${sessionId}_`)) {
          const studentId = d.id.substring(`AP_${sessionId}_`.length);
          if (!processedAdultIds.has(studentId)) {
            const data = d.data();
            studentEvals[studentId] = {
              studentId: studentId,
              studentName: data.participantName || "",
              attendance: data.attendance || "حاضر",
              activityType: data.activityType || "حفظ",
              surah: data.surah || "",
              fromVerse: data.fromVerse || 0,
              toVerse: data.toVerse || 0,
              notes: data.notes || "",
              courseName: data.courseName || "تحفيظ القرآن",
              stars: data.stars || 0,
              points: data.points || 0,
              totalStarsEarned: data.stars || 0,
              totalPointsEarned: data.points || 0
            };
          }
        }
      });
      
      return Object.values(studentEvals);
    } catch (error) {
      console.error("[DB] getSessionEvaluations failed:", error);
      return [];
    }
  },

  async updateSession(sessionId, date, supervisorName, selectedCourses, evaluations, circleType) {
    return saveSessionData(sessionId, date, supervisorName, selectedCourses, evaluations, circleType, false);
  },

  async endSession(sessionId, evaluations, selectedCourses) {
    const sessionDocRef = doc(db, "sessions", sessionId);
    const sessionDoc = await getDoc(sessionDocRef);
    let date = getCurrentDateStr();
    let supervisorName = "غير محدد";
    let circleType = "حلقة صباحية";
    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      date = data["التاريخ"] || date;
      supervisorName = data["اسم المشرف"] || supervisorName;
      circleType = data["الفترة"] || circleType;
    }
    return saveSessionData(sessionId, date, supervisorName, selectedCourses || [], evaluations, circleType, true);
  },

  async readDashboardData() {
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const adultsSnap = await getDocs(collection(db, "adult_participants"));
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      const presenceSnap = await getDocs(collection(db, "Presence"));
      const pointsSnap = await getDocs(collection(db, "point"));
      const ratingsSnap = await getDocs(collection(db, "Ratings"));
      
      const acceptedStudents = [];
      let braemCount = 0;
      let ashbalCount = 0;
      let kidsMales = 0;
      let kidsFemales = 0;

      studentsSnap.forEach(d => {
        const data = d.data();
        if (data["حالة الطلب"] === "مقبول" || data.status === "مقبول") {
          const age = Number(data["السن"] || data.age) || 0;
          const gender = data["الجنس"] || data.gender || "ذكر";
          const studentInfo = {
            id: d.id,
            name: data["سليماني ياني :اسم الطالب كامل"] || data.name || "",
            age: age,
            gender: gender,
            quranLevel: data["المستوى القرآني"] || data.quranLevel || ""
          };
          acceptedStudents.push(studentInfo);

          if (age >= 4 && age <= 7) {
            braemCount++;
          } else if (age >= 8 && age <= 14) {
            ashbalCount++;
          }
          
          if (gender === "أنثى") {
            kidsFemales++;
          } else {
            kidsMales++;
          }
        }
      });
      
      const acceptedAdults = [];
      let adultsMales = 0;
      let adultsFemales = 0;
      
      adultsSnap.forEach(d => {
        const data = d.data();
        if (data.status === "مقبول") {
          const section = data.section || "رجال";
          const adultInfo = {
            id: d.id,
            name: data.name || "",
            section: section,
            quranLevel: data.quranLevel || "0"
          };
          acceptedAdults.push(adultInfo);
          
          if (section === "نساء") {
            adultsFemales++;
          } else {
            adultsMales++;
          }
        }
      });

      const totalStudents = acceptedStudents.length;
      const totalAdults = acceptedAdults.length;
      const totalBraem = braemCount;
      const totalAshbal = ashbalCount;
      const totalMales = kidsMales + adultsMales;
      const totalFemales = kidsFemales + adultsFemales;
      
      const acceptedStudentIds = new Set(acceptedStudents.map(s => s.id));
      const acceptedAdultIds = new Set(acceptedAdults.map(a => a.id));
      const allAcceptedIds = new Set([...acceptedStudentIds, ...acceptedAdultIds]);

      // Calculate attendance
      let totalPresence = 0;
      let presentCount = 0;
      const studentPresenceStats = {}; // id -> { present: 0, total: 0 }

      presenceSnap.forEach(d => {
        const data = d.data();
        const studentId = data.StudentID;
        if (allAcceptedIds.has(studentId)) {
          totalPresence++;
          const status = data["حالة الحضور"] || "";
          const isPresent = (status === "حاضر" || status.startsWith("متأخر") || status === "حاظر");
          if (isPresent) {
            presentCount++;
          }
          if (!studentPresenceStats[studentId]) {
            studentPresenceStats[studentId] = { present: 0, total: 0 };
          }
          studentPresenceStats[studentId].total += 1;
          if (isPresent) {
            studentPresenceStats[studentId].present += 1;
          }
        }
      });
      const attendanceRate = totalPresence > 0 ? Math.round((presentCount / totalPresence) * 100) : 0;

      // Regular students (top 10 based on presence rate)
      const regularStudents = [];
      allAcceptedIds.forEach(id => {
        const stats = studentPresenceStats[id];
        let name = "";
        const kid = acceptedStudents.find(s => s.id === id);
        if (kid) name = kid.name;
        else {
          const adult = acceptedAdults.find(a => a.id === id);
          if (adult) name = adult.name;
        }

        if (stats && stats.total > 0) {
          regularStudents.push({
            id: id,
            name: name,
            rate: Math.round((stats.present / stats.total) * 100),
            sessions: stats.total
          });
        }
      });
      const topRegularStudents = regularStudents
        .sort((a, b) => b.rate - a.rate || b.sessions - a.sessions)
        .slice(0, 10);

      // Level / Hizb breakdown
      const parseHizb = (levelStr) => {
        if (!levelStr) return 0;
        const clean = levelStr.trim();
        if (clean.includes("60") || clean.includes("كامل")) return 60;
        if (clean.includes("30") || clean.includes("نصف")) return 30;
        const match = clean.match(/\d+/);
        return match ? parseInt(match[0]) || 0 : 0;
      };

      const hizbBreakdown = {
        "0_hizb": 0,    // لم يبدأ بعد / 0 حزب
        "1_5_hizb": 0,  // 1-5 أحزاب
        "6_10_hizb": 0, // 6-10 أحزاب
        "11_20_hizb": 0,// 11-20 حزب
        "21_30_hizb": 0,// 21-30 حزب
        "30_plus": 0    // أكثر من 30 حزب
      };

      acceptedStudents.forEach(s => {
        const hz = parseHizb(s.quranLevel || "");
        if (hz === 0) hizbBreakdown["0_hizb"]++;
        else if (hz <= 5) hizbBreakdown["1_5_hizb"]++;
        else if (hz <= 10) hizbBreakdown["6_10_hizb"]++;
        else if (hz <= 20) hizbBreakdown["11_20_hizb"]++;
        else if (hz <= 30) hizbBreakdown["21_30_hizb"]++;
        else hizbBreakdown["30_plus"]++;
      });

      acceptedAdults.forEach(a => {
        const hz = parseHizb(a.quranLevel || "");
        if (hz === 0) hizbBreakdown["0_hizb"]++;
        else if (hz <= 5) hizbBreakdown["1_5_hizb"]++;
        else if (hz <= 10) hizbBreakdown["6_10_hizb"]++;
        else if (hz <= 20) hizbBreakdown["11_20_hizb"]++;
        else if (hz <= 30) hizbBreakdown["21_30_hizb"]++;
        else hizbBreakdown["30_plus"]++;
      });

      // Top circles
      const circleSessionsCount = {};
      sessionsSnap.forEach(d => {
        const data = d.data();
        const circleName = data["اسم الحلقة"] || data.circleName || "عامة";
        circleSessionsCount[circleName] = (circleSessionsCount[circleName] || 0) + 1;
      });
      const topCircles = Object.entries(circleSessionsCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Remaining dashboard data elements (ranks and leaderboards)
      const pointsMap = {};
      pointsSnap.forEach(d => {
        const data = d.data();
        pointsMap[d.id] = {
          points: Number(data["النقاط الكلية"]) || 0,
          stars: Number(data["عدد النجوم"]) || 0
        };
      });

      const studentRewards = acceptedStudents.map(stud => {
        const r = pointsMap[stud.id] || { points: 0, stars: 0 };
        return {
          studentId: stud.id,
          studentName: stud.name,
          points: r.points,
          stars: r.stars
        };
      });

      const allRanks = [...studentRewards].sort((a, b) => b.points - a.points);
      const leaderboardPoints = [...allRanks].slice(0, 10);

      const quranMap = {};
      ratingsSnap.forEach(d => {
        const data = d.data();
        const studentId = data.StudentID;
        const act = data["نوع النشاط"];
        if (acceptedStudentIds.has(studentId)) {
          const isQuran = (act === "حفظ القرآن" || act === "تسميع" || act === "مراجعة القرآن");
          if (isQuran && (data["نوع الإنجاز"] === "حفظ جديد" || data["نوع الإنجاز"] === "استدراك")) {
            const count = Number(data["عدد الآيات"]) || 0;
            quranMap[studentId] = (quranMap[studentId] || 0) + count;
          }
        }
      });

      const leaderboardQuran = acceptedStudents.map(stud => {
        return {
          studentId: stud.id,
          studentName: stud.name,
          totalAyahs: quranMap[stud.id] || 0
        };
      }).sort((a, b) => b.totalAyahs - a.totalAyahs).slice(0, 10);

      const behaviorMap = {};
      ratingsSnap.forEach(d => {
        const data = d.data();
        const studentId = data.StudentID;
        if (acceptedStudentIds.has(studentId) && data["نوع النشاط"] === "التقييم العام") {
          try {
            const crit = JSON.parse(data["عناصر التقييم"] || "{}");
            const behavior = Number(crit["السلوك"] || crit["behavior"] || crit["السلوك والتربية"] || 0);
            if (behavior > 0) {
              if (!behaviorMap[studentId]) behaviorMap[studentId] = { total: 0, count: 0 };
              behaviorMap[studentId].total += behavior;
              behaviorMap[studentId].count += 1;
            }
          } catch(e) {}
        }
      });

      const leaderboardBehavior = acceptedStudents.map(stud => {
        const b = behaviorMap[stud.id] || { total: 0, count: 0 };
        return {
          studentId: stud.id,
          studentName: stud.name,
          avgBehavior: b.count > 0 ? Math.round((b.total / b.count) * 10) / 10 : 0
        };
      }).sort((a, b) => b.avgBehavior - a.avgBehavior).slice(0, 10);

      return {
        totalStudents,
        totalAdults,
        totalBraem,
        totalAshbal,
        totalMales,
        totalFemales,
        totalSessions: sessionsSnap.size || 0,
        attendanceRate,
        leaderboardPoints,
        leaderboardQuran,
        leaderboardBehavior,
        allRanks,
        hizbBreakdown,
        topCircles,
        topRegularStudents
      };
    } catch (error) {
      console.error("[DB] readDashboardData failed:", error);
      throw error;
    }
  },

  async readStudentProfile(studentId, phone) {
    try {
      const canonicalId = studentId.trim().toUpperCase();
      const trimmedId = studentId.trim().toLowerCase();
      const phoneTrimmed = phone.trim();
      
      const studentDocRef = doc(db, "students", canonicalId);
      const studentDocSnap = await getDoc(studentDocRef);
      
      if (!studentDocSnap.exists()) {
        return { success: false, error: "فشل التحقق من الهوية. يرجى التأكد من معرف الطالب ورقم هاتف ولي الأمر بدقة." };
      }
      
      const studentData = mapStudentFromFirestore(studentDocSnap.data(), studentDocSnap.id);
      
      const actualPhone = studentData.phone || studentData["رقم الهاتف"] || "";
      if (actualPhone.trim() !== phoneTrimmed) {
        return { success: false, error: "فشل التحقق من الهوية. يرجى التأكد من معرف الطالب ورقم هاتف ولي الأمر بدقة." };
      }
      
      let totalPoints = 0;
      let totalStars = 0;
      let totalBadges = 0;
      let badges = [];
      
      try {
        const pointDocRef = doc(db, "point", canonicalId);
        const pointDocSnap = await getDoc(pointDocRef);
        if (pointDocSnap.exists()) {
          const pData = pointDocSnap.data();
          totalPoints = Number(pData["النقاط الكلية"]) || 0;
          totalStars = Number(pData["عدد النجوم"]) || 0;
          totalBadges = Number(pData["عدد الشارات"]) || 0;
          const badgesStr = pData["الشارات"] || "";
          badges = badgesStr ? badgesStr.split("، ") : [];
        }
      } catch (err) {
        console.warn("[DB] Point doc fetch failed (possibly permission restrictions):", err);
      }
      
      let rank = "-";
      try {
        const acceptedStudents = [];
        const studentsSnap = await getDocs(collection(db, "students"));
        studentsSnap.forEach(d => {
          const data = d.data();
          if (data["حالة الطلب"] === "مقبول") {
            acceptedStudents.push({
              id: d.id,
              points: 0
            });
          }
        });

        const pointsSnap = await getDocs(collection(db, "point"));
        const pointsMap = {};
        pointsSnap.forEach(d => {
          pointsMap[d.id.trim().toLowerCase()] = Number(d.data()["النقاط الكلية"]) || 0;
        });

        acceptedStudents.forEach(s => {
          const key = s.id.trim().toLowerCase();
          if (pointsMap[key] !== undefined) {
            s.points = pointsMap[key];
          }
        });

        acceptedStudents.sort((a, b) => b.points - a.points);
        const foundIndex = acceptedStudents.findIndex(x => x.id.trim().toLowerCase() === trimmedId);
        if (foundIndex !== -1) {
          rank = foundIndex + 1;
        } else if (studentData.id) {
          const foundIndex2 = acceptedStudents.findIndex(x => x.id.trim().toLowerCase() === studentData.id.trim().toLowerCase());
          if (foundIndex2 !== -1) {
            rank = foundIndex2 + 1;
          }
        }
      } catch (err) {
        console.warn("[DB] Rank calculation skipped (possibly permission restrictions):", err);
      }
      
      const presenceQuery = query(collection(db, "Presence"), where("StudentID", "==", studentData.id));
      const presenceSnap = await getDocs(presenceQuery);
      
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      const sessionsMap = {};
      sessionsSnap.forEach(d => {
        sessionsMap[d.id] = d.data();
      });
      
      const attendanceHistory = [];
      let totalClasses = 0;
      let presentClasses = 0;
      
      presenceSnap.forEach(d => {
        const data = d.data();
        const sess = sessionsMap[data.SessionID];
        totalClasses++;
        const attendanceStatus = data["حالة الحضور"] || "";
        if (attendanceStatus === "حاضر" || attendanceStatus.startsWith("متأخر")) {
          presentClasses++;
        }
        attendanceHistory.push({
          sessionId: data.SessionID,
          date: sess ? sess["التاريخ"] : "-",
          supervisor: sess ? sess["اسم المشرف"] : "-",
          courses: sess ? sess["المقررات المختارة"] : "-",
          circleType: sess ? (sess["الفترة"] || "حلقة صباحية") : "حلقة صباحية",
          status: data["حالة الحضور"]
        });
      });
      
      attendanceHistory.sort((a,b) => b.sessionId.localeCompare(a.sessionId));
      
      const ratingsQuery = query(collection(db, "Ratings"), where("StudentID", "==", studentData.id));
      const ratingsSnap = await getDocs(ratingsQuery);
      
      const qHistory = [];
      const studentEvals = [];
      let totalAyahs = Number(studentData.initialToVerse) || 0;
      
      ratingsSnap.forEach(d => {
        const data = d.data();
        const sess = sessionsMap[data.SessionID];
        const act = data["نوع النشاط"];
        const isQuran = isQuranActivity(act);
        
        if (isQuran) {
          const count = Number(data["عدد الآيات"]) || 0;
          if (data["نوع الإنجاز"] === "حفظ جديد" || data["نوع الإنجاز"] === "استدراك" || data["نوع الإنجاز"] === "حفظ") {
            totalAyahs += count;
          }
          qHistory.push({
            sessionId: data.SessionID || "",
            surah: data["السورة"] || "",
            fromVerse: data["من الآية"] || "",
            toVerse: data["إلى الآية"] || "",
            date: data["التاريخ"] || "",
            type: data["نوع الإنجاز"] || "",
            notes: data["الملاحظات"] || ""
          });
        } else {
          studentEvals.push({
            sessionId: data.SessionID,
            date: sess ? sess["التاريخ"] : data["التاريخ"] || "-",
            circleType: sess ? (sess["الفترة"] || "حلقة صباحية") : "حلقة صباحية",
            activityType: data["نوع النشاط"] || "",
            criteria: data["عناصر التقييم"] || "{}",
            points: Number(data["النقاط"]) || 0,
            notes: data["الملاحظات"] || ""
          });
        }
      });
      
      qHistory.sort((a,b) => b.date.localeCompare(a.date));
      studentEvals.sort((a,b) => b.date.localeCompare(a.date));
      
      const lastSurah = qHistory.length > 0 ? qHistory[0].surah : (studentData.initialSurah || "-");
      const lastFromVerse = qHistory.length > 0 ? qHistory[0].fromVerse : "";
      const lastToVerse = qHistory.length > 0 ? qHistory[0].toVerse : (studentData.initialToVerse || "");
      
      const settingsSnap = await getDoc(doc(db, "settings", "courseEnded"));
      const courseEnded = settingsSnap.exists() ? (settingsSnap.data().value === "true") : false;
      
      return {
        success: true,
        student: studentData,
        rank: rank,
        courseEnded: courseEnded,
        rewards: {
          points: totalPoints,
          stars: totalStars,
          badgesCount: totalBadges,
          badges: badges
        },
        attendance: {
          rate: totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : (Number(studentData.initialAttendanceRate) || 0),
          totalClasses: totalClasses,
          presentClasses: presentClasses,
          history: attendanceHistory
        },
        quran: {
          totalAyahs: totalAyahs,
          lastSurah: lastSurah,
          lastFromVerse: lastFromVerse,
          lastToVerse: lastToVerse,
          history: qHistory
        },
        evaluations: studentEvals
      };
    } catch (error) {
      console.error("[DB] readStudentProfile failed:", error);
      return { success: false, error: "حدث خطأ أثناء تحميل بيانات الطالب." };
    }
  },

  async readParentPortal(studentId, phone) {
    return this.readStudentProfile(studentId, phone);
  },

  async setSetting(key, value) {
    try {
      await setDoc(doc(db, "settings", key), { value: value });
      return true;
    } catch (error) {
      console.error("[DB] setSetting failed:", error);
      return false;
    }
  },

  async getSetting(key) {
    try {
      const sDoc = await getDoc(doc(db, "settings", key));
      return sDoc.exists() ? sDoc.data().value : null;
    } catch (error) {
      console.error("[DB] getSetting failed:", error);
      return null;
    }
  },

  async syncPendingQueue() {
    if (!navigator.onLine) {
      return { success: false, error: "Offline" };
    }
    try {
      const ops = await getQueuedOperations();
      if (ops.length === 0) {
        return { success: true, count: 0 };
      }
      
      for (const op of ops) {
        const { operationId, type, data } = op;
        const idKeyRef = doc(db, "idempotency_keys", operationId);
        
        try {
          const idKeySnap = await getDoc(idKeyRef);
          if (!idKeySnap.exists()) {
            if (type === "saveSessionData") {
              await saveSessionData(
                data.sessionId,
                data.date,
                data.supervisorName,
                data.selectedCourses,
                data.evaluations,
                data.circleType,
                data.isEnd,
                true // bypassOfflineCheck
              );
            } else if (type === "deleteSession") {
              await window.DB.deleteSession(data.sessionId, true); // bypassOfflineCheck
            }
            await setDoc(idKeyRef, { processedAt: Date.now() });
          }
          await removeOperationFromQueue(operationId);
        } catch (opErr) {
          console.error(`[DB] Operation ${operationId} failed to sync:`, opErr);
          return { success: false, error: opErr.message };
        }
      }
      return { success: true, count: ops.length };
    } catch (err) {
      console.error("[DB] syncPendingQueue failed:", err);
      return { success: false, error: err.message };
    }
  },

  async rebuildRecoveryIndex() {
    try {
      console.log("[DB] Commencing rebuild of student recovery index...");
      const studentsSnap = await getDocs(collection(db, "students"));
      const recoveryMap = {};
      
      studentsSnap.forEach(d => {
        const data = d.data();
        const studentId = data.id || d.id;
        const phone = data["رقم الهاتف"] || data.phone || "";
        const name = data["سليماني ياني :اسم الطالب كامل"] || data.name || "";
        
        const cleanPhone = phone.trim();
        const cleanName = name.trim();
        
        if (cleanPhone && studentId) {
          if (!recoveryMap[cleanPhone]) {
            recoveryMap[cleanPhone] = [];
          }
          if (!recoveryMap[cleanPhone].some(s => s.id === studentId)) {
            recoveryMap[cleanPhone].push({
              id: studentId,
              name: cleanName
            });
          }
        }
      });
      
      const batchLimit = 200;
      let batch = writeBatch(db);
      let count = 0;
      
      for (const [phone, studentsList] of Object.entries(recoveryMap)) {
        const docRef = doc(db, "student_recovery", phone);
        batch.set(docRef, {
          phone: phone,
          students: studentsList
        });
        count++;
        
        if (count >= batchLimit) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      
      console.log("[DB] Rebuild of student recovery index completed successfully.");
      return true;
    } catch (error) {
      console.error("[DB] rebuildRecoveryIndex failed:", error);
      return false;
    }
  },

  // --- Weekly Honor Board Methods ---
  async getWeeklyHonorBoard(gender = "males") {
    try {
      const docId = gender === "females" ? "weekly_honor_board_females" : "weekly_honor_board_males";
      const docRef = doc(db, "settings", docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      const fallbackRef = doc(db, "settings", "weekly_honor_board");
      const fallbackSnap = await getDoc(fallbackRef);
      if (fallbackSnap.exists()) {
        return fallbackSnap.data();
      }
      return null;
    } catch (error) {
      console.error("[DB] getWeeklyHonorBoard failed:", error);
      return null;
    }
  },

  async saveWeeklyHonorBoard(honorData, gender = "males") {
    try {
      const docId = gender === "females" ? "weekly_honor_board_females" : "weekly_honor_board_males";
      const docRef = doc(db, "settings", docId);
      const dataToSave = {
        weekName: honorData.weekName || "الأسبوع الأول",
        memorizationChampion: honorData.memorizationChampion || "",
        behaviorChampion: honorData.behaviorChampion || "",
        participationChampion: honorData.participationChampion || "",
        rank1: honorData.rank1 || "",
        rank2: honorData.rank2 || "",
        rank3: honorData.rank3 || "",
        distinguishedTeam: honorData.distinguishedTeam || "لا يوجد هذا الأسبوع",
        notes: honorData.notes || "",
        gender: gender,
        updatedAt: Date.now()
      };
      await setDoc(docRef, dataToSave);
      
      await setDoc(doc(db, "settings", "weekly_honor_board"), {
        weekName: honorData.weekName || "الأسبوع الأول",
        memorizationChampion: honorData.memorizationChampion || "",
        behaviorChampion: honorData.behaviorChampion || "",
        participationChampion: honorData.participationChampion || "",
        distinguishedTeam: honorData.distinguishedTeam || "لا يوجد هذا الأسبوع",
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error("[DB] saveWeeklyHonorBoard failed:", error);
      return false;
    }
  },

  async assignStudentsToTeam(studentIds, teamName) {
    try {
      const batchPromises = studentIds.map(async (id) => {
        const isAdult = id.startsWith("AD");
        const coll = isAdult ? "adult_participants" : "students";
        const docRef = doc(db, coll, id);
        await setDoc(docRef, { teamName: teamName }, { merge: true });
      });
      await Promise.all(batchPromises);
      return true;
    } catch (error) {
      console.error("[DB] assignStudentsToTeam failed:", error);
      return false;
    }
  },

  async calculateWeeklyHonors(startDate, endDate, gender) {
    try {
      // 1. Get all students
      const students = await this.getAllStudents();
      const targetGender = gender === "females" ? "أنثى" : "ذكر";
      const targetStudents = students.filter(s => s.status === "مقبول" && s.gender === targetGender);
      const studentMap = {};
      const studentTeamMap = {};
      targetStudents.forEach(s => {
        studentMap[s.id] = s.name;
        studentTeamMap[s.id] = s.teamName || "";
      });

      // 2. Query Ratings documents within the date range [startDate, endDate]
      const ratingsRef = collection(db, "Ratings");
      const q = query(
        ratingsRef,
        where("التاريخ", ">=", startDate),
        where("التاريخ", "<=", endDate)
      );
      const querySnap = await getDocs(q);

      // Aggregates
      const memoVerses = {};
      const behaviorScores = {};
      const participationScores = {};
      const totalPoints = {};
      const teamPoints = {};
      const weeklyBadges = {};

      querySnap.forEach(d => {
        const data = d.data();
        const studentId = data.StudentID;
        
        // Skip if student not in target list
        if (!studentMap[studentId]) return;

        // Sum overall points
        const points = Number(data["النقاط"]) || 0;
        totalPoints[studentId] = (totalPoints[studentId] || 0) + points;

        // Sum team points
        const teamName = studentTeamMap[studentId];
        if (teamName) {
          teamPoints[teamName] = (teamPoints[teamName] || 0) + points;
        }

        // Memorization: Check "حفظ القرآن"
        if (data["نوع النشاط"] === "حفظ القرآن") {
          const verses = Number(data["عدد الآيات"]) || 0;
          memoVerses[studentId] = (memoVerses[studentId] || 0) + verses;
        }

        // Behavior / Participation / Badges: Check "التقييم العام"
        if (data["نوع النشاط"] === "التقييم العام") {
          if (data["الشارات الممنوحة"]) {
            const badges = data["الشارات الممنوحة"];
            if (Array.isArray(badges)) {
              weeklyBadges[studentId] = (weeklyBadges[studentId] || 0) + badges.length;
            }
          }
          if (data["عناصر التقييم"]) {
            try {
              const criteria = JSON.parse(data["عناصر التقييم"]);
              const behVal = Number(criteria["السلوك"]) || 0;
              const partVal = Number(criteria["المشاركة العامة"]) || 0;

              behaviorScores[studentId] = (behaviorScores[studentId] || 0) + behVal;
              participationScores[studentId] = (participationScores[studentId] || 0) + partVal;
            } catch (e) {
              console.error("[Weekly Honors] Error parsing general criteria:", e);
            }
          }
        }
      });

      // Format results
      const formatLeaderList = (scoreMap) => {
        return Object.keys(scoreMap).map(id => ({
          studentId: id,
          name: studentMap[id],
          score: scoreMap[id]
        })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
      };

      const memoList = formatLeaderList(memoVerses);
      const behList = formatLeaderList(behaviorScores);
      const partList = formatLeaderList(participationScores);
      
      const pointList = Object.keys(totalPoints).map(id => {
        const score = totalPoints[id];
        return {
          studentId: id,
          studentName: studentMap[id],
          points: score,
          stars: Math.round(score / 2),
          badgesCount: weeklyBadges[id] || 0,
          score: score // for compatibility with any legacy code checking candidate.score
        };
      }).filter(x => x.points > 0).sort((a, b) => b.points - a.points);

      const checkTies = (list) => {
        if (list.length === 0) return { champions: [], hasTie: false };
        const maxScore = list[0].score;
        const topScorers = list.filter(item => item.score === maxScore);
        return {
          champions: topScorers,
          hasTie: topScorers.length > 1
        };
      };

      const memoRes = checkTies(memoList);
      const behRes = checkTies(behList);
      const partRes = checkTies(partList);

      // Find distinguished team automatically
      const sortedTeams = Object.keys(teamPoints).map(tName => ({
        name: tName,
        score: teamPoints[tName]
      })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

      let distinguishedTeam = "لا يوجد فريق متميز هذا الأسبوع";
      if (sortedTeams.length > 0) {
        const maxTeamScore = sortedTeams[0].score;
        const topTeams = sortedTeams.filter(t => t.score === maxTeamScore).map(t => t.name);
        distinguishedTeam = topTeams.join(" و ");
      }

      const results = {
        distinguishedTeam,
        candidates: {
          memorization: memoList,
          behavior: behList,
          participation: partList,
          rank: pointList
        },
        ties: {
          memorization: memoRes.hasTie,
          behavior: behRes.hasTie,
          participation: partRes.hasTie,
          rank1: (pointList.length > 1 && pointList[0].score === pointList[1].score),
          rank2: (pointList.length > 2 && pointList[1].score === pointList[2].score),
          rank3: (pointList.length > 3 && pointList[2].score === pointList[3].score)
        }
      };

      return results;
    } catch (error) {
      console.error("[DB] calculateWeeklyHonors failed:", error);
      return null;
    }
  },

  async getTeams() {
    try {
      const docRef = doc(db, "settings", "teams");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().names) {
        return docSnap.data().names;
      }
      return [];
    } catch (error) {
      console.error("[DB] getTeams failed:", error);
      return [];
    }
  },

  async saveTeams(teamsArray) {
    try {
      const docRef = doc(db, "settings", "teams");
      await setDoc(docRef, { names: teamsArray }, { merge: true });
      return true;
    } catch (error) {
      console.error("[DB] saveTeams failed:", error);
      return false;
    }
  },

  // --- Adult Quranic Circle Methods ---
  async addAdultParticipant(name, section, phone = "", quranLevel = "غير محدد", lastSurah = "", lastVerse = 0) {
    try {
      const id = "AD" + Math.floor(10000 + Math.random() * 90000);
      const assignedCircle = section === "نساء" ? "حلقة الكبار - إناث" : "حلقة الكبار - ذكور";
      const adultDoc = {
        id: id,
        name: name,
        section: section, // "رجال" or "نساء"
        phone: phone,
        quranLevel: quranLevel,
        lastSurah: lastSurah,
        lastVerse: Number(lastVerse) || 0,
        status: "مقبول",
        target: 30, // default target: 30 Juz'
        createdAt: Date.now(),
        "الفئة العمرية": "كبار",
        "الحلقة": assignedCircle
      };
      await setDoc(doc(db, "adult_participants", id), adultDoc);
      
      await this.writeAuditLog("إضافة مشارك كبير يدوياً", null, { id, name, section, assignedCircle });

      return { success: true, id: id };
    } catch (error) {
      console.error("[DB] addAdultParticipant failed:", error);
      return { success: false, error: error.message };
    }
  },

  async registerAdultParticipant(adultData) {
    try {
      let id = "";
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 15) {
        id = "AD" + Math.floor(10000 + Math.random() * 90000);
        const docRef = doc(db, "adult_participants", id);
        const docSnap = await getDoc(docRef);
        exists = docSnap.exists();
        attempts++;
      }
      if (exists) {
        throw new Error("تعذر إنشاء معرف فريد للمشارك بعد عدة محاولات.");
      }

      const assignedCircle = adultData.gender === "أنثى" ? "حلقة الكبار - إناث" : "حلقة الكبار - ذكور";
      const adultDoc = {
        id: id,
        name: adultData.name || "",
        section: adultData.gender === "أنثى" ? "نساء" : "رجال",
        phone: adultData.phone || "",
        age: Number(adultData.age) || 0,
        quranLevel: adultData.quranLevel || "غير محدد",
        lastSurah: adultData.lastSurah || "",
        lastVerse: Number(adultData.lastVerse) || 0,
        status: "قيد المراجعة",
        target: 30, // default target: 30 Juz'
        createdAt: Date.now(),
        "الفئة العمرية": "كبار",
        "الحلقة": assignedCircle
      };

      await setDoc(doc(db, "adult_participants", id), adultDoc);
      
      await this.writeAuditLog("تسجيل مشارك كبير جديد", null, { id, name: adultData.name, section: adultDoc.section, assignedCircle });

      return id;
    } catch (error) {
      console.error("[DB] registerAdultParticipant failed:", error);
      throw error;
    }
  },

  async updateAdultParticipantStatus(id, status) {
    try {
      await setDoc(doc(db, "adult_participants", id), { status: status }, { merge: true });
      return true;
    } catch (error) {
      console.error("[DB] updateAdultParticipantStatus failed:", error);
      return false;
    }
  },

  async updateAdultParticipantTarget(id, target) {
    try {
      await setDoc(doc(db, "adult_participants", id), { target: Number(target) || 30 }, { merge: true });
      return true;
    } catch (error) {
      console.error("[DB] updateAdultParticipantTarget failed:", error);
      return false;
    }
  },

  async updateAdultParticipantDirection(id, direction) {
    try {
      await setDoc(doc(db, "adult_participants", id), { memoDirection: direction }, { merge: true });
      return true;
    } catch (error) {
      console.error("[DB] updateAdultParticipantDirection failed:", error);
      return false;
    }
  },

  async getAdultParticipantsList() {
    try {
      const q = collection(db, "adult_participants");
      const qSnap = await getDocs(q);
      const list = [];
      qSnap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      // Sort by createdAt descending
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return list;
    } catch (error) {
      console.error("[DB] getAdultParticipantsList failed:", error);
      return [];
    }
  },

  async deleteAdultParticipant(id) {
    try {
      await deleteDoc(doc(db, "adult_participants", id));
      // Delete their progress logs as well
      const q = query(collection(db, "adult_progress"), where("participantId", "==", id));
      const qSnap = await getDocs(q);
      for (const docSnap of qSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      return true;
    } catch (error) {
      console.error("[DB] deleteAdultParticipant failed:", error);
      return false;
    }
  },

  async getAdultParticipants(section) {
    try {
      const q = query(collection(db, "adult_participants"), where("section", "==", section));
      const qSnap = await getDocs(q);
      const list = [];
      qSnap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      return list;
    } catch (error) {
      console.error("[DB] getAdultParticipants failed:", error);
      return [];
    }
  },

  async addAdultProgress(progressDoc) {
    try {
      const id = progressDoc.id || "AP" + Date.now();
      const docData = {
        id: id,
        participantId: progressDoc.participantId,
        participantName: progressDoc.participantName,
        section: progressDoc.section, // "رجال" or "نساء"
        date: progressDoc.date || getCurrentDateStr(),
        activityType: progressDoc.activityType || "حفظ", // "حفظ" or "مراجعة"
        surah: progressDoc.surah || "",
        fromVerse: Number(progressDoc.fromVerse) || 0,
        toVerse: Number(progressDoc.toVerse) || 0,
        attendance: progressDoc.attendance || "حاضر", // "حاضر" or "غائب" or "متأخر"
        notes: progressDoc.notes || "",
        createdAt: Date.now()
      };
      await setDoc(doc(db, "adult_progress", id), docData);
      return { success: true, id: id };
    } catch (error) {
      console.error("[DB] addAdultProgress failed:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteAdultProgress(id) {
    try {
      await deleteDoc(doc(db, "adult_progress", id));
      return true;
    } catch (error) {
      console.error("[DB] deleteAdultProgress failed:", error);
      return false;
    }
  },

  async getAdultProgress(section) {
    try {
      const q = query(collection(db, "adult_progress"), where("section", "==", section));
      const qSnap = await getDocs(q);
      const list = [];
      qSnap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      // Sort by date descending, then by createdAt descending
      list.sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      return list;
    } catch (error) {
      console.error("[DB] getAdultProgress failed:", error);
      return [];
    }
  },

  async readAdultProfile(adultId, phone) {
    try {
      const canonicalId = adultId.trim().toUpperCase();
      const phoneTrimmed = phone.trim();
      
      const docRef = doc(db, "adult_participants", canonicalId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { success: false, error: "المعرف غير مسجل. يرجى التأكد من معرف الطالب بدقة." };
      }
      
      const data = docSnap.data();
      const actualPhone = data.phone || "";
      if (actualPhone.trim() !== phoneTrimmed) {
        return { success: false, error: "رقم الهاتف غير مطابق للمعرف المدخل." };
      }
      
      if (data.status === "قيد المراجعة") {
        return { success: false, error: "حسابك قيد المراجعة حالياً من قبل الإدارة. يرجى الانتظار لحين قبول الطلب." };
      }
      if (data.status === "مرفوض") {
        return { success: false, error: "عذراً، تم رفض طلب التسجيل هذا." };
      }
      if (data.status !== "مقبول") {
        return { success: false, error: "الحساب غير نشط حالياً." };
      }
      
      // Load progress logs
      const q = query(collection(db, "adult_progress"), where("participantId", "==", canonicalId));
      const qSnap = await getDocs(q);
      const progressLogs = [];
      qSnap.forEach(dSnap => {
        progressLogs.push(dSnap.data());
      });
      
      // Sort progress logs: newest date first, then newest createdAt first
      progressLogs.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      
      return {
        success: true,
        participant: {
          id: canonicalId,
          name: data.name,
          section: data.section,
          phone: data.phone,
          age: data.age || 0,
          courses: data.courses || [],
          quranLevel: data.quranLevel || "غير محدد",
          lastSurah: data.lastSurah || "",
          lastVerse: data.lastVerse || 0,
          target: data.target || 30,
          memoDirection: data.memoDirection || "front"
        },
        progressLogs
      };
      
    } catch (error) {
      console.error("[DB] readAdultProfile failed:", error);
      return { success: false, error: "حدث خطأ أثناء تحميل بيانات الملف الشخصي للكبار." };
    }
  },

  async recoverAdultId(phone, name) {
    try {
      let canonicalPhone = phone.trim();
      if (canonicalPhone.length === 9 && /^[567]/.test(canonicalPhone)) {
        canonicalPhone = '0' + canonicalPhone;
      }
      const q = query(collection(db, "adult_participants"), where("phone", "==", canonicalPhone));
      const qSnap = await getDocs(q);
      const matches = [];
      const seenIds = new Set();
      
      const normalizeArabic = (str) => {
        if (!str) return "";
        return str
          .replace(/[أإآأ]/g, "ا")
          .replace(/ة/g, "ه")
          .replace(/ى/g, "ي")
          .replace(/[\u064B-\u065F]/g, "")
          .trim();
      };
      
      const normalizedInputName = normalizeArabic(name);

      qSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.name && data.id) {
          const normalizedDbName = normalizeArabic(data.name);
          if (normalizedDbName === normalizedInputName) {
            const lowerId = data.id.trim().toLowerCase();
            if (!seenIds.has(lowerId)) {
              seenIds.add(lowerId);
              matches.push({
                name: data.name,
                id: data.id
              });
            }
          }
        }
      });
      return { success: true, matches };
    } catch (error) {
      console.error("[DB] recoverAdultId failed:", error);
      return { success: false, error: "حدث خطأ أثناء البحث عن المعرف." };
    }
  },

  getUserRole() {
    return localStorage.getItem("adminRole") || "";
  },

  hasFullAccess() {
    const role = this.getUserRole();
    const email = localStorage.getItem("adminUser") || "";
    
    // Explicitly check for the restricted accounts and roles
    if (email.includes("admin1@masjid-chouhadaa.dz") || 
        email.includes("admin2@masjid-chouhadaa.dz") || 
        email.includes("admin3@masjid-chouhadaa.dz") ||
        role === "Teacher" || 
        role === "مدرس التعليم القرآني" || 
        role === "Guide" || 
        role === "المرشدة الدينية") {
      return false;
    }
    
    // Default to true for Admin, Imam and الإمام roles
    if (role === "Admin" || role === "Imam" || role === "الإمام") {
      return true;
    }
    
    // If no role is set but email is not a restricted admin, allow access
    if (!role) return true;
    
    return false;
  },

  async writeAuditLog(action, beforeData = null, afterData = null) {
    try {
      const email = localStorage.getItem("adminUser") || "غير معروف";
      const role = localStorage.getItem("adminRole") || "غير معروف";
      
      const logDoc = {
        user: email,
        role: role,
        action: action,
        timestamp: Date.now(),
        dateStr: getCurrentDateStr(),
        before: beforeData ? JSON.stringify(beforeData) : null,
        after: afterData ? JSON.stringify(afterData) : null
      };
      
      const logId = "LOG_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      await setDoc(doc(db, "audit_logs", logId), logDoc);
      console.log("[DB Audit] Log written successfully:", action);
      return true;
    } catch (err) {
      console.error("[DB Audit] writeAuditLog failed:", err);
      return false;
    }
  },

  async getAuditLogs() {
    try {
      const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(15));
      const qSnap = await getDocs(q);
      const logs = [];
      qSnap.forEach(d => {
        logs.push(d.data());
      });
      return logs;
    } catch (error) {
      console.error("[DB] getAuditLogs failed:", error);
      return [];
    }
  }
};

window.DB.db = db;
window.DB.auth = auth;

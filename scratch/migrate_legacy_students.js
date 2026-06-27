/**
 * Safe Legacy Student Migration Script
 * Coordinates: STxxxxx Document Names Migration
 * 
 * Usage: node scratch/migrate_legacy_students.js <admin_email> <admin_password>
 */

const fs = require('fs');
const path = require('path');

const API_KEY = "AIzaSyD39DP8lxZ1S7G9XbqcH5FPkc1mLzB1dI0";
const PROJECT_ID = "masjid-chouhadaa";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper: Convert Firestore REST format to simple JS object
function firestoreToJs(fields) {
  const obj = {};
  if (!fields) return obj;
  for (const [key, value] of Object.entries(fields)) {
    if ('stringValue' in value) obj[key] = value.stringValue;
    else if ('integerValue' in value) obj[key] = Number(value.integerValue);
    else if ('doubleValue' in value) obj[key] = Number(value.doubleValue);
    else if ('booleanValue' in value) obj[key] = value.booleanValue;
    else if ('arrayValue' in value) {
      obj[key] = (value.arrayValue.values || []).map(v => {
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        return v;
      });
    }
  }
  return obj;
}

// Helper: Convert JS object to Firestore REST format
function jsToFirestore(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: String(value) };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            return v;
          })
        }
      };
    }
  }
  return { fields };
}

// Helper: Paginated fetch of all documents
async function fetchAllDocuments(collection, idToken) {
  let documents = [];
  let pageToken = "";
  do {
    const url = `${BASE_URL}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch ${collection}: ${res.statusText} - ${errText}`);
    }
    const data = await res.json();
    if (data.documents) {
      documents = documents.concat(data.documents);
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return documents;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scratch/migrate_legacy_students.js <admin_email> <admin_password>");
    process.exit(1);
  }
  
  const [email, password] = args;
  
  console.log("🔑 Authenticating with Firebase Auth...");
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  if (!authRes.ok) {
    console.error("❌ Authentication failed:", authRes.statusText, await authRes.text());
    process.exit(1);
  }
  
  const authData = await authRes.json();
  const idToken = authData.idToken;
  console.log("✅ Authenticated successfully.\n");
  
  const timestamp = Date.now();
  const backupFile = path.join(__dirname, `migration_backup_${timestamp}.json`);
  const reportFile = path.join(__dirname, `migration_report_${timestamp}.txt`);
  
  // --- Phase 0: Backup Snapshots ---
  console.log("📦 Phase 0: Creating database backup snapshots...");
  const rawStudents = await fetchAllDocuments("students", idToken);
  const rawPoints = await fetchAllDocuments("point", idToken);
  const rawRatings = await fetchAllDocuments("Ratings", idToken);
  const rawPresence = await fetchAllDocuments("Presence", idToken);
  
  const backupData = {
    students: rawStudents.map(d => ({ docId: d.name.split('/').pop(), data: firestoreToJs(d.fields) })),
    point: rawPoints.map(d => ({ docId: d.name.split('/').pop(), data: firestoreToJs(d.fields) })),
    ratings: rawRatings.map(d => ({ docId: d.name.split('/').pop(), data: firestoreToJs(d.fields) })),
    presence: rawPresence.map(d => ({ docId: d.name.split('/').pop(), data: firestoreToJs(d.fields) }))
  };
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✅ Backup successfully saved to ${backupFile}\n`);
  
  // Identify legacy students
  const legacyStudents = [];
  const validStudentIds = [];
  
  for (const s of backupData.students) {
    const docId = s.docId;
    
    // Check if docId is in format STxxxxx
    const isValidFormat = /^ST\d{5}$/.test(docId);
    if (!isValidFormat) {
      // Legacy student
      legacyStudents.push(s);
    } else {
      validStudentIds.push(docId);
    }
  }
  
  console.log(`🔍 Scan complete: Found ${legacyStudents.length} legacy students out of ${backupData.students.length} total students.`);
  
  if (legacyStudents.length === 0) {
    console.log("🎉 No legacy students to migrate. Database is already clean!");
    process.exit(0);
  }
  
  const reportLogs = [];
  const log = (msg) => {
    console.log(msg);
    reportLogs.push(msg);
  };
  
  log(`--- Migration started at ${new Date().toISOString()} ---`);
  log(`Legacy students count: ${legacyStudents.length}`);
  
  // Phase 1 & 2 maps
  const studentIdMap = {}; // oldDocId -> newStructuredId
  
  // --- Phase 1: Copy legacy docs to structured IDs ---
  log("\n📂 Phase 1: Copying legacy student documents to structured IDs...");
  for (const ls of legacyStudents) {
    const oldDocId = ls.docId;
    let newId = ls.data.id || "";
    
    // Validate or generate structured ID
    if (!/^ST\d{5}$/.test(newId)) {
      do {
        newId = "ST" + Math.floor(10000 + Math.random() * 90000);
      } while (validStudentIds.includes(newId) || Object.values(studentIdMap).includes(newId));
      ls.data.id = newId;
    }
    
    studentIdMap[oldDocId] = newId;
    log(`  Migrating student: [${ls.data.name}] ID: ${oldDocId} -> ${newId}`);
    
    // 1. Copy student document to the new path
    const updatedStudentData = {
      ...ls.data,
      id: newId,
      migratedFrom: oldDocId
    };
    
    const writeStudRes = await fetch(`${BASE_URL}/students/${newId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(jsToFirestore(updatedStudentData))
    });
    if (!writeStudRes.ok) {
      throw new Error(`Failed to write new student doc for ${newId}: ${writeStudRes.statusText} - ${await writeStudRes.text()}`);
    }
    
    // 2. Copy point document if exists
    const oldPoint = backupData.point.find(p => p.docId === oldDocId);
    if (oldPoint) {
      const updatedPointData = {
        ...oldPoint.data,
        StudentID: newId
      };
      const writePointRes = await fetch(`${BASE_URL}/point/${newId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(jsToFirestore(updatedPointData))
      });
      if (!writePointRes.ok) {
        throw new Error(`Failed to write point doc for ${newId}: ${writePointRes.statusText} - ${await writePointRes.text()}`);
      }
    }
    
    // 3. Mark old student document as migrated
    const legacyStudentUpdate = {
      ...ls.data,
      migrated: true,
      newId: newId
    };
    const updateLegacyRes = await fetch(`${BASE_URL}/students/${oldDocId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(jsToFirestore(legacyStudentUpdate))
    });
    if (!updateLegacyRes.ok) {
      throw new Error(`Failed to update legacy student doc ${oldDocId}: ${updateLegacyRes.statusText}`);
    }
  }
  
  // --- Phase 2: Reference Updates (Ratings & Presence) ---
  log("\n🔗 Phase 2: Updating references in Ratings and Presence...");
  let ratingsUpdatedCount = 0;
  let presenceUpdatedCount = 0;
  
  // Update Ratings
  for (const r of backupData.ratings) {
    const ratingId = r.docId;
    const studentId = r.data.StudentID;
    
    if (studentIdMap[studentId]) {
      const newStudentId = studentIdMap[studentId];
      
      // Calculate new rating ID containing the new student ID
      let newRatingId = ratingId;
      if (ratingId.includes(studentId)) {
        newRatingId = ratingId.replaceAll(studentId, newStudentId);
      } else {
        newRatingId = `${ratingId}_${newStudentId}`;
      }
      
      log(`  Updating rating reference: ${ratingId} (Student: ${studentId} -> ${newStudentId})`);
      
      const updatedRatingData = {
        ...r.data,
        StudentID: newStudentId,
        EvaluationID: newRatingId
      };
      
      // Write new rating document
      const writeRatingRes = await fetch(`${BASE_URL}/Ratings/${newRatingId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(jsToFirestore(updatedRatingData))
      });
      if (!writeRatingRes.ok) {
        throw new Error(`Failed to write new rating doc ${newRatingId}: ${writeRatingRes.statusText}`);
      }
      
      // Mark old rating doc for deletion
      r.shouldDelete = true;
      ratingsUpdatedCount++;
    }
  }
  
  // Update Presence
  for (const p of backupData.presence) {
    const presenceId = p.docId;
    const studentId = p.data.StudentID;
    
    if (studentIdMap[studentId]) {
      const newStudentId = studentIdMap[studentId];
      
      // Calculate new presence ID containing the new student ID
      let newPresenceId = presenceId;
      if (presenceId.includes(studentId)) {
        newPresenceId = presenceId.replaceAll(studentId, newStudentId);
      } else {
        newPresenceId = `${presenceId}_${newStudentId}`;
      }
      
      log(`  Updating presence reference: ${presenceId} (Student: ${studentId} -> ${newStudentId})`);
      
      const updatedPresenceData = {
        ...p.data,
        StudentID: newStudentId
      };
      
      // Write new presence document
      const writePresenceRes = await fetch(`${BASE_URL}/Presence/${newPresenceId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(jsToFirestore(updatedPresenceData))
      });
      if (!writePresenceRes.ok) {
        throw new Error(`Failed to write new presence doc ${newPresenceId}: ${writePresenceRes.statusText}`);
      }
      
      // Mark old presence doc for deletion
      p.shouldDelete = true;
      presenceUpdatedCount++;
    }
  }
  
  log(`\n✅ Reference updates completed. Ratings updated: ${ratingsUpdatedCount}, Presence updated: ${presenceUpdatedCount}`);
  
  // --- Phase 3 & 4: Validation and Purging ---
  log("\n🚨 Phase 3 & 4: Validating new documents and purging legacy records...");
  
  // Validation: Check if new students exist
  let validationSuccess = true;
  for (const oldDocId of Object.keys(studentIdMap)) {
    const newId = studentIdMap[oldDocId];
    const checkRes = await fetch(`${BASE_URL}/students/${newId}`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!checkRes.ok) {
      log(`❌ Validation Failed: New student document students/${newId} does not exist!`);
      validationSuccess = false;
    }
  }
  
  if (!validationSuccess) {
    log("⚠️ Purge aborted due to validation failure. Legacy documents have not been removed.");
  } else {
    log("✅ Validation Succeeded. Commencing purge of old documents...");
    
    // Delete legacy student docs
    for (const oldDocId of Object.keys(studentIdMap)) {
      log(`  Deleting legacy student document: students/${oldDocId}`);
      await fetch(`${BASE_URL}/students/${oldDocId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      
      // Delete old point doc if it existed
      const hasPoint = backupData.point.some(p => p.docId === oldDocId);
      if (hasPoint) {
        log(`  Deleting legacy point document: point/${oldDocId}`);
        await fetch(`${BASE_URL}/point/${oldDocId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
      }
    }
    
    // Delete old Ratings docs
    for (const r of backupData.ratings) {
      if (r.shouldDelete) {
        log(`  Deleting old rating document: Ratings/${r.docId}`);
        await fetch(`${BASE_URL}/Ratings/${r.docId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
      }
    }
    
    // Delete old Presence docs
    for (const p of backupData.presence) {
      if (p.shouldDelete) {
        log(`  Deleting old presence document: Presence/${p.docId}`);
        await fetch(`${BASE_URL}/Presence/${p.docId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
      }
    }
    
    log("\n🎉 Purge complete. Database is clean!");
  }
  
  log(`\n--- Migration finished at ${new Date().toISOString()} ---`);
  
  fs.writeFileSync(reportFile, reportLogs.join('\n'), 'utf-8');
  console.log(`\n📄 Report successfully written to ${reportFile}`);
}

main().catch(err => {
  console.error("❌ Migration Script Failed with Critical Error:", err);
});

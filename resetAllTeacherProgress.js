// Script to reset teacher progress for a specific level
// Run this with: node resetAllTeacherProgress.js [username] [levelName]
// Examples:
//   node resetAllTeacherProgress.js laudza "Advance 1"  - Reset laudza's Advance 1 progress
//   node resetAllTeacherProgress.js all "Advance 1"    - Reset ALL teachers' Advance 1 progress

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, getDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDMe5gG_wZ7Ql0Vu9vKHxWqJYEYx8pYqhI",
    authDomain: "curriculum-tool-d5e9f.firebaseapp.com",
    projectId: "curriculum-tool-d5e9f",
    storageBucket: "curriculum-tool-d5e9f.firebasestorage.app",
    messagingSenderId: "673633863033",
    appId: "1:673633863033:web:0c0c0e3f8f8f8f8f8f8f8f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetTeacherProgress(targetUsername, targetLevelName) {
    try {
        const resetAll = targetUsername.toLowerCase() === 'all';
        console.log(`🔍 Finding level: ${targetLevelName}...`);
        
        // Find the target level
        const levelsRef = collection(db, 'codingLevels');
        const levelsSnapshot = await getDocs(levelsRef);
        
        let targetLevelId = null;
        let targetLevelFullName = null;
        for (const levelDoc of levelsSnapshot.docs) {
            const levelData = levelDoc.data();
            if (levelData.name && levelData.name.toLowerCase().includes(targetLevelName.toLowerCase())) {
                targetLevelId = levelDoc.id;
                targetLevelFullName = levelData.name;
                console.log(`✓ Found level: ${levelData.name} (${targetLevelId})`);
                break;
            }
        }
        
        if (!targetLevelId) {
            console.log(`❌ Level "${targetLevelName}" not found`);
            return;
        }
        
        console.log('\n🔍 Finding teachers...');
        
        // Get teachers
        const teachersRef = collection(db, 'teachers');
        const teachersSnapshot = await getDocs(teachersRef);
        
        // Filter teachers if specific username provided
        const teachersToReset = resetAll 
            ? teachersSnapshot.docs 
            : teachersSnapshot.docs.filter(d => d.data().username?.toLowerCase() === targetUsername.toLowerCase());
        
        if (teachersToReset.length === 0) {
            console.log(`❌ No teacher found with username: ${targetUsername}`);
            return;
        }
        
        console.log(`✓ Found ${teachersToReset.length} teacher(s) to reset`);
        
        // Collect usernames to clear from acknowledgements
        const usernamesToClear = teachersToReset.map(d => d.data().username?.toLowerCase()).filter(Boolean);
        
        let totalProgressDeleted = 0;
        let totalAcksCleared = 0;
        
        // Step 1: Delete progress documents for each teacher
        for (const teacherDoc of teachersToReset) {
            const teacherId = teacherDoc.id;
            const teacherData = teacherDoc.data();
            const username = teacherData.username || 'Unknown';
            
            console.log(`\n📝 Processing teacher: ${username} (${teacherId})`);
            
            // Delete progress document
            const progressDocRef = doc(db, 'teachers', teacherId, 'progress', targetLevelId);
            
            try {
                await deleteDoc(progressDocRef);
                console.log(`  ✅ Deleted progress document for ${username}`);
                totalProgressDeleted++;
            } catch (error) {
                if (error.code === 'not-found') {
                    console.log(`  ℹ️  No progress document found`);
                } else {
                    console.log(`  ⚠️  Error deleting progress: ${error.message}`);
                }
            }
        }
        
        // Step 2: Clear acknowledgements from curriculum challenges
        console.log(`\n🔍 Clearing acknowledgements from curriculum...`);
        
        const unitsRef = collection(db, 'codingLevels', targetLevelId, 'units_new');
        const unitsSnapshot = await getDocs(unitsRef);
        
        for (const unitDoc of unitsSnapshot.docs) {
            const challengesRef = collection(unitDoc.ref, 'challenges');
            const challengesSnapshot = await getDocs(challengesRef);
            
            for (const challengeDoc of challengesSnapshot.docs) {
                const challengeData = challengeDoc.data();
                const acknowledgements = challengeData.acknowledgements || {};
                const submissionComments = challengeData.submissionComments || {};
                
                let needsUpdate = false;
                const newAcks = { ...acknowledgements };
                const newComments = { ...submissionComments };
                
                // Remove acknowledgements for target users
                for (const key of Object.keys(acknowledgements)) {
                    // Key could be "username" or "username--stepId"
                    const keyUsername = key.includes('--') ? key.split('--')[0] : key;
                    if (usernamesToClear.includes(keyUsername.toLowerCase())) {
                        delete newAcks[key];
                        needsUpdate = true;
                        totalAcksCleared++;
                    }
                }
                
                // Remove submission comments for target users
                for (const key of Object.keys(submissionComments)) {
                    const keyUsername = key.includes('--') ? key.split('--')[0] : key;
                    if (usernamesToClear.includes(keyUsername.toLowerCase())) {
                        delete newComments[key];
                    }
                }
                
                if (needsUpdate) {
                    await updateDoc(challengeDoc.ref, {
                        acknowledgements: newAcks,
                        submissionComments: newComments
                    });
                    console.log(`  ✅ Cleared acks from: ${challengeData.challengeName || challengeDoc.id}`);
                }
            }
        }
        
        // Step 3: Delete user submissions (snippets) for this level
        console.log(`\n🔍 Clearing user submissions...`);
        
        for (const username of usernamesToClear) {
            const submissionsRef = collection(db, 'users', username, 'submissions');
            const submissionsSnapshot = await getDocs(submissionsRef);
            
            let deletedCount = 0;
            for (const subDoc of submissionsSnapshot.docs) {
                const subData = subDoc.data();
                if (subData.levelName && subData.levelName.toLowerCase().includes(targetLevelName.toLowerCase())) {
                    await deleteDoc(subDoc.ref);
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                console.log(`  ✅ Deleted ${deletedCount} submissions for ${username}`);
            }
        }
        
        console.log(`\n✅ COMPLETE!`);
        console.log(`   - Progress documents deleted: ${totalProgressDeleted}`);
        console.log(`   - Acknowledgements cleared: ${totalAcksCleared}`);
        console.log(`🎉 ${resetAll ? 'All teachers' : targetUsername} can now start ${targetLevelFullName} fresh!`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'all';
const levelName = args[1] || 'Advance 1';

console.log('═══════════════════════════════════════════════════════════');
console.log('  TEACHER PROGRESS RESET SCRIPT');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Target: ${username === 'all' ? 'ALL TEACHERS' : username}`);
console.log(`  Level: ${levelName}`);
console.log('═══════════════════════════════════════════════════════════\n');

resetTeacherProgress(username, levelName);

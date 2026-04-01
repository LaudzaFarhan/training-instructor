// Script to reset progress for laudza account on Advance 1
// Run this with: node resetProgress.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, deleteDoc } = require('firebase/firestore');

// Firebase config (from your app)
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

async function resetProgress() {
    try {
        console.log('Finding laudza account...');
        
        // Find the teacher with username "Laudza"
        const teachersRef = collection(db, 'teachers');
        const q = query(teachersRef, where('username', '==', 'Laudza'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('❌ Teacher "Laudza" not found');
            return;
        }
        
        const teacherDoc = querySnapshot.docs[0];
        const teacherId = teacherDoc.id;
        console.log(`✓ Found teacher: ${teacherId}`);
        
        // Find Advance 1 level
        const levelsRef = collection(db, 'codingLevels');
        const levelsSnapshot = await getDocs(levelsRef);
        
        let advance1Id = null;
        for (const levelDoc of levelsSnapshot.docs) {
            const levelData = levelDoc.data();
            if (levelData.name && levelData.name.toLowerCase().includes('advance 1')) {
                advance1Id = levelDoc.id;
                console.log(`✓ Found Advance 1: ${advance1Id}`);
                break;
            }
        }
        
        if (!advance1Id) {
            console.log('❌ Advance 1 level not found');
            return;
        }
        
        // Delete progress document
        const progressDocRef = doc(db, 'teachers', teacherId, 'progress', advance1Id);
        await deleteDoc(progressDocRef);
        
        console.log('✅ Successfully reset progress for laudza on Advance 1');
        console.log('The instructor can now start fresh!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

resetProgress();

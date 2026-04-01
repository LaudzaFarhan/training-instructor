// Script to update existing snippets with question content from curriculum
// Run this with: node updateSnippetsWithQuestions.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function updateSnippetsWithQuestions() {
    try {
        console.log('🔍 Loading curriculum data...');
        
        // Load all levels and their questions
        const levelsRef = collection(db, 'codingLevels');
        const levelsSnapshot = await getDocs(levelsRef);
        
        const questionsMap = new Map(); // Map of question title to question data
        
        for (const levelDoc of levelsSnapshot.docs) {
            const levelData = levelDoc.data();
            const levelName = levelData.name;
            
            console.log(`  📚 Loading questions from ${levelName}...`);
            
            // Load units
            const unitsRef = collection(db, 'codingLevels', levelDoc.id, 'units_new');
            const unitsSnap = await getDocs(unitsRef);
            
            for (const unitDoc of unitsSnap.docs) {
                const unitData = unitDoc.data();
                
                // Load challenges
                const challengesRef = collection(unitDoc.ref, 'challenges');
                const challengesSnap = await getDocs(challengesRef);
                
                for (const challengeDoc of challengesSnap.docs) {
                    const challengeData = challengeDoc.data();
                    
                    // Load steps
                    const stepsRef = collection(challengeDoc.ref, 'steps');
                    const stepsSnap = await getDocs(stepsRef);
                    
                    const hardSteps = stepsSnap.docs
                        .map(stepDoc => ({ id: stepDoc.id, ...stepDoc.data() }))
                        .filter(step => step.difficulty === 'hard')
                        .sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
                    
                    hardSteps.forEach((step, stepIdx) => {
                        const title = `${challengeData.challengeName} - Step ${stepIdx + 1}`;
                        const questionData = {
                            title: title,
                            description: step.content || challengeData.description || `Complete: ${title}`,
                            expectedOutput: step.expectedOutput || challengeData.expectedOutput || '',
                            unitName: unitData.unitName,
                            levelName: levelName
                        };
                        
                        questionsMap.set(title, questionData);
                    });
                }
            }
        }
        
        console.log(`✓ Loaded ${questionsMap.size} questions from curriculum\n`);
        
        // Now update all user submissions
        console.log('🔍 Finding all users with submissions...');
        
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        let totalUpdated = 0;
        let totalSkipped = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const username = userDoc.id;
            console.log(`\n👤 Processing user: ${username}`);
            
            const submissionsRef = collection(db, 'users', username, 'submissions');
            const submissionsSnapshot = await getDocs(submissionsRef);
            
            if (submissionsSnapshot.empty) {
                console.log(`  ℹ️  No submissions found`);
                continue;
            }
            
            console.log(`  📝 Found ${submissionsSnapshot.docs.length} submissions`);
            
            for (const submissionDoc of submissionsSnapshot.docs) {
                const submissionData = submissionDoc.data();
                const title = submissionData.title;
                
                // Check if we have question data for this title
                if (questionsMap.has(title)) {
                    const questionData = questionsMap.get(title);
                    
                    // Update the submission with question content
                    await updateDoc(doc(db, 'users', username, 'submissions', submissionDoc.id), {
                        description: questionData.description,
                        expectedOutput: questionData.expectedOutput
                    });
                    
                    console.log(`    ✅ Updated: ${title}`);
                    totalUpdated++;
                } else {
                    console.log(`    ⚠️  No question found for: ${title}`);
                    totalSkipped++;
                }
            }
        }
        
        console.log(`\n✅ COMPLETE!`);
        console.log(`📊 Updated: ${totalUpdated} submissions`);
        console.log(`⚠️  Skipped: ${totalSkipped} submissions (no matching question)`);
        console.log(`🎉 All snippets now have question content!`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateSnippetsWithQuestions();

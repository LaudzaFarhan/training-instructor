import { useEffect } from 'react';
import { pb } from '../../context/AppStateContext';

export const ReviewPreview = () => {
    useEffect(() => {
        // Get review data from sessionStorage
        const data = sessionStorage.getItem('reviewPreview');
        if (!data) {
            alert('No review data found');
            window.close();
            return;
        }

        const review = JSON.parse(data);
        
        const loadAndRedirect = async () => {
            // If blocklyXml is missing, try to fetch from submissions collection
            let blocklyXml = review.blocklyXml || '';
            if (!blocklyXml && review.type === 'blockly' && review.username) {
                try {
                    const subs = await pb.collection('submissions').getFullList({
                        filter: `username="${review.username.toLowerCase()}"`,
                        requestKey: null
                    });
                    // Find the matching submission by challenge name or ID
                    const match = subs.find(s => 
                        s.customId?.includes(review.challengeId) || 
                        s.title === review.questionTitle
                    );
                    if (match?.blocklyXml) {
                        blocklyXml = match.blocklyXml;
                        console.log('Fetched blocklyXml from submissions:', blocklyXml.length, 'chars');
                    }
                } catch (e) {
                    console.warn('Could not fetch blocklyXml from submissions:', e);
                }
            }

            // Store the review data for the target component to use
            sessionStorage.setItem('previewMode', 'true');
            sessionStorage.setItem('previewSnippet', JSON.stringify({
                id: `${review.levelId}_${review.challengeId}`,
                challengeId: review.challengeId,
                ackKey: review.ackKey,
                code: review.code,
                blocklyXml: blocklyXml,
                type: review.type || 'python',
                title: review.questionTitle || review.challengeName,
                challengeName: review.challengeName,
                description: review.questionInstructions,
                expectedOutput: review.expectedOutput,
                levelName: review.levelName,
                unitName: review.unitName,
                username: review.username
            }));

            // Redirect to the actual editor with the level and challenge title
            const challengeTitle = encodeURIComponent(review.questionTitle || review.challengeName || '');
            window.location.href = `/?portalLevelId=${review.levelId}&previewMode=true&challengeTitle=${challengeTitle}`;
        };

        loadAndRedirect();
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                <div className="text-slate-500">Loading editor...</div>
            </div>
        </div>
    );
};

export default ReviewPreview;

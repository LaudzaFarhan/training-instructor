import React, { useEffect, useState } from 'react';
import { pb } from '../../context/AppStateContext';
import { Loader2 } from 'lucide-react';

export const SnippetPreview = () => {
    const [status, setStatus] = useState('Loading editor...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPreview = async () => {
            // Get snippet data from sessionStorage
            const data = sessionStorage.getItem('snippetPreview');
            if (!data) {
                setError('No snippet data found');
                return;
            }

            const snippet = JSON.parse(data);

            try {
                // Look up the level by name from PocketBase
                setStatus(`Finding level "${snippet.levelName}"...`);
                const levels = await pb.collection('codingLevels').getFullList({
                    filter: `name="${snippet.levelName}"`,
                    $autoCancel: false
                });

                if (levels.length === 0) {
                    setError(`Level "${snippet.levelName}" not found in the database.`);
                    return;
                }

                const levelId = levels[0].id;

                // Store for the target component to use
                sessionStorage.setItem('previewMode', 'true');
                sessionStorage.setItem('previewSnippet', data);

                // Redirect to the appropriate editor with the correct level ID and challenge title
                const challengeTitle = encodeURIComponent(snippet.title || '');
                window.location.href = `/?portalLevelId=${levelId}&previewMode=true&challengeTitle=${challengeTitle}`;
            } catch (err) {
                console.error('Error loading preview:', err);
                setError(`Failed to load: ${err?.message || err}`);
            }
        };

        loadPreview();
    }, []);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-rose-500 font-medium">{error}</p>
                    <button
                        onClick={() => window.close()}
                        className="text-slate-500 hover:underline"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="animate-spin h-12 w-12 text-violet-600 mx-auto mb-4" />
                <div className="text-slate-500">{status}</div>
            </div>
        </div>
    );
};

export default SnippetPreview;

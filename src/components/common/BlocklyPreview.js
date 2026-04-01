import React from 'react';
import { ExternalLink } from 'lucide-react';

export const BlocklyPreview = ({ blocklyXml, code, review, height = 300 }) => {
    const handleOpenInEditor = () => {
        if (!review) return;
        
        // Store review data for the preview
        sessionStorage.setItem('reviewPreview', JSON.stringify({
            ...review,
            submittedAt: review.submittedAt?.seconds 
                ? new Date(review.submittedAt.seconds * 1000).toISOString()
                : null
        }));
        
        // Open in new tab
        window.open(`/review-preview?type=blockly`, '_blank');
    };

    if (!blocklyXml && !code) {
        return (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-slate-500 text-sm text-center" style={{ height }}>
                No Blockly blocks available
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Info message */}
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
                <p className="text-sm text-violet-700 dark:text-violet-300 mb-3">
                    Blockly submissions contain graphical code blocks. Click the button below to open the full Blockly editor and view/run the instructor's blocks.
                </p>
                <button
                    onClick={handleOpenInEditor}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <ExternalLink size={16} />
                    Open in Blockly Editor
                </button>
            </div>
            
            {/* Show generated code */}
            <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Generated Code:
                </p>
                <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-3 border border-slate-700 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
{code || "# No code generated"}</pre>
                </div>
            </div>
        </div>
    );
};

export default BlocklyPreview;

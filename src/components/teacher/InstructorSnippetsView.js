import React, { useState, useEffect, useMemo } from "react";
import { pb, useAppState } from "../../context/AppStateContext";
import { Code, Calendar, CheckCircle, Filter, ChevronDown, ChevronUp, Trash2, Check, AlertTriangle, ExternalLink } from "lucide-react";

export const InstructorSnippetsView = ({ username: propUsername }) => {
    const { currentUser } = useAppState();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState("all");
    const [expandedSnippets, setExpandedSnippets] = useState({});

    // Use prop username if provided (for admin viewing), otherwise use currentUser
    const targetUsername = propUsername || currentUser?.username;
    const isAdminView = !!propUsername && currentUser?.role === 'admin';

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!targetUsername) return;
            try {
                const data = await pb.collection("submissions").getFullList({
                    filter: `username="${targetUsername.toLowerCase()}"`,
                    sort: '-timestamp'
                });
                setSubmissions(data);
            } catch (error) {
                console.error("Error fetching submissions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [targetUsername]);

    const handleDeleteSnippet = async (snippetId) => {
        if (!window.confirm("Delete this code snippet? This cannot be undone.")) return;
        
        try {
            await pb.collection("submissions").delete(snippetId);
            setSubmissions(prev => prev.filter(s => s.id !== snippetId));
            alert("Snippet deleted successfully");
        } catch (error) {
            console.error("Error deleting snippet:", error);
            alert("Failed to delete snippet");
        }
    };

    const handleRemoveAllSnippets = async () => {
        const count = filteredSubmissions.length;
        
        if (count === 0) {
            alert("No snippets to delete.");
            return;
        }

        const levelInfo = selectedLevel === "all" ? "all levels" : selectedLevel;
        
        if (!window.confirm(`⚠️ WARNING: You are about to delete ${count} snippet(s) for ${targetUsername} (${levelInfo}).\n\nThis action CANNOT be undone!\n\nAre you sure you want to proceed?`)) return;
        
        // Double confirmation for safety
        if (!window.confirm(`FINAL CONFIRMATION: Delete ${count} snippet(s)? Click OK to permanently delete.`)) return;

        try {
            setLoading(true);
            
            for (const snippet of filteredSubmissions) {
                await pb.collection("submissions").delete(snippet.id);
            }

            // Update local state
            if (selectedLevel === "all") {
                setSubmissions([]);
            } else {
                setSubmissions(prev => prev.filter(s => s.levelName !== selectedLevel));
            }

            alert(`Successfully deleted ${count} snippet(s).`);
        } catch (error) {
            console.error("Error deleting snippets:", error);
            alert("Failed to delete some snippets. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsDone = async (submission) => {
        if (!window.confirm(`Mark "${submission.title}" as completed for ${targetUsername}?`)) return;
        
        try {
            // Find the teacher document
            const teachersSnap = await pb.collection("teachers").getFullList({
                filter: `username="${targetUsername.toLowerCase()}"`
            });
            let teacherId = teachersSnap.length > 0 ? teachersSnap[0].id : null;
            
            if (!teacherId) {
                alert("Teacher not found");
                return;
            }

            // Find the level ID
            const levelsSnap = await pb.collection("codingLevels").getFullList({
                filter: `name="${submission.levelName}"`
            });
            let levelId = levelsSnap.length > 0 ? levelsSnap[0].id : null;
            
            if (!levelId) {
                alert("Level not found");
                return;
            }

            // Get current progress
            let currentProgress = { completedQuestions: [] };
            let progressId = null;
            try {
                const progressSnap = await pb.collection("teacher_progress").getFullList({
                    filter: `teacherId="${teacherId}" && levelId="${levelId}"`
                });
                if (progressSnap.length > 0) {
                    currentProgress = progressSnap[0];
                    progressId = currentProgress.id;
                }
            } catch (e) {}
            
            // Add this question to completed if not already there
            const questionId = submission.title; // Using title as ID
            if (!currentProgress.completedQuestions?.includes(questionId)) {
                const newCompleted = [...(currentProgress.completedQuestions || []), questionId];
                
                if (progressId) {
                    await pb.collection("teacher_progress").update(progressId, {
                        completedQuestions: newCompleted,
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    await pb.collection("teacher_progress").create({
                        teacherId,
                        levelId,
                        completedQuestions: newCompleted,
                        percentage: 100,
                        lastUpdated: new Date().toISOString()
                    });
                }
                
                alert(`Marked as completed! Progress updated for ${targetUsername}`);
            } else {
                alert("This question is already marked as completed");
            }
        } catch (error) {
            console.error("Error marking as done:", error);
            alert("Failed to mark as done");
        }
    };

    const uniqueLevels = useMemo(() => {
        const levels = new Set(submissions.map(s => s.levelName));
        return Array.from(levels).sort();
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        if (selectedLevel === "all") return submissions;
        return submissions.filter(s => s.levelName === selectedLevel);
    }, [submissions, selectedLevel]);

    const toggleExpand = (id) => {
        setExpandedSnippets(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleOpenInIDE = (submission) => {
        // Store snippet data in sessionStorage for the preview page
        const snippetData = {
            id: submission.id,
            title: submission.title,
            code: submission.code,
            type: submission.type || 'python',
            blocklyXml: submission.blocklyXml || '',
            levelName: submission.levelName,
            unitName: submission.unitName,
            description: submission.description,
            expectedOutput: submission.expectedOutput,
            actualOutput: submission.actualOutput,
        };
        sessionStorage.setItem('snippetPreview', JSON.stringify(snippetData));
        window.open('/snippet-preview', '_blank');
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading snippets...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Code className="text-violet-600" size={24} />
                        My Code Snippets
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Review your solutions and past challenges.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={16} className="text-slate-500" />
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full sm:w-64 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                        <option value="all">All Levels</option>
                        {uniqueLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    {isAdminView && (
                        <button
                            onClick={handleRemoveAllSnippets}
                            disabled={filteredSubmissions.length === 0}
                            className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                            title={`Remove all snippets ${selectedLevel === "all" ? "" : `for ${selectedLevel}`}`}
                        >
                            <Trash2 size={16} />
                            <span>Remove All</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Snippets List */}
            <div className="space-y-4">
                {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Code className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No snippets found</h3>
                        <p className="text-slate-500">
                            {selectedLevel === "all"
                                ? "Complete challenges to save your code snippets here."
                                : `No snippets found for ${selectedLevel}.`}
                        </p>
                    </div>
                ) : (
                    filteredSubmissions.map((sub) => (
                        <div key={sub.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all">
                            <div className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-bold rounded uppercase tracking-wider">
                                                {sub.levelName}
                                            </span>
                                            <span className="text-slate-400 text-xs">•</span>
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {sub.unitName}
                                            </span>
                                            {sub.type === 'blockly' && (
                                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded">
                                                    Blockly
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                            {sub.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar size={14} />
                                            <span>{sub.timestamp ? new Date(sub.timestamp).toLocaleDateString() : 'Recently'}</span>
                                        </div>
                                        <button
                                            onClick={() => handleOpenInIDE(sub)}
                                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                            title="Open in IDE (new tab)"
                                        >
                                            Show
                                            <ExternalLink size={14} />
                                        </button>
                                        <button 
                                            onClick={() => toggleExpand(sub.id)}
                                            className="text-slate-400 hover:text-violet-600 transition-colors">
                                            {expandedSnippets[sub.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content - Side by Side Layout */}
                            {expandedSnippets[sub.id] && (
                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Question Section */}
                                        <div className="space-y-2 select-none">
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                                Question
                                            </div>
                                            {sub.description ? (
                                                <div className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300 select-none pointer-events-none">
                                                    <div dangerouslySetInnerHTML={{ __html: sub.description }} />
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 dark:text-slate-400 italic select-none">No question description available</p>
                                            )}
                                            {sub.expectedOutput && (
                                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Expected Output:</div>
                                                    <pre className="text-sm text-blue-900 dark:text-blue-100 font-mono whitespace-pre-wrap">{sub.expectedOutput}</pre>
                                                </div>
                                            )}
                                        </div>

                                        {/* Answer Section */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {isAdminView ? "Instructor's Answer" : "Your Answer"}
                                                </span>
                                                <div className="flex gap-2">
                                                    {isAdminView && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsDone(sub);
                                                                }}
                                                                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                                                            >
                                                                <Check size={14} /> Mark as Done
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSnippet(sub.id);
                                                                }}
                                                                className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(sub.code);
                                                        }}
                                                        className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                                                    >
                                                        Copy Code
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Show Blockly type indicator */}
                                            {sub.type === 'blockly' && (
                                                <div className="mb-2 text-xs text-violet-500 dark:text-violet-400 flex items-center gap-1">
                                                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 rounded">Blockly</span>
                                                    {sub.blocklyXml && <span className="text-slate-400">• Graphical blocks saved</span>}
                                                </div>
                                            )}
                                            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-700">
                                                <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
                                                    <code>{sub.code || '// No code generated'}</code>
                                                </pre>
                                            </div>
                                            {sub.actualOutput && (
                                                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                    <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Your Output:</div>
                                                    <pre className="text-sm text-green-900 dark:text-green-100 font-mono whitespace-pre-wrap">{sub.actualOutput}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

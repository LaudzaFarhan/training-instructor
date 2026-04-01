import React, { useState, useEffect } from "react";
import { pb } from "../../context/AppStateContext";
import { Code, Trash2, ChevronDown, ChevronUp, User, Calendar, ExternalLink } from "lucide-react";
import { Button } from "../common/Button";

export const AdminSnippetsView = ({ selectedInstructor: initialInstructor = "all" }) => {
    const [allSnippets, setAllSnippets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInstructor, setSelectedInstructor] = useState(initialInstructor);
    const [expandedSnippets, setExpandedSnippets] = useState({});

    useEffect(() => {
        fetchAllSnippets();
    }, []);

    const fetchAllSnippets = async () => {
        try {
            setLoading(true);
            const submissions = await pb.collection("submissions").getFullList({
                sort: "-timestamp"
            });
            setAllSnippets(submissions);
        } catch (error) {
            console.error("Error fetching snippets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSnippet = async (username, snippetId) => {
        if (!window.confirm("Delete this code snippet? This cannot be undone.")) return;
        
        try {
            await pb.collection("submissions").delete(snippetId);
            setAllSnippets(prev => prev.filter(s => s.id !== snippetId));
            alert("Snippet deleted successfully");
        } catch (error) {
            console.error("Error deleting snippet:", error);
            alert("Failed to delete snippet");
        }
    };

    const toggleExpand = (id) => {
        setExpandedSnippets(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleOpenInIDE = (snippet) => {
        const snippetData = {
            id: snippet.id,
            title: snippet.title,
            code: snippet.code,
            type: snippet.type || 'python',
            blocklyXml: snippet.blocklyXml || '',
            levelName: snippet.levelName,
            unitName: snippet.unitName,
            description: snippet.description,
            expectedOutput: snippet.expectedOutput,
            actualOutput: snippet.actualOutput,
        };
        sessionStorage.setItem('snippetPreview', JSON.stringify(snippetData));
        window.open('/snippet-preview', '_blank');
    };

    const uniqueInstructors = [...new Set(allSnippets.map(s => s.username))].sort();
    
    const filteredSnippets = selectedInstructor === "all" 
        ? allSnippets 
        : allSnippets.filter(s => s.username === selectedInstructor);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Code className="text-violet-600" size={24} />
                        All Instructor Snippets
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        View and manage code submissions from all instructors
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <User size={16} className="text-slate-500" />
                    <select
                        value={selectedInstructor}
                        onChange={(e) => setSelectedInstructor(e.target.value)}
                        className="w-full sm:w-64 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    >
                        <option value="all">All Instructors ({allSnippets.length})</option>
                        {uniqueInstructors.map(instructor => {
                            const count = allSnippets.filter(s => s.username === instructor).length;
                            return (
                                <option key={instructor} value={instructor}>
                                    {instructor} ({count})
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Snippets List */}
            <div className="space-y-4">
                {filteredSnippets.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Code className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No snippets found</h3>
                        <p className="text-slate-500">
                            {selectedInstructor === "all"
                                ? "No code submissions yet."
                                : `No snippets found for ${selectedInstructor}.`}
                        </p>
                    </div>
                ) : (
                    filteredSnippets.map((snippet) => (
                        <div key={`${snippet.username}_${snippet.id}`} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all">
                            <div
                                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                onClick={() => toggleExpand(snippet.id)}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-bold rounded uppercase tracking-wider">
                                                {snippet.username}
                                            </span>
                                            <span className="text-slate-400 text-xs">•</span>
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded uppercase tracking-wider">
                                                {snippet.levelName}
                                            </span>
                                            <span className="text-slate-400 text-xs">•</span>
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {snippet.unitName}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                            {snippet.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar size={14} />
                                            <span>{new Date(snippet.timestamp || snippet.created).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenInIDE(snippet);
                                            }}
                                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                            title="Open in IDE (new tab)"
                                        >
                                            Show
                                            <ExternalLink size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSnippet(snippet.username, snippet.id);
                                            }}
                                            className="text-red-400 hover:text-red-600 transition-colors p-2"
                                            title="Delete snippet"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button className="text-slate-400 hover:text-violet-600 transition-colors">
                                            {expandedSnippets[snippet.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedSnippets[snippet.id] && (
                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Question Section */}
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                                Question
                                            </div>
                                            {snippet.description ? (
                                                <div className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300">
                                                    <div dangerouslySetInnerHTML={{ __html: snippet.description }} />
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 dark:text-slate-400 italic">No question description available</p>
                                            )}
                                            {snippet.expectedOutput && (
                                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Expected Output:</div>
                                                    <pre className="text-sm text-blue-900 dark:text-blue-100 font-mono whitespace-pre-wrap">{snippet.expectedOutput}</pre>
                                                </div>
                                            )}
                                        </div>

                                        {/* Answer Section */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Instructor's Answer
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(snippet.code);
                                                    }}
                                                    className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                                                >
                                                    Copy Code
                                                </button>
                                            </div>
                                            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-700">
                                                <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
                                                    <code>{snippet.code}</code>
                                                </pre>
                                            </div>
                                            {snippet.actualOutput && (
                                                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                    <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Actual Output:</div>
                                                    <pre className="text-sm text-green-900 dark:text-green-100 font-mono whitespace-pre-wrap">{snippet.actualOutput}</pre>
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

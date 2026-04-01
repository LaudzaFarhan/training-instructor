import React, { useState, useEffect } from "react";
import { pb, useAppState } from "../../context/AppStateContext";
import { AlertCircle, Code, Calendar, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";

export const RevisionChallengesView = () => {
    const { currentUser } = useAppState();
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRevisions, setExpandedRevisions] = useState({});

    useEffect(() => {
        fetchRevisions();
    }, [currentUser]);

    const fetchRevisions = async () => {
        if (!currentUser?.username) return;

        try {
            setLoading(true);
            const revisionsNeeded = [];

            // Load all levels
            const levelsSnap = await pb.collection("codingLevels").getFullList();

            for (const levelDoc of levelsSnap) {
                const levelData = levelDoc;

                // Load units
                const unitsSnap = await pb.collection("units_new").getFullList({
                    filter: `levelId="${levelDoc.id}"`
                });

                for (const unitDoc of unitsSnap) {
                    const unitData = unitDoc;

                    // Load challenges
                    const challengesSnap = await pb.collection("challenges").getFullList({
                        filter: `unitId="${unitDoc.id}"`
                    });

                    for (const challengeDoc of challengesSnap) {
                        const challengeData = challengeDoc;
                        const acknowledgements = challengeData.acknowledgements || {};
                        const submissionComments = challengeData.submissionComments || {};

                        // Check if this user has a "needs_revision" status
                        Object.entries(acknowledgements).forEach(([key, ack]) => {
                            const isUser = ack.username === currentUser.username.toLowerCase() ||
                                key === currentUser.username.toLowerCase() ||
                                key.startsWith(`${currentUser.username.toLowerCase()}--`);

                            if (isUser && ack.status === "needs_revision") {
                                revisionsNeeded.push({
                                    id: `${levelDoc.id}_${unitDoc.id}_${challengeDoc.id}_${key}`,
                                    levelId: levelDoc.id,
                                    levelName: levelData.name,
                                    unitId: unitDoc.id,
                                    unitName: unitData.unitName,
                                    challengeId: challengeDoc.id,
                                    challengeName: challengeData.challengeName,
                                    code: ack.code,
                                    output: ack.output,
                                    questionTitle: ack.questionTitle,
                                    questionInstructions: ack.questionInstructions,
                                    expectedOutput: ack.expectedOutput,
                                    reviewedAt: ack.reviewedAt,
                                    adminComment: submissionComments[key] || submissionComments[currentUser.username.toLowerCase()] || "Please revise your submission.",
                                });
                            }
                        });
                    }
                }
            }

            setRevisions(revisionsNeeded);
        } catch (error) {
            console.error("Error fetching revisions:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpanded = (id) => {
        setExpandedRevisions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Recently";
        try {
            return new Date(timestamp).toLocaleDateString();
        } catch (e) {
            return "Recently";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-slate-400">Loading revisions...</div>
            </div>
        );
    }

    if (revisions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <CheckCircle size={48} className="mb-4 opacity-30" />
                <p className="text-lg">No revisions needed!</p>
                <p className="text-sm">All your submissions have been approved.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Revision Challenges</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Review admin feedback and resubmit your work
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">{revisions.length} Pending</span>
                </div>
            </div>

            <div className="space-y-4">
                {revisions.map((revision) => {
                    const isExpanded = expandedRevisions[revision.id];

                    return (
                        <Card key={revision.id} className="border-l-4 border-l-amber-500">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">
                                                {revision.levelName}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {revision.unitName}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                            {revision.questionTitle || revision.challengeName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <Calendar size={14} />
                                            <span>Reviewed: {formatDate(revision.reviewedAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleExpanded(revision.id)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        {isExpanded ? (
                                            <ChevronUp size={20} className="text-slate-600 dark:text-slate-400" />
                                        ) : (
                                            <ChevronDown size={20} className="text-slate-600 dark:text-slate-400" />
                                        )}
                                    </button>
                                </div>

                                {/* Admin Comment */}
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">
                                                Admin Feedback
                                            </p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {revision.adminComment}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        {/* Question */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Question
                                            </h4>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                                                {revision.questionInstructions ? (
                                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                                        <div dangerouslySetInnerHTML={{ __html: revision.questionInstructions }} />
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                                        No instructions provided
                                                    </p>
                                                )}
                                                {revision.expectedOutput && (
                                                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                            Expected Output:
                                                        </p>
                                                        <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs text-slate-800 dark:text-slate-200 font-mono">
                                                            {revision.expectedOutput}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Your Previous Code */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Your Previous Code
                                            </h4>
                                            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-700">
                                                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                                                    {revision.code || "# No code"}</pre>
                                            </div>
                                            {revision.output && (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        Your Output:
                                                    </p>
                                                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                                                        <pre className="text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap">
                                                            {revision.output}</pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            // Open the IDE at the specific challenge so the instructor can resubmit
                                            const challengeTitle = encodeURIComponent(revision.questionTitle || revision.challengeName || '');
                                            window.open(`/?portalLevelId=${revision.levelId}&challengeTitle=${challengeTitle}`, '_blank');
                                        }}>
                                        Go to Challenge & Resubmit
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

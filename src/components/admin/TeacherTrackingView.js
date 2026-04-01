import React, { useState, useMemo } from "react";
import { Loader2, ListChecks, Activity, Users, Trophy, TrendingUp, BookOpen, RotateCcw } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { pb } from "../../context/AppStateContext";

export const TeacherTrackingView = ({
    allLevels,
    teachers,
    onAssignTask,
    onViewLog,
    isLoading,
}) => {
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [resetting, setResetting] = useState(false);

    const handleResetProgress = async (teacher) => {
        if (!window.confirm(`Are you sure you want to reset ALL progress for ${teacher.username}? This will:\n\n• Clear all completed questions\n• Remove all acknowledgements\n• Delete all submissions\n\nThis action cannot be undone!`)) {
            return;
        }

        setResetting(true);
        try {
            const usernameLower = teacher.username.toLowerCase();

            // 1. Reset progress (both regular progress and blocklyProgress)
            const progressList = await pb.collection("progress").getFullList({
                filter: `username="${usernameLower}"`
            });
            for (const p of progressList) {
                await pb.collection("progress").delete(p.id);
            }

            const blocklyProgressList = await pb.collection("blocklyProgress").getFullList({
                filter: `username="${usernameLower}"`
            });
            for (const bp of blocklyProgressList) {
                await pb.collection("blocklyProgress").delete(bp.id);
            }

            // 2. Remove acknowledgements from all challenges (including step-level acks)
            const allChallenges = await pb.collection("challenges").getFullList();
            for (const challenge of allChallenges) {
                const acknowledgements = challenge.acknowledgements || {};
                const submissionComments = challenge.submissionComments || {};
                        
                // Find all keys that belong to this user (could be "username" or "username--stepId")
                const userAckKeys = Object.keys(acknowledgements).filter(key => {
                    const keyUsername = key.includes('--') ? key.split('--')[0] : key;
                    return keyUsername.toLowerCase() === usernameLower;
                });
                        
                const userCommentKeys = Object.keys(submissionComments).filter(key => {
                    const keyUsername = key.includes('--') ? key.split('--')[0] : key;
                    return keyUsername.toLowerCase() === usernameLower;
                });
                        
                if (userAckKeys.length > 0 || userCommentKeys.length > 0) {
                    const newAcks = { ...acknowledgements };
                    const newComments = { ...submissionComments };
                            
                    // Remove all user's acknowledgements
                    userAckKeys.forEach(key => delete newAcks[key]);
                    // Remove all user's comments
                    userCommentKeys.forEach(key => delete newComments[key]);
                            
                    await pb.collection("challenges").update(challenge.id, { 
                        acknowledgements: newAcks,
                        submissionComments: newComments
                    });
                }
            }

            // 3. Delete submissions
            const submissionsList = await pb.collection("submissions").getFullList({
                filter: `username="${usernameLower}"`
            });
            for (const sub of submissionsList) {
                await pb.collection("submissions").delete(sub.id);
            }

            alert(`Progress reset successfully for ${teacher.username}!`);
            window.location.reload(); // Refresh to show updated data
        } catch (error) {
            console.error("Error resetting progress:", error);
            alert("Failed to reset progress. Please try again.");
        } finally {
            setResetting(false);
        }
    };

    const teacherProfile = useMemo(() => {
        if (!selectedTeacher || !allLevels) return [];
        return allLevels.map((level) => {
            // Count total steps across all challenges
            let totalQuestions = 0;
            let approvedQuestions = 0;
            let lastApproved = null;
            const username = selectedTeacher.username.toLowerCase();
            
            level.newData?.forEach((unit) => {
                unit.challenges?.forEach((challenge) => {
                    // Only count hard-difficulty steps for tracking
                    const hardSteps = (challenge.steps || []).filter(s => s.difficulty === 'hard');
                    totalQuestions += hardSteps.length;
                    
                    // Check each hard step for approval
                    hardSteps.forEach((step, idx) => {
                        // Check multiple possible ack key formats:
                        // 1. username--stepId (PocketBase record ID)
                        // 2. username--stepIndex (numeric index)
                        // 3. username (legacy challenge-level)
                        const ackByStepId = challenge.acknowledgements?.[`${username}--${step.id}`];
                        const ackByStepIndex = challenge.acknowledgements?.[`${username}--${step.stepIndex ?? idx}`];
                        const ackLegacy = challenge.acknowledgements?.[username];
                        
                        const ack = ackByStepId || ackByStepIndex || ackLegacy;
                        
                        if (ack?.status === 'approved') {
                            approvedQuestions += 1;
                            if (!lastApproved || (ack.submittedAt && ack.submittedAt > (lastApproved.submittedAt || ''))) {
                                lastApproved = {
                                    unitName: unit.unitName,
                                    challengeName: challenge.challengeName,
                                    submittedAt: ack.submittedAt
                                };
                            }
                        }
                    });
                });
            });
            
            // Calculate percentage based on approved questions
            const percentage = totalQuestions === 0 ? 0 : Math.round((approvedQuestions / totalQuestions) * 100);
            
            return {
                levelName: level.name,
                total: totalQuestions,
                approved: approvedQuestions,
                percentage: percentage,
                lastCompleted: lastApproved,
            };
        });
    }, [selectedTeacher, allLevels]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            <Card className="md:col-span-1 overflow-y-auto h-[calc(100vh-140px)]">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
                    Instructors{" "}
                    {isLoading && (
                        <Loader2 className="animate-spin text-violet-500" size={16} />
                    )}
                </h3>
                <div className="space-y-2">
                    {teachers.map((t) => (
                        <div
                            key={t.id}
                            className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-colors ${selectedTeacher?.id === t.id
                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                            onClick={() => setSelectedTeacher(t)}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-bold capitalize">
                                    {t.username?.[0]}
                                </div>
                                <span className="font-medium capitalize text-slate-700 dark:text-slate-200">
                                    {t.username}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAssignTask(t);
                                    }}
                                    className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded text-violet-600 dark:text-violet-400">
                                    <ListChecks size={16} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewLog(t);
                                    }}
                                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                                    <Activity size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card className="md:col-span-2 overflow-y-auto h-[calc(100vh-140px)] bg-slate-50/50 dark:bg-slate-900/50">
                {selectedTeacher ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-emerald-100 dark:border-emerald-900/30 shadow-sm flex items-center justify-center text-2xl font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                    {selectedTeacher.username?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-2xl capitalize">
                                        {selectedTeacher.username}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                                        <Users size={14} /> Instructor Profile
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="danger"
                                onClick={() => handleResetProgress(selectedTeacher)}
                                disabled={resetting}
                                className="flex items-center gap-2">
                                <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
                                {resetting ? "Resetting..." : "Reset Progress"}
                            </Button>
                        </div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500" /> Curriculum
                            Progress
                        </h4>
                        {teacherProfile.length > 0 ? (
                            <div className="space-y-4">
                                {teacherProfile.map((p, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h5 className="font-bold text-lg text-slate-800 dark:text-white">
                                                    {p.levelName}
                                                </h5>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs">
                                                    {p.approved} / {p.total} Challenges Solved
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                    {p.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mb-4">
                                            <div
                                                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                                                style={{ width: `${p.percentage}%` }}></div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex items-start gap-3">
                                            <TrendingUp
                                                size={18}
                                                className="text-indigo-500 mt-0.5"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">
                                                    Current Status
                                                </span>
                                                {p.lastCompleted ? (
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        Last completed:{" "}
                                                        <span className="text-indigo-600 dark:text-indigo-400">
                                                            {p.lastCompleted.unitName}
                                                        </span>{" "}
                                                        - {p.lastCompleted.challengeName}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-slate-400 italic">
                                                        No progress yet.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No curriculum data available.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Users size={48} className="mb-4 opacity-30" />
                        <p>
                            Select an instructor from the list to view their full profile and
                            progress.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
};

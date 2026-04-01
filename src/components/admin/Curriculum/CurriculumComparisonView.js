import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ChevronUp,
    ChevronDown,
    AlignLeft,
    FileText,
} from "lucide-react";
import { pb, useAppState } from "../../../context/AppStateContext";
import { Button } from "../../common/Button";
import { Badge } from "../../common/Badge";

const ChallengeComparisonRow = ({
    challenge,
    onAcknowledge,
    userRole,
    username,
    levelId,
    unitId,
    curriculumType,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [difficulty, setDifficulty] = useState("easy");
    const [stepIdx, setStepIdx] = useState(0);
    const [allSteps, setAllSteps] = useState([]);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const status = challenge.acknowledgements?.[username?.toLowerCase()]?.status;

    const steps = useMemo(() => {
        const configuredCount = challenge.levels?.[difficulty]?.steps || 0;
        return allSteps
            .filter((s) => s.difficulty?.toLowerCase() === difficulty.toLowerCase())
            .sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0))
            .slice(0, configuredCount);
    }, [allSteps, difficulty, challenge.levels]);
    const step = steps[stepIdx];

    useEffect(() => {
        setStepIdx(0);
    }, [difficulty]);

    useEffect(() => {
        if (expanded && challenge.id && allSteps.length === 0) {
            setLoadingSteps(true);
            if (challenge.levels?.easy?.stepDetails?.length > 0) {
                const easy = challenge.levels.easy.stepDetails || [];
                const mod = challenge.levels.moderate?.stepDetails || [];
                const hard = challenge.levels.hard?.stepDetails || [];
                setAllSteps([...easy, ...mod, ...hard]);
                setLoadingSteps(false);
            } else {
                pb.collection("steps").getFullList({
                    filter: `challengeId="${challenge.id}"`
                })
                    .then((records) => {
                        const loaded = records.map((d) => ({ id: d.id, ...d }));
                        setAllSteps(loaded);
                        setLoadingSteps(false);
                    })
                    .catch((err) => {
                        console.error(err);
                        setLoadingSteps(false);
                    });
            }
        }
    }, [
        expanded,
        challenge.id,
        levelId,
        unitId,
        curriculumType,
        allSteps.length,
        challenge.levels,
    ]);

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-3 bg-white dark:bg-slate-800 shadow-sm">
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 rounded-t-lg">
                <div
                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center gap-3">
                        {expanded ? (
                            <ChevronUp size={16} className="text-indigo-500 dark:text-indigo-400" />
                        ) : (
                            <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
                        )}
                        <span
                            className={`font-bold text-sm ${expanded ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200"
                                }`}>
                            {challenge.challengeName || "Untitled"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {status && <Badge status={status} />}
                        {userRole === "teacher" && !status && onAcknowledge && (
                            <Button
                                variant="primary"
                                className="h-7 px-3 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAcknowledge(challenge.id);
                                }}>
                                Submit
                            </Button>
                        )}
                    </div>
                </div>
                {expanded && (
                    <div className="px-4 py-2 bg-white dark:bg-slate-800 flex gap-2 border-t border-slate-50 dark:border-slate-700">
                        {["easy", "moderate", "hard"].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${difficulty === d
                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-700"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                                    }`}>
                                {d}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {expanded && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
                    {loadingSteps ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="animate-spin text-violet-500" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
                                <AlignLeft size={14} className="text-slate-400 ml-1" />
                                <select
                                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-w-[100px]"
                                    value={stepIdx}
                                    onChange={(e) => setStepIdx(Number(e.target.value))}>
                                    {steps.length === 0 ? (
                                        <option>No steps</option>
                                    ) : (
                                        steps.map((_, i) => (
                                            <option key={i} value={i} className="dark:bg-slate-800">
                                                Step {i + 1}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[150px] text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none shadow-sm dark:prose-invert">
                                {step?.content ? (
                                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: step.content }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                        <FileText size={24} className="mb-2 opacity-20" />
                                        <p className="text-xs">
                                            No content available for this step.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const CurriculumComparisonView = ({ levelId, onBack, userRole }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [oldUnits, setOldUnits] = useState([]);
    const [newUnits, setNewUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currentUser, logActivity } = useAppState();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchShallow = async (coll) => {
                const uSnap = await pb.collection(coll).getFullList({
                    filter: `levelId="${levelId}"`
                });
                const units = [];
                for (const uDoc of uSnap) {
                    const unit = { id: uDoc.id, ...uDoc, challenges: [] };
                    const cSnap = await pb.collection("challenges").getFullList({
                        filter: `unitId="${uDoc.id}" && curriculumType="${coll}"`
                    });
                    unit.challenges = cSnap.map((c) => {
                        const data = c;
                        return {
                            id: c.id,
                            ...data,
                            levels: {
                                easy: { steps: data.steps_easy || data.levels?.easy?.steps || 0 },
                                moderate: { steps: data.steps_moderate || data.levels?.moderate?.steps || 0 },
                                hard: { steps: data.steps_hard || data.levels?.hard?.steps || 0 },
                            },
                        };
                    });
                    units.push(unit);
                }
                units.sort(
                    (a, b) => parseInt(a.unitNumber || 0) - parseInt(b.unitNumber || 0)
                );
                return units;
            };

            const [oldD, newD] = await Promise.all([
                fetchShallow("units_old"),
                fetchShallow("units_new"),
            ]);
            setOldUnits(oldD);
            setNewUnits(newD);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [levelId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAcknowledge = async (challengeId) => {
        if (!currentUser) return;
        try {
            // Find the challenge ref
            let targetChallenge = null;

            for (const unit of newUnits) {
                const ch = unit.challenges.find((c) => c.id === challengeId);
                if (ch) {
                    targetChallenge = ch;
                    break;
                }
            }

            if (targetChallenge) {
                const acks = targetChallenge.acknowledgements || {};
                acks[currentUser.username.toLowerCase()] = {
                    status: "pending",
                    submittedAt: new Date().toISOString(),
                };
                await pb.collection("challenges").update(challengeId, { acknowledgements: acks });
                await logActivity(currentUser.username, "submitted_challenge", {
                    challengeId,
                    challengeName: targetChallenge.challengeName,
                });
                alert("Submitted for review!");
                fetchData(); // Refresh
            }
        } catch (e) {
            console.error(e);
            alert("Error submitting.");
        }
    };

    // Pagination Logic
    const totalItems = Math.max(oldUnits.length, newUnits.length);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedOld = oldUnits.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const paginatedNew = newUnits.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-4 mb-6">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Curriculum Comparison
                </h2>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-violet-500" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-8">
                    {/* Old Version Column */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between sticky top-0 bg-slate-100 dark:bg-slate-800 py-4 z-10 rounded-lg px-2">
                            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Previous Version
                            </h3>
                        </div>
                        {paginatedOld.map((unit) => (
                            <div key={unit.id} className="opacity-60 grayscale">
                                <h4 className="font-bold text-slate-600 dark:text-slate-500 mb-3 text-lg">
                                    Unit {unit.unitNumber}: {unit.unitName}
                                </h4>
                                {unit.challenges.map((ch) => (
                                    <ChallengeComparisonRow
                                        key={ch.id}
                                        challenge={ch}
                                        userRole={userRole}
                                        username={currentUser?.username}
                                        levelId={levelId}
                                        unitId={unit.id}
                                        curriculumType="units_old"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* New Version Column */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between sticky top-0 bg-slate-100 dark:bg-slate-800 py-4 z-10 rounded-lg px-2">
                            <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                New Version
                            </h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                                    <ChevronLeft size={16} />
                                </Button>
                                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-sm font-medium flex items-center dark:text-slate-200">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="secondary"
                                    disabled={currentPage === totalPages}
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }>
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </div>
                        {paginatedNew.map((unit) => (
                            <div key={unit.id}>
                                <h4 className="font-bold text-slate-800 dark:text-white mb-3 text-lg">
                                    Unit {unit.unitNumber}: {unit.unitName}
                                </h4>
                                {unit.challenges.map((ch) => (
                                    <ChallengeComparisonRow
                                        key={ch.id}
                                        challenge={ch}
                                        onAcknowledge={handleAcknowledge}
                                        userRole={userRole}
                                        username={currentUser?.username}
                                        levelId={levelId}
                                        unitId={unit.id}
                                        curriculumType="units_new"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

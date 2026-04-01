import React, { useState, useEffect } from "react";
import {
    BookOpen,
    Eye,
    HandMetal,
    GraduationCap,
    Check,
    Loader2,
    Users,
    Shield,
    RefreshCw,
} from "lucide-react";
import { pb } from "../../context/AppStateContext";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Modal } from "../common/Modal";
import { Breadcrumb } from "../common/Breadcrumb";

const TrainingStatusModal = ({
    teacher,
    level,
    percentage,
    onClose,
    onUpdateStatus,
}) => {
    const currentStatus = teacher.trainingStatus?.[level.id] || "learning";
    const steps = [
        {
            id: "learning",
            label: "Curriculum Mastery",
            icon: BookOpen,
            desc: "Complete all challenges",
        },
        {
            id: "observing",
            label: "Class Observation",
            icon: Eye,
            desc: "Observe a senior instructor",
        },
        {
            id: "assisting",
            label: "Assist Class",
            icon: HandMetal,
            desc: "Assist in teaching a class",
        },
        {
            id: "teaching",
            label: "Certified Teacher",
            icon: GraduationCap,
            desc: "Fully qualified to teach",
        },
    ];
    const currentStepIdx = steps.findIndex((s) => s.id === currentStatus);
    const handleAdvance = () => {
        if (currentStatus === "learning" && percentage < 100) {
            alert("Instructor must complete 100% of curriculum challenges first.");
            return;
        }
        const nextStep = steps[currentStepIdx + 1];
        if (nextStep) onUpdateStatus(nextStep.id);
    };
    return (
        <Modal
            title={`Training Progress: ${level.name}`}
            onClose={onClose}
            maxWidth="max-w-2xl"
            footer={
                <Button onClick={onClose} variant="secondary">
                    Close
                </Button>
            }>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl font-bold shadow-sm text-violet-600 border border-violet-100">
                    {teacher.username[0]}
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 capitalize">
                        {teacher.username}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Curriculum:</span>
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="font-medium text-slate-700">{percentage}%</span>
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>
                <div className="space-y-6">
                    {steps.map((step, idx) => {
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                            <div
                                key={step.id}
                                className={`flex gap-4 p-3 rounded-xl border transition-all ${isCurrent
                                    ? "bg-white border-violet-200 shadow-md scale-[1.02]"
                                    : "bg-transparent border-transparent opacity-80"
                                    }`}>
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 ${isCompleted
                                        ? "bg-emerald-500 border-emerald-100 text-white"
                                        : isCurrent
                                            ? "bg-violet-600 border-violet-100 text-white"
                                            : "bg-slate-100 border-slate-50 text-slate-400"
                                        }`}>
                                    {isCompleted ? <Check size={20} /> : <step.icon size={20} />}
                                </div>
                                <div className="flex-grow">
                                    <h5
                                        className={`font-bold ${isCurrent ? "text-slate-800" : "text-slate-500"
                                            }`}>
                                        {step.label}
                                    </h5>
                                    <p className="text-sm text-slate-400">{step.desc}</p>
                                </div>
                                <div className="flex items-center">
                                    {isCurrent && step.id !== "teaching" && (
                                        <Button size="sm" variant="primary" onClick={handleAdvance}>
                                            {step.id === "learning"
                                                ? "Verify & Advance"
                                                : "Mark Complete"}
                                        </Button>
                                    )}
                                    {isCompleted && (
                                        <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                                            <Check size={14} /> Done
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

export const TrainingManagementView = ({
    allLevels,
    teachers,
    onUpdateStatus,
    allowAssignmentEditing = true,
    fetchLevelData, // New prop for lazy loading
}) => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState("level"); // "level" or "instructor"
    const [viewInstructor, setViewInstructor] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Cache for lazy-loaded level data: { [levelId]: unitsData }
    const [levelDataCache, setLevelDataCache] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Define categories and their levels
    const categories = {
        all: { name: "All Levels", levels: [] },
        kinder: {
            name: "Kinder",
            levels: ["Kinder Foundation 1", "Kinder Foundation 2", "Kinder Term 1", "Kinder Term 2", "Kinder Term 3", "Kinder Term 4"]
        },
        junior: {
            name: "Junior",
            levels: ["Junior Foundation 1", "Junior Foundation 2", "Junior Term 1", "Junior Term 2", "Junior Term 3", "Junior Term 4"]
        },
        coder: {
            name: "Coder",
            levels: ["Basic 1", "Basic 2", "Intermediate 1", "Intermediate 2", "Advance 1", "Advance 2", "Advance 3", "Skip Intermediate Level"]
        }
    };

    const levelOrder = [
        // Kinder
        "Kinder Foundation 1",
        "Kinder Foundation 2",
        "Kinder Term 1",
        "Kinder Term 2",
        "Kinder Term 3",
        "Kinder Term 4",
        // Junior
        "Junior Foundation 1",
        "Junior Foundation 2",
        "Junior Term 1",
        "Junior Term 2",
        "Junior Term 3",
        "Junior Term 4",
        // Coder
        "Basic 1",
        "Basic 2",
        "Intermediate 1",
        "Intermediate 2",
        "Advance 1",
        "Advance 2",
        "Advance 3",
        "Skip Intermediate Level",
        // Also support Level X: format
        "Level 1: Basic 1",
        "Level 2: Basic 2",
        "Level 3: Intermediate 1",
        "Level 4: Intermediate 2",
        "Level 5: Advance 1",
        "Level 6: Advance 2",
        "Level 7: Advance 3",
        "Level 8: Skip to Intermediate",
    ];

    // Helper function to determine which category a level belongs to
    const getLevelCategory = (level) => {
        // First check if level has explicit category field
        if (level.category) {
            return level.category.toLowerCase();
        }

        // Otherwise, infer from name
        const name = level.name.toLowerCase();
        if (name.includes('kinder')) return 'kinder';
        if (name.includes('junior')) return 'junior';
        if (name.includes('basic') || name.includes('intermediate') || name.includes('advance') || name.includes('skip')) return 'coder';

        // For generic names like "Term 1", "Term 2", default to coder
        // Admin can set explicit category field in Firebase
        return 'coder';
    };

    // Count levels in each category
    const categoryCounts = {
        all: allLevels.length,
        kinder: allLevels.filter(l => getLevelCategory(l) === 'kinder').length,
        junior: allLevels.filter(l => getLevelCategory(l) === 'junior').length,
        coder: allLevels.filter(l => getLevelCategory(l) === 'coder').length,
    };

    // Filter and sort levels based on selected category
    const sortedLevels = [...allLevels]
        .filter(level => {
            if (selectedCategory === "all") return true;
            return getLevelCategory(level) === selectedCategory;
        })
        .sort((a, b) => {
            const indexA = levelOrder.indexOf(a.name);
            const indexB = levelOrder.indexOf(b.name);
            // If both are in the list, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // If only A is in the list, A comes first
            if (indexA !== -1) return -1;
            // If only B is in the list, B comes first
            if (indexB !== -1) return 1;
            // If neither is in the list, sort alphabetically
            return a.name.localeCompare(b.name);
        });

    useEffect(() => {
        if (sortedLevels.length > 0 && !selectedLevel) setSelectedLevel(sortedLevels[0]);
    }, [sortedLevels, selectedLevel]);

    // Auto-select instructor if not editing (Teacher View)
    useEffect(() => {
        if (!allowAssignmentEditing && teachers.length > 0 && !viewInstructor) {
            setViewInstructor(teachers[0]);
        }
    }, [allowAssignmentEditing, teachers, viewInstructor]);

    // Fetch data for selected level if not in cache
    useEffect(() => {
        const loadData = async () => {
            if (selectedLevel && !levelDataCache[selectedLevel.id] && fetchLevelData) {
                setIsLoadingData(true);
                try {
                    const data = await fetchLevelData(selectedLevel.id);
                    setLevelDataCache(prev => ({ ...prev, [selectedLevel.id]: data }));
                } catch (error) {
                    console.error("Failed to load level data", error);
                } finally {
                    setIsLoadingData(false);
                }
            }
        };
        loadData();
    }, [selectedLevel, levelDataCache, fetchLevelData]);

    const getTeacherStatus = (teacher, levelId) => {
        return teacher.trainingStatus?.[levelId] || "learning";
    };

    const getTeacherPercentage = (teacher, levelId) => {
        // Use cached data or data from props (if pre-loaded)
        const levelData = levelDataCache[levelId] || allLevels.find((l) => l.id === levelId)?.newData;

        if (!levelData) return null; // Return null to indicate data not loaded

        let totalQuestions = 0,
            approvedQuestions = 0;
        const username = teacher.username.toLowerCase();
        
        levelData.forEach((u) =>
            u.challenges?.forEach((c) => {
                // Count hard-difficulty steps (Python questions)
                const hardSteps = (c.steps || []).filter(s => s.difficulty === 'hard');
                totalQuestions += hardSteps.length;

                // Check each step for approval (new step-level format)
                hardSteps.forEach((step) => {
                    // Check step-level acknowledgement first (format: username--stepId)
                    const stepAckKey = `${username}--${step.id}`;
                    let ack = c.acknowledgements?.[stepAckKey];
                    
                    // Fallback to legacy challenge-level acknowledgement
                    if (!ack) {
                        ack = c.acknowledgements?.[username];
                    }
                    
                    if (ack?.status === 'approved') {
                        approvedQuestions += 1;
                    }
                });
            })
        );
        return totalQuestions === 0 ? 0 : Math.round((approvedQuestions / totalQuestions) * 100);
    };

    const handleUpdateAssignedLevels = async (teacherId, levelId, isAssigned) => {
        try {
            const teacher = teachers.find(t => t.id === teacherId);
            if (!teacher) return;

            let currentAssigned = teacher.assignedLevels || [];
            let newAssigned;

            if (isAssigned) {
                if (!currentAssigned.includes(levelId)) {
                    newAssigned = [...currentAssigned, levelId];
                } else {
                    newAssigned = currentAssigned;
                }
            } else {
                newAssigned = currentAssigned.filter(id => id !== levelId);
            }

            // Optimistic update
            setViewInstructor(prev => ({
                ...prev,
                assignedLevels: newAssigned
            }));

            await pb.collection("teachers").update(teacherId, {
                assignedLevels: newAssigned
            });
        } catch (error) {
            console.error("Error updating assigned levels:", error);
            alert("Failed to update assigned levels");
            // Revert on error (optional, but good practice)
            const teacher = teachers.find(t => t.id === teacherId);
            if (teacher) setViewInstructor(teacher);
        }
    };

    // Function to manually trigger load for a level (used in Instructor View)
    const handleLoadLevelData = async (levelId, e) => {
        e?.stopPropagation();
        if (!fetchLevelData || levelDataCache[levelId]) return;

        setIsLoadingData(true);
        try {
            const data = await fetchLevelData(levelId);
            setLevelDataCache(prev => ({ ...prev, [levelId]: data }));
        } catch (error) {
            console.error("Failed to load level data", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Management", "Training Flow"]} />
            <h2 className="text-2xl font-bold text-slate-800">
                Instructor Training Pipeline
            </h2>

            {/* View Mode Toggle */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <button
                    onClick={() => setViewMode("level")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === "level"
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                        : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}>
                    <BookOpen size={18} />
                    View by Level
                </button>
                <button
                    onClick={() => setViewMode("instructor")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${viewMode === "instructor"
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                        : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}>
                    <Users size={18} />
                    {allowAssignmentEditing ? "View by Instructor" : "Assigned Levels"}
                </button>
            </div>

            {viewMode === "level" ? (
                <>
                    {/* Category Filter */}
                    <div className="flex items-center gap-4 mb-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Filter by Category:
                        </label>
                        <div className="flex gap-2">
                            {Object.entries(categories).map(([key, cat]) => {
                                const count = categoryCounts[key] || 0;
                                // Hide categories with no levels (except "All Levels")
                                if (key !== 'all' && count === 0) return null;

                                return (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSelectedCategory(key);
                                            setSelectedLevel(null);
                                        }}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedCategory === key
                                            ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
                                            }`}>
                                        {cat.name} {key !== 'all' && `(${count})`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Level Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-1">
                        {sortedLevels.map((lvl) => (
                            <button
                                key={lvl.id}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${selectedLevel?.id === lvl.id
                                    ? "bg-white dark:bg-slate-800 border-b-2 border-violet-600 text-violet-600 dark:text-violet-400 shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}>
                                {lvl.name}
                            </button>
                        ))}
                    </div>

                    <Card className="min-h-[400px]">
                        {selectedLevel ? (
                            isLoadingData && !levelDataCache[selectedLevel.id] ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="animate-spin text-violet-500" size={32} />
                                    <span className="ml-2 text-slate-500">Loading curriculum data...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                Instructor
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                Curriculum Mastery
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                Current Status
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {teachers.map((t) => {
                                            const pct = getTeacherPercentage(t, selectedLevel.id);
                                            const status = getTeacherStatus(t, selectedLevel.id);
                                            return (
                                                <tr
                                                    key={t.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 capitalize">
                                                        {t.username}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                                    style={{ width: `${pct || 0}%` }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                                {pct !== null ? `${pct}%` : "..."}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge status={status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="secondary"
                                                            className="h-8 px-3 text-xs"
                                                            onClick={() => {
                                                                setSelectedTeacher(t);
                                                                setModalOpen(true);
                                                            }}>
                                                            Manage Flow
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )
                        ) : (
                            <div className="flex justify-center items-center h-64">
                                <span className="text-slate-400">Select a level to view training status</span>
                            </div>
                        )}
                    </Card>
                </>
            ) : (
                <div className="space-y-6">
                    {allowAssignmentEditing ? (
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Select Instructor
                            </label>
                            <select
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                value={viewInstructor?.id || ""}
                                onChange={(e) => {
                                    const t = teachers.find(t => t.id === e.target.value);
                                    setViewInstructor(t);
                                }}
                            >
                                <option value="">-- Choose Instructor --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.username}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        null
                    )}

                    {viewInstructor && (
                        <Card>
                            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        {viewInstructor.username[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                            {viewInstructor.username}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            Instructor Training Profile
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Assigned Levels</div>
                                    <div className="font-bold text-slate-800 dark:text-white text-lg">
                                        {viewInstructor.assignedLevels?.length || 0} / {allLevels.length}
                                    </div>
                                </div>
                            </div>

                            {/* Category Filter for Instructor View */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                    Filter by Category:
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(categories).map(([key, cat]) => {
                                        const count = categoryCounts[key] || 0;
                                        // Hide categories with no levels (except "All Levels")
                                        if (key !== 'all' && count === 0) return null;

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedCategory(key)}
                                                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${selectedCategory === key
                                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
                                                    }`}>
                                                {cat.name} {key !== 'all' && `(${count})`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <Shield size={18} className="text-violet-500" />
                                    {allowAssignmentEditing ? "Level Access Control" : "Assigned Levels"}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {sortedLevels.map(lvl => {
                                        const isAssigned = viewInstructor.assignedLevels?.includes(lvl.id);
                                        return (
                                            <label key={lvl.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${allowAssignmentEditing ? "cursor-pointer" : "cursor-default"
                                                } ${isAssigned
                                                    ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700"
                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70"
                                                } ${allowAssignmentEditing && !isAssigned ? "hover:opacity-100" : ""}`}>
                                                <input
                                                    type="checkbox"
                                                    className="accent-violet-600 w-4 h-4"
                                                    checked={!!isAssigned}
                                                    onChange={(e) => handleUpdateAssignedLevels(viewInstructor.id, lvl.id, e.target.checked)}
                                                    disabled={!allowAssignmentEditing}
                                                />
                                                <span className={`text-sm font-medium ${isAssigned ? "text-violet-700 dark:text-violet-300" : "text-slate-600 dark:text-slate-400"}`}>
                                                    {lvl.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                            Level
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                            Curriculum Mastery
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {sortedLevels.map((lvl) => {
                                        const pct = getTeacherPercentage(viewInstructor, lvl.id);
                                        const status = getTeacherStatus(viewInstructor, lvl.id);
                                        return (
                                            <tr key={lvl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                                                    {lvl.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                                style={{ width: `${pct || 0}%` }}></div>
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            {pct !== null ? `${pct}%` : (
                                                                <button
                                                                    onClick={(e) => handleLoadLevelData(lvl.id, e)}
                                                                    className="text-violet-500 hover:underline flex items-center gap-1"
                                                                >
                                                                    <RefreshCw size={12} /> Load
                                                                </button>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge status={status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="secondary"
                                                        className="h-8 px-3 text-xs"
                                                        onClick={async () => {
                                                            setSelectedTeacher(viewInstructor);
                                                            setSelectedLevel(lvl);
                                                            // Ensure data is loaded before opening modal
                                                            if (!levelDataCache[lvl.id] && fetchLevelData) {
                                                                await handleLoadLevelData(lvl.id);
                                                            }
                                                            setModalOpen(true);
                                                        }}>
                                                        Manage Flow
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </div>
            )}

            {modalOpen && selectedTeacher && selectedLevel && (
                <TrainingStatusModal
                    teacher={selectedTeacher}
                    level={selectedLevel}
                    percentage={getTeacherPercentage(selectedTeacher, selectedLevel.id) || 0}
                    onClose={() => setModalOpen(false)}
                    onUpdateStatus={(newStatus) => {
                        onUpdateStatus(selectedTeacher.id, selectedLevel.id, newStatus);
                        setModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

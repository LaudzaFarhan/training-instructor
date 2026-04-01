import React, { useState, useEffect } from "react";
import {
    LayoutDashboard,
    BookOpen,
    LogOut,
    Bell,
    TrendingUp,
    GraduationCap,
    Globe,
    ClipboardList,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { pb, useAppState } from "../../context/AppStateContext";
import { TeacherOverview } from "./TeacherOverview";
import { TeacherCurriculumList } from "./TeacherCurriculumList";
import { CurriculumComparisonView } from "../admin/Curriculum/CurriculumComparisonView";
import { ThemeToggle } from "../common/ThemeToggle";
import { StudentProgressReport } from "../admin/StudentProgressReport";
import { TrainingManagementView } from "../admin/TrainingManagementView";
import { RevisionChallengesView } from "./RevisionChallengesView";
import { PortalView } from "../common/PortalView";
import { InstructorSnippetsView } from "./InstructorSnippetsView";
import { Code } from "lucide-react";

export const TeacherDashboard = () => {
    const { currentUser, logout, updateCurrentUser } = useAppState();
    const [activeTab, setActiveTab] = useState("overview");
    const [levels, setLevels] = useState([]);
    const [allLevelsRef, setAllLevelsRef] = useState([]); // Store all levels for filtering
    const [tasks, setTasks] = useState([]);
    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [isPortalExpanded, setIsPortalExpanded] = useState(false);
    const [stats, setStats] = useState({
        finishedLevels: 0,
        submittedChallenges: 0,
        activeLevels: 0,
    });
    const [rawData, setRawData] = useState([]);
    const [submittedCountData, setSubmittedCountData] = useState([]);
    const [nextChallenge, setNextChallenge] = useState(null);

    const fetchCurriculumShell = async (levelId, curriculumType) => {
        const unitsSnapshot = await pb.collection(curriculumType).getFullList({
            filter: `levelId="${levelId}"`
        });
        const unitsData = [];
        for (const unitDoc of unitsSnapshot) {
            const unit = { ...unitDoc, challenges: [] };
            const challengesSnapshot = await pb.collection("challenges").getFullList({
                filter: `unitId="${unitDoc.id}"`
            });
            for (const challengeDoc of challengesSnapshot) {
                unit.challenges.push({ ...challengeDoc });
            }
            unitsData.push(unit);
        }
        unitsData.sort(
            (a, b) => parseInt(a.unitNumber || 0) - parseInt(b.unitNumber || 0)
        );
        return unitsData;
    };

    // Filter levels based on assignedLevels whenever they change
    useEffect(() => {
        if (allLevelsRef.length === 0) return;

        const assignedLevels = (currentUser?.assignedLevels || []).filter(id => id && id.trim() !== "");
        if (assignedLevels.length > 0) {
            // Filter to only show assigned levels
            const filteredLevels = allLevelsRef.filter(l => assignedLevels.includes(l.id));
            setLevels(filteredLevels.length > 0 ? filteredLevels : allLevelsRef);
        } else {
            // If no assigned levels, show all (for backwards compatibility)
            setLevels(allLevelsRef);
        }
    }, [allLevelsRef, currentUser?.assignedLevels]);

    // Training data fetching removed in favor of lazy loading in TrainingManagementView

    useEffect(() => {
        if (!currentUser) return;

        // PocketBase Subscriptions & Fetching
        const fetchLevels = async () => {
             try {
                 const allLevels = await pb.collection("codingLevels").getFullList({ sort: "name" });
                 setAllLevelsRef(allLevels);
             } catch (e) {}
        };
        fetchLevels();
        pb.collection("codingLevels").subscribe('*', fetchLevels);

        if (currentUser.role === "teacher") {
            const fetchTeacher = async () => {
                try {
                    const snap = await pb.collection("teachers").getFullList({
                        filter: `username="${currentUser.username.toLowerCase()}"`
                    });
                    if (snap.length > 0) {
                        const teacherDoc = snap[0];
                        const newAssignedLevels = teacherDoc.assignedLevels || [];
                        const teacherId = teacherDoc.id;
                        
                        const currentAssigned = currentUser.assignedLevels || [];
                        const hasChanged =
                            JSON.stringify(currentAssigned.sort()) !== JSON.stringify(newAssignedLevels.sort()) ||
                            currentUser.id !== teacherId;

                        if (hasChanged) {
                            updateCurrentUser({
                                assignedLevels: newAssignedLevels,
                                id: teacherId
                            });
                        }
                    }
                } catch (e) {}
            };
            fetchTeacher();
            pb.collection("teachers").subscribe('*', fetchTeacher);
        }

        const fetchTasks = async () => {
            try {
                const tasks = await pb.collection("tasks").getFullList({
                    filter: `assignedTo="${currentUser.username}"`
                });
                setTasks(tasks);
            } catch (e) {}
        };
        fetchTasks();
        pb.collection("tasks").subscribe('*', fetchTasks);

        return () => {
            pb.collection("codingLevels").unsubscribe('*');
            if (currentUser.role === "teacher") {
                pb.collection("teachers").unsubscribe('*');
            }
            pb.collection("tasks").unsubscribe('*');
        };
    }, [currentUser]);

    useEffect(() => {
        if (levels.length > 0 && currentUser) {
            const calculateStats = async () => {
                let finished = 0;
                let submitted = 0;
                let active = 0;
                const raw = [];
                let realSubmissions = [];
                let completedSet = new Set();

                try {
                    realSubmissions = await pb.collection("submissions").getFullList({
                        filter: `username="${currentUser.username.toLowerCase()}"`,
                        sort: "-submittedAt"
                    });
                    submitted = realSubmissions.length;
                } catch(e) { console.error("Error fetching submissions:", e); }

                try {
                    const blocklyProgress = await pb.collection("teacher_blockly_progress").getFullList({
                        filter: `teacherId="${currentUser.id}"`
                    });
                    blocklyProgress.forEach(bp => {
                        if (bp.completedChallenges) {
                            bp.completedChallenges.forEach(cId => completedSet.add(cId));
                        }
                    });
                } catch(e) { console.error("Error fetching blockly_progress:", e); }

                let nextChallengeToRecommend = null;

                for (const level of levels) {
                    const uSnap = await pb.collection("units_new").getFullList({
                        filter: `levelId="${level.id}"`
                    });
                    
                    const sortedUnits = uSnap.sort((a,b) => (a.unitNumber||0) - (b.unitNumber||0));

                    let totalCh = 0;
                    let approvedCh = 0;
                    const levelChallenges = [];

                    for (const uDoc of sortedUnits) {
                        const cSnap = await pb.collection("challenges").getFullList({
                            filter: `unitId="${uDoc.id}"`
                        });
                        const sortedChallenges = cSnap.sort((a,b) => (a.order||0) - (b.order||0));
                        
                        for (const cDoc of sortedChallenges) {
                            totalCh++;
                            const cData = cDoc;
                            const username = currentUser.username.toLowerCase();
                            let status = cData.acknowledgements?.[username]?.status;

                            if (!status && cData.acknowledgements) {
                                const stepKeys = Object.keys(cData.acknowledgements).filter(k => k.startsWith(`${username}--`));
                                if (stepKeys.length > 0) {
                                    const anyApproved = stepKeys.some(k => cData.acknowledgements[k].status === "approved");
                                    const anyPending = stepKeys.some(k => cData.acknowledgements[k].status === "pending");
                                    status = anyApproved ? "approved" : (anyPending ? "pending" : "in_progress");
                                }
                            }

                            if (status === "approved") {
                                approvedCh++;
                            }
                            
                            // Check for nextChallengeToRecommend based on strict physical completion logic
                            let challengeSteps = [];
                            try {
                                const stepsData = await pb.collection('steps').getFullList({
                                    filter: `challengeId="${cData.id}"`,
                                    sort: 'stepIndex',
                                    $autoCancel: false
                                });
                                challengeSteps = stepsData.filter(s => s.difficulty === 'hard');
                            } catch(e) {}
                            
                            if (challengeSteps.length > 0) {
                                for (let i = 0; i < challengeSteps.length; i++) {
                                    const stepId = `${cData.id}_step_${i}`;
                                    if (!completedSet.has(stepId)) {
                                        if (!nextChallengeToRecommend) {
                                            nextChallengeToRecommend = {
                                                challengeName: `${cData.challengeName} - Step ${i + 1}`,
                                                unitName: uDoc.unitName,
                                                levelName: level.name,
                                            };
                                        }
                                        break; // Stop at first incomplete step
                                    }
                                }
                            } else {
                                if (!completedSet.has(cData.id)) {
                                    if (!nextChallengeToRecommend) {
                                        nextChallengeToRecommend = {
                                            challengeName: cData.challengeName,
                                            unitName: uDoc.unitName,
                                            levelName: level.name,
                                        };
                                    }
                                }
                            }

                            levelChallenges.push({
                                challengeName: cData.challengeName,
                                unitName: uDoc.unitName,
                                levelName: level.name,
                                status: status || "not_started",
                            });
                        }
                    }
                    const progress =
                        totalCh === 0 ? 0 : Math.round((approvedCh / totalCh) * 100);
                    if (progress === 100) finished++;
                    else if (progress > 0) active++;
                    raw.push({
                        name: level.name,
                        progress,
                        challenges: levelChallenges,
                    });
                }
                
                setStats({
                    finishedLevels: finished,
                    submittedChallenges: submitted,
                    activeLevels: active,
                });
                setRawData(raw);
                setSubmittedCountData(realSubmissions);
                setNextChallenge(nextChallengeToRecommend);
            };
            calculateStats();
        }
    }, [levels, currentUser]);

    const handleTaskComplete = async (taskId) => {
        await pb.collection("tasks").update(taskId, { status: "completed" });
    };

    const handlePortalLevelClick = (levelId) => {
        const url = new URL(window.location.href);
        url.searchParams.set("portalLevelId", levelId);
        window.open(url.toString(), "_blank");
    };

    const renderContent = () => {
        if (selectedLevelId) {
            return (
                <CurriculumComparisonView
                    levelId={selectedLevelId}
                    onBack={() => setSelectedLevelId(null)}
                    userRole="teacher"
                />
            );
        }
        switch (activeTab) {
            case "overview":
                return (
                    <TeacherOverview
                        stats={stats}
                        rawData={rawData}
                        tasks={tasks}
                        nextChallenge={nextChallenge}
                        submittedCountData={submittedCountData}
                        onNavigate={setActiveTab}
                        onTaskComplete={handleTaskComplete}
                    />
                );
            case "curriculum":
                return (
                    <TeacherCurriculumList
                        levels={levels}
                        onSelectLevel={setSelectedLevelId}
                    />
                );
            case "update_progress":
                return <StudentProgressReport />;
            case "training":
                return (
                    <TrainingManagementView
                        allLevels={levels}
                        teachers={[currentUser]}
                        onUpdateStatus={() => { }} // Teachers can't update their own status
                        allowAssignmentEditing={false}
                        fetchLevelData={(levelId) => fetchCurriculumShell(levelId, "units_new")}
                    />
                );
            case "portal":
                return <PortalView levels={levels} />;
            case "assign":
                return <RevisionChallengesView />;
            case "snippets":
                return <InstructorSnippetsView />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
            <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 flex flex-col flex-shrink-0 shadow-2xl z-20">
                <div className="p-6 flex items-center gap-3 text-white font-bold text-xl border-b border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <BookOpen className="text-white" size={20} />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Instructor Portal
                    </span>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => {
                            setActiveTab("overview");
                            setSelectedLevelId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "overview"
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                            }`}>
                        {activeTab === "overview" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                        )}
                        <LayoutDashboard size={20} className={`transition-transform duration-300 ${activeTab === "overview" ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="font-medium">Dashboard</span>
                    </button>
                    {/* Curriculum button hidden for instructors */}
                    <button
                        onClick={() => {
                            setActiveTab("update_progress");
                            setSelectedLevelId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "update_progress"
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                            }`}>
                        {activeTab === "update_progress" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                        )}
                        <TrendingUp size={20} className={`transition-transform duration-300 ${activeTab === "update_progress" ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="font-medium">Update Progress</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("training");
                            setSelectedLevelId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "training"
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                            }`}>
                        {activeTab === "training" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                        )}
                        <GraduationCap size={20} className={`transition-transform duration-300 ${activeTab === "training" ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="font-medium">Training</span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => {
                                setActiveTab("portal");
                                setSelectedLevelId(null);
                                setIsPortalExpanded(!isPortalExpanded);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "portal"
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                                : "hover:bg-white/5 text-slate-400 hover:text-white"
                                }`}>
                            {activeTab === "portal" && (
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                            )}
                            <Globe size={20} className={`transition-transform duration-300 ${activeTab === "portal" ? "scale-110" : "group-hover:scale-110"}`} />
                            <span className="font-medium flex-1 text-left">Portal</span>
                            {isPortalExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isPortalExpanded && (
                            <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-700 pl-2 animate-in slide-in-from-top-2 duration-200">
                                {levels
                                    .slice()
                                    .sort((a, b) => {
                                        const order = [
                                            "Basic 1", "Basic 2", "Intermediate 1", "Intermediate 2",
                                            "Advance 1", "Advance 2", "Advance 3"
                                        ];
                                        const cleanName = (name) => name.replace(/^Level \d+:\s*/, "").trim();
                                        const indexA = order.indexOf(cleanName(a.name));
                                        const indexB = order.indexOf(cleanName(b.name));
                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                        if (indexA !== -1) return -1;
                                        if (indexB !== -1) return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((level) => (
                                        <button
                                            key={level.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePortalLevelClick(level.id);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                                            <span className="truncate">{level.name.replace(/^Level \d+:\s*/, "")}</span>
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setActiveTab("assign");
                            setSelectedLevelId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "assign"
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                            }`}>
                        {activeTab === "assign" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                        )}
                        <ClipboardList size={20} className={`transition-transform duration-300 ${activeTab === "assign" ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="font-medium">Revision Challenge</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("snippets");
                            setSelectedLevelId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === "snippets"
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                            }`}>
                        {activeTab === "snippets" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                        )}
                        <Code size={20} className={`transition-transform duration-300 ${activeTab === "snippets" ? "scale-110" : "group-hover:scale-110"}`} />
                        <span className="font-medium">My Snippets</span>
                    </button>
                </nav>
                <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 text-rose-400 hover:text-white hover:bg-rose-500/10 w-full px-4 py-3 rounded-xl transition-all duration-300 group">
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto h-screen custom-scrollbar relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
                <div className="max-w-7xl mx-auto h-full relative z-10">
                    <header className="flex justify-between items-center mb-8 glass dark:glass-dark p-4 rounded-2xl sticky top-0 z-10 transition-all duration-300">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">
                                {activeTab}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Instructor Overview
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <ThemeToggle />
                            <div className="relative">
                                <Bell size={20} className="text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer" />
                                {tasks.filter((t) => t.status === "pending").length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                                )}
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {currentUser?.username}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Instructor</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900 dark:to-indigo-900 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-700 shadow-sm">
                                    {currentUser?.username?.[0]}
                                </div>
                            </div>
                        </div>
                    </header>
                    <div className="animate-in delay-100">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

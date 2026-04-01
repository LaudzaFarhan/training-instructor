import React, { useState, useEffect } from 'react';
import { useAppState, pb } from '../../context/AppStateContext';
import { Loader2, Globe } from 'lucide-react';
import { JuniorLMS } from './JuniorLMS';
import { PythonAssessment } from './PythonAssessment';
import BlocklyRobotSimulator from './BlocklyRobotSimulator';
import { Breadcrumb } from './Breadcrumb';
import { Card } from './Card';

export const PortalLevelRunner = () => {
    const { currentUser } = useAppState();
    const [level, setLevel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [levelId, setLevelId] = useState(null);
    const [curriculumData, setCurriculumData] = useState([]);

    useEffect(() => {
        if (!currentUser) return; // Wait for auth

        const params = new URLSearchParams(window.location.search);
        const paramLevelId = params.get("portalLevelId");

        if (!paramLevelId) {
            setError("No level specified.");
            setLoading(false);
            return;
        }

        setLevelId(paramLevelId);

        const fetchLevel = async () => {
            try {
                // For teachers, fetch latest assignedLevels from PocketBase
                if (currentUser.role === "teacher") {
                    try {
                        const records = await pb.collection("teachers").getFullList({
                            filter: `username="${currentUser.username.toLowerCase()}"`,
                            $autoCancel: false
                        });

                        let assignedLevels = currentUser.assignedLevels || [];

                        if (records.length > 0) {
                            const teacherDoc = records[0];
                            assignedLevels = teacherDoc.assignedLevels || [];

                            // Update localStorage with latest assignedLevels
                            const updatedUser = { ...currentUser, assignedLevels, id: teacherDoc.id };
                            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        }

                        console.log('Teacher access check:', {
                            username: currentUser.username,
                            assignedLevels,
                            requestedLevel: paramLevelId,
                            hasAccess: assignedLevels.includes(paramLevelId)
                        });

                        if (!assignedLevels.includes(paramLevelId)) {
                            setError(`Access Denied: This level has not been assigned to you by your administrator. Please contact your admin for access. (Level: ${paramLevelId})`);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                         console.error("Error fetching teacher record", e);
                    }
                }
                // Admin has access to all levels (no check needed)

                let levelData;
                try {
                    levelData = await pb.collection("codingLevels").getOne(paramLevelId, { $autoCancel: false });
                } catch (e) {
                    console.error("Level fetch failed:", e, "LevelId:", paramLevelId);
                    setError(`Level not found. (${e?.message || e})`);
                    setLoading(false);
                    return;
                }

                setLevel(levelData);

                // Fetch curriculum content for all levels using flat collections in PB
                const unitsData = await pb.collection("units_new").getFullList({
                    filter: `levelId="${levelData.id}"`,
                    $autoCancel: false
                });

                const unitsPromises = unitsData.map(async (unitDoc) => {
                    const challengesData = await pb.collection("challenges").getFullList({
                        filter: `unitId="${unitDoc.id}"`,
                        $autoCancel: false
                    });

                    const challengesPromises = challengesData.map(async (cDoc) => {
                        let stepsData = [];
                        try {
                            stepsData = await pb.collection("steps").getFullList({
                                filter: `challengeId="${cDoc.id}"`,
                                sort: 'stepIndex',
                                $autoCancel: false
                            });
                        } catch(e) {}

                        const challengesList = [];

                        if (stepsData.length > 0) {
                            // Handle steps (Advance style)
                            const hardSteps = stepsData.filter(s => s.difficulty === 'hard');

                            if (hardSteps.length > 0) {
                                hardSteps.forEach((step, idx) => {
                                    challengesList.push({
                                        id: `${cDoc.id}_step_${idx}`,
                                        challengeName: `${cDoc.challengeName} - Step ${idx + 1}`,
                                        description: step.content,
                                        starterCode: cDoc.starterCode || "",
                                        hint: cDoc.hint || "",
                                        validationRegex: cDoc.validationRegex,
                                        checkType: cDoc.checkType,
                                        unitName: unitDoc.unitName,
                                        unitId: unitDoc.id  // Add unitId for submission tracking
                                    });
                                });
                            }
                        } else {
                            // Handle simple challenge (Basic/Intermediate style)
                            challengesList.push({
                                id: cDoc.id,
                                challengeName: cDoc.challengeName,
                                description: cDoc.description || cDoc.content || "No description available.",
                                starterCode: cDoc.starterCode || "",
                                hint: cDoc.hint || "",
                                unitName: unitDoc.unitName,
                                unitId: unitDoc.id  // Add unitId for submission tracking
                            });
                        }
                        return challengesList;
                    });

                    const unitChallengesNested = await Promise.all(challengesPromises);
                    return unitChallengesNested.flat();
                });

                const allChallengesNested = await Promise.all(unitsPromises);
                const allChallenges = allChallengesNested.flat();
                setCurriculumData(allChallenges);

            } catch (err) {
                console.error("Error fetching level:", err);
                setError("Failed to load level.");
            } finally {
                setLoading(false);
            }
        };

        fetchLevel();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-slate-500 font-medium">Authentication Required</p>
                    <p className="text-sm text-slate-400">Please log in to access this content.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={40} />
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
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

    // Check level category or name to determine which LMS to use
    const levelCategory = level?.category?.toLowerCase() || '';
    const levelName = level?.name?.toLowerCase() || '';

    // Junior levels use JuniorLMS
    if (levelCategory === 'junior' || levelName.includes('junior')) {
        return <JuniorLMS levelId={levelId} />;
    }

    // Advance levels use Python Assessment (Hybrid validation)
    if (levelName.includes("advance")) {
        const params = new URLSearchParams(window.location.search);
        const initialQuestionIndex = parseInt(params.get("questionIndex")) || 0;
        return <PythonAssessment levelId={levelId} initialQuestionIndex={initialQuestionIndex} />;
    }

    // Basic/Intermediate/Kinder levels use Blockly Simulator
    if (levelName.includes("basic") || levelName.includes("intermediate") || levelName.includes("kinder")) {
        return <BlocklyRobotSimulator challenges={curriculumData} levelId={levelId} levelName={level?.name} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
                <Breadcrumb path={["Portal", level.name, "Content"]} />

                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {level.name}
                    </h2>
                </div>

                <Card className="min-h-[400px] flex items-center justify-center flex-col gap-4 text-slate-400">
                    <Globe size={48} className="opacity-50" />
                    <p className="text-lg font-medium">Content for {level.name} will appear here.</p>
                </Card>
            </div>
        </div>
    );
};



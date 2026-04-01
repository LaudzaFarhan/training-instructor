import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    ArrowLeft,
    Plus,
    Loader2,
    Save,
    Bold,
    Italic,
    Image as ImageIcon,
    Palette,
    FileText,
} from "lucide-react";
import { pb } from "../../../context/AppStateContext";
import { Card } from "../../common/Card";
import { Button } from "../../common/Button";
import { InputField } from "../../common/InputField";
import { Modal } from "../../common/Modal";

const generateId = () =>
    `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const createBlankLevel = () => ({ steps: 0, stepDetails: [] });
const createNewChallenge = () => ({
    id: generateId(),
    challengeName: "",
    acknowledgements: {},
    submissionComments: {},
    levels: {
        easy: createBlankLevel(),
        moderate: createBlankLevel(),
        hard: createBlankLevel(),
    },
});
const createNewUnit = () => ({
    id: generateId(),
    unitNumber: "",
    unitName: "",
    challenges: [createNewChallenge()],
});

const EditorToolbar = ({ onAction }) => (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-t-lg border-b border-slate-200 flex-wrap">
        <button
            onClick={() => onAction("bold")}
            className="p-2 hover:bg-slate-200 rounded"
            title="Bold">
            <Bold size={16} />
        </button>
        <button
            onClick={() => onAction("italic")}
            className="p-2 hover:bg-slate-200 rounded"
            title="Italic">
            <Italic size={16} />
        </button>
        <button
            onClick={() => onAction("formatBlock", "H2")}
            className="p-2 hover:bg-slate-200 rounded font-bold text-xs"
            title="Heading">
            H2
        </button>
        <button
            onClick={() => {
                const url = prompt("Image URL:");
                if (url) onAction("insertImage", url);
            }}
            className="p-2 hover:bg-slate-200 rounded"
            title="Insert Image URL">
            <ImageIcon size={16} />
        </button>
        <div className="relative p-2 hover:bg-slate-200 rounded" title="Text Color">
            <Palette size={16} />
            <input
                type="color"
                onChange={(e) => onAction("foreColor", e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
        </div>
    </div>
);

const StepDetailsModal = ({
    stepData,
    levelName,
    stepIndex,
    onSave,
    onCancel,
    levelId,
    unitId,
    challengeId,
    curriculumType,
}) => {
    const [content, setContent] = useState(stepData.content);

    useEffect(() => {
        if (
            stepData.content === null &&
            levelId &&
            stepData.id &&
            !stepData.id.startsWith("id_")
        ) {
            pb.collection("steps").getOne(stepData.id)
                .then((record) => {
                    setContent(record.content || "");
                })
                .catch((err) => {
                    if (err.status === 404) setContent("");
                    else console.error("Error fetching step:", err);
                });
        }
    }, [stepData, levelId, curriculumType, unitId, challengeId]);

    const applyStyle = (style, value = null) => {
        document.execCommand(style, false, value);
    };

    return (
        <Modal
            title={`Edit ${levelName} - Step ${stepIndex + 1}`}
            onClose={onCancel}
            maxWidth="max-w-4xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={() => onSave({ ...stepData, content })}>
                        Save Changes
                    </Button>
                </>
            }>
            <div className="border border-slate-200 rounded-lg flex flex-col h-96">
                <EditorToolbar onAction={applyStyle} />
                <div
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: content }}
                    onInput={(e) => setContent(e.currentTarget.innerHTML)}
                    className="flex-grow p-3 outline-none overflow-y-auto font-sans text-sm prose prose-sm max-w-none"
                    style={{ minHeight: '200px' }}
                />
            </div>
        </Modal>
    );
};

export const CurriculumEditor = ({ levelId, onBack }) => {
    const [units, setUnits] = useState([]);
    const [activeUnitIndex, setActiveUnitIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editStep, setEditStep] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const snap = await pb.collection("units_new").getFullList({
                filter: `levelId="${levelId}"`,
                sort: 'unitNumber,created'
            });
            const loadedUnits = [];
            for (const d of snap) {
                const unit = { id: d.id, ...d, challenges: [] };
                const challSnap = await pb.collection("challenges").getFullList({
                    filter: `unitId="${d.id}" && curriculumType="units_new"`,
                });
                for (const cDoc of challSnap) {
                    const c = cDoc;
                    const ch = {
                        id: cDoc.id,
                        ...c,
                        levels: { easy: {}, moderate: {}, hard: {} },
                    };
                    const stepsSnap = await pb.collection("steps").getFullList({
                        filter: `challengeId="${cDoc.id}"`,
                    });
                    const allSteps = stepsSnap.map((s) => ({ id: s.id, ...s }));

                    ["easy", "moderate", "hard"].forEach((dStr) => {
                        const levelSteps = allSteps.filter((s) => s.difficulty === dStr);
                        levelSteps.sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
                        ch.levels[dStr] = { steps: c[`steps_${dStr}`] || 0, stepDetails: levelSteps };
                    });
                    unit.challenges.push(ch);
                }
                loadedUnits.push(unit);
            }
            loadedUnits.sort((a, b) => {
                const numA = parseInt(a.unitNumber) || 0;
                const numB = parseInt(b.unitNumber) || 0;
                if (numA !== numB) return numA - numB;
                return new Date(a.created || 0) - new Date(b.created || 0);
            });
            setUnits(loadedUnits);
        } catch (e) {
            if (e?.isAbort) return; // Ignore auto-cancelled requests
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [levelId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const saveUnitCore = async (unit) => {
        let unitId = unit.id;
        const unitData = {
            levelId,
            unitNumber: unit.unitNumber,
            unitName: unit.unitName,
        };
        if (unitId.startsWith("id_")) {
            const record = await pb.collection("units_new").create(unitData);
            unitId = record.id;
            unit.id = unitId; // update local pointer 
        } else {
            await pb.collection("units_new").update(unitId, unitData);
        }

        for (const ch of unit.challenges) {
            const flatData = {
                challengeName: ch.challengeName || "",
                unitId,
                curriculumType: "units_new",
                steps_easy: ch.levels.easy.steps || 0,
                steps_moderate: ch.levels.moderate.steps || 0,
                steps_hard: ch.levels.hard.steps || 0,
                acknowledgements: ch.acknowledgements || {},
                submissionComments: ch.submissionComments || {},
            };
            
            let chId = ch.id;
            if (chId.startsWith("id_")) {
                const record = await pb.collection("challenges").create(flatData);
                chId = record.id;
                ch.id = chId; 
            } else {
                await pb.collection("challenges").update(chId, flatData);
            }

            // Save all steps for this challenge
            for (const level of ["easy", "moderate", "hard"]) {
                const levelData = ch.levels[level];
                if (!levelData?.stepDetails) continue;
                for (let sIdx = 0; sIdx < levelData.stepDetails.length; sIdx++) {
                    const step = levelData.stepDetails[sIdx];
                    if (step.content === null || step.content === undefined) continue;
                    const stepPayload = {
                        challengeId: chId,
                        content: step.content,
                        difficulty: level,
                        stepIndex: step.stepIndex ?? sIdx,
                    };
                    try {
                        if (step.id.startsWith("id_")) {
                            const record = await pb.collection("steps").create(stepPayload);
                            step.id = record.id;
                        } else {
                            await pb.collection("steps").update(step.id, stepPayload);
                        }
                    } catch (e) {
                        console.error(`Failed to save step ${sIdx} (${level}):`, e);
                    }
                }
            }
        }
    };

    const handleSaveUnit = async (unit) => {
        setIsSaving(true);
        try {
            await saveUnitCore(unit);
            alert("Unit Saved!");
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save unit. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAllUnits = async () => {
        setIsSaving(true);
        try {
            for (const unit of units) {
                await saveUnitCore(unit);
            }
            alert("All Units Saved Successfully!");
        } catch (e) {
            console.error("Save all failed", e);
            alert("Failed to save some units. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUnit = () => {
        const newUnit = createNewUnit();
        
        // Find maximum unitNumber and increment
        const maxUnitNum = units.reduce((max, u) => {
            const num = parseInt(u.unitNumber) || 0;
            return num > max ? num : max;
        }, 0);
        
        newUnit.unitNumber = (maxUnitNum + 1).toString();
        
        setUnits((prev) => [...prev, newUnit]);
        setActiveUnitIndex(units.length);
    };

    const activeUnit = units[activeUnitIndex];

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {editStep && (
                <StepDetailsModal
                    stepData={editStep.data}
                    levelName={editStep.levelName}
                    stepIndex={editStep.index}
                    levelId={levelId}
                    unitId={activeUnit.id}
                    challengeId={editStep.challengeId}
                    curriculumType="units_new"
                    onCancel={() => setEditStep(null)}
                    onSave={async (newData) => {
                        const stepData = {
                            challengeId: editStep.challengeId,
                            content: newData.content,
                            difficulty: editStep.levelName,
                            stepIndex: editStep.index,
                        };
                        try {
                            let newId = newData.id;
                            if (newId.startsWith("id_")) {
                                const record = await pb.collection("steps").create(stepData);
                                newId = record.id;
                            } else {
                                await pb.collection("steps").update(newId, stepData);
                            }
                            newData.id = newId;
                        } catch (e) {
                            console.error("Save step failed", e);
                            return;
                        }

                        // Update local state
                        setUnits((prev) =>
                            prev.map((u) => {
                                if (u.id !== activeUnit.id) return u;
                                return {
                                    ...u,
                                    challenges: u.challenges.map((c) => {
                                        if (c.id !== editStep.challengeId) return c;
                                        const diff = c.levels[editStep.levelName];

                                        const stepEntry = {
                                            id: newData.id,
                                            content: newData.content,
                                            stepIndex: editStep.index
                                        };

                                        let newDetails;
                                        const existingIndex = diff.stepDetails.findIndex(s => s.id === newData.id);

                                        if (existingIndex >= 0) {
                                            newDetails = diff.stepDetails.map((s, i) =>
                                                i === existingIndex ? { ...s, ...stepEntry } : s
                                            );
                                        } else {
                                            newDetails = [...diff.stepDetails, stepEntry];
                                        }

                                        return {
                                            ...c,
                                            levels: {
                                                ...c.levels,
                                                [editStep.levelName]: {
                                                    ...diff,
                                                    stepDetails: newDetails,
                                                },
                                            },
                                        };
                                    }),
                                };
                            })
                        );
                        setEditStep(null);
                    }}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} variant="secondary">
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Curriculum Editor
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={handleSaveAllUnits} disabled={isSaving || units.length === 0}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                        Save All Units
                    </Button>
                    <Button onClick={handleAddUnit}>
                        <Plus size={16} className="mr-2" /> Add Unit
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-violet-500" size={40} />
                </div>
            ) : units.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <p>No units found. Create one to get started.</p>
                </div>
            ) : (
                <div className="flex gap-6 h-full overflow-hidden">
                    {/* Sidebar: Unit List */}
                    <div className="w-64 flex-shrink-0 overflow-y-auto pr-2 space-y-2">
                        {units.map((u, idx) => (
                            <div
                                key={u.id}
                                onClick={() => setActiveUnitIndex(idx)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${idx === activeUnitIndex
                                    ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                                    }`}>
                                <div className="text-xs font-bold opacity-70 uppercase tracking-wider mb-1">
                                    Unit {u.unitNumber || idx + 1}
                                </div>
                                <div className="font-bold truncate">
                                    {u.unitName || "Untitled Unit"}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content: Unit Editor */}
                    <div className="flex-1 overflow-y-auto pb-20">
                        <Card className="mb-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-4 flex-1 mr-8">
                                    <InputField
                                        label="Unit Number"
                                        value={activeUnit.unitNumber}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setUnits((prev) =>
                                                prev.map((u, i) =>
                                                    i === activeUnitIndex ? { ...u, unitNumber: val } : u
                                                )
                                            );
                                        }}
                                    />
                                    <InputField
                                        label="Unit Name"
                                        value={activeUnit.unitName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setUnits((prev) =>
                                                prev.map((u, i) =>
                                                    i === activeUnitIndex ? { ...u, unitName: val } : u
                                                )
                                            );
                                        }}
                                    />
                                </div>
                                <Button
                                    onClick={() => handleSaveUnit(activeUnit)}
                                    disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        <Save size={18} className="mr-2" />
                                    )}
                                    Save Unit
                                </Button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-700">
                                        Challenges
                                    </h3>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            const newCh = createNewChallenge();
                                            setUnits((prev) =>
                                                prev.map((u, i) =>
                                                    i === activeUnitIndex
                                                        ? { ...u, challenges: [...u.challenges, newCh] }
                                                        : u
                                                )
                                            );
                                        }}>
                                        <Plus size={14} className="mr-1" /> Add Challenge
                                    </Button>
                                </div>

                                {activeUnit.challenges.map((ch, chIdx) => (
                                    <div
                                        key={ch.id}
                                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                                        <div className="mb-4 flex items-end gap-3">
                                            <div className="flex-1">
                                                <InputField
                                                    label="Challenge Name"
                                                    value={ch.challengeName}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setUnits((prev) =>
                                                            prev.map((u, i) =>
                                                                i === activeUnitIndex
                                                                    ? {
                                                                        ...u,
                                                                        challenges: u.challenges.map((c, ci) =>
                                                                            ci === chIdx
                                                                                ? { ...c, challengeName: val }
                                                                                : c
                                                                        ),
                                                                    }
                                                                    : u
                                                            )
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm(`Delete challenge "${ch.challengeName || 'Untitled'}"? This will remove all steps in this challenge.`)) {
                                                        // Delete from PocketBase if it's a saved record
                                                        if (!ch.id.startsWith("id_")) {
                                                            try {
                                                                // Delete all steps for this challenge first
                                                                const steps = await pb.collection("steps").getFullList({
                                                                    filter: `challengeId="${ch.id}"`,
                                                                    $autoCancel: false
                                                                });
                                                                for (const step of steps) {
                                                                    await pb.collection("steps").delete(step.id);
                                                                }
                                                                // Then delete the challenge itself
                                                                await pb.collection("challenges").delete(ch.id);
                                                            } catch (e) {
                                                                console.error("Error deleting challenge:", e);
                                                            }
                                                        }
                                                        // Update local state
                                                        setUnits((prev) =>
                                                            prev.map((u, i) =>
                                                                i === activeUnitIndex
                                                                    ? {
                                                                        ...u,
                                                                        challenges: u.challenges.filter((_, ci) => ci !== chIdx),
                                                                    }
                                                                    : u
                                                            )
                                                        );
                                                    }
                                                }}
                                                className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 text-sm font-medium transition-colors"
                                                title="Delete Challenge"
                                            >
                                                Delete
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            {["easy", "moderate", "hard"].map((level) => (
                                                <div
                                                    key={level}
                                                    className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold uppercase text-slate-500">
                                                            {level}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            className="w-12 p-1 text-xs border rounded text-center"
                                                            value={ch.levels[level].steps}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setUnits((prev) =>
                                                                    prev.map((u, i) =>
                                                                        i === activeUnitIndex
                                                                            ? {
                                                                                ...u,
                                                                                challenges: u.challenges.map((c, ci) =>
                                                                                    ci === chIdx
                                                                                        ? {
                                                                                            ...c,
                                                                                            levels: {
                                                                                                ...c.levels,
                                                                                                [level]: {
                                                                                                    ...c.levels[level],
                                                                                                    steps: val,
                                                                                                },
                                                                                            },
                                                                                        }
                                                                                        : c
                                                                                ),
                                                                            }
                                                                            : u
                                                                    )
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        {Array.from({ length: ch.levels[level].steps }).map(
                                                            (_, sIdx) => {
                                                                const stepId =
                                                                    ch.levels[level].stepDetails?.[sIdx]?.id ||
                                                                    generateId();
                                                                return (
                                                                    <button
                                                                        key={sIdx}
                                                                        onClick={() =>
                                                                            setEditStep({
                                                                                data: {
                                                                                    id: stepId,
                                                                                    content:
                                                                                        ch.levels[level].stepDetails?.[sIdx]
                                                                                            ?.content || null,
                                                                                },
                                                                                levelName: level,
                                                                                index: sIdx,
                                                                                challengeId: ch.id,
                                                                            })
                                                                        }
                                                                        className="w-full text-left text-xs p-2 rounded hover:bg-violet-50 text-slate-600 hover:text-violet-600 transition-colors flex justify-between items-center">
                                                                        <span>Step {sIdx + 1}</span>
                                                                        <FileText size={12} />
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

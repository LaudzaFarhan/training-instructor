import React, { useState, useEffect } from "react";
import {
    BookOpen,
    LayoutDashboard,
    CheckSquare,
    Clock,
    Users,
    Activity,
    GraduationCap,
    Calendar as CalendarIcon,
    LogOut,
    ListChecks,
    Trash2,
    Plus,
    Loader2,
    TrendingUp,
    Globe,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Code,
    FileText,
} from "lucide-react";
import { pb, useAppState } from "../../context/AppStateContext";
import { DashboardView } from "./DashboardView";
import { InstructorsView } from "./InstructorsView";
import { TasksView } from "./TasksView";
import { PendingReviewsView } from "./PendingReviewsView";
import { ScheduleView } from "./ScheduleView";
import { TrainingManagementView } from "./TrainingManagementView";
import { TeacherTrackingView } from "./TeacherTrackingView";
import { StudentProgressReport } from "./StudentProgressReport";
import { CurriculumEditor } from "./Curriculum/CurriculumEditor";
import { CurriculumComparisonView } from "./Curriculum/CurriculumComparisonView";
import { JuniorLessonManager } from "./JuniorLessonManager";
import { QuestionManager } from "./QuestionManager";
import { InstructorSnippetsView } from "../teacher/InstructorSnippetsView";
import { AdminSnippetsView } from "./AdminSnippetsView";
import { PortalView } from "../common/PortalView";
import { ThemeToggle } from "../common/ThemeToggle";
import { BlocklyPreview } from "../common/BlocklyPreview";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { InputField } from "../common/InputField";
import { Breadcrumb } from "../common/Breadcrumb";
import { Card } from "../common/Card";

const AssignTaskModal = ({ teacher, teachers = [], onClose, onAssign }) => {
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [selectedTeachers, setSelectedTeachers] = useState(
        teacher?.username ? [teacher.username] : []
    );
    const isSpecific = !!teacher?.username;
    const handleToggleTeacher = (username) => {
        setSelectedTeachers((prev) =>
            prev.includes(username)
                ? prev.filter((u) => u !== username)
                : [...prev, username]
        );
    };
    const handleSelectAll = () => {
        selectedTeachers.length === teachers.length
            ? setSelectedTeachers([])
            : setSelectedTeachers(teachers.map((t) => t.username));
    };
    const handleSubmit = () => {
        if (!title || selectedTeachers.length === 0) return;
        onAssign({ title, description: desc, assignedTo: selectedTeachers });
        onClose();
    };
    return (
        <Modal
            title={isSpecific ? `Assign Task to ${teacher.username}` : "Assign Task"}
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!title || selectedTeachers.length === 0}>
                        Assign ({selectedTeachers.length})
                    </Button>
                </>
            }>
            <div className="space-y-4">
                {!isSpecific && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-600">
                                Assign To
                            </label>
                            <button
                                onClick={handleSelectAll}
                                className="text-xs text-violet-600 font-medium hover:underline">
                                {selectedTeachers.length === teachers.length
                                    ? "Deselect All"
                                    : "Select All"}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                            {teachers.map((t) => (
                                <label
                                    key={t.id}
                                    className={`flex items-center gap-2 text-sm p-1.5 rounded cursor-pointer ${selectedTeachers.includes(t.username)
                                        ? "bg-violet-100 text-violet-700"
                                        : "hover:bg-slate-100"
                                        }`}>
                                    <input
                                        type="checkbox"
                                        className="accent-violet-600"
                                        checked={selectedTeachers.includes(t.username)}
                                        onChange={() => handleToggleTeacher(t.username)}
                                    />
                                    <span className="truncate capitalize">{t.username}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <InputField
                    label="Task Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">
                        Description
                    </label>
                    <textarea
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        rows={3}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    );
};

const ReviewSubmissionModal = ({ review, onClose, onReviewAction }) => {
    const [comment, setComment] = useState(review.comment || "");

    return (
        <Modal
            title="Review Submission"
            onClose={onClose}
            maxWidth="max-w-6xl"
            footer={
                <>
                    <Button
                        variant="warning"
                        onClick={() => onReviewAction(review, "needs_revision", comment)}>
                        Request Revision
                    </Button>
                    <Button
                        variant="success"
                        onClick={() => onReviewAction(review, "approved", comment)}>
                        Approve
                    </Button>
                </>
            }>
            <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm space-y-1">
                    <p>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Instructor:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400 capitalize">{review.username}</span>
                    </p>
                    <p>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Level:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">{review.levelName}</span>
                    </p>
                    <p>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Challenge:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">{review.challengeName}</span>
                    </p>
                    {review.submittedAt && (
                        <p>
                            <span className="font-bold text-slate-700 dark:text-slate-300">Submitted:</span>{" "}
                            <span className="text-slate-600 dark:text-slate-400">
                                {new Date(review.submittedAt).toLocaleString()}
                            </span>
                        </p>
                    )}
                </div>

                {/* Question and Code Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Question Panel */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <FileText size={16} className="text-blue-500" />
                            Question
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 max-h-96 overflow-y-auto space-y-4">
                            <h5 className="font-bold text-slate-900 dark:text-white text-base mb-3">
                                {review.questionTitle || review.challengeName}
                            </h5>

                            {/* Question Instructions - Render HTML */}
                            {review.questionInstructions ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <div
                                        className="text-slate-700 dark:text-slate-300"
                                        dangerouslySetInnerHTML={{ __html: review.questionInstructions }}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                    No instructions provided
                                </p>
                            )}

                            {/* Expected Output */}
                            {review.expectedOutput && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                        Expected Output:
                                    </p>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                        <pre className="text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap">
                                            {review.expectedOutput}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Code Panel */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <Code size={16} className="text-green-500" />
                            Instructor's Answer
                            {review.type === 'blockly' && (
                                <span className="ml-2 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded text-xs">
                                    Blockly
                                </span>
                            )}
                        </h4>
                        
                        {/* Show Blockly visual blocks for Blockly submissions */}
                        {review.type === 'blockly' ? (
                            <BlocklyPreview 
                                blocklyXml={review.blocklyXml} 
                                code={review.code}
                                review={review}
                                height={280} 
                            />
                        ) : (
                            <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-700">
                                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{review.code || "# No code submitted"}</pre>
                            </div>
                        )}

                        {/* Actual Output */}
                        {review.output && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                    Your Output:
                                </p>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                    <pre className="text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap">
                                        {review.output}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Admin Feedback / Comments
                    </label>
                    <textarea
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Great job! or Please fix..."
                    />
                </div>
            </div>
        </Modal>
    );
};

const AddEventModal = ({ teachers, onClose, onSave }) => {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [instructor, setInstructor] = useState("");
    const handleSubmit = () => {
        if (!title || !date) return;
        onSave({ title, date, instructor });
    };
    return (
        <Modal
            title="Add Schedule Event"
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>Save Event</Button>
                </>
            }>
            <div className="space-y-4">
                <InputField
                    label="Event Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Python Workshop"
                />
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">
                        Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">
                        Instructor (Optional)
                    </label>
                    <select
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        value={instructor}
                        onChange={(e) => setInstructor(e.target.value)}>
                        <option value="">None</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.username}>
                                {t.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </Modal>
    );
};

const ActivityLogModal = ({ teacher, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!teacher) return;
        let unsub = () => {};
        
        const loadLogs = async () => {
            try {
                const usernameLower = teacher.username.toLowerCase();
                const records = await pb.collection("activityLog").getFullList({
                    filter: `username="${usernameLower}"`,
                    sort: '-created'
                });
                setLogs(records);
                setLoading(false);
            } catch (e) {
                console.error("Error loading logs", e);
                setLoading(false);
            }
        };

        loadLogs();
        
        pb.collection("activityLog").subscribe('*', function(e) {
            loadLogs();
        }).then(u => unsub = u);

        return () => unsub();
    }, [teacher]);
    return (
        <Modal title={`Activity Log: ${teacher?.username}`} onClose={onClose}>
            {loading ? (
                <div className="flex justify-center">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.length === 0 && (
                        <p className="text-center text-slate-500">No activity recorded.</p>
                    )}
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                            <div>
                                <p className="font-semibold text-sm text-slate-700 capitalize">
                                    {log.action.replace(/_/g, " ")}
                                </p>
                                {log.context?.challengeName && (
                                    <p className="text-xs text-slate-500">
                                        {log.context.challengeName}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-slate-400">
                                {new Date(log.created || log.timestamp).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

export const AdminPanel = () => {
    const { currentUser, logout } = useAppState();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [teachers, setTeachers] = useState([]);
    const [levels, setLevels] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [scheduleEvents, setScheduleEvents] = useState([]);

    const [selectedLevelId, setSelectedLevelId] = useState(null);
    const [compareLevelId, setCompareLevelId] = useState(null);
    const [activeReview, setActiveReview] = useState(null);

    const [assignTaskUser, setAssignTaskUser] = useState(null);
    const [viewLogUser, setViewLogUser] = useState(null);
    const [viewSnippetsUser, setViewSnippetsUser] = useState(null);
    const [addEventOpen, setAddEventOpen] = useState(false);

    const [trackingData, setTrackingData] = useState([]);
    const [allPendingReviews, setAllPendingReviews] = useState([]);
    const [loadingTracking, setLoadingTracking] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState('coder');
    const [juniorLessonLevel, setJuniorLessonLevel] = useState(null);
    const [questionManagerLevel, setQuestionManagerLevel] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        
        const loadDashboardData = async () => {
            try {
                const [t, l, k, e] = await Promise.all([
                    pb.collection("teachers").getFullList(),
                    pb.collection("codingLevels").getFullList({ sort: 'name' }),
                    pb.collection("tasks").getFullList(),
                    pb.collection("events").getFullList()
                ]);
                setTeachers(t);
                setLevels(l);
                setTasks(k);
                setScheduleEvents(e);
            } catch (err) {
                if (err?.isAbort) return; // Ignore auto-cancelled requests
                console.error("Error loading dashboard data", err);
            }
        };

        loadDashboardData();

        let unsubs = [];
        pb.collection("teachers").subscribe('*', loadDashboardData).then(u => unsubs.push(u));
        pb.collection("codingLevels").subscribe('*', loadDashboardData).then(u => unsubs.push(u));
        pb.collection("tasks").subscribe('*', loadDashboardData).then(u => unsubs.push(u));
        pb.collection("events").subscribe('*', loadDashboardData).then(u => unsubs.push(u));

        return () => unsubs.forEach(u => u());
    }, [currentUser]);

    const fetchCurriculumShell = async (levelId, curriculumType) => {
      try {
        const unitsData = await pb.collection(curriculumType).getFullList({
            filter: `levelId="${levelId}"`,
            requestKey: null // prevent auto-cancellation
        });
        const fullUnits = [];
        for (const unitDoc of unitsData) {
            const unit = { id: unitDoc.id, ...unitDoc, challenges: [] };
            const challengesData = await pb.collection("challenges").getFullList({
                filter: `unitId="${unit.id}" && curriculumType="${curriculumType}"`,
                requestKey: null // prevent auto-cancellation
            });
            for (const challengeDoc of challengesData) {
                const challenge = { id: challengeDoc.id, ...challengeDoc, steps: [] };
                const stepsData = await pb.collection("steps").getFullList({
                    filter: `challengeId="${challenge.id}"`,
                    requestKey: null // prevent auto-cancellation
                });
                for (const stepDoc of stepsData) {
                    challenge.steps.push({ id: stepDoc.id, ...stepDoc });
                }
                challenge.steps.sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
                unit.challenges.push(challenge);
            }
            fullUnits.push(unit);
        }
        fullUnits.sort((a, b) => parseInt(a.unitNumber || 0) - parseInt(b.unitNumber || 0));
        return fullUnits;
      } catch (err) {
          if (err?.isAbort) return []; // Ignore auto-cancelled requests
          console.error("Error fetching curriculum", err);
          return [];
      }
    };

    useEffect(() => {
        if (
            (activeTab === "tracking" ||
                activeTab === "reviews" ||
                activeTab === "dashboard") &&
            levels.length > 0
        ) {
            setLoadingTracking(true);
            const load = async () => {
                const data = await Promise.all(
                    levels.map(async (level) => {
                        const units = await fetchCurriculumShell(level.id, "units_new");
                        return { name: level.name, id: level.id, newData: units };
                    })
                );
                setTrackingData(data);
                const pending = [];
                console.log('DEBUG REVIEWS: levels count:', data.length);
                data.forEach((lvl) => {
                    console.log('DEBUG REVIEWS: level:', lvl.name, 'units:', lvl.newData.length);
                    lvl.newData.forEach((unit) => {
                        console.log('DEBUG REVIEWS: unit:', unit.unitName, 'challenges:', unit.challenges.length);
                        unit.challenges.forEach((ch) => {
                            console.log('DEBUG REVIEWS: challenge:', ch.id, ch.challengeName, 'acks:', JSON.stringify(ch.acknowledgements));
                            if (ch.acknowledgements) {
                                Object.entries(ch.acknowledgements).forEach(([key, ack]) => {
                                    console.log('DEBUG REVIEWS: ack key:', key, 'status:', ack.status);
                                    if (ack.status === "pending") {
                                        // Handle composite keys (username--stepId)
                                        const username = ack.username || (key.includes('--') ? key.split('--')[0] : key);

                                        pending.push({
                                            levelId: lvl.id,
                                            levelName: lvl.name,
                                            unitId: unit.id,
                                            unitName: unit.unitName,
                                            challengeId: ch.id,
                                            challengeName: ch.challengeName,
                                            username: username,
                                            ackKey: key, // Store the actual key for updates
                                            submittedAt: ack.submittedAt,
                                            submissionComments: ch.submissionComments,
                                            code: ack.code,
                                            output: ack.output,
                                            questionTitle: ack.questionTitle,
                                            questionInstructions: ack.questionInstructions,
                                            expectedOutput: ack.expectedOutput,
                                            type: ack.type || 'python',
                                            blocklyXml: ack.blocklyXml,
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
                console.log('DEBUG REVIEWS: total pending:', pending.length);
                setAllPendingReviews(pending);
                setLoadingTracking(false);
            };
            load();
        }
    }, [activeTab, levels]);


    const handleAddEvent = async (eventData) => {
        await pb.collection("events").create({
            ...eventData
        });
        setAddEventOpen(false);
    };
    const handleAddTeacher = async (username) => {
        await pb.collection("teachers").create({
            username,
            role: "teacher"
        });
    };
    const handleDeleteTeacher = async (id) => {
        if (window.confirm("Delete this instructor?"))
            await pb.collection("teachers").delete(id);
    };
    const handleResetProgress = async (teacher) => {
        const username = teacher.username.toLowerCase();
        if (!window.confirm(`⚠️ Reset ALL progress for "${teacher.username}"?\n\nThis will delete:\n• All code submissions\n• All blockly progress\n• All training progress\n• All challenge acknowledgements\n\nThis action CANNOT be undone!`)) return;
        if (!window.confirm(`FINAL CONFIRMATION: Permanently delete all data for "${teacher.username}"?`)) return;

        try {
            // 1. Delete all submissions
            const subs = await pb.collection("submissions").getFullList({ filter: `username="${username}"` });
            for (const s of subs) await pb.collection("submissions").delete(s.id);

            // 2. Delete blockly progress
            try {
                const bp = await pb.collection("teacher_blockly_progress").getFullList({ filter: `teacherId="${teacher.id}"` });
                for (const b of bp) await pb.collection("teacher_blockly_progress").delete(b.id);
            } catch (e) { console.warn("No blockly progress to clear"); }

            // 3. Delete teacher_progress
            try {
                const tp = await pb.collection("teacher_progress").getFullList({ filter: `teacherId="${teacher.id}"` });
                for (const t of tp) await pb.collection("teacher_progress").delete(t.id);
            } catch (e) { console.warn("No teacher progress to clear"); }

            // 4. Clear acknowledgements from challenges
            const challenges = await pb.collection("challenges").getFullList();
            for (const ch of challenges) {
                const acks = ch.acknowledgements || {};
                const comments = ch.submissionComments || {};
                let changed = false;
                for (const key of Object.keys(acks)) {
                    const ackUsername = acks[key]?.username || (key.includes('--') ? key.split('--')[0] : key);
                    if (ackUsername === username) {
                        delete acks[key];
                        delete comments[key];
                        changed = true;
                    }
                }
                if (changed) {
                    await pb.collection("challenges").update(ch.id, { acknowledgements: acks, submissionComments: comments });
                }
            }

            alert(`✅ All progress for "${teacher.username}" has been reset.\n\nDeleted: ${subs.length} submissions`);
        } catch (err) {
            console.error("Error resetting progress:", err);
            alert("Failed to reset progress: " + (err?.message || err));
        }
    };
    const handleAddLevel = async () => {
        const name = prompt("Level Name?");
        if (name) await pb.collection("codingLevels").create({ name });
    };
    const handleDeleteLevel = async (id) => {
        if (window.confirm("Delete level?"))
            await pb.collection("codingLevels").delete(id);
    };

    const handleInitializeLevels = async () => {
        if (
            !window.confirm(
                "This will add the default levels. Existing levels will remain. Continue?"
            )
        )
            return;

        const defaultLevels = [
            "Level 1: Basic 1",
            "Level 2: Basic 2",
            "Level 3: Intermediate 1",
            "Level 4: Intermediate 2",
            "Level 5: Advance 1",
            "Level 6: Advance 2",
            "Level 7: Advance 3",
            "Level 8: Skip to Intermediate",
        ];

        for (const name of defaultLevels) {
            if (!levels.find((l) => l.name === name)) {
                await pb.collection("codingLevels").create({ name });
            }
        }
        alert("Levels initialized!");
    };

    const handleReviewAction = async (reviewData, status, comment) => {
        try {
            const { challengeId, username, ackKey } = reviewData;
            
            setAllPendingReviews((prev) =>
                prev.filter(
                    (r) => !(r.challengeId === challengeId && r.username === username && r.ackKey === ackKey)
                )
            );

            const data = await pb.collection("challenges").getOne(challengeId);
            const acks = data.acknowledgements || {};
            const comments = data.submissionComments || {};

            const keyToUpdate = ackKey || username.toLowerCase();

            acks[keyToUpdate] = {
                ...acks[keyToUpdate],
                status,
                reviewedAt: new Date().toISOString(),
            };

            if (comment) comments[keyToUpdate] = comment;
            await pb.collection("challenges").update(challengeId, {
                acknowledgements: acks,
                submissionComments: comments,
            });
            setActiveReview(null);
        } catch (e) {
            console.error(e);
            alert("Error updating review status");
        }
    };

    const handleUpdateTrainingStatus = async (teacherId, levelId, newStatus) => {
        try {
            const teacher = await pb.collection("teachers").getOne(teacherId);
            const currentStatus = teacher.trainingStatus || {};
            currentStatus[levelId] = newStatus;
            await pb.collection("teachers").update(teacherId, { trainingStatus: currentStatus });
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    const renderContent = () => {
        if (questionManagerLevel)
            return (
                <QuestionManager
                    levelId={questionManagerLevel.id}
                    levelName={questionManagerLevel.name}
                    onBack={() => setQuestionManagerLevel(null)}
                />
            );
        if (juniorLessonLevel)
            return (
                <JuniorLessonManager
                    levelId={juniorLessonLevel.id}
                    levelName={juniorLessonLevel.name}
                    onBack={() => setJuniorLessonLevel(null)}
                />
            );
        if (compareLevelId)
            return (
                <CurriculumComparisonView
                    levelId={compareLevelId}
                    onBack={() => setCompareLevelId(null)}
                    userRole="admin"
                />
            );
        if (selectedLevelId)
            return (
                <CurriculumEditor
                    levelId={selectedLevelId}
                    onBack={() => setSelectedLevelId(null)}
                />
            );

        switch (activeTab) {
            case "dashboard":
                return (
                    <DashboardView
                        teachers={teachers}
                        levels={levels}
                        tasks={tasks}
                        pendingReviewsCount={allPendingReviews.length}
                        onNavigate={setActiveTab}
                    />
                );
            case "instructors":
                return (
                    <InstructorsView
                        teachers={teachers}
                        onAddTeacher={handleAddTeacher}
                        onDeleteTeacher={handleDeleteTeacher}
                        onAssignTask={setAssignTaskUser}
                        onViewLog={setViewLogUser}
                        onViewSnippets={setViewSnippetsUser}
                        onResetProgress={handleResetProgress}
                    />
                );
            case "snippets":
                return <AdminSnippetsView />;
            case "tasks":
                return (
                    <TasksView
                        tasks={tasks}
                        teachers={teachers}
                        onAddTask={() => setAssignTaskUser({})}
                    />
                );
            case "reviews":
                return (
                    <PendingReviewsView
                        pendingReviews={allPendingReviews}
                        onOpenReview={setActiveReview}
                    />
                );
            case "tracking":
                return (
                    <TeacherTrackingView
                        allLevels={trackingData}
                        teachers={teachers}
                        onAssignTask={setAssignTaskUser}
                        onViewLog={setViewLogUser}
                        isLoading={loadingTracking}
                    />
                );
            case "training":
                return (
                    <TrainingManagementView
                        allLevels={levels}
                        teachers={teachers}
                        onUpdateStatus={handleUpdateTrainingStatus}
                        fetchLevelData={(levelId) => fetchCurriculumShell(levelId, "units_new")}
                    />
                );
            case "update_progress":
                return <StudentProgressReport />;
            case "materials": {
                // Group levels by category
                const getLevelCategory = (level) => {
                    if (level.category) return level.category.toLowerCase();
                    const name = level.name.toLowerCase();
                    if (name.includes('kinder')) return 'kinder';
                    if (name.includes('junior')) return 'junior';
                    return 'coder';
                };

                const groupedLevels = {
                    kinder: levels.filter(l => getLevelCategory(l) === 'kinder'),
                    junior: levels.filter(l => getLevelCategory(l) === 'junior'),
                    coder: levels.filter(l => getLevelCategory(l) === 'coder'),
                };

                return (
                    <div className="space-y-6 animate-in fade-in">
                        <Breadcrumb path={["Curriculum", "Materials"]} />
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Curriculum</h2>
                            <div className="flex gap-3">
                                <Button onClick={handleAddLevel} variant="primary">
                                    <Plus size={18} /> Create New Level
                                </Button>
                                <Button onClick={handleInitializeLevels} variant="secondary">
                                    <ListChecks size={18} /> Initialize Defaults
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Kinder Category */}
                            {groupedLevels.kinder.length > 0 && (
                                <Card className="overflow-hidden">
                                    <button
                                        onClick={() => setExpandedCategory(expandedCategory === 'kinder' ? null : 'kinder')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                                                <BookOpen className="text-pink-600 dark:text-pink-400" size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Kinder</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{groupedLevels.kinder.length} levels</p>
                                            </div>
                                        </div>
                                        {expandedCategory === 'kinder' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {expandedCategory === 'kinder' && (
                                        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {groupedLevels.kinder.map(l => (
                                                <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <h4 className="font-semibold text-slate-800 dark:text-white mb-3">{l.name}</h4>
                                                    <div className="flex gap-2">
                                                        <Button className="flex-1 h-8 text-xs" onClick={() => setSelectedLevelId(l.id)}>Edit</Button>
                                                        <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => setCompareLevelId(l.id)}>Compare</Button>
                                                        <button onClick={() => handleDeleteLevel(l.id)} className="text-red-400 hover:text-red-600 px-2">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Junior Category */}
                            {groupedLevels.junior.length > 0 && (
                                <Card className="overflow-hidden">
                                    <button
                                        onClick={() => setExpandedCategory(expandedCategory === 'junior' ? null : 'junior')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Junior</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{groupedLevels.junior.length} levels</p>
                                            </div>
                                        </div>
                                        {expandedCategory === 'junior' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {expandedCategory === 'junior' && (
                                        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {groupedLevels.junior.map(l => (
                                                <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <h4 className="font-semibold text-slate-800 dark:text-white mb-3">{l.name}</h4>



                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            className="w-full h-8 text-xs"
                                                            variant="primary"
                                                            onClick={() => setJuniorLessonLevel({ id: l.id, name: l.name })}>
                                                            Manage Lessons
                                                        </Button>
                                                        <div className="flex gap-2">
                                                            <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => setSelectedLevelId(l.id)}>Edit</Button>
                                                            <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => setCompareLevelId(l.id)}>Compare</Button>
                                                            <button onClick={() => handleDeleteLevel(l.id)} className="text-red-400 hover:text-red-600 px-2">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Coder Category */}
                            {groupedLevels.coder.length > 0 && (
                                <Card className="overflow-hidden">
                                    <button
                                        onClick={() => setExpandedCategory(expandedCategory === 'coder' ? null : 'coder')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                                                <BookOpen className="text-violet-600 dark:text-violet-400" size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Coder</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{groupedLevels.coder.length} levels</p>
                                            </div>
                                        </div>
                                        {expandedCategory === 'coder' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {expandedCategory === 'coder' && (
                                        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {groupedLevels.coder.map(l => {
                                                const isAdvance = l.name.toLowerCase().includes('advance');
                                                return (
                                                    <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <h4 className="font-semibold text-slate-800 dark:text-white mb-3">{l.name}</h4>
                                                        <div className="flex flex-col gap-2">
                                                            {isAdvance && (
                                                                <Button
                                                                    className="w-full h-8 text-xs"
                                                                    variant="primary"
                                                                    onClick={() => setQuestionManagerLevel({ id: l.id, name: l.name })}>
                                                                    Manage Questions
                                                                </Button>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => setSelectedLevelId(l.id)}>Edit</Button>
                                                                <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => setCompareLevelId(l.id)}>Compare</Button>
                                                                <button onClick={() => handleDeleteLevel(l.id)} className="text-red-400 hover:text-red-600 px-2">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>
                    </div>
                );
            }
            case "schedule":
                return (
                    <ScheduleView
                        tasks={tasks}
                        events={scheduleEvents}
                        teachers={teachers}
                        onAddEvent={() => setAddEventOpen(true)}
                    />
                );
            case "portal":
                return <PortalView levels={levels} />;
            case "assign":
                return (
                    <div className="flex items-center justify-center h-96 text-slate-400">
                        Assign Content Coming Soon
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
            {assignTaskUser && (
                <AssignTaskModal
                    teacher={assignTaskUser}
                    teachers={teachers}
                    onClose={() => setAssignTaskUser(null)}
                />
            )}
            {viewLogUser && (
                <ActivityLogModal
                    teacher={viewLogUser}
                    onClose={() => setViewLogUser(null)}
                />
            )}
            {viewSnippetsUser && (
                <Modal
                    title={`Code Snippets: ${viewSnippetsUser.username}`}
                    onClose={() => setViewSnippetsUser(null)}
                    maxWidth="max-w-6xl">
                    <InstructorSnippetsView username={viewSnippetsUser.username} />
                </Modal>
            )}
            {activeReview && (
                <ReviewSubmissionModal
                    review={activeReview}
                    onClose={() => setActiveReview(null)}
                    onReviewAction={handleReviewAction}
                />
            )}
            {addEventOpen && (
                <AddEventModal
                    teachers={teachers}
                    onClose={() => setAddEventOpen(false)}
                    onSave={handleAddEvent}
                />
            )}

            <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 flex flex-col flex-shrink-0 shadow-2xl z-20">
                <div className="p-6 flex items-center gap-3 text-white font-bold text-xl border-b border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <BookOpen className="text-white" size={20} />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Admin Portal
                    </span>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
                    {[
                        { id: "dashboard", l: "Dashboard", i: LayoutDashboard },
                        { id: "tasks", l: "Tasks", i: CheckSquare },
                        { id: "reviews", l: "Reviews", i: Clock },
                        { id: "instructors", l: "Instructors", i: Users },
                        { id: "tracking", l: "Progress", i: Activity },
                        { id: "training", l: "Training Flow", i: GraduationCap },
                        { id: "update_progress", l: "Update Progress", i: TrendingUp },
                        { id: "materials", l: "Curriculum", i: BookOpen },
                        { id: "schedule", l: "Schedule", i: CalendarIcon },
                        { id: "portal", l: "Portal", i: Globe },
                        { id: "assign", l: "Assign", i: ClipboardList },

                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setCompareLevelId(null);
                                setSelectedLevelId(null);
                                setJuniorLessonLevel(null);
                                setQuestionManagerLevel(null);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${activeTab === item.id
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                                : "hover:bg-white/5 text-slate-400 hover:text-white"
                                }`}>
                            {activeTab === item.id && (
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 -z-10" />
                            )}
                            <item.i size={20} className={`transition-transform duration-300 ${activeTab === item.id ? "scale-110" : "group-hover:scale-110"}`} />
                            <span className="font-medium">{item.l}</span>
                            {item.id === "reviews" && allPendingReviews.length > 0 && (
                                <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 animate-pulse">
                                    {allPendingReviews.length}
                                </span>
                            )}
                        </button>
                    ))}
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
                    <header className="fixed top-0 right-0 left-0 sm:left-72 z-50 bg-slate-50 dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300">
                        <div className="max-w-7xl mx-auto px-8 py-3 flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">
                                    {activeTab}
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Overview and management
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                <ThemeToggle />
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {currentUser?.username}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                                            {currentUser?.role}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900 dark:to-indigo-900 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-700 shadow-sm">
                                        {currentUser?.username?.[0]}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div className="animate-in delay-100 pt-20">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

import React, { useState } from "react";
import {
    Trophy,
    Target,
    BookOpen,
    CheckSquare,
    Check,
    Clock,
    PlayCircle,
    AlertCircle,
} from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Modal } from "../common/Modal";
import { Breadcrumb } from "../common/Breadcrumb";

const DetailListModal = ({ title, items, type, onClose }) => (
    <Modal
        title={title}
        onClose={onClose}
        footer={
            <Button onClick={onClose} variant="secondary">
                Close
            </Button>
        }>
        <div className="space-y-3">
            {items.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">No items found.</p>
            ) : (
                items.map((item, i) => (
                    <div
                        key={i}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            {type === "level" ? (
                                <p className="font-bold text-slate-700 dark:text-slate-200">{item.name}</p>
                            ) : (
                                <>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                        {item.challengeName}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {item.unitName} - {item.levelName}
                                    </p>
                                </>
                            )}
                        </div>
                        {type === "submission" && (
                            <Badge status={item.status || "pending"} />
                        )}
                    </div>
                ))
            )}
        </div>
    </Modal>
);

export const TeacherOverview = ({
    stats,
    rawData,
    tasks,
    nextChallenge,
    submittedCountData = [],
    onNavigate,
    onTaskComplete,
}) => {
    const [modalType, setModalType] = useState(null);

    const getModalData = () => {
        switch (modalType) {
            case "finished":
                return {
                    title: "Finished Levels",
                    items: rawData.filter((l) => l.progress === 100),
                    type: "level",
                };
            case "submitted":
                return {
                    title: "Submitted Challenges",
                    items: submittedCountData.map(s => ({
                        challengeName: s.challengeName,
                        unitName: s.unitName,
                        levelName: s.levelName,
                        status: s.status || "pending"
                    })),
                    type: "submission",
                };
            case "active":
                return {
                    title: "Active Levels",
                    items: rawData.filter((l) => l.progress > 0 && l.progress < 100),
                    type: "level",
                };
            default:
                return { title: "", items: [] };
        }
    };

    const modalData = getModalData();

    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Dashboard", "Overview"]} />
            {modalType && (
                <DetailListModal
                    title={modalData.title}
                    items={modalData.items}
                    type={modalData.type}
                    onClose={() => setModalType(null)}
                />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        l: "Levels Finished",
                        v: stats.finishedLevels,
                        i: Trophy,
                        c: "text-amber-500",
                        bg: "bg-amber-50 dark:bg-amber-900/20",
                        id: "finished",
                    },
                    {
                        l: "Challenges Submitted",
                        v: stats.submittedChallenges,
                        i: Target,
                        c: "text-emerald-500",
                        bg: "bg-emerald-50 dark:bg-emerald-900/20",
                        id: "submitted",
                    },
                    {
                        l: "Active Levels",
                        v: stats.activeLevels,
                        i: BookOpen,
                        c: "text-blue-500",
                        bg: "bg-blue-50 dark:bg-blue-900/20",
                        id: "active",
                    },
                ].map((s, i) => (
                    <Card
                        key={i}
                        onClick={() => setModalType(s.id)}
                        className="cursor-pointer hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{s.l}</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                                    {s.v}
                                </h3>
                            </div>
                            <div className={`p-3 rounded-xl ${s.bg} ${s.c}`}>
                                <s.i size={24} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <CheckSquare className="text-violet-500" /> My Tasks
                    </h3>
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                            <Check size={32} className="mx-auto mb-2 opacity-50" />
                            <p>All caught up! No pending tasks.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex gap-4 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
                                    <div className="mt-1">
                                        {task.status === "completed" ? (
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                <Check size={14} />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                <Clock size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <h4
                                            className={`font-bold text-slate-800 dark:text-white ${task.status === "completed" ? "line-through opacity-50" : ""
                                                }`}>
                                            {task.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {task.description}
                                        </p>
                                    </div>
                                    {task.status !== "completed" && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => onTaskComplete(task.id)}>
                                            Mark Done
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-none">
                    <h3 className="font-bold text-lg mb-2">Continue Learning</h3>
                    <p className="text-violet-100 text-sm mb-6">
                        Pick up where you left off and complete your next challenge.
                    </p>
                    {nextChallenge ? (
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <PlayCircle className="text-emerald-400" />
                                <span className="font-bold">Next Up</span>
                            </div>
                            <p className="font-medium text-sm">
                                {nextChallenge.levelName.replace(/^Level \d+:\s*/, "")} - {nextChallenge.unitName} - {nextChallenge.challengeName}
                            </p>
                        </div>
                    ) : rawData.length > 0 ? (
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 mb-6 flex items-center gap-3">
                            <Trophy className="text-amber-400" />
                            <p className="text-sm">All caught up! You've completed all available challenges.</p>
                        </div>
                    ) : (
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 mb-6 flex items-center gap-3">
                            <AlertCircle className="text-amber-400" />
                            <p className="text-sm">No active curriculum found.</p>
                        </div>
                    )}
                    <button
                        className="w-full bg-white text-violet-700 hover:bg-violet-50 transition-colors px-4 py-2 mt-2 rounded-lg font-bold text-sm"
                        onClick={() => onNavigate("curriculum")}>
                        Go to Curriculum
                    </button>
                </Card>
            </div>
        </div>
    );
};

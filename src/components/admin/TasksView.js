import React, { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Breadcrumb } from "../common/Breadcrumb";

const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";
    try {
        if (timestamp.seconds)
            return new Date(timestamp.seconds * 1000).toLocaleString();
        return new Date(timestamp).toLocaleString();
    } catch (e) {
        return "Invalid Date";
    }
};

export const TasksView = ({ tasks, teachers, onAddTask }) => {
    const [filter, setFilter] = useState("all");
    const filteredTasks = tasks.filter((t) => {
        if (filter === "all") return true;
        return t.status === filter;
    });
    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Management", "Tasks"]} />
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Task Management</h2>
                    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1 gap-1 ml-4">
                        {["all", "pending", "completed"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${filter === f
                                    ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <Button onClick={onAddTask}>
                    <Plus size={18} /> New Task
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                    <Card
                        key={task.id}
                        className="flex flex-col h-full border-l-4 border-l-violet-500">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">{task.title}</h4>
                            <Badge status={task.status} />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-grow">
                            {task.description || "No description provided."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1 capitalize">
                                <Users size={12} /> {task.assignedTo}
                            </span>
                            <span>{formatTimestamp(task.createdAt)}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

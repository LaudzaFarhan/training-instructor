import React, { useState, useEffect, useMemo } from "react";
import {
    Users,
    BookOpen,
    AlertCircle,
    Clock,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { pb } from "../../context/AppStateContext";
import { Card } from "../common/Card";
import { Breadcrumb } from "../common/Breadcrumb";

const COLORS = {
    primary: "#7c3aed",
    success: "#10b981",
};

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

export const DashboardView = ({
    teachers,
    levels,
    tasks,
    pendingReviewsCount,
    onNavigate,
}) => {
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;
    const [activityLog, setActivityLog] = useState([]);

    useEffect(() => {
        const fetchLog = async () => {
            try {
                // Fetch the latest 10 logs
                const result = await pb.collection("activityLog").getList(1, 10, {
                    sort: "-created",
                });
                setActivityLog(result.items);
            } catch (error) {
                if (error?.isAbort) return; // Ignore auto-cancelled requests
                console.error("Error fetching activity log:", error);
            }
        };

        fetchLog();

        // Subscribe to real-time changes
        pb.collection("activityLog").subscribe("*", function (e) {
            fetchLog();
        });

        return () => {
            pb.collection("activityLog").unsubscribe();
        };
    }, []);

    const chartData = useMemo(() => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const data = days.map((d) => ({ name: d, logins: 0, submissions: 0 }));
        return data.map((d) => ({
            ...d,
            logins: Math.floor(Math.random() * 20),
            submissions: Math.floor(Math.random() * 10),
        }));
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Breadcrumb path={["Dashboard", "Overview"]} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: "Instructors",
                        val: teachers.length,
                        icon: Users,
                        col: "text-violet-600 dark:text-violet-400",
                        bg: "bg-violet-50 dark:bg-violet-900/20",
                        link: "instructors",
                    },
                    {
                        label: "Levels",
                        val: levels.length,
                        icon: BookOpen,
                        col: "text-blue-600 dark:text-blue-400",
                        bg: "bg-blue-50 dark:bg-blue-900/20",
                        link: "materials",
                    },
                    {
                        label: "Pending Tasks",
                        val: pendingTasks,
                        icon: AlertCircle,
                        col: "text-amber-600 dark:text-amber-400",
                        bg: "bg-amber-50 dark:bg-amber-900/20",
                        link: "tasks",
                    },
                    {
                        label: "Pending Reviews",
                        val: pendingReviewsCount,
                        icon: Clock,
                        col: "text-indigo-600 dark:text-indigo-400",
                        bg: "bg-indigo-50 dark:bg-indigo-900/20",
                        link: "reviews",
                    },
                ].map((s, i) => (
                    <Card
                        key={i}
                        onClick={() => s.link && onNavigate(s.link)}
                        className={
                            s.link ? "cursor-pointer hover:shadow-md transition-all" : ""
                        }>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                                    {s.val}
                                </h3>
                            </div>
                            <div className={`p-3 rounded-xl ${s.bg} ${s.col}`}>
                                <s.icon size={24} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 h-80">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6">Activity Overview</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0"
                                strokeOpacity={0.2}
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8" }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#94a3b8" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "none",
                                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                                    backgroundColor: "#1e293b",
                                    color: "#f8fafc",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="logins"
                                stroke={COLORS.primary}
                                strokeWidth={3}
                                dot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="submissions"
                                stroke={COLORS.success}
                                strokeWidth={3}
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="h-80 overflow-hidden flex flex-col">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">
                        Recent Activity Feed
                    </h3>
                    <div className="overflow-y-auto space-y-3 pr-2 flex-1 custom-scrollbar">
                        {activityLog.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div
                                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.action.includes("login")
                                        ? "bg-emerald-500"
                                        : "bg-blue-500"
                                        }`}
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                        {log.username}{" "}
                                        <span className="text-slate-400 font-normal">
                                            {log.action.replace(/_/g, " ")}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {formatTimestamp(log.created)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

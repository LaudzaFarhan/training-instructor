import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "../common/Button";
import { Breadcrumb } from "../common/Breadcrumb";

export const ScheduleView = ({ tasks, events, onAddEvent, teachers }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const d = new Date(year, month + 1, 0).getDate();
        const fd = new Date(year, month, 1).getDay();
        const arr = [];
        for (let i = 0; i < fd; i++) arr.push(null);
        for (let i = 1; i <= d; i++) arr.push(new Date(year, month, i));
        return arr;
    }, [currentDate]);

    const getEventsForDay = (day) => {
        if (!day) return [];
        const dayStr = day.toISOString().split("T")[0];
        const taskEvents = tasks
            .filter((t) => t.deadline && t.deadline.startsWith(dayStr))
            .map((t) => ({ id: t.id, title: `Due: ${t.title}`, type: "task", ...t }));
        const customEvents = events
            .filter((e) => e.date && e.date.startsWith(dayStr))
            .map((e) => ({ id: e.id, title: e.title, type: "event", ...e }));
        return [...taskEvents, ...customEvents];
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Management", "Schedule"]} />
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Training Schedule</h2>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() =>
                            setCurrentDate(
                                new Date(
                                    currentDate.getFullYear(),
                                    currentDate.getMonth() - 1,
                                    1
                                )
                            )
                        }>
                        <ChevronDown className="rotate-90" size={16} />
                    </Button>
                    <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[150px] text-center">
                        {currentDate.toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                        })}
                    </span>
                    <Button
                        variant="secondary"
                        onClick={() =>
                            setCurrentDate(
                                new Date(
                                    currentDate.getFullYear(),
                                    currentDate.getMonth() + 1,
                                    1
                                )
                            )
                        }>
                        <ChevronRight size={16} />
                    </Button>
                    <Button onClick={onAddEvent} className="ml-4">
                        <Plus size={16} /> Add Event
                    </Button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
                <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-slate-500 dark:text-slate-400 text-sm uppercase">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d}>{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2 h-[600px] overflow-y-auto custom-scrollbar">
                    {days.map((day, i) => (
                        <div
                            key={i}
                            className={`border rounded-lg p-2 min-h-[100px] transition-colors ${day
                                ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-500"
                                : "bg-slate-50 dark:bg-slate-900/50 border-transparent"
                                }`}>
                            {day && (
                                <>
                                    <span
                                        className={`text-sm font-medium ${day.toDateString() === new Date().toDateString()
                                            ? "text-white bg-violet-600 rounded-full w-6 h-6 flex items-center justify-center"
                                            : "text-slate-700 dark:text-slate-300"
                                            }`}>
                                        {day.getDate()}
                                    </span>
                                    <div className="space-y-1 mt-1">
                                        {getEventsForDay(day).map((ev) => (
                                            <div
                                                key={ev.id}
                                                className={`text-xs p-1 rounded truncate ${ev.type === "task"
                                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                                    : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                    }`}>
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

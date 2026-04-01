import React from "react";

export const InputField = ({ label, rightElement, ...props }) => (
    <div className="space-y-1 w-full">
        {label && (
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
        )}
        <div className="relative">
            <input
                className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all text-sm dark:text-white ${rightElement ? "pr-10" : ""
                    }`}
                {...props}
            />
            {rightElement && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {rightElement}
                </div>
            )}
        </div>
    </div>
);

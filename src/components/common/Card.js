import React from "react";

export const Card = ({ children, className = "", onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300 ${className}`}>
        {children}
    </div>
);

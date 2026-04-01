import React from "react";
import { Home, ChevronRight } from "lucide-react";

export const Breadcrumb = ({ path }) => (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
        <Home size={14} />
        {path.map((item, idx) => (
            <React.Fragment key={idx}>
                <ChevronRight size={14} />
                <span
                    className={
                        idx === path.length - 1 ? "font-semibold text-violet-600 dark:text-violet-400" : ""
                    }>
                    {item}
                </span>
            </React.Fragment>
        ))}
    </div>
);

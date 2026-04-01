import React from "react";

export const Badge = ({ status }) => {
    const styles = {
        active: "bg-emerald-100 text-emerald-700",
        approved: "bg-emerald-100 text-emerald-700",
        open: "bg-blue-100 text-blue-700",
        resolved: "bg-slate-100 text-slate-500",
        inactive: "bg-slate-100 text-slate-500",
        pending: "bg-amber-100 text-amber-700",
        completed: "bg-blue-100 text-blue-700",
        needs_revision: "bg-red-100 text-red-700",
        learning: "bg-blue-50 text-blue-600",
        observing: "bg-amber-50 text-amber-600",
        assisting: "bg-purple-50 text-purple-600",
        teaching: "bg-emerald-50 text-emerald-600",
    };
    const style = styles[status?.toLowerCase()] || styles.inactive;
    return (
        <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
            {status?.replace("_", " ")}
        </span>
    );
};

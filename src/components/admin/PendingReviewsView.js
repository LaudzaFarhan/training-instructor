import React, { useState } from "react";
import { Clock, ExternalLink } from "lucide-react";
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

export const PendingReviewsView = ({ pendingReviews, onOpenReview }) => {
    const [filterType, setFilterType] = useState("all");
    const [filterValue, setFilterValue] = useState("");
    const filtered = pendingReviews.filter((r) => {
        if (filterType === "instructor")
            return r.username.toLowerCase().includes(filterValue.toLowerCase());
        if (filterType === "level")
            return r.levelName.toLowerCase().includes(filterValue.toLowerCase());
        return true;
    });
    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Dashboard", "Reviews"]} />
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="text-amber-500" /> Pending Reviews (
                    {filtered.length})
                </h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                        value={filterType}
                        onChange={(e) => {
                            setFilterType(e.target.value);
                            setFilterValue("");
                        }}>
                        <option value="all">All Reviews</option>
                        <option value="instructor">By Instructor</option>
                        <option value="level">By Level</option>
                    </select>
                    {filterType !== "all" && (
                        <input
                            type="text"
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none dark:text-white"
                            placeholder={`Search ${filterType}...`}
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                        />
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((r, idx) => (
                    <Card
                        key={`${r.username}-${r.challengeId}`}
                        className="flex flex-col h-full border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold capitalize text-xs">
                                    {r.username[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 capitalize text-sm">
                                        {r.username}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {formatTimestamp(r.submittedAt)}
                                    </p>
                                </div>
                            </div>
                            <Badge status="pending" />
                        </div>
                        <div className="flex-grow space-y-1 mb-4">
                            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                {r.levelName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{r.unitName}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                                {r.challengeName}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={() => onOpenReview(r)}>
                                Review Submission
                            </Button>
                            <Button
                                variant="secondary"
                                className="px-3"
                                title="Preview in Editor"
                                onClick={() => {
                                    // Store review data in sessionStorage for the new tab
                                    const previewData = {
                                        ...r,
                                        submittedAt: r.submittedAt?.seconds 
                                            ? new Date(r.submittedAt.seconds * 1000).toISOString()
                                            : null
                                    };
                                    sessionStorage.setItem('reviewPreview', JSON.stringify(previewData));
                                    // Open preview in new tab
                                    window.open(`/review-preview?type=${r.type || 'python'}`, '_blank');
                                }}>
                                <ExternalLink size={16} />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

import React, { useState } from "react";
import { Play, Globe } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Breadcrumb } from "./Breadcrumb";

export const PortalView = ({ levels }) => {
    const [selectedLevelId, setSelectedLevelId] = useState("");

    const handleStart = () => {
        if (selectedLevelId) {
            const url = new URL(window.location.href);
            url.searchParams.set("portalLevelId", selectedLevelId);
            window.open(url.toString(), "_blank");
        }
    };

    // Removed inline rendering logic as it opens in new tab now

    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Portal", "Select Level"]} />
            <div className="max-w-xl mx-auto mt-20">
                <Card className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-violet-600 dark:text-violet-400">
                            <Globe size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Welcome to the Portal
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Select a level to begin your learning journey.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Select Level
                            </label>
                            <select
                                value={selectedLevelId}
                                onChange={(e) => setSelectedLevelId(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            >
                                <option value="">-- Choose a Level --</option>
                                {levels
                                    .slice()
                                    .sort((a, b) => {
                                        const order = [
                                            "Basic 1",
                                            "Basic 2",
                                            "Intermediate 1",
                                            "Intermediate 2",
                                            "Advance 1",
                                            "Advance 2",
                                            "Advance 3"
                                        ];
                                        // Normalize names for comparison (remove "Level X: " prefix if present)
                                        const cleanName = (name) => name.replace(/^Level \d+:\s*/, "").trim();

                                        const indexA = order.indexOf(cleanName(a.name));
                                        const indexB = order.indexOf(cleanName(b.name));

                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                        if (indexA !== -1) return -1;
                                        if (indexB !== -1) return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((level) => (
                                        <option key={level.id} value={level.id}>
                                            {level.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <Button
                            onClick={handleStart}
                            disabled={!selectedLevelId}
                            className="w-full py-4 text-lg font-bold shadow-lg shadow-violet-500/20"
                        >
                            Start Learning <Play size={20} className="ml-2 fill-current" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

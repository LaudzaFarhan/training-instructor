import React from "react";
import { BookOpen, ChevronRight, Star } from "lucide-react";
import { Card } from "../common/Card";
import { Breadcrumb } from "../common/Breadcrumb";

export const TeacherCurriculumList = ({ levels, onSelectLevel }) => {
    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Curriculum", "Browse"]} />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Available Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {levels.map((level, idx) => (
                    <Card
                        key={level.id}
                        onClick={() => onSelectLevel(level.id)}
                        className="group cursor-pointer hover:shadow-lg transition-all border-t-4 border-t-violet-500 relative overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BookOpen size={64} className="dark:text-white" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                            {level.name}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-2">
                            Master the concepts of {level.name} through interactive challenges
                            and projects.
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-1 text-amber-500">
                                <Star size={14} fill="currentColor" />
                                <Star size={14} fill="currentColor" />
                                <Star size={14} fill="currentColor" />
                                <Star size={14} fill="currentColor" />
                                <Star size={14} className="text-slate-300 dark:text-slate-600" />
                                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">(4.0)</span>
                            </div>
                            <span className="text-violet-600 dark:text-violet-400 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Start Learning <ChevronRight size={16} />
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

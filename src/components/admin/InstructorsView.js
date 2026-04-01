import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ListChecks, Activity, Trash2, Code, RotateCcw } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Modal } from "../common/Modal";
import { InputField } from "../common/InputField";
import { Breadcrumb } from "../common/Breadcrumb";

export const InstructorsView = ({
    teachers,
    onAssignTask,
    onViewLog,
    onAddTeacher,
    onDeleteTeacher,
    onViewSnippets,
    onResetProgress,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTeacherName, setNewTeacherName] = useState("");
    const filteredTeachers = teachers.filter((t) =>
        t.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleAddSubmit = async () => {
        if (newTeacherName.trim()) {
            await onAddTeacher(newTeacherName);
            setNewTeacherName("");
            setIsAddModalOpen(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Breadcrumb path={["Management", "Instructors"]} />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Search instructors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-white"
                    />
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={18} /> Add Instructor
                </Button>
            </div>
            <Card className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Instructor
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredTeachers.map((teacher, idx) => (
                            <motion.tr
                                key={teacher.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-sm capitalize">
                                            {teacher.username.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm capitalize">
                                                {teacher.username}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                ID: {teacher.id.substr(0, 8)}...
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 capitalize">
                                    {teacher.role || "Teacher"}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge status="active" />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onViewSnippets(teacher)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                            title="View Code Snippets">
                                            <Code size={18} />
                                        </button>
                                        <button
                                            onClick={() => onAssignTask(teacher)}
                                            className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                            title="Assign Task">
                                            <ListChecks size={18} />
                                        </button>
                                        <button
                                            onClick={() => onViewLog(teacher)}
                                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            title="View Logs">
                                            <Activity size={18} />
                                        </button>
                                        <button
                                            onClick={() => onResetProgress(teacher)}
                                            className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                            title="Reset All Progress">
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteTeacher(teacher.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                            title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            {isAddModalOpen && (
                <Modal
                    title="Add New Instructor"
                    onClose={() => setIsAddModalOpen(false)}
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddSubmit}>Add Instructor</Button>
                        </>
                    }>
                    <InputField
                        label="Username"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. john_doe"
                    />
                </Modal>
            )}
        </div>
    );
};

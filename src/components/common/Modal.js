import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export const Modal = ({ title, onClose, children, footer, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 top-20 bg-black/50 flex justify-center items-start z-50 p-4 pt-4 backdrop-blur-sm">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[calc(100vh-6rem)] transition-colors duration-300`}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow dark:text-slate-300">{children}</div>
            {footer && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end gap-3">
                    {footer}
                </div>
            )}
        </motion.div>
    </div>
);

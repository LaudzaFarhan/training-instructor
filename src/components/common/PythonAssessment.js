import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Play, CheckCircle, AlertCircle, Code, FileText, Lock, Award, Move, Plus, Edit2, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { pb, useAppState } from '../../context/AppStateContext';
import { Button } from './Button';
import { ErrorBoundary } from './ErrorBoundary';

// Suppress ResizeObserver errors (caused by Monaco Editor) and Pyodide CDN errors
if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
        if (message && message.includes) {
            // Suppress ResizeObserver errors (Monaco Editor)
            if (message.includes('ResizeObserver')) return true;
            // Suppress Pyodide CDN "Unexpected token" errors (HTML returned instead of JS)
            if (message.includes('Unexpected token') && (source || '').includes('pyodide')) return true;
        }
        return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
    };
    // Suppress unhandled promise rejections from Pyodide/CDN
    window.addEventListener('unhandledrejection', (event) => {
        const msg = event.reason?.message || '';
        if (msg.includes('Unexpected token') || msg.includes('pyodide')) {
            event.preventDefault();
        }
    });
}

// Python code execution using Pyodide (runs in browser)
let pyodideInstance = null;

const loadPyodide = async () => {
    if (pyodideInstance) return pyodideInstance;

    // Check if Pyodide script is already loaded
    if (!window.loadPyodide) {
        // Load Pyodide from CDN
        const existingScript = document.querySelector('script[src*="pyodide.js"]');
        if (!existingScript) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        } else {
            // Wait for existing script to load
            await new Promise((resolve) => {
                if (window.loadPyodide) {
                    resolve();
                } else {
                    existingScript.addEventListener('load', resolve);
                }
            });
        }
    }

    pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
    });
    return pyodideInstance;
};

const validateCodeRequirements = (code, requirements) => {
    if (!requirements) return { valid: true, issues: [] };

    const issues = [];

    // Helper to safely create regex or do simple string match
    const testPattern = (pattern, text) => {
        if (!pattern || pattern.trim() === '') return true;
        try {
            const regex = new RegExp(pattern, 'i');
            return regex.test(text);
        } catch (e) {
            // If regex is invalid, fall back to simple string includes
            console.warn(`Invalid regex pattern: ${pattern}, using string match`);
            return text.toLowerCase().includes(pattern.toLowerCase());
        }
    };

    // Check must-have patterns
    if (requirements.mustHave) {
        requirements.mustHave.forEach(pattern => {
            if (pattern && pattern.trim() !== '' && !testPattern(pattern, code)) {
                issues.push(`Code must use: ${pattern}`);
            }
        });
    }

    // Check forbidden patterns
    if (requirements.mustNotHave) {
        requirements.mustNotHave.forEach(pattern => {
            if (pattern && pattern.trim() !== '' && testPattern(pattern, code)) {
                issues.push(`Code should not use: ${pattern}`);
            }
        });
    }

    // Check line count
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    if (requirements.minLines && lines.length < requirements.minLines) {
        issues.push(`Code should have at least ${requirements.minLines} lines`);
    }
    if (requirements.maxLines && lines.length > requirements.maxLines) {
        issues.push(`Code should have at most ${requirements.maxLines} lines`);
    }

    // Check minimum variables (count variable assignments like: varName = value or n1,n2 = value)
    if (requirements.minVariables && requirements.minVariables > 0) {
        // Count individual variable names on the left side of assignments
        // Match lines with = (but not ==, !=, <=, >=)
        const assignmentLines = code.split('\n').filter(line => {
            const trimmed = line.trim();
            // Skip comments and lines without =
            if (trimmed.startsWith('#') || !trimmed.includes('=')) return false;
            // Check it's an assignment (not comparison)
            return /[^=!<>]=[^=]/.test(trimmed);
        });
        
        let variableCount = 0;
        assignmentLines.forEach(line => {
            // Get the left side of the assignment
            const leftSide = line.split('=')[0].trim();
            // Count variable names (handles: x, n1,n2, a,b,c, etc.)
            const varNames = leftSide.split(',').map(v => v.trim()).filter(v => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
            variableCount += varNames.length;
        });
        
        if (variableCount < requirements.minVariables) {
            issues.push(`Code must have at least ${requirements.minVariables} variable(s). Found: ${variableCount}`);
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
};

// Gemini AI API Key
const GEMINI_API_KEY = 'AIzaSyBYa7NIkoj0V2nyCyz_Y7ZshyjS_Vqeu2c';

// Get AI hint from Gemini
const getAIHint = async (code, question, attemptCount, errorMessage) => {
    try {
        const hintLevel = attemptCount <= 2 ? 'none' : attemptCount <= 3 ? 'small' : attemptCount <= 5 ? 'medium' : 'detailed';

        if (hintLevel === 'none') return null;

        const prompt = `You are a helpful coding tutor. A student is trying to solve this Python problem:

Problem: ${question.title}
Instructions: ${question.instructions}
Expected Output: ${question.expectedOutput}

Student's Code:
${code}

Error/Issue: ${errorMessage}

This is attempt #${attemptCount}. Provide a ${hintLevel} hint:
- small hint: Give a general direction (1 sentence)
- medium hint: Be more specific about what to fix (2-3 sentences)
- detailed hint: Show the approach with pseudo-code, but DON'T give the complete answer

Remember: NEVER give the complete working code. Always make them think and write it themselves.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.error('AI hint error:', error);
        return null;
    }
};

const TurtleModal = ({ isOpen, onClose, commands }) => {
    const canvasRef = React.useRef(null);
    const requestRef = React.useRef();
    const animState = React.useRef({ index: 0, progress: 0, lastTime: 0 });

    React.useEffect(() => {
        if (commands.length === 0) animState.current = { index: 0, progress: 0, lastTime: 0 };
    }, [commands]);

    React.useEffect(() => {
        if (!isOpen || !canvasRef.current) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const animate = (time) => {
            if (animState.current.lastTime === 0) animState.current.lastTime = time;
            const deltaTime = time - animState.current.lastTime;
            animState.current.lastTime = time;

            let { index, progress } = animState.current;

            if (index < commands.length) {
                const cmd = commands[index];
                const dx = cmd.x2 - cmd.x1;
                const dy = cmd.y2 - cmd.y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speedVal = cmd.speed !== undefined ? cmd.speed : 6;

                if (speedVal === 0) progress = 1;
                else {
                    const pxPerSec = speedVal * 50;
                    const step = (pxPerSec * (deltaTime / 1000)) / (dist || 1);
                    progress += step;
                }

                if (progress >= 1) {
                    index++;
                    progress = 0;
                }
                animState.current.index = index;
                animState.current.progress = progress;
            }

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
            ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
            ctx.stroke();

            for (let i = 0; i < index; i++) drawCommand(ctx, commands[i], 1, centerX, centerY);

            if (index < commands.length) {
                drawCommand(ctx, commands[index], progress, centerX, centerY);
                drawTurtle(ctx, commands[index], progress, centerX, centerY);
            } else if (commands.length > 0) {
                drawTurtle(ctx, commands[commands.length - 1], 1, centerX, centerY);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        const drawCommand = (ctx, cmd, prog, cx, cy) => {
            if (cmd.action !== 'draw') return;
            const startX = cx + cmd.x1; const startY = cy - cmd.y1;
            const endX = cx + cmd.x2; const endY = cy - cmd.y2;
            const curX = startX + (endX - startX) * prog;
            const curY = startY + (endY - startY) * prog;
            ctx.beginPath();
            ctx.strokeStyle = cmd.color;
            ctx.lineWidth = cmd.width;
            ctx.lineCap = 'round';
            ctx.moveTo(startX, startY);
            ctx.lineTo(curX, curY);
            ctx.stroke();
        };

        const drawTurtle = (ctx, cmd, prog, cx, cy) => {
            if (!cmd) return;
            const startX = cx + cmd.x1; const startY = cy - cmd.y1;
            const endX = cx + cmd.x2; const endY = cy - cmd.y2;
            const curX = startX + (endX - startX) * prog;
            const curY = startY + (endY - startY) * prog;
            ctx.fillStyle = "green";
            ctx.beginPath();
            ctx.arc(curX, curY, 6, 0, 2 * Math.PI);
            ctx.fill();
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isOpen, commands]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-2 w-[500px] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Move size={20} className="text-green-600" />Turtle Graphics</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-4 flex justify-center bg-slate-50 rounded-b-xl">
                    <canvas ref={canvasRef} width={400} height={400} className="bg-white shadow-sm border border-slate-200 rounded-lg" />
                </div>
                <div className="p-4 text-center text-xs text-slate-400">Speed: 0 (instant) to 10 (fast).</div>
            </div>
        </div>
    );
};

const FileModal = ({ isOpen, onClose, onSave, initialName = "", initialContent = "" }) => {
    const [filename, setFilename] = useState(initialName);
    const [content, setContent] = useState(initialContent);

    React.useEffect(() => {
        setFilename(initialName);
        setContent(initialContent);
    }, [initialName, initialContent, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" /> {initialName ? 'Edit File' : 'New File'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filename</label>
                        <input type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="e.g. data.txt" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" disabled={!!initialName} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-48 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none" placeholder="Type file content here..." />
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancel</button>
                    <button onClick={() => onSave(filename, content)} disabled={!filename.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">Save File</button>
                </div>
            </div>
        </div>
    );
};

// Memoized Sidebar Component (kept for potential future use)
// eslint-disable-next-line no-unused-vars
const QuestionsSidebar = React.memo(({
    levelName,
    questions,
    currentQuestionIndex,
    completedQuestions,
    revisionsNeeded,
    sidebarTab,
    setSidebarTab,
    userFiles,
    currentUser,
    levelId,
    setCompletedQuestions,
    setCurrentQuestionIndex,
    setCode,
    setOutput,
    setFeedback,
    setAttemptCounts,
    openNewFileModal,
    openEditFileModal,
    deleteFile,
    goToQuestion,
    isQuestionUnlocked
}) => {
    const progress = Math.round((completedQuestions.length / questions.length) * 100);

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-700">
            <div className="p-4 border-b border-slate-800">
                {/* Home Button */}
                <button
                    onClick={() => {
                        // Try to close the window first (works if opened via JS)
                        window.close();
                        // Fallback: remove portalLevelId and reload to go back to main app
                        setTimeout(() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('portalLevelId');
                            window.location.href = url.toString();
                        }, 100);
                    }}
                    className="mb-4 flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    Home
                </button>

                <h2 className="text-xl font-bold mb-2 truncate">{levelName}</h2>

                {/* Tabs */}
                <div className="flex bg-slate-800 rounded-lg p-1 mt-4">
                    <button
                        onClick={() => setSidebarTab('questions')}
                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${sidebarTab === 'questions' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        Questions
                    </button>
                    <button
                        onClick={() => setSidebarTab('files')}
                        className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${sidebarTab === 'files' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        Files
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {sidebarTab === 'questions' ? (
                    <>
                        {currentUser?.role === 'teacher' && (
                            <div className="mb-4">
                                <div className="text-sm text-slate-400">
                                    Progress: {completedQuestions.length}/{questions.length}
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {/* Reset Progress Button */}
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Reset all progress for this level? This cannot be undone.')) {
                                            try {
                                                const prog = currentUser.progress || {};
                                                prog[levelId] = { completedQuestions: [], percentage: 0, lastUpdated: new Date().toISOString() };
                                                await pb.collection('teachers').update(currentUser.id, {
                                                    progress: prog
                                                });
                                                setCompletedQuestions([]);
                                                setCurrentQuestionIndex(0);
                                                setCode(questions[0]?.codeTemplate || '# Write your code here\n');
                                                setOutput('');
                                                setFeedback(null);
                                                setAttemptCounts({});
                                                alert('Progress reset successfully!');
                                            } catch (error) {
                                                console.error('Error resetting:', error);
                                                alert('Failed to reset progress');
                                            }
                                        }
                                    }}
                                    className="mt-2 w-full text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors">
                                    Reset Progress
                                </button>
                            </div>
                        )}

                        {questions.map((q, index) => {
                            const unlocked = isQuestionUnlocked(index);
                            const completed = completedQuestions.includes(q.id);
                            const needsRevision = revisionsNeeded.includes(q.id);
                            const isCurrent = index === currentQuestionIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => unlocked && goToQuestion(index)}
                                    disabled={!unlocked}
                                    className={`w-full text-left p-3 rounded-lg transition-all ${isCurrent
                                        ? 'bg-violet-600 text-white'
                                        : needsRevision
                                            ? 'bg-amber-900/30 text-amber-400 border border-amber-700'
                                            : completed
                                                ? 'bg-emerald-900/30 text-emerald-400'
                                                : unlocked
                                                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                                        }`}>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-shrink-0">
                                            {needsRevision ? (
                                                <AlertCircle size={16} />
                                            ) : completed ? (
                                                <CheckCircle size={16} />
                                            ) : unlocked ? (
                                                <Code size={16} />
                                            ) : (
                                                <Lock size={16} />
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-xs font-semibold truncate">
                                                Q{index + 1}: {q.title}
                                            </div>
                                            {needsRevision && (
                                                <div className="text-xs opacity-75">
                                                    Needs Revision
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </>
                ) : (
                    <div>
                        <button onClick={openNewFileModal} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mb-4 transition-colors">
                            <Plus size={16} /> New File
                        </button>

                        {/* File I/O Help */}
                        <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                            <p className="text-xs text-blue-300 mb-2 font-medium">📁 File I/O Examples:</p>
                            <pre className="text-xs text-blue-200 font-mono whitespace-pre-wrap">{`# Write to file
with open('data.txt', 'w') as f:
    f.write('Hello!')

# Read from file
with open('data.txt', 'r') as f:
    content = f.read()
    print(content)`}</pre>
                        </div>

                        {userFiles.length === 0 ? (
                            <div className="text-center text-slate-500 text-sm italic py-4">No files created yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {userFiles.map(file => (
                                    <div key={file.name} className="group flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-600">
                                        <div
                                            className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                                            onClick={() => openEditFileModal(file)}
                                        >
                                            <FileText size={18} className="text-blue-400 flex-shrink-0" />
                                            <div className="overflow-hidden">
                                                <span className="text-sm text-slate-300 truncate block">{file.name}</span>
                                                <span className="text-xs text-slate-500">{file.content?.length || 0} chars</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditFileModal(file)}
                                                className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors"
                                                title="Edit file"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Delete "${file.name}"?`)) {
                                                        deleteFile(file.name);
                                                    }
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
                                                title="Delete file"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// Memoized TaskPanel Component
const TaskPanel = React.memo(({
    currentQuestion,
    currentQuestionIndex,
    isCompleted,
    needsRevision,
    feedback
}) => {
    return (
        <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto select-none">
            <div className="p-6 space-y-6">
                <div className="select-none">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Question {currentQuestionIndex + 1}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {currentQuestion?.title}
                    </h2>
                </div>

                {needsRevision && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
                            <AlertCircle size={20} />
                            <span className="font-bold text-sm">Revision Requested</span>
                        </div>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                            Your previous submission needs revision. Please review the admin feedback and resubmit your improved code.
                        </p>
                    </div>
                )}

                {isCompleted && !needsRevision && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                        <span className="text-emerald-800 dark:text-emerald-200 text-sm font-medium">
                            Completed
                        </span>
                    </div>
                )}

                <div className="prose dark:prose-invert prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentQuestion?.instructions || '' }} />
                </div>

                {currentQuestion?.hints && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                            <AlertCircle size={16} />
                            <span className="font-semibold text-sm">Hint</span>
                        </div>
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                            {currentQuestion.hints}
                        </p>
                    </div>
                )}

                {feedback && (
                    <div
                        className={`p-4 rounded-lg border ${feedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                        <div
                            className={`font-semibold mb-2 ${feedback.type === 'success'
                                ? 'text-emerald-800 dark:text-emerald-200'
                                : 'text-red-800 dark:text-red-200'
                                }`}>
                            {feedback.message}
                        </div>
                        {feedback.details && (
                            <pre
                                className={`text-xs whitespace-pre-wrap ${feedback.type === 'success'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-700 dark:text-red-300'
                                    }`}>
                                {feedback.details}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export const PythonAssessment = ({ levelId, initialQuestionIndex = 0 }) => {
    const { currentUser: contextUser } = useAppState();
    // Get the latest user data from localStorage (may have been updated by PortalLevelRunner)
    const currentUser = React.useMemo(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                // Merge with context user, preferring localStorage for id and assignedLevels
                return { ...contextUser, ...parsed };
            } catch(e) { console.error('Error parsing user', e); localStorage.removeItem('currentUser'); }
        }
        return contextUser;
    }, [contextUser]);

    const [level, setLevel] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
    const [code, setCode] = useState('');
    const [previewSnippet, setPreviewSnippet] = useState(null);

    // Check for preview mode
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('previewMode') === 'true') {
            const snippetData = sessionStorage.getItem('previewSnippet');
            if (snippetData) {
                const snippet = JSON.parse(snippetData);
                setPreviewSnippet(snippet);
                if (snippet.code) {
                    setCode(snippet.code);
                }
            }
        }
    }, []);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [completedQuestions, setCompletedQuestions] = useState([]);
    const [revisionsNeeded, setRevisionsNeeded] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingQuestion, setLoadingQuestion] = useState(false);
    const [attemptCounts, setAttemptCounts] = useState({});

    // Turtle & File IO State
    const [showTurtle, setShowTurtle] = useState(false);
    const [turtleCommands, setTurtleCommands] = useState([]);
    const turtleCmdBuffer = React.useRef([]);
    const [userFiles, setUserFiles] = useState([]);
    const [fileModalOpen, setFileModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [sidebarTab, setSidebarTab] = useState('questions');

    // Initialize Python Environment (Turtle & Input)
    useEffect(() => {
        const initPython = async () => {
            try {
                const py = await loadPyodide();

                // Define JS callbacks
                window.turtleEmit = (data) => {
                    let cmd = data;
                    if (data && typeof data.toJs === 'function') {
                        cmd = data.toJs({ dict_converter: Object.fromEntries });
                    }
                    turtleCmdBuffer.current.push(cmd);
                };

                // Run setup script
                await py.runPythonAsync(`
                    import sys
                    import types
                    import math
                    import js
                    import builtins

                    # Input override
                    def input(prompt_text=""):
                        val = js.prompt(prompt_text)
                        if val is None: return ""
                        return str(val)
                    builtins.input = input

                    # WebTurtle
                    class WebTurtle:
                        def __init__(self):
                            self.x = 0; self.y = 0; self.heading = 0; self.is_down = True; self.p_color = "black"; self.p_width = 1; self.speed_val = 6
                            js.turtleEmit(dict(action="reset"))

                        def _emit_move(self, new_x, new_y):
                            action = "draw" if self.is_down else "move"
                            js.turtleEmit(dict(action=action, x1=self.x, y1=self.y, x2=new_x, y2=new_y, color=self.p_color, width=self.p_width, speed=self.speed_val))
                            self.x = new_x; self.y = new_y

                        def forward(self, dist):
                            rad = math.radians(self.heading)
                            self._emit_move(self.x + dist * math.cos(rad), self.y + dist * math.sin(rad))

                        def backward(self, dist): self.forward(-dist)
                        def right(self, angle): self.heading -= angle
                        def left(self, angle): self.heading += angle
                        def goto(self, x, y): self._emit_move(x, y)
                        def penup(self): self.is_down = False
                        def pendown(self): self.is_down = True
                        def width(self, w): self.p_width = w
                        def color(self, c): self.p_color = c
                        def speed(self, s): self.speed_val = s
                        
                        fd = forward; bk = backward; rt = right; lt = left; setpos = goto; pencolor = color; pensize = width
                        def done(self): pass
                        def Screen(self): return self
                        def exitonclick(self): pass
                        def title(self, t): pass
                        def bgcolor(self, c): pass

                    m = types.ModuleType("turtle")
                    m.Turtle = WebTurtle
                    m.Screen = WebTurtle
                    default_t = WebTurtle()
                    for attr in dir(default_t):
                        if not attr.startswith("__"): setattr(m, attr, getattr(default_t, attr))
                    sys.modules["turtle"] = m
                `);
            } catch (e) {
                console.error("Failed to init Python env:", e);
            }
        };
        initPython();
    }, []);

    const syncFiles = (py) => {
        try {
            const fileListJson = py.runPython(`
                import os
                import json
                files_out = []
                for f in os.listdir('.'):
                    if os.path.isfile(f) and not f.startswith('.'):
                        try:
                            with open(f, 'r', encoding='utf-8') as fh:
                                files_out.append({"name": f, "content": fh.read()})
                        except:
                            pass
                json.dumps(files_out)
            `);
            setUserFiles(JSON.parse(fileListJson));
        } catch (e) {
            console.error("Sync files error:", e);
        }
    };

    const saveFile = async (name, content) => {
        const py = await loadPyodide();
        py.FS.writeFile(name, content, { encoding: "utf8" });
        syncFiles(py);
        setFileModalOpen(false);
    };

    const deleteFile = async (name) => {
        try {
            const py = await loadPyodide();
            py.FS.unlink(name);
            syncFiles(py);
        } catch (e) {
            console.error("Delete file error:", e);
            alert("Failed to delete file");
        }
    };

    useEffect(() => {
        loadData();
        loadPyodide(); // Preload Python runtime
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [levelId, currentUser]);

    const loadData = async () => {
        try {
            // Load level info
            try {
                const levelDoc = await pb.collection('codingLevels').getOne(levelId, { $autoCancel: false });
                if (levelDoc) {
                    setLevel({ id: levelDoc.id, ...levelDoc });
                }
            } catch (err) {
                console.error("Level not found", err);
            }

            // Load hard-level steps from curriculum (units_new → challenges → steps)
            const units = await pb.collection('units_new').getFullList({ filter: `levelId="${levelId}"`, sort: 'unitNumber,created', $autoCancel: false });

            const allQuestions = [];
            let order = 0;

            for (const unitData of units) {
                const challenges = await pb.collection('challenges').getFullList({ filter: `unitId="${unitData.id}"`, sort: 'created', $autoCancel: false });

                for (const challengeData of challenges) {
                    // Load steps for this challenge
                    const steps = await pb.collection('steps').getFullList({ filter: `challengeId="${challengeData.id}"`, sort: 'stepIndex', $autoCancel: false });

                    // Filter only hard difficulty steps
                    const hardSteps = steps.filter(step => step.difficulty === 'hard');

                    if (hardSteps.length > 0) {
                        // Create a question for each hard step
                        for (let stepIdx = 0; stepIdx < hardSteps.length; stepIdx++) {
                            const step = hardSteps[stepIdx];
                            allQuestions.push({
                                id: `${challengeData.id}_step_${step.id}`,
                                challengeId: challengeData.id,
                                unitId: unitData.id,
                                stepId: step.id,
                                title: `${challengeData.challengeName} - Step ${stepIdx + 1}`,
                                instructions: step.content || challengeData.description || '',
                                expectedOutput: step.expectedOutput || challengeData.expectedOutput || '',
                                codeTemplate: challengeData.starterCode || '# Write your code here\n',
                                hints: step.hint || challengeData.hint || '',
                                testCases: step.testCases || [],
                                order: order++,
                                stepIndex: step.stepIndex || stepIdx,
                                requirements: challengeData.requirements || {
                                    mustHave: [],
                                    mustNotHave: [],
                                    minLines: 0,
                                    maxLines: 0
                                },
                                unitName: unitData.unitName,
                                unitNumber: unitData.unitNumber
                            });
                        }
                    } else {
                        // Fallback: use the challenge itself as a question
                        allQuestions.push({
                            id: challengeData.id,
                            challengeId: challengeData.id,
                            unitId: unitData.id,
                            stepId: null,
                            title: challengeData.challengeName,
                            instructions: challengeData.description || challengeData.content || 'No description available.',
                            expectedOutput: challengeData.expectedOutput || '',
                            codeTemplate: challengeData.starterCode || '# Write your code here\n',
                            hints: challengeData.hint || '',
                            testCases: [],
                            order: order++,
                            stepIndex: 0,
                            requirements: challengeData.requirements || {
                                mustHave: [],
                                mustNotHave: [],
                                minLines: 0,
                                maxLines: 0
                            },
                            unitName: unitData.unitName,
                            unitNumber: unitData.unitNumber
                        });
                    }
                }
            }

            // Sort by order
            allQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
            setQuestions(allQuestions);

            // Load progress
            let loadedCompletedQuestions = [];
            if (currentUser?.role === 'teacher' && currentUser.id) {
                try {
                    const progressRecords = await pb.collection('teacher_blockly_progress').getFullList({
                        filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`,
                        $autoCancel: false
                    });
                    
                    if (progressRecords.length > 0) {
                        loadedCompletedQuestions = progressRecords[0].completedChallenges || [];
                        setCompletedQuestions(loadedCompletedQuestions);

                        // Auto-jump to the first incomplete question (resume progress)
                        // Only if not coming from a specific questionIndex in URL
                        const params = new URLSearchParams(window.location.search);
                        const urlQuestionIndex = params.get('questionIndex');

                        if (!urlQuestionIndex && loadedCompletedQuestions.length > 0) {
                            // Find the first incomplete question
                            const firstIncompleteIndex = allQuestions.findIndex(
                                q => !loadedCompletedQuestions.includes(q.id)
                            );

                            if (firstIncompleteIndex > 0) {
                                setCurrentQuestionIndex(firstIncompleteIndex);
                            } else if (firstIncompleteIndex === -1 && allQuestions.length > 0) {
                                // All completed - go to last question
                                setCurrentQuestionIndex(allQuestions.length - 1);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error fetching progress:', e);
                }

                // Load revision statuses from acknowledgements
                const revisionsNeededList = [];
                for (const question of allQuestions) {
                    if (question.challengeId && question.unitId) {
                        try {
                            const challengeData = await pb.collection('challenges').getOne(question.challengeId, { $autoCancel: false });
                            if (challengeData) {
                                // Check for new key first
                                const ackKey = `${currentUser.username.toLowerCase()}--${question.stepId}`;
                                let ack = challengeData.acknowledgements?.[ackKey];

                                // Fallback to legacy key if not found
                                if (!ack) {
                                    ack = challengeData.acknowledgements?.[currentUser.username.toLowerCase()];
                                }

                                if (ack?.status === 'needs_revision') {
                                    revisionsNeededList.push(question.id);
                                }
                            }
                        } catch (err) {
                            // Ignore if not found
                        }
                    }
                }
                setRevisionsNeeded(revisionsNeededList);
            }

            // Set initial code from template (unless in preview mode with code already loaded)
            const params = new URLSearchParams(window.location.search);
            const isPreviewMode = params.get('previewMode') === 'true';
            const snippetData = sessionStorage.getItem('previewSnippet');

            if (isPreviewMode && snippetData) {
                let snippet = null;
                try {
                    snippet = JSON.parse(snippetData);
                } catch(e) { console.error('Error parsing snippet', e); }

                if (snippet) {
                    // Find the correct question index based on the submission title
                    let targetIndex = 0;
                const searchTitle = snippet.title?.toLowerCase() || '';
                const searchChallengeName = snippet.challengeName?.toLowerCase() || '';

                if (searchTitle || searchChallengeName) {
                    const foundIndex = allQuestions.findIndex(q => {
                        const qTitle = (q.title || '').toLowerCase();
                        // Exact match
                        if (qTitle === searchTitle) return true;
                        // Title contains the search title or vice versa
                        if (searchTitle && (qTitle.includes(searchTitle) || searchTitle.includes(qTitle))) return true;
                        // Match by challenge name
                        if (searchChallengeName && qTitle.includes(searchChallengeName)) return true;
                        return false;
                    });
                    if (foundIndex !== -1) {
                        targetIndex = foundIndex;
                    }
                }

                console.log('Preview mode: navigating to question', targetIndex, 'for title:', snippet.title);

                // Navigate to the correct question and set the code
                setCurrentQuestionIndex(targetIndex);
                if (snippet.code) {
                    setCode(snippet.code);
                } else if (allQuestions.length > 0) {
                    setCode(allQuestions[targetIndex]?.codeTemplate || '# Write your code here\n');
                }
                } // End if (snippet)
            } else if (allQuestions.length > 0) {
                setCode(allQuestions[0].codeTemplate || '# Write your code here\n');
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading assessment:', error);
            setLoading(false);
        }
    };
    const runCode = async () => {
        setIsRunning(true);
        setOutput('');
        setFeedback(null);
        turtleCmdBuffer.current = []; // Reset turtle buffer

        try {
            const pyodide = await loadPyodide();

            // Capture stdout, setup random module, and mock input function
            await pyodide.runPythonAsync(`
import sys
from io import StringIO
import random
# Ensure random is properly seeded
random.seed()

# Mock input function - prompts user via browser
_input_prompts = []
def _mock_input(prompt=""):
    _input_prompts.append(prompt)
    # For Run mode, use JavaScript prompt
    import js
    result = js.prompt(prompt if prompt else "Enter input:")
    return result if result is not None else ""

__builtins__.input = _mock_input

sys.stdout = StringIO()
            `);

            // Run the user's code
            await pyodide.runPythonAsync(code);

            // Get the captured output
            const capturedOutput = await pyodide.runPythonAsync(`
sys.stdout.getvalue()
            `);

            // Reset stdout
            await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
            `);

            // Sync files after run
            syncFiles(pyodide);

            // Check turtle
            if (turtleCmdBuffer.current.length > 0) {
                setTurtleCommands([...turtleCmdBuffer.current]);
                if (turtleCmdBuffer.current.some(c => c.action === 'draw')) {
                    setShowTurtle(true);
                }
            }

            setOutput(capturedOutput);
            setIsRunning(false);
            return capturedOutput;
        } catch (error) {
            const errorMsg = error.message || 'Error running code';
            setOutput(`Error: ${errorMsg}`);
            setFeedback({
                type: 'error',
                message: 'Code has errors. Please fix and try again.',
                details: errorMsg
            });
            setIsRunning(false);
            return null;
        }
    };

    const submitAnswer = async () => {
        const question = questions[currentQuestionIndex];

        // Check if question has code requirements (mustHave, minVariables, etc.)
        const hasCodeRequirements = question.requirements && (
            (question.requirements.mustHave && question.requirements.mustHave.length > 0) ||
            (question.requirements.mustNotHave && question.requirements.mustNotHave.length > 0) ||
            (question.requirements.minVariables && question.requirements.minVariables > 0) ||
            (question.requirements.minLines && question.requirements.minLines > 0)
        );

        // Check if this is an instruction-only question (no expected output AND no code requirements)
        const isInstructionOnly = (!question.expectedOutput || question.expectedOutput.trim() === '') && !hasCodeRequirements;

        if (isInstructionOnly) {
            // Mark as complete without code validation
            const newCompleted = [...completedQuestions];
            if (!newCompleted.includes(question.id)) {
                newCompleted.push(question.id);
                setCompletedQuestions(newCompleted);

                // Save to Firebase -> PocketBase
                if (currentUser?.role === 'teacher' && currentUser.id) {
                    const percentage = Math.round((newCompleted.length / questions.length) * 100);
                    try {
                        const progressRecords = await pb.collection('teacher_blockly_progress').getFullList({
                            filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
                        });
                        if (progressRecords.length > 0) {
                            await pb.collection('teacher_blockly_progress').update(progressRecords[0].id, {
                                completedChallenges: newCompleted,
                                lastUpdated: new Date().toISOString()
                            });
                        } else {
                            await pb.collection('teacher_blockly_progress').create({
                                teacherId: currentUser.id,
                                levelId: levelId,
                                completedQuestions: newCompleted,
                                percentage,
                                lastUpdated: new Date().toISOString()
                            });
                        }
                    } catch (e) {
                        console.error('Error saving progress:', e);
                    }
                }
            }

            setFeedback({
                type: 'success',
                message: '✅ Completed! You can now proceed to the next question.',
                details: 'Click the next question to continue.'
            });
            return;
        }
        
        // Check if this is a code-requirements-only question (no expected output but has requirements)
        const isCodeRequirementsOnly = (!question.expectedOutput || question.expectedOutput.trim() === '') && hasCodeRequirements;

        // Check if code has meaningful content (not just comments or template)
        const codeLines = code.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('#');
        });

        if (codeLines.length === 0) {
            setFeedback({
                type: 'error',
                message: '❌ Please write some code first',
                details: 'You need to write Python code to solve this problem. The template comment is just a placeholder.'
            });
            return;
        }

        // Track attempts
        const currentAttempts = (attemptCounts[question.id] || 0) + 1;
        setAttemptCounts({ ...attemptCounts, [question.id]: currentAttempts });

        const normalizeOutput = (str) => str.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Check if question has test cases (for input-based questions)
        const testCases = question.testCases || [];

        let outputCorrect = false;
        let codeOutput = '';
        let testResults = [];

        // For code-requirements-only questions (no expected output), just run the code and validate requirements
        if (isCodeRequirementsOnly) {
            codeOutput = await runCode();
            if (codeOutput === null) return; // Has errors
            
            // Validate code requirements only
            const codeValidation = validateCodeRequirements(code, question.requirements);
            
            if (codeValidation.valid) {
                // Reset attempts for this question
                setAttemptCounts({ ...attemptCounts, [question.id]: 0 });

                // Mark as complete
                const newCompleted = [...completedQuestions];
                if (!newCompleted.includes(question.id)) {
                    newCompleted.push(question.id);
                    setCompletedQuestions(newCompleted);

                    if (currentUser?.role === 'teacher' && currentUser.id) {
                        const percentage = Math.round((newCompleted.length / questions.length) * 100);
                        try {
                            const progressRecords = await pb.collection('teacher_progress').getFullList({
                                filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
                            });
                            if (progressRecords.length > 0) {
                                await pb.collection('teacher_progress').update(progressRecords[0].id, {
                                    completedQuestions: newCompleted,
                                    percentage,
                                    lastUpdated: new Date().toISOString()
                                });
                            } else {
                                await pb.collection('teacher_progress').create({
                                    teacherId: currentUser.id,
                                    levelId: levelId,
                                    completedQuestions: newCompleted,
                                    percentage,
                                    lastUpdated: new Date().toISOString()
                                });
                            }
                        } catch (e) {
                            console.error('Error saving progress:', e);
                        }
                    }
                }

                setFeedback({
                    type: 'success',
                    message: '✅ Correct! Your code meets all requirements.',
                    details: 'Great job! You can proceed to the next question.'
                });
            } else {
                setFeedback({
                    type: 'error',
                    message: '❌ Code requirements not met',
                    details: codeValidation.issues.join('\n')
                });
            }
            return;
        }

        if (testCases.length > 0) {
            // Run code with each test case
            const pyodide = await loadPyodide();
            let allPassed = true;

            for (const testCase of testCases) {
                try {
                    // Setup input mock with test case inputs
                    const inputs = Array.isArray(testCase.input) ? testCase.input : [testCase.input];
                    await pyodide.runPythonAsync(`
import sys
from io import StringIO
import random
random.seed()

# Mock input function
_input_values = ${JSON.stringify(inputs)}
_input_index = 0

def _mock_input(prompt=""):
    global _input_index
    if _input_index < len(_input_values):
        val = str(_input_values[_input_index])
        _input_index += 1
        return val
    return ""

# Replace input function
__builtins__.input = _mock_input

# Capture stdout
sys.stdout = StringIO()
                    `);

                    // Run the user's code
                    await pyodide.runPythonAsync(code);

                    // Get output
                    const output = await pyodide.runPythonAsync(`sys.stdout.getvalue()`);

                    // Reset
                    await pyodide.runPythonAsync(`sys.stdout = sys.__stdout__`);

                    const passed = normalizeOutput(output) === normalizeOutput(testCase.expectedOutput);
                    testResults.push({
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        actualOutput: output,
                        passed
                    });

                    if (!passed) allPassed = false;
                    codeOutput = output; // Keep last output for display

                } catch (error) {
                    testResults.push({
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        actualOutput: `Error: ${error.message}`,
                        passed: false
                    });
                    allPassed = false;
                }
            }

            outputCorrect = allPassed;
            setOutput(codeOutput);
        } else {
            // No test cases - use simple output matching
            codeOutput = await runCode();
            if (codeOutput === null) return; // Has errors
            outputCorrect = normalizeOutput(codeOutput) === normalizeOutput(question.expectedOutput);
        }

        // Step 2: Validate code requirements
        const codeValidation = validateCodeRequirements(code, question.requirements);

        // Step 3: Check if output is empty when it shouldn't be
        const hasEmptyOutput = codeOutput.trim() === '' && question.expectedOutput.trim() !== '' && testCases.length === 0;

        // Step 4: Determine if passed
        const passed = outputCorrect && codeValidation.valid && !hasEmptyOutput;

        if (passed) {
            // Reset attempts for this question
            setAttemptCounts({ ...attemptCounts, [question.id]: 0 });

            // Mark as complete locally (for UI to show progress and unlock next questions)
            const newCompleted = [...completedQuestions];
            if (!newCompleted.includes(question.id)) {
                newCompleted.push(question.id);
                setCompletedQuestions(newCompleted);

                // Save local progress (for UI purposes only, not official training progress)
                if (currentUser?.role === 'teacher' && currentUser.id) {
                    const percentage = Math.round((newCompleted.length / questions.length) * 100);
                    try {
                        const progressRecords = await pb.collection('teacher_blockly_progress').getFullList({
                            filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
                        });
                        if (progressRecords.length > 0) {
                            await pb.collection('teacher_blockly_progress').update(progressRecords[0].id, {
                                completedChallenges: newCompleted,
                                lastUpdated: new Date().toISOString()
                            });
                        } else {
                            await pb.collection('teacher_blockly_progress').create({
                                teacherId: currentUser.id,
                                levelId: levelId,
                                completedChallenges: newCompleted,
                                lastUpdated: new Date().toISOString()
                            });
                        }
                    } catch (e) {
                        console.error('Error saving local progress:', e);
                    }
                }
            }

            // Save submission for admin review
            if (currentUser?.role === 'teacher' && currentUser.id) {
                try {
                    // Get the full question description
                    const questionDescription = question.instructions ||
                        question.description ||
                        question.content ||
                        `Complete the challenge: ${question.title}`;

                    // Create a unique ID for this submission based on level and question
                    // This ensures we update existing submissions instead of creating duplicates
                    const submissionId = `${levelId}_${question.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');

                    const submissionData = {
                        username: currentUser.username.toLowerCase(),
                        submissionId: submissionId,
                        code: code,
                        title: question.title,
                        description: questionDescription,
                        levelName: level?.name || 'Unknown',
                        unitName: question.unitName,
                        timestamp: new Date().toISOString(),
                        expectedOutput: question.expectedOutput,
                        actualOutput: codeOutput
                    };

                    try {
                        const existingSubmissions = await pb.collection('submissions').getFullList({
                            filter: `username="${currentUser.username.toLowerCase()}" && submissionId="${submissionId}"`
                        });
                        if (existingSubmissions.length > 0) {
                            await pb.collection('submissions').update(existingSubmissions[0].id, submissionData);
                        } else {
                            await pb.collection('submissions').create(submissionData);
                        }
                    } catch (e) {
                        await pb.collection('submissions').create(submissionData);
                    }

                    // Create pending review for admin
                    // Update the challenge document with acknowledgement
                    if (question.challengeId && question.unitId) {
                        console.log('Creating pending review for:', {
                            levelId,
                            unitId: question.unitId,
                            challengeId: question.challengeId,
                            username: currentUser.username,
                            stepId: question.stepId
                        });

                        try {
                            const challengeData = await pb.collection('challenges').getOne(question.challengeId);
                            const acknowledgements = challengeData.acknowledgements || {};

                            // Use composite key to support per-step status
                            // Format: username--stepId
                            const ackKey = `${currentUser.username.toLowerCase()}--${question.stepId}`;

                            // Always create/update pending review on new submission
                            acknowledgements[ackKey] = {
                                status: 'pending',
                                submittedAt: new Date().toISOString(),
                                code: code,
                                output: codeOutput,
                                questionTitle: question.title,
                                questionInstructions: question.instructions || question.description || question.content || '',
                                expectedOutput: question.expectedOutput,
                                username: currentUser.username.toLowerCase(), // Store username for AdminPanel
                                stepId: question.stepId
                            };

                            await pb.collection('challenges').update(question.challengeId, {
                                acknowledgements: acknowledgements
                            });
                            console.log('Pending review created successfully!');
                        } catch (e) {
                            console.error('Challenge document not found or error updating:', e);
                        }
                    } else {
                        console.error('Missing challengeId or unitId:', question);
                    }
                } catch (error) {
                    console.error('Error saving snippet:', error);
                }
            }

            setFeedback({
                type: 'success',
                message: '✅ Correct! Well done!',
                details: 'Your code produces the correct output and follows best practices. Moving to next question...'
            });

            // Auto-advance to next question after 2 seconds
            setTimeout(() => {
                const nextIndex = currentQuestionIndex + 1;
                if (nextIndex < questions.length) {
                    goToQuestion(nextIndex);
                }
            }, 2000);
        } else {
            // Show specific feedback
            let message = '';
            let details = [];

            if (!outputCorrect) {
                message = `❌ Attempt ${currentAttempts}: Output doesn't match expected result`;

                // Show test case results if available
                if (testResults.length > 0) {
                    details.push('Test Results:');
                    testResults.forEach((result, idx) => {
                        const status = result.passed ? '✅' : '❌';
                        const inputStr = Array.isArray(result.input) ? result.input.join(', ') : result.input;
                        details.push(`${status} Test ${idx + 1}: input(${inputStr})`);
                        if (!result.passed) {
                            details.push(`   Expected: ${result.expectedOutput}`);
                            details.push(`   Got: ${result.actualOutput.trim()}`);
                        }
                    });
                } else {
                    details.push(`Expected: ${question.expectedOutput}`);
                    details.push(`Got: ${codeOutput}`);
                }
            }

            if (!codeValidation.valid) {
                message = message || `⚠️ Attempt ${currentAttempts}: Code doesn't meet requirements`;
                details = [...details, ...codeValidation.issues];
            }

            // Get AI hint if attempts >= 3
            if (currentAttempts >= 3) {
                const errorMessage = details.join('\n');
                const aiHint = await getAIHint(code, question, currentAttempts, errorMessage);

                if (aiHint) {
                    details.push('\n💡 AI Hint:\n' + aiHint);
                }
            }

            setFeedback({
                type: 'error',
                message,
                details: details.join('\n'),
                aiHint: currentAttempts >= 3
            });
        }
    };

    const goToQuestion = (index) => {
        setLoadingQuestion(true);

        // Simulate loading delay for smooth transition
        setTimeout(() => {
            setCurrentQuestionIndex(index);
            setCode(questions[index].codeTemplate || '# Write your code here\n');
            setOutput('');
            setFeedback(null);
            setLoadingQuestion(false);
        }, 300);
    };

    const isQuestionUnlocked = (index) => {
        // Admin can access all
        if (currentUser?.role === 'admin') return true;
        // First question always unlocked
        if (index === 0) return true;
        // Others unlock after previous is completed
        return completedQuestions.includes(questions[index - 1]?.id);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCompleted = completedQuestions.includes(currentQuestion?.id);
    const needsRevision = revisionsNeeded.includes(currentQuestion?.id);
    const progress = Math.round((completedQuestions.length / questions.length) * 100);

    // File Management Helpers
    const openNewFileModal = () => { setEditingFile(null); setFileModalOpen(true); };
    const openEditFileModal = (file) => { setEditingFile(file); setFileModalOpen(true); };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Preview Mode Banner */}
            {previewSnippet && (
                <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="font-bold">📋 Review Preview</span>
                        <span className="text-amber-200">|</span>
                        <span>
                            <strong className="capitalize">{previewSnippet.username || 'Unknown'}</strong>'s submission: <strong>{previewSnippet.title}</strong>
                        </span>
                        {previewSnippet.levelName && (
                            <>
                                <span className="text-amber-200">|</span>
                                <span className="text-amber-100">{previewSnippet.levelName}</span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('previewMode');
                            sessionStorage.removeItem('previewSnippet');
                            sessionStorage.removeItem('reviewPreview');
                            window.close();
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm"
                    >
                        Close Preview
                    </button>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Simplified Sidebar - Current Question Only */}
                <div className="w-64 bg-slate-900 text-white p-4 flex flex-col">
                    {/* Home Button */}
                    <button
                        onClick={() => {
                            // Try to close the window first (works if opened via JS)
                            window.close();
                            // Fallback: remove portalLevelId and reload to go back to main app
                            setTimeout(() => {
                                const url = new URL(window.location.href);
                                url.searchParams.delete('portalLevelId');
                                window.location.href = url.toString();
                            }, 100);
                        }}
                        className="mb-4 flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        Home
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-2">{level?.name}</h2>
                        {currentUser?.role === 'teacher' && (
                            <>
                                <div className="text-sm text-slate-400">
                                    Progress: {completedQuestions.length}/{questions.length}
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}></div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tabs: Question / Files */}
                    <div className="flex gap-1 mb-4 bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setSidebarTab('questions')}
                            className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${sidebarTab === 'questions'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Question
                        </button>
                        <button
                            onClick={() => setSidebarTab('files')}
                            className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${sidebarTab === 'files'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <FileText size={12} />
                            Files {userFiles.length > 0 && `(${userFiles.length})`}
                        </button>
                    </div>

                    {/* Content based on tab */}
                    <div className="flex-grow overflow-y-auto">
                        {sidebarTab === 'questions' ? (
                            <div className="bg-violet-600 text-white p-4 rounded-lg">
                                <div className="text-xs opacity-80 mb-2 font-medium">
                                    UNIT {currentQuestion?.unitNumber}: {currentQuestion?.unitName}
                                </div>
                                <div className="font-bold text-lg mb-1">
                                    Q{currentQuestionIndex + 1} of {questions.length}
                                </div>
                                <div className="text-sm opacity-90">{currentQuestion?.title}</div>
                                {needsRevision && (
                                    <div className="mt-3 flex items-center gap-2 text-amber-300 text-xs">
                                        <AlertCircle size={14} />
                                        <span>Needs Revision</span>
                                    </div>
                                )}
                                {isCompleted && !needsRevision && (
                                    <div className="mt-3 flex items-center gap-2 text-emerald-300 text-xs">
                                        <CheckCircle size={14} />
                                        <span>Completed</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* New File Button */}
                                <button
                                    onClick={openNewFileModal}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus size={16} /> New File
                                </button>

                                {/* File I/O Help */}
                                <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                                    <p className="text-xs text-blue-300 mb-2 font-medium">📁 File I/O:</p>
                                    <pre className="text-[10px] text-blue-200 font-mono whitespace-pre-wrap leading-relaxed">{`# Write
with open('f.txt','w') as f:
    f.write('Hi')

# Read
with open('f.txt') as f:
    print(f.read())`}</pre>
                                </div>

                                {/* Files List */}
                                {userFiles.length === 0 ? (
                                    <div className="text-center text-slate-500 text-sm italic py-4">
                                        No files yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {userFiles.map(file => (
                                            <div
                                                key={file.name}
                                                className="group flex items-center justify-between p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                                            >
                                                <div
                                                    className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                                                    onClick={() => openEditFileModal(file)}
                                                >
                                                    <FileText size={14} className="text-blue-400 flex-shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <span className="text-xs text-slate-300 truncate block">{file.name}</span>
                                                        <span className="text-[10px] text-slate-500">{file.content?.length || 0} chars</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        onClick={() => openEditFileModal(file)}
                                                        className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Delete "${file.name}"?`)) {
                                                                deleteFile(file.name);
                                                            }
                                                        }}
                                                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => {
                                if (currentQuestionIndex > 0) {
                                    goToQuestion(currentQuestionIndex - 1);
                                }
                            }}
                            disabled={currentQuestionIndex === 0}
                            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                const nextIndex = currentQuestionIndex + 1;
                                if (nextIndex < questions.length && (isQuestionUnlocked(nextIndex) || currentUser?.role === 'admin')) {
                                    goToQuestion(nextIndex);
                                }
                            }}
                            disabled={
                                currentQuestionIndex >= questions.length - 1 ||
                                (!isQuestionUnlocked(currentQuestionIndex + 1) && currentUser?.role !== 'admin')
                            }
                            className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {progress === 100 && (
                        <div className="mt-4 p-4 bg-emerald-900/30 rounded-lg border border-emerald-700">
                            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                <Award size={20} />
                                <span className="font-bold">All Done!</span>
                            </div>
                            <p className="text-xs text-emerald-300">
                                You've completed all questions!
                            </p>
                        </div>
                    )}
                </div>

                {/* Remove old QuestionsSidebar component call */}
                {/* <QuestionsSidebar
                levelName={level?.name}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                completedQuestions={completedQuestions}
                revisionsNeeded={revisionsNeeded}
                sidebarTab={sidebarTab}
                setSidebarTab={setSidebarTab}
                userFiles={userFiles}
                currentUser={currentUser}
                levelId={levelId}
                setCompletedQuestions={setCompletedQuestions}
                setCurrentQuestionIndex={setCurrentQuestionIndex}
                setCode={setCode}
                setOutput={setOutput}
                setFeedback={setFeedback}
                setAttemptCounts={setAttemptCounts}
                openNewFileModal={openNewFileModal}
                openEditFileModal={openEditFileModal}
                goToQuestion={goToQuestion}
                isQuestionUnlocked={isQuestionUnlocked}
            /> */}

                {/* Main Content - Code Editor & Task */}
                <div className="flex-grow flex relative">
                    {/* Loading Overlay */}
                    {loadingQuestion && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                                    <span className="text-slate-700 dark:text-slate-200 font-medium">Loading question...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col bg-slate-900">
                        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                            <span className="text-white text-sm font-medium">main.py</span>
                            <div className="flex gap-2">
                                {(!currentQuestion?.expectedOutput || currentQuestion.expectedOutput.trim() === '') ? (
                                    // Instruction-only question - just show Continue button
                                    <Button
                                        onClick={submitAnswer}
                                        disabled={isCompleted}
                                        className="h-8 text-xs">
                                        {isCompleted ? 'Completed' : 'Mark as Complete'}
                                    </Button>
                                ) : (
                                    // Coding question - show Run and Submit buttons
                                    <>
                                        <Button
                                            onClick={runCode}
                                            disabled={isRunning}
                                            variant="secondary"
                                            className="h-8 text-xs">
                                            <Play size={14} /> Run
                                        </Button>
                                        <Button
                                            onClick={submitAnswer}
                                            disabled={isRunning || (isCompleted && !needsRevision)}
                                            className="h-8 text-xs">
                                            {needsRevision ? 'Resubmit Answer' : 'Submit Answer'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow relative">
                            <ErrorBoundary>
                                <Editor
                                    height="100%"
                                    defaultLanguage="python"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(value) => { setCode(value || ""); setFeedback(null); }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        tabSize: 4,
                                        padding: { top: 16, bottom: 16 }
                                    }}
                                />
                            </ErrorBoundary>
                        </div>

                        {/* Console Output */}
                        <div className="h-48 bg-black border-t border-slate-700">
                            <div className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold border-b border-slate-700">
                                Console
                            </div>
                            <div className="p-4 text-green-400 font-mono text-sm whitespace-pre-wrap overflow-auto h-[calc(100%-32px)]">
                                {output || 'Run your code to see output...'}
                            </div>
                        </div>
                    </div>

                    {/* Task Panel */}
                    {/* Task Panel */}
                    <TaskPanel
                        currentQuestion={currentQuestion}
                        currentQuestionIndex={currentQuestionIndex}
                        isCompleted={isCompleted}
                        needsRevision={needsRevision}
                        feedback={feedback}
                    />
                </div>
            </div>
            <TurtleModal isOpen={showTurtle} onClose={() => setShowTurtle(false)} commands={turtleCommands} />
            <FileModal
                isOpen={fileModalOpen}
                onClose={() => setFileModalOpen(false)}
                onSave={saveFile}
                initialName={editingFile ? editingFile.name : ""}
                initialContent={editingFile ? editingFile.content : ""}
            />
        </div>
    );
};

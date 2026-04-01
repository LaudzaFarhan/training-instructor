import React, { useState, useEffect, useRef, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
    Move, X, FileText, Edit2, CheckCircle, Plus, Award, FileCode, Play, Check, Cpu, Lock, Send
} from "lucide-react";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db, useAppState } from "../../context/AppStateContext";
import { ErrorBoundary } from "./ErrorBoundary";

// Helper to load Pyodide script dynamically
const loadPyodideScript = () => {
    return new Promise((resolve, reject) => {
        if (window.loadPyodide) {
            resolve(window.loadPyodide);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
        script.onload = () => resolve(window.loadPyodide);
        script.onerror = () => reject(new Error("Failed to load Pyodide script"));
        document.head.appendChild(script);
    });
};

const iconMap = {
    'move': Move,
    'x': X,
    'file-text': FileText,
    'edit-2': Edit2,
    'check-circle': CheckCircle,
    'plus': Plus,
    'award': Award,
    'file-code': FileCode,
    'play': Play,
    'check': Check,
    'cpu': Cpu,
    'lock': Lock,
    'send': Send
};

const Icon = ({ name, size = 24, className = "" }) => {
    const LucideIcon = iconMap[name];
    if (!LucideIcon) return null;
    return <LucideIcon size={size} className={className} />;
};

const questions = [
    { id: 1, title: "Variable Declaration", description: "Create a variable named `score` and assign it the value `0`.", hint: "score = 0", placeholder: "score = 0", checkType: 'variable', criteria: { varName: 'score', expectedValue: 0 } },
    { id: 2, title: "Turtle Graphics Intro", description: "Let's draw! Import turtle, create a turtle, and move forward 100 steps.", hint: "import turtle\nt = turtle.Turtle()\nt.forward(100)", placeholder: "import turtle\nt = turtle.Turtle()\n", checkType: 'regex', validation: /forward|fd/ },
    { id: 3, title: "Drawing a Square", description: "Write a loop to draw a square. Move forward 100, turn right 90, repeat 4 times.", hint: "for i in range(4): ...", placeholder: "import turtle\nt = turtle.Turtle()\n", checkType: 'regex', validation: /for\s+.*in\s+range/ },
    { id: 4, title: "File I/O", description: "Read the content of 'data.txt' and print it. (First, create 'data.txt' in the Files tab!)", hint: "with open('data.txt', 'r') as f: print(f.read())", placeholder: "with open('data.txt', 'r') as f:\n    print(f.read())", checkType: 'regex', validation: /open\s*\(\s*['"]data.txt['"]/ },
];

const TurtleModal = ({ isOpen, onClose, commands }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const animState = useRef({ index: 0, progress: 0, lastTime: 0 });

    useEffect(() => {
        if (commands.length === 0) animState.current = { index: 0, progress: 0, lastTime: 0 };
    }, [commands]);

    useEffect(() => {
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
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Icon name="move" size={20} className="text-green-600" />Turtle Graphics</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><Icon name="x" size={20} /></button>
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

    useEffect(() => {
        setFilename(initialName);
        setContent(initialContent);
    }, [initialName, initialContent, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col overflow-hidden border border-slate-200">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Icon name="file-text" size={20} className="text-blue-600" /> {initialName ? 'Edit File' : 'New File'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={24} /></button>
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

export const PythonLMS = ({ levelName, initialQuestions = [], isTestMode = false }) => {
    const { currentUser } = useAppState();
    // Use initialQuestions if provided, otherwise fallback to default questions (for backward compatibility/testing)
    const activeQuestions = useMemo(() => initialQuestions.length > 0 ? initialQuestions.map((q, idx) => ({
        id: q.id || idx + 1,
        title: q.challengeName || q.title || `Question ${idx + 1}`,
        description: q.description || "No description provided.",
        hint: q.hint || "No hint available.",
        placeholder: q.starterCode || q.placeholder || "",
        checkType: q.checkType || 'regex', // Default to regex if not specified
        validation: q.validationRegex ? new RegExp(q.validationRegex) : /.*/, // Default to match anything if no regex
        criteria: q.criteria || {},
        unitName: q.unitName // Pass unitName through
    })) : questions, [initialQuestions]);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userCode, setUserCode] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [rightTab, setRightTab] = useState('task');

    const [pyodide, setPyodide] = useState(null);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [replInput, setReplInput] = useState('');
    const consoleEndRef = useRef(null);
    const stdoutRef = useRef([]);

    const [showTurtle, setShowTurtle] = useState(false);
    const [turtleCommands, setTurtleCommands] = useState([]);
    const turtleCmdBuffer = useRef([]);

    const [sidebarTab, setSidebarTab] = useState('lessons');
    const [userFiles, setUserFiles] = useState([]);
    const [fileModalOpen, setFileModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState(null);

    const currentQuestion = activeQuestions[currentQuestionIndex] || {};

    // Update userCode when question changes
    useEffect(() => {
        if (currentQuestion.placeholder) {
            setUserCode(currentQuestion.placeholder);
        } else {
            setUserCode('');
        }
    }, [currentQuestion.id]); // Only reset when question ID changes

    const addLog = (type, text) => setConsoleLogs(prev => [...prev, { type, text }]);

    // Init Pyodide on Main Thread
    useEffect(() => {
        async function initPyodide() {
            try {
                const loadPyodide = await loadPyodideScript();
                const py = await loadPyodide({
                    stdout: (text) => {
                        addLog('output', text);
                        stdoutRef.current.push(text);
                    },
                    stderr: (text) => addLog('error', text)
                });

                // Define JS callbacks on window so Pyodide can call them
                window.turtleEmit = (data) => {
                    // Accumulate commands
                    let cmd = data;
                    if (data && typeof data.toJs === 'function') {
                        cmd = data.toJs({ dict_converter: Object.fromEntries });
                    }
                    turtleCmdBuffer.current.push(cmd);
                };

                // Override input to use prompt()
                py.runPython(`
                    import builtins
                    import js
                    
                    def input(prompt_text=""):
                        # Use JS prompt - this BLOCKS until user answers
                        val = js.prompt(prompt_text)
                        if val is None:
                            return ""
                        return str(val)
                    builtins.input = input
                `);

                // WebTurtle Implementation (same logic, but calls window.turtleEmit)
                py.runPython(`
                    import sys
                    import types
                    import math
                    import js

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

                setPyodide(py);
                addLog('system', 'Python 3.11 Environment Ready (Main Thread).');
            } catch (err) {
                addLog('error', "Failed to load Python: " + err.message);
            }
        }
        initPyodide();
    }, []);

    useEffect(() => { if (rightTab === 'console' && consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [consoleLogs, rightTab]);

    const syncFiles = (py) => {
        // List files from Python Virtual FS
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
    };

    const executeCode = async () => {
        if (!pyodide) return false;

        setRightTab('console');
        stdoutRef.current = [];
        turtleCmdBuffer.current = [];

        addLog('system', '--- Running main.py ---');

        try {
            await pyodide.runPythonAsync(userCode);
            syncFiles(pyodide);

            // Update Turtle Graphics
            if (turtleCmdBuffer.current.length > 0) {
                setTurtleCommands([...turtleCmdBuffer.current]);
                if (turtleCmdBuffer.current.some(c => c.action === 'draw')) {
                    setShowTurtle(true);
                }
            }
            return true;
        } catch (err) {
            addLog('error', err.toString());
            return false;
        }
    };

    const handleRunCode = async () => {
        await executeCode();
    };

    const handleSubmitCode = async () => {
        // 1. Execute code first to get current state
        const success = await executeCode();
        if (!success) {
            setFeedback({ type: 'error', message: 'Fix runtime errors before submitting.' });
            return;
        }

        // 2. Validate
        let isCorrect = false;
        let errorMsg = "Incorrect result.";

        if (currentQuestion.checkType === 'variable') {
            const { varName, expectedValue } = currentQuestion.criteria;
            try {
                const actual = pyodide.globals.get(varName);
                if (actual === expectedValue) isCorrect = true;
                else errorMsg = actual === undefined ? `Variable '${varName}' not found.` : `Expected ${expectedValue}, got ${actual}.`;
            } catch (e) { errorMsg = `Variable '${varName}' not found.`; }
        } else if (currentQuestion.checkType === 'regex') {
            if (currentQuestion.validation.test(userCode.trim())) isCorrect = true;
            else errorMsg = "Code structure doesn't match requirements.";
        }

        if (isCorrect) {
            setFeedback({ type: 'success', message: 'Correct! Great job.' });
            if (!completedSteps.includes(currentQuestion.id)) setCompletedSteps([...completedSteps, currentQuestion.id]);
            setRightTab('result');

            // Save submission to Firestore
            if (currentUser) {
                try {
                    const submissionId = `${levelName}_${currentQuestion.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
                    const submissionRef = doc(db, "users", currentUser.username.toLowerCase(), "submissions", submissionId);
                    await setDoc(submissionRef, {
                        questionId: currentQuestion.id,
                        title: currentQuestion.title,
                        description: currentQuestion.description || "",
                        code: userCode,
                        levelName: levelName || "Unknown Level",
                        unitName: currentQuestion.unitName || "Unknown Unit",
                        timestamp: serverTimestamp(),
                        status: "completed"
                    });
                } catch (err) {
                    console.error("Error saving submission:", err);
                }
            }
        } else {
            setFeedback({ type: 'error', message: errorMsg });
            addLog('system', `[LMS Validation Failed] ${errorMsg}`);
            setRightTab('result'); // Show result tab on fail too for submit
        }
    };

    const handleReplSubmit = (e) => {
        e.preventDefault();
        if (!replInput.trim() || !pyodide) return;
        addLog('input', `>>> ${replInput}`);
        try {
            const result = pyodide.runPython(replInput);
            if (result !== undefined) addLog('output', result.toString());
            syncFiles(pyodide);
        } catch (err) {
            addLog('error', err.toString());
        }
        setReplInput('');
    };

    const handleNext = () => {
        setFeedback(null); setUserCode(''); setRightTab('task');
        if (currentQuestionIndex < activeQuestions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
        else setIsCompleted(true);
    };

    // File Management
    const openNewFileModal = () => { setEditingFile(null); setFileModalOpen(true); };
    const openEditFileModal = (file) => { setEditingFile(file); setFileModalOpen(true); };
    const saveFile = (name, content) => {
        if (pyodide) {
            pyodide.FS.writeFile(name, content, { encoding: "utf8" });
            syncFiles(pyodide);
            addLog('system', `File '${name}' saved.`);
        }
        setFileModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            <style>{`
                textarea::-webkit-scrollbar, .console-scroll::-webkit-scrollbar { width: 8px; }
                textarea::-webkit-scrollbar-track, .console-scroll::-webkit-scrollbar-track { background: #1e293b; }
                textarea::-webkit-scrollbar-thumb, .console-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
                textarea::-webkit-scrollbar-thumb:hover, .console-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <TurtleModal isOpen={showTurtle} onClose={() => setShowTurtle(false)} commands={turtleCommands} />
            <FileModal
                isOpen={fileModalOpen}
                onClose={() => setFileModalOpen(false)}
                onSave={saveFile}
                initialName={editingFile ? editingFile.name : ""}
                initialContent={editingFile ? editingFile.content : ""}
            />

            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-700 hidden md:flex">
                <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
                    <Icon name="cpu" className="text-blue-500" />
                    <span className="font-bold text-white text-xl">
                        {isTestMode ? "Assessment" : "CodeMaster"}
                    </span>
                </div>

                {isTestMode && (
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h3 className="text-white font-bold text-sm mb-1">{levelName}</h3>
                        <p className="text-xs text-slate-400">Complete all questions.</p>
                    </div>
                )}

                <div className="flex border-b border-slate-800">
                    <button onClick={() => setSidebarTab('lessons')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${sidebarTab === 'lessons' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                        {isTestMode ? "Questions" : "Lessons"}
                    </button>
                    <button onClick={() => setSidebarTab('files')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${sidebarTab === 'files' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>Files</button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                    {sidebarTab === 'lessons' ? (
                        <div className="space-y-2">
                            {activeQuestions.map((q, idx) => {
                                const isLocked = !isTestMode && idx > completedSteps.length;
                                const isCompleted = completedSteps.includes(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            if (!isLocked) {
                                                setCurrentQuestionIndex(idx);
                                                setFeedback(null);
                                                // Only clear code if switching questions, maybe preserve state in future
                                                // setUserCode(''); 
                                            }
                                        }}
                                        disabled={isLocked}
                                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between text-sm transition-colors 
                                            ${currentQuestionIndex === idx ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}
                                            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <span className="truncate flex items-center gap-2">
                                            {isLocked && <Icon name="lock" size={12} />}
                                            {isTestMode ? `Q${idx + 1}` : `${idx + 1}.`} {q.title}
                                        </span>
                                        {isCompleted && <Icon name="check-circle" size={16} className="text-green-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div>
                            <button onClick={openNewFileModal} disabled={!pyodide} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mb-4 transition-colors disabled:opacity-50">
                                <Icon name="plus" size={16} /> New File
                            </button>
                            {userFiles.length === 0 ? (
                                <div className="text-center text-slate-600 text-sm italic py-4">No files created yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {userFiles.map(file => (
                                        <div key={file.name} onClick={() => openEditFileModal(file)} className="group flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-600">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Icon name="file-text" size={18} className="text-blue-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-300 truncate">{file.name}</span>
                                            </div>
                                            <Icon name="edit-2" size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-2 flex justify-between"><span>Progress</span> <span>{Math.round((completedSteps.length / activeQuestions.length) * 100)}%</span></div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(completedSteps.length / activeQuestions.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 overflow-hidden p-6 flex flex-col max-w-7xl mx-auto w-full">
                    {isCompleted ? (
                        <div className="text-center mt-20">
                            <div className="bg-green-100 p-6 rounded-full inline-block mb-6"><Icon name="award" size={64} className="text-green-600" /></div>
                            <h2 className="text-3xl font-bold">
                                {isTestMode ? "Assessment Completed!" : "Course Completed!"}
                            </h2>
                            <p className="text-slate-600 mt-2 mb-8">
                                {isTestMode ? "You have successfully submitted all answers." : "You have finished all lessons."}
                            </p>
                            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">Restart</button>
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-6 min-h-0">
                            <div className="flex-[2] flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
                                <div className="bg-slate-800 px-4 py-3 flex justify-between border-b border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <Icon name="file-code" size={18} className="text-blue-400" />
                                        <div>
                                            <span className="text-slate-300 text-sm font-bold block">main.py</span>
                                            <span className="text-slate-500 text-xs block">
                                                {isTestMode ? `Question ${currentQuestionIndex + 1}: ${currentQuestion.title}` : `Current Task: ${currentQuestion.title}`}
                                            </span>
                                        </div>
                                    </div>
                                    {!pyodide && <span className="text-yellow-500 text-xs animate-pulse">Loading Python...</span>}
                                </div>
                                <div className="flex-1 relative">
                                    <ErrorBoundary>
                                        <Editor
                                            height="100%"
                                            defaultLanguage="python"
                                            theme="vs-dark"
                                            value={userCode}
                                            onChange={(value) => { setUserCode(value || ""); setFeedback(null); }}
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
                                <div className="bg-slate-800 p-4 border-t border-slate-700 flex justify-end gap-3">
                                    <div className="text-slate-500 text-xs py-2 mr-auto">Pyodide v0.23</div>
                                    <button onClick={handleRunCode} disabled={!pyodide} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                                        <Icon name="play" size={18} /> Run
                                    </button>
                                    <button onClick={handleSubmitCode} disabled={!pyodide} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                                        <Icon name="send" size={18} /> Submit Answer
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                <div className="flex border-b border-slate-200 bg-slate-50">
                                    {['task', 'console', 'result'].map(tab => (
                                        <button key={tab} onClick={() => setRightTab(tab)} className={`flex-1 py-3 text-sm font-bold capitalize ${rightTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}>{tab}</button>
                                    ))}
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                                    {rightTab === 'task' && (
                                        <div>
                                            <div className="mb-4 pb-4 border-b border-slate-200">
                                                {currentQuestion.unitName && (
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                        Unit: {currentQuestion.unitName}
                                                    </div>
                                                )}
                                                <h2 className="text-2xl font-bold text-slate-800">
                                                    {isTestMode && <span className="text-slate-400 text-lg block mb-1">Question {currentQuestionIndex + 1}</span>}
                                                    {currentQuestion.title}
                                                </h2>
                                            </div>
                                            <div className="text-slate-600 mb-6 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: currentQuestion.description }} />

                                            {/* Hide hints in Test Mode unless explicitly allowed (assuming hidden for now) */}
                                            {!isTestMode && (
                                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                                                    <strong>Hint:</strong> {currentQuestion.hint}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {rightTab === 'console' && (
                                        <div className="h-full flex flex-col bg-black rounded-lg overflow-hidden font-mono text-sm">
                                            <div className="flex-1 p-4 overflow-y-auto console-scroll space-y-1">
                                                {consoleLogs.map((l, i) => <div key={i} className={l.type === 'error' ? 'text-red-400' : l.type === 'output' ? 'text-green-400' : l.type === 'input' ? 'text-white font-bold' : 'text-blue-300'}>{l.text}</div>)}
                                                <div ref={consoleEndRef} />
                                            </div>
                                            <form onSubmit={handleReplSubmit} className="bg-slate-900 p-2 flex items-center border-t border-slate-700">
                                                <span className="text-green-500 mr-2">&gt;&gt;&gt;</span>
                                                <input type="text" value={replInput} onChange={(e) => setReplInput(e.target.value)} placeholder="Type python code here..." className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 font-mono" disabled={!pyodide} />
                                            </form>
                                        </div>
                                    )}
                                    {rightTab === 'result' && (
                                        <div className="text-center h-full flex flex-col justify-center">
                                            {!feedback ? <div className="text-slate-400">Run code to test or Submit to grade</div> : (
                                                <div>
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        <Icon name={feedback.type === 'success' ? 'check' : 'x'} size={32} />
                                                    </div>
                                                    <h3 className="text-xl font-bold mb-2">{feedback.type === 'success' ? 'Excellent!' : 'Try Again'}</h3>
                                                    <p className="text-slate-600 mb-6">{feedback.message}</p>
                                                    {feedback.type === 'success' ? (
                                                        <button onClick={handleNext} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold w-full">Next Question</button>
                                                    ) : (
                                                        <button onClick={() => setRightTab('task')} className="border border-slate-300 px-6 py-3 rounded-lg font-bold w-full">Review Task</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

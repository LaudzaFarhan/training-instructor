import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Edit3, Trash2, Save, X, Eye, Code, ChevronDown, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { pb } from '../../context/AppStateContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';

const generateId = () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const QuestionManager = ({ levelId, levelName, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [expandedChallenges, setExpandedChallenges] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const challengesPerPage = 3;

    useEffect(() => {
        loadQuestions();
    }, [levelId]);

    // Cleanup: close modal when component unmounts
    useEffect(() => {
        return () => {
            setShowModal(false);
            setEditingQuestion(null);
        };
    }, []);

    const loadQuestions = async () => {
        try {
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
                        hardSteps.forEach((step, stepIdx) => {
                            allQuestions.push({
                                id: `${challengeData.id}_step_${step.id}`,
                                challengeId: challengeData.id,
                                stepId: step.id,
                                unitId: unitData.id,
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
                        });
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
            
            allQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
            setQuestions(allQuestions);
            setLoading(false);
        } catch (error) {
            console.error('Error loading questions:', error);
            setLoading(false);
        }
    };

    const handleSaveQuestion = async () => {
        if (!editingQuestion.title) {
            alert('Please enter a question title');
            return;
        }

        try {
            // Parse test cases from JSON string
            let testCases = [];
            if (editingQuestion.testCasesJson) {
                try {
                    testCases = JSON.parse(editingQuestion.testCasesJson);
                } catch (e) {
                    console.error('Invalid test cases JSON:', e);
                }
            }
            
            if (editingQuestion.stepId) {
                // Update step content
                await pb.collection('steps').update(editingQuestion.stepId, {
                    content: editingQuestion.instructions || '',
                    expectedOutput: editingQuestion.expectedOutput || '',
                    hint: editingQuestion.hints || '',
                    testCases: testCases,
                    updatedAt: new Date().toISOString(),
                });

                // Also update challenge-level data
                await pb.collection('challenges').update(editingQuestion.challengeId, {
                    starterCode: editingQuestion.codeTemplate || '# Write your code here\n',
                    requirements: {
                        mustHave: editingQuestion.mustHave?.split(',').map(s => s.trim()).filter(Boolean) || [],
                        mustNotHave: editingQuestion.mustNotHave?.split(',').map(s => s.trim()).filter(Boolean) || [],
                        minLines: parseInt(editingQuestion.minLines) || 0,
                        maxLines: parseInt(editingQuestion.maxLines) || 0,
                        minVariables: parseInt(editingQuestion.minVariables) || 0,
                    },
                    updatedAt: new Date().toISOString(),
                });
            } else {
                // For challenge-level fallbacks, update everything on the challenge
                await pb.collection('challenges').update(editingQuestion.challengeId, {
                    description: editingQuestion.instructions || '',
                    expectedOutput: editingQuestion.expectedOutput || '',
                    hint: editingQuestion.hints || '',
                    starterCode: editingQuestion.codeTemplate || '# Write your code here\n',
                    requirements: {
                        mustHave: editingQuestion.mustHave?.split(',').map(s => s.trim()).filter(Boolean) || [],
                        mustNotHave: editingQuestion.mustNotHave?.split(',').map(s => s.trim()).filter(Boolean) || [],
                        minLines: parseInt(editingQuestion.minLines) || 0,
                        maxLines: parseInt(editingQuestion.maxLines) || 0,
                        minVariables: parseInt(editingQuestion.minVariables) || 0,
                    },
                    updatedAt: new Date().toISOString(),
                });
            }

            await loadQuestions();
            setShowModal(false);
            setEditingQuestion(null);
        } catch (error) {
            console.error('Error saving question:', error);
            alert('Failed to save question');
        }
    };

    const handleDeleteQuestion = async (question) => {
        if (!window.confirm('Delete this step from the challenge?')) return;

        try {
            if (question.stepId) {
                // Delete the step document
                await pb.collection('steps').delete(question.stepId);
            } else {
                // Delete the entire challenge if it's a fallback
                if (window.confirm('This will delete the entire challenge because it has no steps. Continue?')) {
                    await pb.collection('challenges').delete(question.challengeId);
                } else {
                    return;
                }
            }
            await loadQuestions();
        } catch (error) {
            console.error('Error deleting step:', error);
            alert('Failed to delete step');
        }
    };

    const handleEditQuestion = (question) => {
        setEditingQuestion({
            ...question,
            mustHave: question.requirements?.mustHave?.join(', ') || '',
            mustNotHave: question.requirements?.mustNotHave?.join(', ') || '',
            minLines: question.requirements?.minLines || 0,
            maxLines: question.requirements?.maxLines || 0,
            minVariables: question.requirements?.minVariables || 0,
            testCasesJson: question.testCases?.length > 0 
                ? JSON.stringify(question.testCases, null, 2) 
                : '',
        });
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" onClick={onBack}>
                        <ArrowLeft size={18} /> Back
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Python Questions: {levelName}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            Manage coding assessment questions
                        </p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set("portalLevelId", levelId);
                        window.open(url.toString(), "_blank");
                    }}>
                    <Eye size={18} /> Preview Assessment
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search challenges by name, unit, or step..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Group questions by challenge name */}
            <div className="space-y-4">
                {(() => {
                    // Group questions by challenge (extract base name without "- Step X")
                    const grouped = {};
                    questions.forEach((q, idx) => {
                        const baseName = q.title.replace(/ - Step \d+$/, '');
                        if (!grouped[baseName]) {
                            grouped[baseName] = { questions: [], unitName: q.unitName };
                        }
                        grouped[baseName].questions.push({ ...q, globalIndex: idx });
                    });

                    // Filter by search query
                    const allChallenges = Object.entries(grouped).filter(([challengeName, data]) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        // Search in challenge name, unit name, or step titles
                        return challengeName.toLowerCase().includes(query) ||
                               data.unitName?.toLowerCase().includes(query) ||
                               data.questions.some(q => q.title.toLowerCase().includes(query));
                    });
                    
                    const totalPages = Math.ceil(allChallenges.length / challengesPerPage);
                    const startIndex = (currentPage - 1) * challengesPerPage;
                    const paginatedChallenges = allChallenges.slice(startIndex, startIndex + challengesPerPage);

                    return (
                        <>
                            {paginatedChallenges.map(([challengeName, data]) => (
                        <Card key={challengeName} className="overflow-hidden">
                            {/* Challenge Header - Clickable */}
                            <button
                                onClick={() => setExpandedChallenges(prev => ({
                                    ...prev,
                                    [challengeName]: !prev[challengeName]
                                }))}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedChallenges[challengeName] ? (
                                        <ChevronDown size={20} className="text-violet-500" />
                                    ) : (
                                        <ChevronRight size={20} className="text-slate-400" />
                                    )}
                                    <div className="text-left">
                                        <h3 className="font-bold text-slate-800 dark:text-white">{challengeName}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Unit: {data.unitName} • {data.questions.length} step(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {data.questions.some(q => q.testCases?.length > 0) && (
                                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                                            Has Test Cases
                                        </span>
                                    )}
                                    <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                                        {data.questions.filter(q => q.expectedOutput?.trim()).length} coding / {data.questions.filter(q => !q.expectedOutput?.trim()).length} instruction
                                    </span>
                                </div>
                            </button>

                            {/* Expanded Steps */}
                            {expandedChallenges[challengeName] && (
                                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4">
                                    <div className="space-y-3">
                                        {data.questions.map((question) => (
                                            <div 
                                                key={question.id} 
                                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-violet-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                        {question.globalIndex + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-white text-sm">
                                                            {question.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {(!question.expectedOutput || question.expectedOutput.trim() === '') ? (
                                                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]">
                                                                    📖 Instruction
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px]">
                                                                    💻 Coding
                                                                </span>
                                                            )}
                                                            {question.testCases?.length > 0 && (
                                                                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px]">
                                                                    🧪 {question.testCases.length} tests
                                                                </span>
                                                            )}
                                                            {question.expectedOutput && (
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                                    Output: {question.expectedOutput.substring(0, 20)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        className="h-7 text-xs px-3"
                                                        onClick={() => {
                                                            const url = new URL(window.location.href);
                                                            url.searchParams.set("portalLevelId", levelId);
                                                            url.searchParams.set("questionIndex", question.globalIndex);
                                                            window.open(url.toString(), "_blank");
                                                        }}>
                                                        <Eye size={12} /> Preview
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="h-7 text-xs px-3"
                                                        onClick={() => handleEditQuestion(question)}>
                                                        <Edit3 size={12} /> Edit
                                                    </Button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(question)}
                                                        className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-9 px-3"
                                    >
                                        <ChevronLeft size={16} /> Prev
                                    </Button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <Button
                                        variant="secondary"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-9 px-3"
                                    >
                                        Next <ChevronRight size={16} />
                                    </Button>
                                </div>
                            )}

                            {/* Page info */}
                            {totalPages > 1 && (
                                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                                    Showing {startIndex + 1}-{Math.min(startIndex + challengesPerPage, allChallenges.length)} of {allChallenges.length} challenges
                                </p>
                            )}
                        </>
                    );
                })()}

                {questions.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <p>No challenges found in curriculum. Please add challenges using the Curriculum Editor first.</p>
                    </div>
                )}
            </div>

            {showModal && editingQuestion && (
                <div 
                    className="fixed inset-0 z-[99999] bg-black/30 flex items-center justify-center"
                    onClick={() => { setShowModal(false); setEditingQuestion(null); }}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl border-2 border-violet-600 mx-4 max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Edit Validation Rules
                            </h3>
                            <button
                                onClick={() => { setShowModal(false); setEditingQuestion(null); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Challenge Info */}
                                <div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                                    <p className="text-lg text-blue-900 dark:text-blue-100">
                                        <strong className="font-bold">{editingQuestion.title}</strong> <span className="text-blue-600 dark:text-blue-400">• {editingQuestion.unitName}</span>
                                    </p>
                                </div>

                                {/* Question Type Toggle */}
                                <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!editingQuestion.expectedOutput || editingQuestion.expectedOutput.trim() === ''}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Make it instruction-only (clear expected output)
                                                    setEditingQuestion({ ...editingQuestion, expectedOutput: '' });
                                                } else {
                                                    // Make it a coding challenge (set placeholder)
                                                    setEditingQuestion({ ...editingQuestion, expectedOutput: 'Enter expected output' });
                                                }
                                            }}
                                            className="w-4 h-4 accent-violet-600"
                                        />
                                        <div>
                                            <span className="font-semibold text-slate-800 dark:text-white">Instruction Only (No Coding Required)</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Check this if students only need to read/mark as complete. Uncheck for coding challenges.</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Expected Output */}
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                                        Expected Output *
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                                        rows={2}
                                        value={editingQuestion.expectedOutput}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, expectedOutput: e.target.value })}
                                        placeholder="Hello World"
                                    />
                                </div>

                                {/* Code Template */}
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                                        Code Template
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                                        rows={2}
                                        value={editingQuestion.codeTemplate}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, codeTemplate: e.target.value })}
                                        placeholder="# Write your code here"
                                    />
                                </div>

                                {/* Hints */}
                                <div className="col-span-2">
                                    <InputField
                                        label="Hints (Optional)"
                                        value={editingQuestion.hints}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, hints: e.target.value })}
                                        placeholder="Use the print() function"
                                    />
                                </div>

                                {/* Validation Rules Section */}
                                <div className="col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-3">Code Validation Rules</h4>
                                </div>

                                {/* Must Have */}
                                <div>
                                    <InputField
                                        label="Must Have (comma-separated)"
                                        value={editingQuestion.mustHave}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, mustHave: e.target.value })}
                                        placeholder="for, range, print"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Code must contain these patterns</p>
                                </div>

                                {/* Must NOT Have */}
                                <div>
                                    <InputField
                                        label="Must NOT Have (comma-separated)"
                                        value={editingQuestion.mustNotHave}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, mustNotHave: e.target.value })}
                                        placeholder="print\\('#'\\), print\\('##'\\)"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Code cannot contain these patterns</p>
                                </div>

                                {/* Min/Max Lines, Min Variables and Order */}
                                <div>
                                    <InputField
                                        label="Min Lines"
                                        type="number"
                                        value={editingQuestion.minLines}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, minLines: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <InputField
                                        label="Max Lines"
                                        type="number"
                                        value={editingQuestion.maxLines}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, maxLines: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <InputField
                                        label="Min Variables"
                                        type="number"
                                        value={editingQuestion.minVariables}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, minVariables: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Minimum variable assignments required</p>
                                </div>

                                <div>
                                    <InputField
                                        label="Order"
                                        type="number"
                                        value={editingQuestion.order}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, order: parseInt(e.target.value) || 0 })}
                                    />
                                </div>

                                {/* Test Cases Section */}
                                <div className="col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">
                                        Test Cases (for input() questions)
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        Define multiple input/output pairs to test code with input(). Format: JSON array.
                                    </p>
                                    <textarea
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-xs font-mono"
                                        rows={5}
                                        value={editingQuestion.testCasesJson || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, testCasesJson: e.target.value })}
                                        placeholder={`[
  { "input": "30", "expectedOutput": "You are old" },
  { "input": "20", "expectedOutput": "You are young" },
  { "input": ["John", "25"], "expectedOutput": "Hello John, you are 25" }
]`}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Use array for multiple inputs: ["input1", "input2"]
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => { setShowModal(false); setEditingQuestion(null); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveQuestion}>
                                <Save size={18} /> Save Question
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

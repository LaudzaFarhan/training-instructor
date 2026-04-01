import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit3, Trash2, Save, X, Eye } from 'lucide-react';
import { pb } from '../../context/AppStateContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { InputField } from '../common/InputField';
import { Modal } from '../common/Modal';

const generateId = () => `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const JuniorLessonManager = ({ levelId, levelName, onBack }) => {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingLesson, setEditingLesson] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadLessons();
    }, [levelId]);

    const loadLessons = async () => {
        try {
            const lessonsData = await pb.collection('lessons').getFullList({ filter: `levelId="${levelId}"`, sort: 'order' });
            setLessons(lessonsData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading lessons:', error);
            setLoading(false);
        }
    };

    const handleSaveLesson = async () => {
        if (!editingLesson.title) {
            alert('Please enter a lesson title');
            return;
        }

        try {
            const data = {
                levelId: levelId,
                title: editingLesson.title,
                description: editingLesson.description || '',
                content: editingLesson.content || '',
                videoUrl: editingLesson.videoUrl || '',
                order: editingLesson.order || lessons.length,
                updatedAt: new Date().toISOString(),
            };

            if (editingLesson.id.startsWith('lesson_')) {
                await pb.collection('lessons').create(data);
            } else {
                await pb.collection('lessons').update(editingLesson.id, data);
            }

            await loadLessons();
            setShowModal(false);
            setEditingLesson(null);
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Failed to save lesson');
        }
    };

    const handleDeleteLesson = async (lessonId) => {
        if (!window.confirm('Delete this lesson?')) return;

        try {
            await pb.collection('lessons').delete(lessonId);
            await loadLessons();
        } catch (error) {
            console.error('Error deleting lesson:', error);
            alert('Failed to delete lesson');
        }
    };

    const handleAddLesson = () => {
        setEditingLesson({
            id: generateId(),
            title: '',
            description: '',
            content: '',
            videoUrl: '',
            order: lessons.length,
        });
        setShowModal(true);
    };

    const handleEditLesson = (lesson) => {
        setEditingLesson({ ...lesson });
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
                            Junior Lessons: {levelName}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            Manage the 10 lessons for this Junior level
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.set("portalLevelId", levelId);
                            window.open(url.toString(), "_blank");
                        }}>
                        <Eye size={18} /> Preview as Instructor
                    </Button>
                    <Button onClick={handleAddLesson}>
                        <Plus size={18} /> Add Lesson
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessons.map((lesson, index) => (
                    <Card key={lesson.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white">
                                    {lesson.title}
                                </h3>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                            {lesson.description || 'No description'}
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                className="flex-1 h-8 text-xs"
                                onClick={() => handleEditLesson(lesson)}>
                                <Edit3 size={14} /> Edit
                            </Button>
                            <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="text-red-400 hover:text-red-600 px-2">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </Card>
                ))}

                {lessons.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        <p>No lessons yet. Click "Add Lesson" to create one.</p>
                    </div>
                )}
            </div>

            {showModal && editingLesson && (
                <Modal
                    title={editingLesson.id.startsWith('lesson_') ? 'Add New Lesson' : 'Edit Lesson'}
                    onClose={() => {
                        setShowModal(false);
                        setEditingLesson(null);
                    }}
                    maxWidth="max-w-4xl"
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingLesson(null);
                                }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveLesson}>
                                <Save size={18} /> Save Lesson
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <InputField
                                    label="Lesson Title *"
                                    value={editingLesson.title}
                                    onChange={(e) =>
                                        setEditingLesson({ ...editingLesson, title: e.target.value })
                                    }
                                    placeholder="e.g., Introduction to Robotics"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-2">
                                    Description
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all text-sm"
                                    rows={3}
                                    value={editingLesson.description}
                                    onChange={(e) =>
                                        setEditingLesson({ ...editingLesson, description: e.target.value })
                                    }
                                    placeholder="Brief description of the lesson"
                                />
                            </div>

                            <div className="col-span-2">
                                <InputField
                                    label="Video URL (Optional)"
                                    value={editingLesson.videoUrl}
                                    onChange={(e) =>
                                        setEditingLesson({ ...editingLesson, videoUrl: e.target.value })
                                    }
                                    placeholder="https://youtube.com/watch?v=..."
                                />
                                {editingLesson.videoUrl && (
                                    <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                                        <iframe
                                            className="w-full h-full"
                                            src={editingLesson.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                            title="Video Preview"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="col-span-1">
                                <InputField
                                    label="Lesson Order"
                                    type="number"
                                    value={editingLesson.order}
                                    onChange={(e) =>
                                        setEditingLesson({
                                            ...editingLesson,
                                            order: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-2">
                                Lesson Content (HTML supported)
                            </label>
                            <textarea
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all text-sm font-mono"
                                rows={12}
                                value={editingLesson.content}
                                onChange={(e) =>
                                    setEditingLesson({ ...editingLesson, content: e.target.value })
                                }
                                placeholder="Enter lesson content here... You can use HTML tags like <h2>, <p>, <ul>, <li>, <strong>, etc."
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Tip: Use HTML tags for formatting. Example: &lt;h2&gt;Title&lt;/h2&gt; &lt;p&gt;Content&lt;/p&gt;
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

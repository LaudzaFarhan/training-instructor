import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Lock, Video, FileText, Award } from 'lucide-react';
import { pb, useAppState } from '../../context/AppStateContext';
import { Card } from './Card';
import { Button } from './Button';

const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;

    let videoId = null;
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split(/[?&]/)[0];
    }

    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    return url;
};

export const JuniorLMS = ({ levelId }) => {
    const { currentUser } = useAppState();
    const [level, setLevel] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [robotVerified, setRobotVerified] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLevelData();
    }, [levelId, currentUser]);

    const loadLevelData = async () => {
        try {
            // Load level info
            try {
                const levelRecord = await pb.collection('levels').getOne(levelId);
                setLevel(levelRecord);
            } catch (e) {
                console.error("Error loading level", e);
            }

            // Load lessons for this level
            try {
                const lessonsRecords = await pb.collection('junior_lessons').getFullList({
                    filter: `levelId="${levelId}"`,
                    sort: 'order'
                });
                setLessons(lessonsRecords);
            } catch (e) {
                console.error("Error loading lessons", e);
            }

            // Load student progress
            if (currentUser?.role === 'teacher') {
                try {
                    const progressRecords = await pb.collection('teacher_junior_progress').getFullList({
                        filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
                    });
                    if (progressRecords.length > 0) {
                        const data = progressRecords[0];
                        setRobotVerified(data.robotVerified || false);
                        setCompletedLessons(data.completedLessons || []);
                    }
                } catch (e) {
                    console.error("Error loading progress", e);
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading Junior level:', error);
            setLoading(false);
        }
    };

    const handleCompleteLesson = async (lessonId) => {
        if (!currentUser || currentUser.role !== 'teacher') return;

        try {
            const newCompleted = [...completedLessons, lessonId];
            setCompletedLessons(newCompleted);

            const timestamp = new Date().toISOString();
            const progressRecords = await pb.collection('teacher_junior_progress').getFullList({
                filter: `teacherId="${currentUser.id}" && levelId="${levelId}"`
            });
            
            if (progressRecords.length > 0) {
                await pb.collection('teacher_junior_progress').update(progressRecords[0].id, {
                    completedLessons: newCompleted,
                    lastUpdated: timestamp,
                });
            } else {
                await pb.collection('teacher_junior_progress').create({
                    teacherId: currentUser.id,
                    levelId: levelId,
                    completedLessons: newCompleted,
                    lastUpdated: timestamp,
                });
            }

            setCurrentLesson(null);
        } catch (error) {
            console.error('Error completing lesson:', error);
        }
    };

    const isLessonUnlocked = (lessonIndex) => {
        // Admin can access all lessons for preview
        if (currentUser?.role === 'admin') return true;
        // First lesson is ALWAYS unlocked for everyone
        if (lessonIndex === 0) return true;
        // Other lessons unlock after previous lesson is completed
        return completedLessons.includes(lessons[lessonIndex - 1]?.id);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (currentLesson) {
        const lesson = lessons.find(l => l.id === currentLesson);
        const isCompleted = completedLessons.includes(lesson?.id);

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
                <div className="max-w-5xl mx-auto">
                    <Button
                        variant="secondary"
                        onClick={() => setCurrentLesson(null)}
                        className="mb-6">
                        ← Back to Lessons
                    </Button>

                    <Card className="p-8">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                                    {lesson?.title || 'Lesson'}
                                </h2>
                                {lesson?.description && (
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {lesson.description}
                                    </p>
                                )}
                            </div>
                            {isCompleted && (
                                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-lg">
                                    <CheckCircle size={20} />
                                    <span className="font-semibold">Completed</span>
                                </div>
                            )}
                        </div>

                        {/* Video Section */}
                        {lesson?.videoUrl && (
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <Video size={20} className="text-violet-600" />
                                    Lesson Video
                                </h3>
                                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                                    {lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
                                        <iframe
                                            className="w-full h-full"
                                            src={getEmbedUrl(lesson.videoUrl)}
                                            title={lesson.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video className="w-full h-full" controls>
                                            <source src={lesson.videoUrl} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lesson Content */}
                        {lesson?.content && (
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <FileText size={20} className="text-violet-600" />
                                    Lesson Content
                                </h3>
                                <div className="prose dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg">
                                    <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                                </div>
                            </div>
                        )}

                        {/* Complete Button */}
                        {!isCompleted && currentUser?.role === 'teacher' && (
                            <Button
                                onClick={() => handleCompleteLesson(lesson?.id)}
                                className="w-full py-4 text-lg">
                                <CheckCircle size={24} /> Mark as Complete
                            </Button>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">
                        {level?.name || 'Junior Level'}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Complete lessons to progress through your learning journey
                    </p>
                </div>

                {/* Robot Building Section */}
                <Card className="p-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <Video size={32} />
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-xl font-bold mb-1">Step 1: Build Your Robot</h3>
                            <p className="text-blue-100">Watch the video and create your robot</p>
                        </div>
                        {robotVerified ? (
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                                <CheckCircle size={20} />
                                <span className="font-semibold">Verified!</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                                <Lock size={20} />
                                <span className="font-semibold">Pending Verification</span>
                            </div>
                        )}
                    </div>

                    {/* Video Player */}
                    {level?.videoUrl && (
                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {level.videoUrl.includes('youtube.com') || level.videoUrl.includes('youtu.be') ? (
                                    <iframe
                                        className="w-full h-full"
                                        src={getEmbedUrl(level.videoUrl)}
                                        title="Robot Building Tutorial"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <video className="w-full h-full" controls>
                                        <source src={level.videoUrl} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                )}
                            </div>
                            <p className="text-white/80 text-sm mt-3">
                                📹 Watch this tutorial to learn how to build your robot
                            </p>
                        </div>
                    )}

                    {!level?.videoUrl && (
                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm text-center">
                            <p className="text-white/80 text-sm">
                                No video available yet. Please contact your instructor.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Lessons Grid */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <FileText size={24} />
                        Lessons ({completedLessons.length}/{lessons.length})
                    </h2>

                    {!robotVerified && currentUser?.role !== 'admin' && lessons.length > 0 && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-blue-800 dark:text-blue-200 text-sm">
                                ℹ️ You can start with Lesson 1. Complete it and get your robot verified to unlock more lessons!
                            </p>
                        </div>
                    )}

                    {currentUser?.role === 'admin' && (
                        <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
                            <p className="text-violet-800 dark:text-violet-200 text-sm font-medium">
                                👁️ Admin Preview Mode - You can access all lessons
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lessons.map((lesson, index) => {
                            const isUnlocked = isLessonUnlocked(index);
                            const isCompleted = completedLessons.includes(lesson.id);

                            return (
                                <Card
                                    key={lesson.id}
                                    className={`p-6 transition-all ${isUnlocked
                                            ? 'hover:shadow-lg cursor-pointer'
                                            : 'opacity-50 cursor-not-allowed'
                                        } ${isCompleted
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                            : ''
                                        }`}
                                    onClick={() => isUnlocked && setCurrentLesson(lesson.id)}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted
                                                        ? 'bg-emerald-500 text-white'
                                                        : isUnlocked
                                                            ? 'bg-violet-500 text-white'
                                                            : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                                                    }`}>
                                                {index + 1}
                                            </div>
                                        </div>
                                        {isCompleted ? (
                                            <CheckCircle className="text-emerald-500" size={20} />
                                        ) : !isUnlocked ? (
                                            <Lock className="text-slate-400" size={20} />
                                        ) : (
                                            <Play className="text-violet-500" size={20} />
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">
                                        {lesson.title || `Lesson ${index + 1}`}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {lesson.description || 'Click to view lesson content'}
                                    </p>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Progress Summary */}
                {robotVerified && (
                    <Card className="p-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Award size={48} />
                                <div>
                                    <h3 className="text-xl font-bold">Your Progress</h3>
                                    <p className="text-violet-100">
                                        {completedLessons.length} of {lessons.length} lessons completed
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold">
                                    {lessons.length > 0
                                        ? Math.round((completedLessons.length / lessons.length) * 100)
                                        : 0}
                                    %
                                </div>
                                <p className="text-violet-100 text-sm">Complete</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

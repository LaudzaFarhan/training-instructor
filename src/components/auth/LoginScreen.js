import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Eye, EyeOff, ArrowRight, Sparkles, ShieldAlert } from "lucide-react";
import { useAppState } from "../../context/AppStateContext";

const InputField = ({ label, type = "text", value, onChange, placeholder, rightElement }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">
            {label}
        </label>
        <div className="relative group">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            {rightElement && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors">
                    {rightElement}
                </div>
            )}
        </div>
    </div>
);

export const LoginScreen = () => {
    const { login } = useAppState();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showMockPopup, setShowMockPopup] = useState(false);
    const [showContactPopup, setShowContactPopup] = useState(false);
    const [showHackerPopup, setShowHackerPopup] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const success = await login(username, password);
            if (!success) {
                setError("Invalid credentials. Please try again.");
                setShowHackerPopup(true);
                setTimeout(() => setShowHackerPopup(false), 4000);
            }
        } catch (err) {
            setError("An unexpected error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        setShowMockPopup(true);
        setTimeout(() => setShowMockPopup(false), 4000);
    };

    const handleContactAdmin = () => {
        setShowContactPopup(true);
        setTimeout(() => setShowContactPopup(false), 4000);
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-slate-950 transition-colors duration-500 relative overflow-hidden">
            <AnimatePresence>
                {showMockPopup && (
                    <motion.div
                        key="mock-popup"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4 text-center"
                    >
                        <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Nice try! 😉
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300">
                            We both know you didn't forget it. You just typed it wrong. Try again!
                        </p>
                    </motion.div>
                )}
                {showContactPopup && (
                    <motion.div
                        key="contact-popup"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4 text-center"
                    >
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Administrator Contact
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                            Please contact <span className="font-bold text-slate-900 dark:text-white">Laudza Farhan</span> for assistance with your account.
                        </p>
                    </motion.div>
                )}
                {showHackerPopup && (
                    <motion.div
                        key="hacker-popup"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-6 border border-red-200 dark:border-red-700 max-w-sm w-full mx-4 text-center"
                    >
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Hacker Detected! 🕵️‍♂️
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                            Are you trying to hack us? Just kidding, wrong credentials.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Side - Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-purple-800/20 z-10" />

                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-white/10 rounded-full"
                            initial={{
                                x: Math.random() * 1000,
                                y: Math.random() * 1000,
                                scale: Math.random() * 0.5 + 0.5,
                                opacity: Math.random() * 0.3 + 0.1,
                            }}
                            animate={{
                                y: [null, Math.random() * -100],
                                x: [null, Math.random() * 50 - 25],
                            }}
                            transition={{
                                duration: Math.random() * 10 + 10,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            style={{
                                width: Math.random() * 100 + 50,
                                height: Math.random() * 100 + 50,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-20 text-center p-12 max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 inline-block"
                    >
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-2xl">
                            <BookOpen className="w-10 h-10 text-white" />
                        </div>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-bold text-white mb-6"
                    >
                        Training Manager
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-slate-300 leading-relaxed"
                    >
                        Empowering educators with advanced curriculum management and seamless tracking tools.
                    </motion.p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Please enter your details to sign in
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <InputField
                                label="Username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                            />

                            <div className="space-y-2">
                                <InputField
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    rightElement={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    }
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign in <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-slate-950 text-slate-500">
                                    Don't have an account?
                                </span>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleContactAdmin}
                                className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                            >
                                Contact Administrator
                            </button>
                        </div>
                    </form>
                </div>

                {/* Decorative Elements for Right Side */}
                <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-50">
                    <div className="w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
                </div>
                <div className="absolute bottom-0 left-0 p-8 pointer-events-none opacity-50">
                    <div className="w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
                </div>
            </div>
        </div>
    );
};

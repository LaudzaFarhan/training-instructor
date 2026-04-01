import React, { createContext, useContext, useState } from "react";
// Migrated to Firebase: Drop-in pocketbase shim
import { pb as firebasePb } from "./firebaseShim";

// Export the globally available Firebase proxy instance
export const pb = firebasePb;

const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        // Try to restore user from localStorage on mount
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const logActivity = async (username, action, context = {}) => {
        if (!username) return;
        try {
            await pb.collection("activityLog").create({
                username: username.toLowerCase(),
                action,
                context,
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    const login = async (username, password) => {
        try {
            const lowerUser = username.toLowerCase();
            
            // Admin login
            if (lowerUser === "admin" && password === "calculated213") {
                const adminUser = { role: "admin", username: "admin" };
                setCurrentUser(adminUser);
                localStorage.setItem('currentUser', JSON.stringify(adminUser));
                await logActivity(adminUser.username, "login");
                return true;
            }

            // Teacher login - check if password matches pattern: instructor_{username}213
            const expectedPassword = `instructor_${lowerUser}213`;
            if (password === expectedPassword) {
                // Verify teacher exists in PocketBase before allowing login
                try {
                    const records = await pb.collection("teachers").getFullList({
                        filter: `username = "${lowerUser}"`,
                        $autoCancel: false
                    });
                    
                    if (records.length === 0) {
                        // Teacher not found in database — reject login
                        return false;
                    }

                    const teacherDoc = records[0];
                    const teacherUser = {
                        role: "teacher",
                        username: lowerUser,
                        id: teacherDoc.id,
                        assignedLevels: teacherDoc.assignedLevels || [],
                    };
                    setCurrentUser(teacherUser);
                    localStorage.setItem('currentUser', JSON.stringify(teacherUser));
                    await logActivity(teacherUser.username, "login");
                    return true;
                } catch (err) {
                    console.error("Error verifying teacher:", err);
                    return false;
                }
            }
        } catch (error) {
            console.error("Error during login:", error);
        }
        return false;
    };

    const logout = async () => {
        if (currentUser) await logActivity(currentUser.username, "logout");
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
    };

    const updateCurrentUser = (updates) => {
        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    };

    return (
        <AppStateContext.Provider
            value={{ currentUser, login, logout, logActivity, updateCurrentUser }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => useContext(AppStateContext);

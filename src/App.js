import React, { Suspense, lazy } from "react";
import { AppStateProvider, useAppState } from "./context/AppStateContext";
import { ThemeProvider } from "./context/ThemeContext";

// Lazy load components
const LoginScreen = lazy(() => import("./components/auth/LoginScreen").then(module => ({ default: module.LoginScreen })));
const AdminPanel = lazy(() => import("./components/admin/AdminPanel").then(module => ({ default: module.AdminPanel })));
const TeacherDashboard = lazy(() => import("./components/teacher/TeacherDashboard").then(module => ({ default: module.TeacherDashboard })));
const PortalLevelRunner = lazy(() => import("./components/common/PortalLevelRunner").then(module => ({ default: module.PortalLevelRunner })));
const SnippetPreview = lazy(() => import("./components/common/SnippetPreview").then(module => ({ default: module.SnippetPreview })));
const ReviewPreview = lazy(() => import("./components/common/ReviewPreview").then(module => ({ default: module.ReviewPreview })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const MainApp = () => {
  const { currentUser } = useAppState();

  // Check for special routes
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;

  // Snippet preview mode
  if (pathname === '/snippet-preview') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SnippetPreview />
      </Suspense>
    );
  }

  // Review preview mode
  if (pathname === '/review-preview') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ReviewPreview />
      </Suspense>
    );
  }

  // Portal runner mode
  if (params.get("portalLevelId")) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PortalLevelRunner />
      </Suspense>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginScreen />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {currentUser.role === "admin" ? <AdminPanel /> : <TeacherDashboard />}
    </Suspense>
  );
};

const App = () => {
  return (
    <AppStateProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AppStateProvider>
  );
};

export default App;

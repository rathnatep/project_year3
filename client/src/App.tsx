import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import GroupDetail from "@/pages/group-detail";
import TaskForm from "@/pages/task-form";
import TaskSubmission from "@/pages/task-submission";
import SubmissionReview from "@/pages/submission-review";
import AllSubmissions from "@/pages/all-submissions";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import AllTasks from "@/pages/all-tasks";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return <>{children}</>;
}

function Dashboard() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-1 h-14 px-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && location !== "/auth") {
    return <Redirect to="/auth" />;
  }

  if (user && location === "/auth") {
    return <Redirect to="/dashboard" />;
  }

  if (user && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/groups">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/groups/:id">
        <ProtectedRoute>
          <AppLayout>
            <GroupDetail />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/groups/:groupId/tasks/new">
        <ProtectedRoute>
          <AppLayout>
            <TaskForm />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tasks/:taskId/edit">
        <ProtectedRoute>
          <AppLayout>
            <TaskForm />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tasks/:taskId/submit">
        <ProtectedRoute>
          <AppLayout>
            <TaskSubmission />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tasks/:taskId/submissions">
        <ProtectedRoute>
          <AppLayout>
            <SubmissionReview />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/submissions">
        <ProtectedRoute>
          <AppLayout>
            <AllSubmissions />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <AppLayout>
            <AnalyticsDashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tasks">
        <ProtectedRoute>
          <AppLayout>
            <AllTasks />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
      </Route>
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <NotFound />
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

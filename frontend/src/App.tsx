import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { McmsSidebar } from '@/components/mcms-sidebar';
import { ReportsSidebar } from '@/components/reports-sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { 
  PageLoading, 
  CollectPageLoading, 
  StudentsPageLoading, 
  ReceiptsPageLoading, 
  DuesPageLoading, 
  SettingsPageLoading,
  AboutPageLoading,
  GroupsPageLoading
} from '@/components/loading-skeletons';
import { getApiBase } from '@/lib/constants';

function DynamicSuspenseFallback() {
  const path = window.location.pathname.toLowerCase();
  
  if (path.includes('/students')) {
    return <StudentsPageLoading />;
  }
  if (path.includes('/groups')) {
    return <GroupsPageLoading />;
  }
  if (path.includes('/collect')) {
    return <CollectPageLoading />;
  }
  if (path.includes('/receipts')) {
    return <ReceiptsPageLoading />;
  }
  if (path.includes('/dues')) {
    return <DuesPageLoading />;
  }
  if (path.includes('/settings')) {
    return <SettingsPageLoading />;
  }
  if (path.includes('/about')) {
    return <AboutPageLoading />;
  }
  
  return <PageLoading />;
}

// Lazy load MCMS pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ModuleSelectionPage = lazy(() => import('@/pages/ModuleSelectionPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const CollectPage = lazy(() => import('@/pages/CollectPage'));
const ReceiptsPage = lazy(() => import('@/pages/ReceiptsPage'));
const DuesPage = lazy(() => import('@/pages/DuesPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const GroupsPage = lazy(() => import('@/pages/GroupsPage'));

// Lazy load Reports pages
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'));
const MonthlyResultsPage = lazy(() => import('@/pages/reports/MonthlyResultsPage'));
const MarksEntryPage = lazy(() => import('@/pages/reports/MarksEntryPage'));
const RankingsPage = lazy(() => import('@/pages/reports/RankingsPage'));
const StudentReportsPage = lazy(() => import('@/pages/reports/StudentReportsPage'));
const BlankMarksSheetPage = lazy(() => import('@/pages/reports/BlankMarksSheetPage'));
const ResultSettingsPage = lazy(() => import('@/pages/reports/ResultSettingsPage'));

/** Auth guard — only renders children if logged in */
function AuthGuard() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** MCMS module layout with sidebar */
function McmsLayout() {
  return (
    <SidebarProvider>
      <McmsSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              Money Collection Management System
            </div>
            <div className="text-sm font-medium text-muted-foreground block sm:hidden">
              MCMS
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<DynamicSuspenseFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Reports module layout with sidebar */
function ReportsLayout() {
  return (
    <SidebarProvider>
      <ReportsSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              Student Report Card Management
            </div>
            <div className="text-sm font-medium text-muted-foreground block sm:hidden">
              Report Cards
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <BrowserRouter basename={getApiBase() || undefined}>
        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<DynamicSuspenseFallback />}>
                <LoginPage />
              </Suspense>
            }
          />

          {/* Authenticated routes */}
          <Route element={<AuthGuard />}>
            {/* Module Selection */}
            <Route
              path="/"
              element={
                <Suspense fallback={<PageLoading />}>
                  <ModuleSelectionPage />
                </Suspense>
              }
            />

            {/* MCMS Module */}
            <Route path="/mcms" element={<McmsLayout />}>
              <Route index element={<Navigate to="/mcms/students" replace />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="collect" element={<CollectPage />} />
              <Route path="receipts" element={<ReceiptsPage />} />
              <Route path="dues" element={<DuesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>

            {/* Reports Module */}
            <Route path="/reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to="/reports/dashboard" replace />} />
              <Route path="dashboard" element={<ReportsDashboard />} />
              <Route path="monthly" element={<MonthlyResultsPage />} />
              <Route path="monthly/:periodId/marks" element={<MarksEntryPage />} />
              <Route path="rankings" element={<RankingsPage />} />
              <Route path="student-reports" element={<StudentReportsPage />} />
              <Route path="blank-sheet" element={<BlankMarksSheetPage />} />
              <Route path="settings" element={<ResultSettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

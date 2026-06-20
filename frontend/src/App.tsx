import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/app-sidebar';
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
  AboutPageLoading
} from '@/components/loading-skeletons';
import { getApiBase } from '@/lib/constants';

function DynamicSuspenseFallback() {
  const path = window.location.pathname.toLowerCase();
  
  if (path.includes('/students')) {
    return <StudentsPageLoading />;
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

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const CollectPage = lazy(() => import('@/pages/CollectPage'));
const ReceiptsPage = lazy(() => import('@/pages/ReceiptsPage'));
const DuesPage = lazy(() => import('@/pages/DuesPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const GroupsPage = lazy(() => import('@/pages/GroupsPage'));

function ProtectedRoute() {
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

  return (
    <SidebarProvider>
      <AppSidebar />
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

export default function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <BrowserRouter basename={getApiBase() || undefined}>
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<DynamicSuspenseFallback />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/collect" element={<CollectPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/dues" element={<DuesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

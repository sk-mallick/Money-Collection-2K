import { useLocation, Link } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, ClipboardList, Trophy, UserRound, FileText, Settings, LogOut, ChevronsUpDown, Moon, Sun, LayoutGrid, GraduationCap } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import logoUrl from '@/assets/favicon.png';

const navItems = [
  { title: 'Dashboard', icon: BarChart3, path: '/reports/dashboard' },
  { title: 'Monthly Results', icon: ClipboardList, path: '/reports/monthly' },
  { title: 'Rankings', icon: Trophy, path: '/reports/rankings' },
  { title: 'Student Reports', icon: UserRound, path: '/reports/student-reports' },
  { title: 'Blank Marks Sheet', icon: FileText, path: '/reports/blank-sheet' },
  { title: 'Result Settings', icon: Settings, path: '/reports/settings' },
];

export function ReportsSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex flex-row items-center py-0 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
                <GraduationCap className="h-4.5 w-4.5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-sm text-foreground tracking-wider">Reports</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Back to Modules */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="All Modules"
                  className="transition-all duration-200 text-muted-foreground hover:text-foreground"
                >
                  <Link to="/" onClick={() => isMobile && setOpenMobile(false)}>
                    <LayoutGrid />
                    <span>All Modules</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/reports/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-all duration-200 [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:scale-110"
                    >
                      <Link to={item.path} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border h-14 flex flex-row items-center py-0 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-10 w-10 md:h-8 md:w-8">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm md:text-xs font-bold">
                      {(user?.name || 'A').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-base md:text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user?.name || 'Admin'}</span>
                    <span className="truncate text-sm md:text-xs text-muted-foreground">{user?.username || 'admin'}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-5 md:size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start" sideOffset={4}>
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-10 w-10 md:h-8 md:w-8">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs md:text-[10px] font-bold">
                      {(user?.name || 'A').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm md:text-xs leading-tight">
                    <span className="truncate font-semibold text-foreground">{user?.name || 'Admin'}</span>
                    <span className="truncate text-xs md:text-[10px] text-muted-foreground">{user?.username || 'admin'}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

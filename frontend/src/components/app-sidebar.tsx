import { useLocation, Link } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { Users, Wallet, IndianRupee, AlertTriangle, Settings, LogOut, ChevronsUpDown, Moon, Sun, Info, Layers } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import logoUrl from '@/assets/favicon.png';

const navItems = [
  { title: 'Students', icon: Users, path: '/students' },
  { title: 'Groups', icon: Layers, path: '/groups' },
  { title: 'Collect Fee', icon: Wallet, path: '/collect' },
  { title: 'Receipts', icon: IndianRupee, path: '/receipts' },
  { title: 'Dues List', icon: AlertTriangle, path: '/dues' },
  { title: 'Settings', icon: Settings, path: '/settings' },
  { title: 'About System', icon: Info, path: '/about' },
];

export function AppSidebar() {
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
              <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg shadow-md" />
              <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-sm text-foreground tracking-wider">MCMS</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const isActive = location.pathname.startsWith(item.path);
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
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm md:text-xs font-bold">
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
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs md:text-[10px] font-bold">
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

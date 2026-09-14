import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchHWSessions, type HWClassSession } from '@/lib/homework-api';
import { fetchSettings, fetchGroups } from '@/lib/api';
import { ClipboardCheck, Calendar, Users, Plus, Download, CalendarDays, Layers } from 'lucide-react';
import type { Group } from '@/lib/constants';

export default function HomeworkDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<HWClassSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, groupsData, sessionsData] = await Promise.all([
        fetchSettings(),
        fetchGroups(),
        fetchHWSessions(),
      ]);
      const ay = settingsData.academicYear || '2026-27';
      setAcademicYear(ay);
      setGroups(groupsData);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to load homework dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSessions = sessions.length;
  const groupsTracked = new Set(sessions.map(s => s.group_id)).size;
  const thisMonthSessions = sessions.filter(s => {
    const d = new Date(s.session_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalRecords = sessions.reduce((sum, s) => sum + (Number(s.record_count) || 0), 0);

  const stats = [
    { label: 'Total Sessions', value: totalSessions, icon: CalendarDays, color: 'text-blue-500', skeletonW: 'w-12' },
    { label: 'This Month', value: thisMonthSessions, icon: Calendar, color: 'text-emerald-500', skeletonW: 'w-10' },
    { label: 'Groups Tracked', value: groupsTracked, icon: Layers, color: 'text-amber-500', skeletonW: 'w-10' },
    { label: 'Total Records', value: totalRecords, icon: Users, color: 'text-violet-500', skeletonW: 'w-14' },
  ];

  const quickActions = [
    { label: 'New Record Entry', icon: Plus, action: () => navigate('/homework/record'), variant: 'default' as const },
    { label: 'Monthly Reports', icon: Download, action: () => navigate('/homework/reports'), variant: 'outline' as const },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Page Header */}
      <div className="border-b pb-3.5 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Homework Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>Academic Year:</span>
              {loading ? (
                <Skeleton className="h-3.5 sm:h-4 w-16 rounded" />
              ) : (
                <span className="font-semibold text-foreground animate-in fade-in duration-200">{academicYear || '—'}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color} ${loading ? 'opacity-80' : ''}`} />
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              </div>
              {loading ? (
                <Skeleton className={`h-7 sm:h-8 ${stat.skeletonW} rounded-md`} />
              ) : (
                <div className="text-xl sm:text-2xl font-bold animate-in fade-in duration-200">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              onClick={action.action}
              className="h-auto py-4 flex flex-col items-center gap-2 text-sm"
            >
              <action.icon className="h-5 w-5" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Sessions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/homework/record')} className="text-xs" disabled={loading}>
            View All
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4.5 w-32 rounded-md" />
                        <Skeleton className="h-4.5 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-3.5 w-48 rounded-md mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-5.5 w-16 rounded-full shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="animate-in fade-in duration-200">
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No homework sessions recorded yet</p>
              <Button size="sm" className="mt-4" onClick={() => navigate('/homework/record')}>
                <Plus className="h-4 w-4 mr-1" />
                Start Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 animate-in fade-in duration-200">
            {sessions.slice(0, 8).map(session => {
              const group = groups.find(g => g.id === session.group_id);
              return (
                <Card
                  key={session.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    const [yStr, mStr] = session.session_date.split('-');
                    const sYear = parseInt(yStr, 10) || new Date(session.session_date).getFullYear();
                    const sMonth = parseInt(mStr, 10) || (new Date(session.session_date).getMonth() + 1);
                    navigate(
                      `/homework/record?group=${encodeURIComponent(session.group_id)}&session=${session.id}&month=${sMonth}&year=${sYear}`,
                      { state: { groupId: session.group_id, sessionId: session.id, month: sMonth, year: sYear } }
                    );
                  }}
                >
                  <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span>{formatDate(session.session_date)}</span>
                          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-bold border border-border/60 bg-muted/70 text-foreground">
                            {formatDay(session.session_date)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Group {session.group_id}{group ? ` (${group.class})` : session.group_class ? ` (${session.group_class})` : ''} · {session.record_count || 0} students
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {session.record_count || 0} records
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

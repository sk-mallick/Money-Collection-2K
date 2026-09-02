import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchResultPeriods, fetchSubjects, type ResultPeriod } from '@/lib/reports-api';
import { fetchSettings, fetchStudents } from '@/lib/api';
import { MONTH_NAMES, MONTH_CODES } from '@/lib/constants';
import { ClipboardList, Trophy, UserRound, FileText, Plus, Users, CalendarDays, CheckCircle2, Clock, UserX } from 'lucide-react';

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<ResultPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, studentsData] = await Promise.all([
        fetchSettings(),
        fetchStudents(),
      ]);
      const ay = settingsData.academicYear || '2026-27';
      setAcademicYear(ay);
      setTotalStudents(studentsData.length);

      const periodsData = await fetchResultPeriods({ academic_year: ay });
      setPeriods(periodsData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedCount = periods.filter(p => p.status === 'Completed' || p.status === 'Published').length;
  const draftCount = periods.filter(p => p.status === 'Draft').length;
  const absentTotal = periods.reduce((sum, p) => sum + (Number(p.absent_count) || 0), 0);
  const latestPeriod = periods.length > 0 ? periods[0] : null;

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-500' },
    { label: 'Latest Result', value: latestPeriod ? `${MONTH_NAMES[latestPeriod.month] || latestPeriod.month}` : '—', icon: CalendarDays, color: 'text-emerald-500' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Pending', value: draftCount, icon: Clock, color: 'text-amber-500' },
    { label: 'Total Absent', value: absentTotal, icon: UserX, color: 'text-red-400' },
  ];

  const quickActions = [
    { label: 'Create Monthly Result', icon: Plus, action: () => navigate('/reports/monthly'), variant: 'default' as const },
    { label: 'View Rankings', icon: Trophy, action: () => navigate('/reports/rankings'), variant: 'outline' as const },
    { label: 'Student Report Cards', icon: UserRound, action: () => navigate('/reports/student-reports'), variant: 'outline' as const },
    { label: 'Blank Marks Sheet', icon: FileText, action: () => navigate('/reports/blank-sheet'), variant: 'outline' as const },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Report Cards Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Academic Year: {academicYear || '—'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Recent Result Periods */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Result Periods</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports/monthly')} className="text-xs">
            View All
          </Button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : periods.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No result periods created yet</p>
              <Button size="sm" className="mt-4" onClick={() => navigate('/reports/monthly')}>
                <Plus className="h-4 w-4 mr-1" />
                Create First Result
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {periods.slice(0, 5).map(period => (
              <Card key={period.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/reports/monthly/${period.id}/marks`)}>
                <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium text-sm">
                        {MONTH_NAMES[period.month] || period.month} {period.academic_year}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Group {period.group_id}{period.group_class ? ` (${period.group_class})` : ''} · {period.category} · {period.student_count || 0} students
                      </div>
                    </div>
                  </div>
                  <Badge variant={period.status === 'Published' ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'}>
                    {period.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

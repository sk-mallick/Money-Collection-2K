import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchRankings, fetchResultPeriods, type RankingGroup, type ResultPeriod } from '@/lib/reports-api';
import { fetchSettings } from '@/lib/api';
import { MONTH_NAMES, MONTH_CODES } from '@/lib/constants';
import { Trophy, Medal, Award, Search, Filter, Printer } from 'lucide-react';

export default function RankingsPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [month, setMonth] = useState('SEP');
  const [rankingType, setRankingType] = useState<'class' | 'group'>('class');
  const [rankings, setRankings] = useState<RankingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [periods, setPeriods] = useState<ResultPeriod[]>([]);

  // Load initial settings and periods
  useEffect(() => {
    async function init() {
      try {
        const settings = await fetchSettings();
        const ay = settings.academicYear || '2026-27';
        setAcademicYear(ay);

        // Fetch periods to know which months have results
        const pList = await fetchResultPeriods({ academic_year: ay });
        setPeriods(pList);
        if (pList.length > 0) {
          setMonth(pList[0].month);
        }
      } catch (err) {
        console.error('Failed to init rankings:', err);
      }
    }
    init();
  }, []);

  const loadRankings = useCallback(async () => {
    if (!academicYear || !month) return;
    setLoading(true);
    try {
      const data = await fetchRankings({
        academic_year: academicYear,
        month: month,
        type: rankingType,
      });
      setRankings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load rankings';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [academicYear, month, rankingType]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // Academic Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });

  const getRankBadge = (rank: number | null) => {
    if (!rank) return '—';
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full text-xs">
          <Trophy className="h-3.5 w-3.5 text-amber-500" /> Rank 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-400/20 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
          <Medal className="h-3.5 w-3.5 text-slate-400" /> Rank 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-700/20 text-amber-800 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full text-xs">
          <Award className="h-3.5 w-3.5 text-amber-700" /> Rank 3
        </span>
      );
    }
    return <span className="font-mono text-muted-foreground font-medium">#{rank}</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Academic Rankings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deterministic percentage-based rankings across classes and batches
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
          <Printer className="h-4 w-4 mr-2" />
          Print Rankings
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="no-print">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Academic Year */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Academic Year
              </label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Month
              </label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_CODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MONTH_NAMES[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Ranking Type Tabs */}
          <Tabs
            value={rankingType}
            onValueChange={(val) => setRankingType(val as 'class' | 'group')}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-2 w-full md:w-[260px]">
              <TabsTrigger value="class" className="text-xs">
                Class-Wise
              </TabsTrigger>
              <TabsTrigger value="group" className="text-xs">
                Group-Wise
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rankings Display */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold">No Rankings Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no completed results for {MONTH_NAMES[month] || month} {academicYear}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {rankings.map((group) => {
            const filteredStudents = group.students.filter(
              (s) =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredStudents.length === 0 && searchTerm) return null;

            return (
              <Card key={group.key} className="overflow-hidden border shadow-sm">
                <CardHeader className="bg-muted/40 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      {group.label}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {filteredStudents.length} Students Ranked
                    </Badge>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-muted/20 border-b">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground w-24 text-center">Rank</th>
                        <th className="p-3 font-semibold text-muted-foreground">Student ID</th>
                        <th className="p-3 font-semibold text-muted-foreground">Student Name</th>
                        <th className="p-3 font-semibold text-muted-foreground">Class</th>
                        <th className="p-3 font-semibold text-muted-foreground">School</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Marks</th>
                        <th className="p-3 font-semibold text-muted-foreground text-right pr-6">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map((student) => {
                        const rankVal = rankingType === 'class' ? student.classRank : student.groupRank;
                        const isTopThree = rankVal && rankVal <= 3;

                        return (
                          <tr
                            key={student.studentId}
                            className={`hover:bg-accent/40 transition-colors ${
                              isTopThree ? 'bg-amber-500/[0.03]' : ''
                            }`}
                          >
                            <td className="p-3 text-center font-medium">{getRankBadge(rankVal)}</td>
                            <td className="p-3 font-mono font-semibold text-muted-foreground">{student.studentId}</td>
                            <td className="p-3 font-semibold">{student.name}</td>
                            <td className="p-3 text-muted-foreground">{student.class || '—'}</td>
                            <td className="p-3 text-muted-foreground">{student.school || '—'}</td>
                            <td className="p-3 text-center font-mono">
                              <span className="font-bold">{student.totalObtained}</span>
                              <span className="text-muted-foreground text-xs"> / {student.totalMax}</span>
                            </td>
                            <td className="p-3 text-right pr-6 font-mono font-bold">
                              <span
                                className={
                                  student.percentage >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400 text-sm'
                                    : ''
                                }
                              >
                                {student.percentage.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

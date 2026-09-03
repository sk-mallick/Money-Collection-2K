import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchRankings, fetchResultPeriods, type RankingGroup, type ResultPeriod } from '@/lib/reports-api';
import { fetchSettings } from '@/lib/api';
import { MONTH_NAMES } from '@/lib/constants';
import { Trophy, Medal, Award, Search, Filter, Printer, X, RotateCcw, Users, GraduationCap, ChevronDown, Check } from 'lucide-react';

// Reverse chronological month sequence (recent months first)
const RANKING_MONTH_CODES = ['MAR', 'FEB', 'JAN', 'DEC', 'NOV', 'OCT', 'SEP', 'AUG', 'JUL', 'JUN', 'MAY', 'APR'];

interface CustomDropdownProps {
  value: string;
  placeholder: string;
  options: { label: string; value: string; disabled?: boolean }[];
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  width?: string;
}

function CustomDropdown({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  className = '',
  width = 'w-[140px]',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative inline-block ${width} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 w-full px-2.5 text-xs rounded-md border flex items-center justify-between gap-1.5 transition-all outline-none select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground border-border/40'
            : 'bg-card hover:bg-muted/40 cursor-pointer border-input text-foreground focus:ring-1 focus:ring-primary shadow-2xs'
        }`}
      >
        <span className={`truncate font-medium ${selectedOption ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[140px] bg-popover text-popover-foreground border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ maxHeight: '240px' }}
        >
          <div className="overflow-y-auto max-h-[230px] p-1 space-y-0.5 divide-y divide-border/10">
            {options.length === 0 ? (
              <div className="px-2.5 py-2 text-center text-xs text-muted-foreground">
                No options
              </div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex items-center justify-between ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : opt.value === value
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="h-3 w-3 text-primary shrink-0 ml-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankingsPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [month, setMonth] = useState('AUG');
  const [rankingType, setRankingType] = useState<'class' | 'group'>('class');
  const [rankings, setRankings] = useState<RankingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('all');
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
          // Default to most recent month
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
      setSelectedFilterKey('all');
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
    if (!rank) return <span className="text-muted-foreground">—</span>;
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold px-3 py-1 rounded-full text-xs shadow-2xs whitespace-nowrap border border-amber-500/20">
          <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Rank 1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 bg-slate-300/25 text-slate-800 dark:text-slate-200 font-bold px-3 py-1 rounded-full text-xs shadow-2xs whitespace-nowrap border border-slate-400/30">
          <Medal className="h-4 w-4 text-slate-500 shrink-0" />
          <span>Rank 2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 bg-amber-700/15 text-amber-900 dark:text-amber-300 font-bold px-3 py-1 rounded-full text-xs shadow-2xs whitespace-nowrap border border-amber-700/20">
          <Award className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Rank 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-muted-foreground px-2.5 py-0.5 rounded-md bg-muted/60 border">
        #{rank}
      </span>
    );
  };

  // Filter buckets based on selected class/group filter
  const displayedRankings = useMemo(() => {
    if (selectedFilterKey === 'all') return rankings;
    return rankings.filter((r) => r.key === selectedFilterKey);
  }, [rankings, selectedFilterKey]);

  // Options for the single unified dynamic Class/Group dropdown
  const filterDropdownOptions = useMemo(() => {
    const totalStudents = rankings.reduce((sum, b) => sum + b.students.length, 0);
    const allLabel = rankingType === 'class' ? `All Classes (${totalStudents})` : `All Groups (${totalStudents})`;

    const items = rankings.map((r) => ({
      value: r.key,
      label: `${r.label} (${r.students.length})`,
    }));

    return [{ value: 'all', label: allLabel }, ...items];
  }, [rankings, rankingType]);

  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full max-w-[99vw] 2xl:max-w-[1850px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Academic Rankings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official monthly merit list separated by <strong className="text-foreground">Class Standards</strong> and <strong className="text-foreground">Tuition Batches</strong>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print gap-1.5">
          <Printer className="h-4 w-4" />
          <span>Print Rankings</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 text-xs sm:text-sm h-9 bg-card"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* 1. Academic Year Dropdown */}
            <CustomDropdown
              value={academicYear}
              placeholder="Academic Year"
              options={yearOptions.map((y) => ({ label: y, value: y }))}
              onChange={setAcademicYear}
              width="w-[125px]"
            />

            {/* 2. Month Dropdown (Recent months first) */}
            <CustomDropdown
              value={month}
              placeholder="Month"
              options={RANKING_MONTH_CODES.map((m) => ({
                label: MONTH_NAMES[m],
                value: m,
              }))}
              onChange={setMonth}
              width="w-[130px]"
            />

            {/* 3. Class / Group Filter Dropdown (Dynamically switches based on Tab) */}
            <CustomDropdown
              value={selectedFilterKey}
              placeholder={rankingType === 'class' ? 'All Classes' : 'All Groups'}
              options={filterDropdownOptions}
              onChange={setSelectedFilterKey}
              width="w-[160px]"
            />

            {/* 4. View Mode Toggle: Class-Wise vs Group-Wise */}
            <Tabs
              value={rankingType}
              onValueChange={(val) => {
                setRankingType(val as 'class' | 'group');
                setSelectedFilterKey('all');
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-2 w-full sm:w-[260px] h-9 bg-muted/60 p-0.5">
                <TabsTrigger value="class" className="text-xs h-8 gap-1.5 font-medium">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Class-Wise</span>
                </TabsTrigger>
                <TabsTrigger value="group" className="text-xs h-8 gap-1.5 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  <span>Group-Wise</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {(searchTerm.trim() !== '' || selectedFilterKey !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/20 border text-xs animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Active:</span>
            </span>

            {searchTerm.trim() !== '' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>Search: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Clear search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedFilterKey !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>{rankingType === 'class' ? 'Class' : 'Group'}: {selectedFilterKey}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFilterKey('all')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Show all"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearchTerm('');
                setSelectedFilterKey('all');
              }}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset</span>
            </Button>
          </div>
        )}
      </div>

      {/* Rankings Display */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : displayedRankings.length === 0 ? (
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
          {displayedRankings.map((group) => {
            const filteredStudents = group.students.filter(
              (s) =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.school && s.school.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            if (filteredStudents.length === 0 && searchTerm) return null;

            return (
              <Card key={group.key} className="overflow-hidden border shadow-sm rounded-xl">
                <CardHeader className="bg-muted/40 py-3.5 px-4 sm:px-6 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      {rankingType === 'class' ? (
                        <GraduationCap className="h-5 w-5 text-primary" />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                      <span>{group.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        • {MONTH_NAMES[month] || month} {academicYear}
                      </span>
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                      {filteredStudents.length} Students Ranked
                    </Badge>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-muted/20 border-b">
                      <tr>
                        {/* Roomy Rank Column */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-32 sm:w-36 min-w-[110px] text-center border-r">
                          {rankingType === 'class' ? 'Class Rank' : 'Group Rank'}
                        </th>
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-20 min-w-[70px] text-center border-r">
                          ID
                        </th>
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground min-w-[160px] border-r">
                          Student Name
                        </th>
                        {rankingType === 'class' ? (
                          <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-28 border-r text-center">
                            Batch / Group
                          </th>
                        ) : (
                          <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-24 border-r text-center">
                            Class
                          </th>
                        )}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground min-w-[130px] border-r">
                          School
                        </th>
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-28 text-center border-r">
                          Marks
                        </th>
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-28 text-right pr-6">
                          Percentage
                        </th>
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
                            {/* Roomy Rank Cell */}
                            <td className="p-3 text-center font-medium min-w-[110px] border-r">
                              {getRankBadge(rankVal)}
                            </td>
                            <td className="p-3 font-mono font-bold text-center text-muted-foreground border-r">
                              {student.studentId}
                            </td>
                            <td className="p-3 font-bold text-foreground border-r">
                              {student.name}
                            </td>
                            {rankingType === 'class' ? (
                              <td className="p-3 text-center border-r">
                                <Badge variant="outline" className="font-semibold text-xs">
                                  Group {student.groupId || '—'}
                                </Badge>
                              </td>
                            ) : (
                              <td className="p-3 text-center text-muted-foreground border-r font-medium">
                                {student.class || '—'}
                              </td>
                            )}
                            <td className="p-3 text-muted-foreground border-r">
                              {student.school || '—'}
                            </td>
                            <td className="p-3 text-center font-mono border-r">
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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import {
  Trophy,
  Medal,
  Award,
  Search,
  Printer,
  Download,
  Filter,
  X,
  RotateCcw,
  Users,
  GraduationCap,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  LayoutList,
} from 'lucide-react';
import {
  generateRankingsPDF,
  printRankingsPDF,
  type RankingsGroupItem,
} from '@/lib/pdf';

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
        className={`h-8 w-full px-2.5 text-xs rounded-md border flex items-center justify-between gap-1.5 transition-all outline-none select-none ${
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
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [month, setMonth] = useState('AUG');
  const [rankingType, setRankingType] = useState<'class' | 'group'>('class');
  const [rankings, setRankings] = useState<RankingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('all');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<ResultPeriod[]>([]);

  // View Mode: 'standard' (interactive cards view) vs 'sheet' (exact A4 offline sheet preview)
  const [viewMode, setViewMode] = useState<'standard' | 'sheet'>(() => {
    const saved = localStorage.getItem('rankings_view_mode');
    return saved === 'sheet' ? 'sheet' : 'standard';
  });

  const handleViewModeChange = (mode: 'standard' | 'sheet') => {
    setViewMode(mode);
    localStorage.setItem('rankings_view_mode', mode);
  };

  // Preview & Pagination state (used in Sheet Preview)
  const [previewBucketIndex, setPreviewBucketIndex] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // A4 Landscape scale reference (1123px width x 794px height at 96 DPI)
  const a4ContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState<number>(1);

  // Smart default month selector: prioritizes months with evaluated rankings, then published/completed, then 'AUG'
  const pickBestMonth = useCallback((pList: ResultPeriod[]): string => {
    if (!pList || pList.length === 0) return 'AUG';

    // 1. First preference: Period with evaluated/ranked students (> 0)
    const withRankings = pList.find((p) => Number(p.ranked_count) > 0);
    if (withRankings) return withRankings.month;

    // 2. Second preference: Period with Published or Completed status
    const published = pList.find((p) => p.status === 'Published' || p.status === 'Completed');
    if (published) return published.month;

    // 3. Third preference: AUG if present in periods
    if (pList.some((p) => p.month === 'AUG')) return 'AUG';

    // 4. Fallback: First period or 'AUG'
    return pList[0].month || 'AUG';
  }, []);

  // Load initial settings and periods
  useEffect(() => {
    async function init() {
      try {
        const settingsRes = await fetchSettings();
        setSettings(settingsRes);
        const ay = settingsRes.academicYear || '2026-27';
        setAcademicYear(ay);

        const pList = await fetchResultPeriods({ academic_year: ay });
        setPeriods(pList);
        const bestMonth = pickBestMonth(pList);
        setMonth(bestMonth);
      } catch (err) {
        console.error('Failed to init rankings:', err);
      }
    }
    init();
  }, [pickBestMonth]);

  const handleAcademicYearChange = async (newYear: string) => {
    setAcademicYear(newYear);
    try {
      const pList = await fetchResultPeriods({ academic_year: newYear });
      setPeriods(pList);
      const bestMonth = pickBestMonth(pList);
      setMonth(bestMonth);
    } catch (err) {
      console.error('Failed to fetch periods for academic year:', err);
    }
  };

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
      setPreviewBucketIndex(0);
      setPreviewPageIndex(0);
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

  // Filter buckets based on selected class/group filter
  const displayedRankings = useMemo(() => {
    if (selectedFilterKey === 'all') return rankings;
    return rankings.filter((r) => r.key === selectedFilterKey);
  }, [rankings, selectedFilterKey]);

  // Reset preview indices if filter changes
  useEffect(() => {
    setPreviewBucketIndex(0);
    setPreviewPageIndex(0);
  }, [selectedFilterKey, rankingType]);

  // Handle auto-scaling for A4 Landscape preview (width: 1123px, height: 794px)
  useEffect(() => {
    if (viewMode !== 'sheet') return;
    const handleResize = () => {
      if (a4ContainerRef.current) {
        const containerWidth = a4ContainerRef.current.clientWidth;
        if (containerWidth > 0) {
          const calculatedScale = Math.min(1, (containerWidth - 4) / 1123);
          setA4Scale(calculatedScale > 0.1 ? calculatedScale : 1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (a4ContainerRef.current) {
      resizeObserver.observe(a4ContainerRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [displayedRankings, previewBucketIndex, previewPageIndex, viewMode]);

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

  // Available months with rankings in the current academic year
  const availableMonthsWithRankings = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of periods) {
      const count = Number(p.ranked_count) || 0;
      if (count > 0 || p.status === 'Published' || p.status === 'Completed') {
        map.set(p.month, (map.get(p.month) || 0) + count);
      }
    }
    return Array.from(map.entries()).map(([m, count]) => ({
      month: m,
      name: MONTH_NAMES[m] || m,
      count,
    }));
  }, [periods]);

  // Enhanced month dropdown options showing evaluated student count
  const monthDropdownOptions = useMemo(() => {
    return RANKING_MONTH_CODES.map((m) => {
      const mPeriods = periods.filter((p) => p.month === m);
      const totalRanked = mPeriods.reduce((sum, p) => sum + (Number(p.ranked_count) || 0), 0);
      const hasPublished = mPeriods.some((p) => p.status === 'Published' || p.status === 'Completed');

      let suffix = '';
      if (totalRanked > 0) {
        suffix = ` (${totalRanked})`;
      } else if (mPeriods.length > 0) {
        suffix = hasPublished ? ' (Completed)' : ' (Draft)';
      }

      return {
        label: `${MONTH_NAMES[m] || m}${suffix}`,
        value: m,
      };
    });
  }, [periods]);

  // Active bucket for A4 sheet preview
  const activeBucket = displayedRankings[previewBucketIndex] || displayedRankings[0] || null;

  // Subjects helper for any bucket
  const getBucketSubjects = useCallback((bucket: RankingGroup | null) => {
    if (!bucket) return [];
    if (bucket.subjects && bucket.subjects.length > 0) {
      return bucket.subjects;
    }
    // Fallback extract from student marks
    const subMap = new Map<number, string>();
    for (const st of bucket.students) {
      for (const m of st.marks || []) {
        if (!subMap.has(m.subjectId)) {
          subMap.set(m.subjectId, m.subjectName);
        }
      }
    }
    if (subMap.size > 0) {
      return Array.from(subMap.entries()).map(([id, name], idx) => ({
        id,
        name,
        display_order: idx + 1,
      }));
    }
    return [
      { id: 1, name: 'Grammar', display_order: 1 },
      { id: 2, name: 'Creative', display_order: 2 },
      { id: 3, name: 'Passage', display_order: 3 },
      { id: 4, name: 'Vocabulary', display_order: 4 },
      { id: 5, name: 'Literature', display_order: 5 },
    ];
  }, []);

  const activeSubjects = useMemo(() => getBucketSubjects(activeBucket), [activeBucket, getBucketSubjects]);

  // Filtered and Sorted students for the active bucket (Sheet Preview)
  const sortedStudentsForSheet = useMemo(() => {
    if (!activeBucket) return [];
    const q = searchTerm.trim().toLowerCase();
    const list = activeBucket.students.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.school && s.school.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const rankA = (activeBucket.type === 'group' ? a.groupRank : a.classRank) ?? a.displayRank ?? 9999;
      const rankB = (activeBucket.type === 'group' ? b.groupRank : b.classRank) ?? b.displayRank ?? 9999;
      const diff = rankA - rankB;
      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }
      return sortDirection === 'asc'
        ? b.percentage - a.percentage
        : a.percentage - b.percentage;
    });
  }, [activeBucket, searchTerm, sortDirection]);

  // Pagination for active bucket
  const totalPagesForActiveBucket = Math.max(1, Math.ceil(sortedStudentsForSheet.length / 25));
  const currentStudentsPage = sortedStudentsForSheet.slice(previewPageIndex * 25, (previewPageIndex + 1) * 25);

  // Toggle rank sort
  const toggleRankSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Convert rankings to PDF options structure
  const getPdfGroupsData = (): RankingsGroupItem[] => {
    const bucketsToExport = selectedFilterKey === 'all' ? displayedRankings : displayedRankings.filter((b) => b.key === selectedFilterKey);
    return bucketsToExport.map((b) => ({
      key: b.key,
      label: b.label,
      type: b.type,
      timing: b.timing,
      category: b.category,
      groupClass: b.groupClass,
      subjects: b.subjects && b.subjects.length > 0 ? b.subjects : getBucketSubjects(b),
      students: b.students,
    }));
  };

  // Handle Download PDF
  const handleDownloadPDF = async () => {
    const groupsData = getPdfGroupsData();
    if (groupsData.length === 0) {
      toast.error('No ranking data available to download');
      return;
    }
    setIsDownloading(true);
    try {
      await generateRankingsPDF({
        groupsData,
        month,
        academicYear,
        rankingType,
        settings,
      });
      toast.success('Official A4 Landscape Rankings PDF downloaded successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate rankings PDF';
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Direct Print
  const handleDirectPrint = async () => {
    const groupsData = getPdfGroupsData();
    if (groupsData.length === 0) {
      toast.error('No ranking data available to print');
      return;
    }
    setIsPrinting(true);
    let targetWin: Window | null = null;
    try {
      targetWin = window.open('about:blank', '_blank');
      await printRankingsPDF(
        {
          groupsData,
          month,
          academicYear,
          rankingType,
          settings,
        },
        targetWin
      );
    } catch (err: unknown) {
      if (targetWin && !targetWin.closed) targetWin.close();
      const msg = err instanceof Error ? err.message : 'Failed to print rankings';
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  // Render Rank Badge for Standard View (matches the exact previous UI/UX with dark mode support)
  const getStandardRankBadge = (rank: number | null | undefined) => {
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

  // Render Rank Badge for Printable A4 Sheet (fixed paper colors, unaffected by dark mode)
  const getSheetRankBadge = (rank: number | null | undefined) => {
    if (!rank) return <span className="text-gray-400 font-bold">—</span>;
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10.5px] border border-amber-400 whitespace-nowrap shadow-2xs">
          <Trophy className="h-3 w-3 text-amber-600 shrink-0" />
          <span>Rank 1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-slate-200 text-slate-900 font-bold px-2.5 py-0.5 rounded-full text-[10.5px] border border-slate-400 whitespace-nowrap shadow-2xs">
          <Medal className="h-3 w-3 text-slate-600 shrink-0" />
          <span>Rank 2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-amber-200/80 text-amber-950 font-bold px-2.5 py-0.5 rounded-full text-[10.5px] border border-amber-500 whitespace-nowrap shadow-2xs">
          <Award className="h-3 w-3 text-amber-700 shrink-0" />
          <span>Rank 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center font-mono font-bold text-[11px] text-gray-800 px-2 py-0.5 rounded-xs bg-gray-100 border border-gray-300">
        #{rank}
      </span>
    );
  };

  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 w-full">
      {/* ─── TOP STREAMLINED TOOLBAR ─── */}
      <div className="no-print space-y-3.5 border-b pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Academic Rankings</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Official merit list with all individual subject scores, total, percentage, and rank
            </p>
          </div>

          {/* Action Buttons: View Mode Switcher, Print & Download */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* ─── VIEW MODE TOGGLE SWITCH (Standard View vs A4 Sheet Preview) ─── */}
            <div className="flex items-center border rounded-md p-0.5 bg-muted/60 shadow-2xs h-8">
              <button
                type="button"
                onClick={() => handleViewModeChange('standard')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xs transition-all cursor-pointer ${
                  viewMode === 'standard'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Standard Interactive Dashboard View"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Standard View</span>
                <span className="sm:hidden">Standard</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('sheet')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xs transition-all cursor-pointer ${
                  viewMode === 'sheet'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="A4 Landscape Offline PDF Print Preview"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">A4 Sheet Preview</span>
                <span className="sm:hidden">A4 Sheet</span>
              </button>
            </div>

            {/* Direct Print Button (Hidden on phone screens, visible on sm and up) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={displayedRankings.length === 0 || loading || isPrinting}
              className="hidden sm:inline-flex h-8 gap-1.5 px-2.5 sm:px-3 text-xs font-semibold shadow-2xs cursor-pointer hover:bg-muted rounded-md"
              title="Print exact A4 Landscape rankings sheet"
            >
              {isPrinting ? (
                <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </Button>

            {/* Download Button */}
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={displayedRankings.length === 0 || loading || isDownloading}
              className="h-8 gap-1.5 px-2.5 sm:px-3.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer rounded-md"
              title="Download official A4 Landscape PDF"
            >
              {isDownloading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>
                {isDownloading
                  ? 'Downloading...'
                  : displayedRankings.length > 1 && selectedFilterKey === 'all'
                  ? `Download All (${displayedRankings.length})`
                  : 'Download PDF'}
              </span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-[200px] md:w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPreviewPageIndex(0);
              }}
              className="pl-8 text-xs h-8 bg-card shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Academic Year Dropdown */}
          <CustomDropdown
            value={academicYear}
            placeholder="Academic Year"
            options={yearOptions.map((y) => ({ label: y, value: y }))}
            onChange={handleAcademicYearChange}
            width="w-[125px]"
          />

          {/* Month Dropdown */}
          <CustomDropdown
            value={month}
            placeholder="Month"
            options={monthDropdownOptions}
            onChange={setMonth}
            width="w-[155px]"
          />

          {/* Class / Group Filter Dropdown */}
          <CustomDropdown
            value={selectedFilterKey}
            placeholder={rankingType === 'class' ? 'All Classes' : 'All Groups'}
            options={filterDropdownOptions}
            onChange={setSelectedFilterKey}
            width="w-[170px]"
          />

          {/* View Mode Toggle: Class-Wise vs Group-Wise */}
          <Tabs
            value={rankingType}
            onValueChange={(val) => {
              setRankingType(val as 'class' | 'group');
              setSelectedFilterKey('all');
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-2 w-full sm:w-[240px] h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="class" className="text-xs h-7 gap-1.5 font-medium">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Class-Wise</span>
              </TabsTrigger>
              <TabsTrigger value="group" className="text-xs h-7 gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5" />
                <span>Group-Wise</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Preview Navigation Switcher (Active in Sheet Mode when Multiple Buckets or Pages) */}
          {viewMode === 'sheet' && (
            <div className="ml-auto flex items-center gap-2">
              {displayedRankings.length > 1 && (
                <div className="flex items-center border rounded-md overflow-hidden bg-background shadow-2xs h-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-none cursor-pointer text-xs"
                    onClick={() => {
                      setPreviewBucketIndex((p) => Math.max(0, p - 1));
                      setPreviewPageIndex(0);
                    }}
                    disabled={previewBucketIndex <= 0}
                    title="Previous Group / Class"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden md:inline ml-0.5">Prev</span>
                  </Button>
                  <span className="text-[11px] font-semibold text-muted-foreground px-2 border-x leading-8 whitespace-nowrap">
                    {rankingType === 'group' ? 'Group' : 'Class'} {previewBucketIndex + 1} / {displayedRankings.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-none cursor-pointer text-xs"
                    onClick={() => {
                      setPreviewBucketIndex((p) => Math.min(displayedRankings.length - 1, p + 1));
                      setPreviewPageIndex(0);
                    }}
                    disabled={previewBucketIndex >= displayedRankings.length - 1}
                    title="Next Group / Class"
                  >
                    <span className="hidden md:inline mr-0.5">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {totalPagesForActiveBucket > 1 && (
                <div className="flex items-center border rounded-md overflow-hidden bg-background shadow-2xs h-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-none cursor-pointer text-xs"
                    onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                    disabled={previewPageIndex <= 0}
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] font-semibold text-muted-foreground px-2 border-x leading-8 whitespace-nowrap">
                    Page {previewPageIndex + 1} / {totalPagesForActiveBucket}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-none cursor-pointer text-xs"
                    onClick={() => setPreviewPageIndex((p) => Math.min(totalPagesForActiveBucket - 1, p + 1))}
                    disabled={previewPageIndex >= totalPagesForActiveBucket - 1}
                    title="Next Page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
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

      {/* ─── LOADING STATE ─── */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : displayedRankings.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center text-muted-foreground max-w-lg mx-auto border-dashed shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <Trophy className="h-6 w-6 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Rankings Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            There are no completed or evaluated results for{' '}
            <span className="font-semibold text-foreground">
              {MONTH_NAMES[month] || month} {academicYear}
            </span>.
          </p>

          {availableMonthsWithRankings.length > 0 && (
            <div className="mt-5 pt-4 border-t space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                Switch to an available month with completed rankings:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {availableMonthsWithRankings.map((am) => (
                  <Button
                    key={am.month}
                    variant="outline"
                    size="sm"
                    onClick={() => setMonth(am.month)}
                    className="h-7 text-xs gap-1.5 cursor-pointer bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <span>{am.name}</span>
                    {am.count > 0 && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">
                        {am.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : viewMode === 'standard' ? (
        /* ══════════════════════════════════════════════════════════════════════════
           MODE 1: STANDARD INTERACTIVE DASHBOARD VIEW (Full-width Cards with Ranks in Last Column)
           ══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-8">
          {displayedRankings.map((group) => {
            const bucketSubs = getBucketSubjects(group);
            const q = searchTerm.trim().toLowerCase();
            const filteredStudents = group.students.filter(
              (s) =>
                !q ||
                s.name.toLowerCase().includes(q) ||
                s.studentId.toLowerCase().includes(q) ||
                (s.school && s.school.toLowerCase().includes(q))
            );

            if (filteredStudents.length === 0 && searchTerm) return null;

            // Sort students for this card by Rank
            const sortedGroupStudents = [...filteredStudents].sort((a, b) => {
              const rankA = (group.type === 'group' ? a.groupRank : a.classRank) ?? a.displayRank ?? 9999;
              const rankB = (group.type === 'group' ? b.groupRank : b.classRank) ?? b.displayRank ?? 9999;
              const diff = rankA - rankB;
              if (diff !== 0) {
                return sortDirection === 'asc' ? diff : -diff;
              }
              return sortDirection === 'asc' ? b.percentage - a.percentage : a.percentage - b.percentage;
            });

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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                        {sortedGroupStudents.length} Students Ranked
                      </Badge>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setSelectedFilterKey(group.key);
                          handleViewModeChange('sheet');
                        }}
                        className="text-xs gap-1 h-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer font-medium"
                        title="View exact A4 sheet for this group"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">A4 Sheet</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-muted/20 border-b">
                      <tr>
                        {/* 1. ID */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-20 min-w-[70px] text-center border-r">
                          ID
                        </th>
                        {/* 2. Name */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground min-w-[170px] border-r">
                          Student Name
                        </th>
                        {/* 3. Class or Group */}
                        {rankingType === 'class' ? (
                          <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-28 border-r text-center">
                            Batch
                          </th>
                        ) : (
                          <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-20 border-r text-center">
                            Class
                          </th>
                        )}
                        {/* 4. School */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground min-w-[120px] border-r">
                          School
                        </th>

                        {/* 5. Subject Columns */}
                        {bucketSubs.map((sub) => (
                          <th
                            key={sub.id}
                            className="p-3 sm:py-3.5 font-bold text-muted-foreground text-center border-r w-24 min-w-[75px]"
                          >
                            <div className="truncate">{sub.name}</div>
                          </th>
                        ))}

                        {/* 6. Total */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-24 text-center border-r">
                          Total
                        </th>

                        {/* 7. Percentage */}
                        <th className="p-3 sm:py-3.5 font-bold text-muted-foreground w-24 text-center border-r">
                          Percentage
                        </th>

                        {/* 8. Rank (IN THE LAST COLUMN) */}
                        <th
                          onClick={toggleRankSort}
                          className="p-3 sm:py-3.5 font-bold text-muted-foreground w-32 min-w-[110px] text-center cursor-pointer select-none hover:bg-muted/40 transition-colors"
                          title="Click to toggle Rank sort order"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Rank</span>
                            {sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : sortDirection === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedGroupStudents.map((student) => {
                        const rankVal =
                          rankingType === 'class' ? student.classRank : student.groupRank;
                        const isTopThree = rankVal && rankVal <= 3;

                        return (
                          <tr
                            key={student.studentId}
                            className={`hover:bg-accent/40 transition-colors ${
                              isTopThree ? 'bg-amber-500/[0.03]' : ''
                            }`}
                          >
                            {/* ID */}
                            <td className="p-3 font-mono font-bold text-center text-muted-foreground border-r">
                              {student.studentId}
                            </td>

                            {/* Name */}
                            <td className="p-3 font-bold text-foreground border-r">
                              {student.name}
                            </td>

                            {/* Class or Batch */}
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

                            {/* School */}
                            <td className="p-3 text-muted-foreground border-r">
                              {student.school || '—'}
                            </td>

                            {/* Subject Marks */}
                            {bucketSubs.map((sub) => {
                              const markItem = student.marks?.find(
                                (m) =>
                                  m.subjectId === sub.id ||
                                  m.subjectName.toLowerCase() === sub.name.toLowerCase()
                              );

                              return (
                                <td key={sub.id} className="p-3 text-center font-mono border-r">
                                  {markItem ? (
                                    markItem.isAbsent ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                                      >
                                        Ab
                                      </Badge>
                                    ) : markItem.obtainedMarks !== null ? (
                                      <span className="font-semibold">{markItem.obtainedMarks}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Total Marks */}
                            <td className="p-3 text-center font-mono border-r">
                              <span className="font-bold">{student.totalObtained}</span>
                              <span className="text-muted-foreground text-xs"> / {student.totalMax}</span>
                            </td>

                            {/* Percentage */}
                            <td className="p-3 text-center font-mono font-bold border-r">
                              <span
                                className={
                                  student.percentage >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                                    : ''
                                }
                              >
                                {student.percentage.toFixed(2)}%
                              </span>
                            </td>

                            {/* Rank (IN THE LAST COLUMN) */}
                            <td className="p-3 text-center font-medium min-w-[120px]">
                              {getStandardRankBadge(rankVal)}
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
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════
           MODE 2: A4 LANDSCAPE OFFLINE SHEET PREVIEW (Exact 1:1 Vector Print Preview)
           ══════════════════════════════════════════════════════════════════════════ */
        <div className="w-full flex flex-col items-center">
          <div
            ref={a4ContainerRef}
            className="w-full flex justify-center items-start overflow-hidden py-1 print:overflow-visible print:h-auto print:py-0 print:block"
            style={{
              height: a4Scale < 1 ? `${Math.ceil(794 * a4Scale)}px` : 'auto',
            }}
          >
            {/* A4 Landscape Paper Layout (1123px width x 794px minHeight, pt-8 for 0.5cm top clearance) */}
            <div
              id="printable-a4-sheet"
              style={{
                width: '1123px',
                minHeight: '794px',
                transform: a4Scale < 1 ? `scale(${a4Scale})` : undefined,
                transformOrigin: 'top center',
                backgroundColor: '#ffffff',
              }}
              className="printable-sheet bg-white text-black font-sans border-[2.5px] border-black rounded-none pt-8 pb-5 px-5 sm:pt-9 sm:pb-6 sm:px-6 shadow-md flex flex-col justify-start shrink-0 box-border print:transform-none print:w-full print:border-[2px] print:shadow-none print:p-4"
            >
              <div className="space-y-1.5">
                {/* ─── 1. Header & Title Banner ─── */}
                <div className="text-center space-y-0.5">
                  <h1 className="text-lg sm:text-[20px] font-black tracking-tight leading-tight uppercase font-sans">
                    <span className="text-black">ENGLISH</span>
                    <span className="text-red-600">JIBI</span>{' '}
                    <span className="text-black">CLASSES</span>
                  </h1>
                  <div className="text-center">
                    <span className="inline-block px-3 py-0.5 rounded-full border border-black text-[9.5px] font-bold uppercase tracking-wider bg-gray-50 text-black leading-tight">
                      Monthly Examination Academic Rankings — {MONTH_NAMES[month] || month}{' '}
                      {academicYear} ({rankingType === 'group' ? 'Batch Merit List' : 'Class Merit List'})
                    </span>
                  </div>
                </div>

                {/* ─── 2. Red Separator Line ─── */}
                <div
                  className="h-[2px] bg-red-600 w-full"
                  style={{ backgroundColor: '#dc2626' }}
                />

                {/* ─── 3. Group & Batch Metadata Banner ─── */}
                <div className="flex items-center justify-between gap-3 px-3 py-1 rounded-xs bg-gray-50 text-xs font-bold border border-black text-black">
                  {rankingType === 'group' ? (
                    <>
                      <div>
                        <span className="text-gray-700 font-bold">BATCH:</span>{' '}
                        <strong className="font-mono text-black">
                          Group {activeBucket.key}
                        </strong>{' '}
                        {activeBucket.groupClass && (
                          <span>({activeBucket.groupClass})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">CATEGORY:</span>{' '}
                        <strong className="text-black">{activeBucket.category || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">TIMING:</span>{' '}
                        <strong className="text-black">{activeBucket.timing || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">STUDENTS:</span>{' '}
                        <strong className="text-black">{sortedStudentsForSheet.length} Ranked</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">PAGE:</span>{' '}
                        <strong className="text-black">
                          {previewPageIndex + 1} OF {totalPagesForActiveBucket}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-700 font-bold">CLASS:</span>{' '}
                        <strong className="text-black">Class {activeBucket.key}</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">SESSION:</span>{' '}
                        <strong className="text-black">{academicYear}</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">EXAM MONTH:</span>{' '}
                        <strong className="text-black">{MONTH_NAMES[month] || month}</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">STUDENTS:</span>{' '}
                        <strong className="text-black">{sortedStudentsForSheet.length} Ranked</strong>
                      </div>
                      <div>
                        <span className="text-gray-700 font-bold">PAGE:</span>{' '}
                        <strong className="text-black">
                          {previewPageIndex + 1} OF {totalPagesForActiveBucket}
                        </strong>
                      </div>
                    </>
                  )}
                </div>

                {/* ─── 4. Rankings Table (Exactly 25 Fixed Rows per page, with Rank in the LAST column and sortable) ─── */}
                <div className="border border-black overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-gray-100 border-b border-black text-[11px] font-bold">
                      <tr>
                        {/* 1. ID Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-16 text-center">
                          ID
                        </th>
                        {/* 2. Student Name Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-[190px]">
                          Student Name
                        </th>
                        {/* 3. Class Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-12 text-center">
                          Class
                        </th>
                        {/* 4. School Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-[75px]">
                          School
                        </th>

                        {/* 5. Dynamic Subject Header Columns */}
                        {activeSubjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="p-1.5 font-bold text-black border-r border-black text-center"
                          >
                            <div className="truncate leading-tight">{sub.name}</div>
                          </th>
                        ))}

                        {/* 6. Total Marks Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-16 text-center">
                          <div className="leading-tight">Total</div>
                        </th>

                        {/* 7. Percentage Column */}
                        <th className="p-1.5 font-bold text-black border-r border-black w-[65px] text-center">
                          <div className="leading-tight">%</div>
                        </th>

                        {/* 8. Rank Column (IN THE LAST COLUMN with Sort Toggle) */}
                        <th
                          onClick={toggleRankSort}
                          className="p-1.5 font-bold text-black w-24 text-center cursor-pointer select-none hover:bg-gray-200 transition-colors"
                          title="Click to toggle Rank sort order"
                        >
                          <div className="flex items-center justify-center gap-1 leading-tight">
                            <span>Rank</span>
                            {sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                            ) : sortDirection === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50 shrink-0" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {Array.from({ length: 25 }).map((_, r) => {
                        const student = currentStudentsPage[r] || null;
                        const rankVal = student
                          ? (activeBucket.type === 'group' ? student.groupRank : student.classRank) ??
                            student.displayRank ??
                            previewPageIndex * 25 + r + 1
                          : null;

                        return (
                          <tr
                            key={r}
                            className="h-[27px] text-[11px] bg-white hover:bg-muted/10 transition-colors"
                          >
                            {/* ID */}
                            <td className="p-1 text-center font-mono font-bold text-black border-r border-gray-300 w-16">
                              {student ? student.studentId : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* Name */}
                            <td className="p-1 font-semibold text-black border-r border-gray-300 w-[190px] truncate">
                              {student ? student.name : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* Class */}
                            <td className="p-1 text-center text-gray-800 border-r border-gray-300 w-12 truncate">
                              {student ? student.class || '—' : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* School */}
                            <td
                              className="p-1 text-gray-800 border-r border-gray-300 w-[75px] truncate"
                              title={student?.school || ''}
                            >
                              {student ? student.school || '—' : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* Subject Marks Columns */}
                            {activeSubjects.map((sub) => {
                              if (!student) {
                                return (
                                  <td
                                    key={sub.id}
                                    className="p-1 text-center border-r border-gray-300"
                                  >
                                    <span className="opacity-0 select-none">-</span>
                                  </td>
                                );
                              }

                              const markItem = student.marks?.find(
                                (m) =>
                                  m.subjectId === sub.id ||
                                  m.subjectName.toLowerCase() === sub.name.toLowerCase()
                              );

                              return (
                                <td
                                  key={sub.id}
                                  className="p-1 text-center border-r border-gray-300 font-mono"
                                >
                                  {markItem ? (
                                    markItem.isAbsent ? (
                                      <span className="text-amber-600 font-bold text-[10px]">Ab</span>
                                    ) : markItem.obtainedMarks !== null ? (
                                      <span className="font-semibold text-gray-900">
                                        {markItem.obtainedMarks}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Total Marks */}
                            <td className="p-1 text-center border-r border-gray-300 w-16 font-mono font-bold text-black">
                              {student ? student.totalObtained : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* Percentage */}
                            <td className="p-1 text-center border-r border-gray-300 w-[65px] font-mono font-bold">
                              {student ? (
                                <span
                                  className={
                                    student.percentage >= 80
                                      ? 'text-emerald-700 font-black'
                                      : 'text-gray-900'
                                  }
                                >
                                  {student.percentage.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="opacity-0 select-none">-</span>
                              )}
                            </td>

                            {/* Rank (IN THE LAST COLUMN) */}
                            <td className="p-1 text-center w-24">
                              {student ? getSheetRankBadge(rankVal) : <span className="opacity-0 select-none">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

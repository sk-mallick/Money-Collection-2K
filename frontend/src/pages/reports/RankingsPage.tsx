import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
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
  const [academicYear, setAcademicYear] = useState('');
  const [month, setMonth] = useState('AUG');
  const [rankingType, setRankingType] = useState<'class' | 'group'>('class');
  const [rankings, setRankings] = useState<RankingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('all');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [, setPeriods] = useState<ResultPeriod[]>([]);

  // Preview & Pagination state
  const [previewBucketIndex, setPreviewBucketIndex] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // A4 Landscape scale reference (1123px width x 794px height at 96 DPI)
  const a4ContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState<number>(1);

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
  }, [displayedRankings, previewBucketIndex, previewPageIndex]);

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

  // Active bucket for preview
  const activeBucket = displayedRankings[previewBucketIndex] || displayedRankings[0] || null;

  // Subjects for active bucket
  const activeSubjects = useMemo(() => {
    if (!activeBucket) return [];
    if (activeBucket.subjects && activeBucket.subjects.length > 0) {
      return activeBucket.subjects;
    }
    // Fallback extract from student marks
    const subMap = new Map<number, string>();
    for (const st of activeBucket.students) {
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
  }, [activeBucket]);

  // Filtered and Sorted students for the active bucket
  const sortedStudents = useMemo(() => {
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
  const totalPagesForActiveBucket = Math.max(1, Math.ceil(sortedStudents.length / 25));
  const currentStudentsPage = sortedStudents.slice(previewPageIndex * 25, (previewPageIndex + 1) * 25);

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
      subjects: b.subjects && b.subjects.length > 0 ? b.subjects : activeSubjects,
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

  // Render Rank Badge for UI table
  const renderRankCell = (rankVal: number | null | undefined) => {
    if (!rankVal) return <span className="text-gray-400 font-bold">—</span>;
    if (rankVal === 1) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-amber-500/15 text-amber-800 font-black px-2 py-0.5 rounded-full text-[10.5px] border border-amber-500/30 whitespace-nowrap shadow-2xs">
          <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
          <span>Rank 1</span>
        </span>
      );
    }
    if (rankVal === 2) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-slate-300/30 text-slate-800 font-black px-2 py-0.5 rounded-full text-[10.5px] border border-slate-400/40 whitespace-nowrap shadow-2xs">
          <Medal className="h-3 w-3 text-slate-500 shrink-0" />
          <span>Rank 2</span>
        </span>
      );
    }
    if (rankVal === 3) {
      return (
        <span className="inline-flex items-center justify-center gap-1 bg-amber-700/15 text-amber-900 font-black px-2 py-0.5 rounded-full text-[10.5px] border border-amber-700/30 whitespace-nowrap shadow-2xs">
          <Award className="h-3 w-3 text-amber-600 shrink-0" />
          <span>Rank 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center font-mono font-bold text-[11px] text-gray-800 px-2 py-0.5 rounded-xs bg-gray-100 border border-gray-300">
        #{rankVal}
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
              Exact A4 Landscape official merit sheet with 25 fixed rows, individual subject scores, total, percentage, and rank
            </p>
          </div>

          {/* Action Buttons (Print & Download) */}
          <div className="flex items-center gap-2 shrink-0">
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
            onChange={setAcademicYear}
            width="w-[125px]"
          />

          {/* Month Dropdown */}
          <CustomDropdown
            value={month}
            placeholder="Month"
            options={RANKING_MONTH_CODES.map((m) => ({
              label: MONTH_NAMES[m],
              value: m,
            }))}
            onChange={setMonth}
            width="w-[125px]"
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

          {/* Preview Navigation Switcher (When Multiple Buckets or Multiple Pages) */}
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

      {/* ─── PREVIEW DISPLAY AREA (EXACT A4 LANDSCAPE OFFLINE FORMAT, NO HORIZONTAL SCROLL) ─── */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : !activeBucket || displayedRankings.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground max-w-md mx-auto">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No Rankings Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no completed results for {MONTH_NAMES[month] || month} {academicYear}.
          </p>
        </Card>
      ) : (
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
                        <strong className="text-black">{sortedStudents.length} Ranked</strong>
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
                        <strong className="text-black">{sortedStudents.length} Ranked</strong>
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
                          ? (activeBucket.type === 'group' ? student.groupRank : student.classRank) ?? student.displayRank ?? (previewPageIndex * 25 + r + 1)
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
                                (m) => m.subjectId === sub.id || m.subjectName.toLowerCase() === sub.name.toLowerCase()
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
                                      <span className="font-semibold text-gray-900">{markItem.obtainedMarks}</span>
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
                                <span className={student.percentage >= 80 ? 'text-emerald-700 font-black' : 'text-gray-900'}>
                                  {student.percentage.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="opacity-0 select-none">-</span>
                              )}
                            </td>

                            {/* Rank (IN THE LAST COLUMN) */}
                            <td className="p-1 text-center w-24">
                              {student ? renderRankCell(rankVal) : <span className="opacity-0 select-none">-</span>}
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

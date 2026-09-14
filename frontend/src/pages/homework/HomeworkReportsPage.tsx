import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchHWExport, type HWExportData } from '@/lib/homework-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import type { Group } from '@/lib/constants';
import {
  MONTH_NAMES,
  MONTH_CODES,
  MONTH_SHORT,
  MONTH_CALENDAR_MAP,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Printer,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  BookOpen,
  Home,
  Layers,
} from 'lucide-react';
import {
  generateHomeworkReportPDF,
  printHomeworkReportPDF,
  type HWReportTrack,
  type HWClassColumn,
  type HomeworkReportGroupItem,
  type HomeworkReportStudent,
} from '@/lib/pdf';

// ─── Day mapping for generating class dates ─────────────────
const DAY_MAP: Record<string, number> = {
  'Sunday': 0, 'Sun': 0,
  'Monday': 1, 'Mon': 1,
  'Tuesday': 2, 'Tue': 2,
  'Wednesday': 3, 'Wed': 3,
  'Thursday': 4, 'Thu': 4,
  'Friday': 5, 'Fri': 5,
  'Saturday': 6, 'Sat': 6,
};

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateDatesForMonth(year: number, month: number, dayNames: string[]): Date[] {
  const dayNums = dayNames.map(d => DAY_MAP[d]).filter(d => d !== undefined);
  if (dayNums.length === 0) return [];
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1, 12, 0, 0);
  while (d.getMonth() === month - 1) {
    if (dayNums.includes(d.getDay())) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export default function HomeworkReportsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [month, setMonth] = useState<string>('SEP');
  const [selectedTrack, setSelectedTrack] = useState<HWReportTrack | 'all'>('homework');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Cache of export data: `${groupId}_${monthNum}_${academicYear}` -> HWExportData
  const [exportCache, setExportCache] = useState<Record<string, HWExportData>>({});

  // Preview navigation state
  const [previewGroupIndex, setPreviewGroupIndex] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  // A4 Landscape scale reference (1123px width x 794px height at 96 DPI)
  const a4ContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState<number>(1);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState<number>(794);

  // Academic Year options (5 years dynamic)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });

  // Calculate calendar month number & calendar year from academicYear + month code
  const monthNum = useMemo(() => {
    return MONTH_CALENDAR_MAP[month]?.calendarMonth || 9;
  }, [month]);

  const calendarYear = useMemo(() => {
    const parts = academicYear.split('-');
    const startYear = parseInt(parts[0], 10) || currentYear;
    const endYear = parts[1]
      ? (parts[1].length === 4 ? parseInt(parts[1], 10) : Math.floor(startYear / 100) * 100 + parseInt(parts[1], 10))
      : startYear + 1;
    return monthNum >= 4 ? startYear : endYear;
  }, [academicYear, monthNum, currentYear]);

  // Load groups & settings on mount
  useEffect(() => {
    async function init() {
      try {
        const [settingsRes, groupsList] = await Promise.all([fetchSettings(), fetchGroups()]);
        if (settingsRes.academicYear) {
          setAcademicYear(settingsRes.academicYear);
        }
        setSettings(settingsRes);
        setGroups(groupsList);
        if (groupsList.length > 0) {
          setSelectedGroupIds([groupsList[0].id]);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to init homework reports:', err);
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch report data for selected groups
  const loadReportsForGroups = useCallback(async (gIds: string[]) => {
    if (gIds.length === 0) return;
    setLoading(true);
    try {
      const missing = gIds.filter(id => !exportCache[`${id}_${monthNum}_${academicYear}`]);
      if (missing.length > 0) {
        const results = await Promise.all(
          missing.map(async id => {
            const data = await fetchHWExport(id, monthNum, academicYear);
            return { id, data };
          })
        );
        setExportCache(prev => {
          const next = { ...prev };
          for (const res of results) {
            next[`${res.id}_${monthNum}_${academicYear}`] = res.data;
          }
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load homework report data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [exportCache, monthNum, academicYear]);

  useEffect(() => {
    if (selectedGroupIds.length > 0) {
      loadReportsForGroups(selectedGroupIds);
    }
  }, [selectedGroupIds, loadReportsForGroups]);

  // Keep preview index in bounds
  useEffect(() => {
    if (previewGroupIndex >= selectedGroupIds.length) {
      setPreviewGroupIndex(Math.max(0, selectedGroupIds.length - 1));
    }
    setPreviewPageIndex(0);
  }, [selectedGroupIds, previewGroupIndex]);

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
      if (sheetRef.current) {
        const actualH = sheetRef.current.offsetHeight;
        if (actualH > 0) {
          setSheetHeight(actualH);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (a4ContainerRef.current) {
      resizeObserver.observe(a4ContainerRef.current);
    }
    if (sheetRef.current) {
      resizeObserver.observe(sheetRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [exportCache, previewGroupIndex, previewPageIndex, selectedTrack]);

  // Current active group data
  const activeGroupId = selectedGroupIds[previewGroupIndex] || selectedGroupIds[0];
  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);
  const activeExportData = activeGroupId ? exportCache[`${activeGroupId}_${monthNum}_${academicYear}`] : null;

  // Compute fixed class date columns for the active group in this month
  const activeClassColumns = useMemo((): HWClassColumn[] => {
    if (!activeGroup) return [];

    const timingDays = activeGroup.timing ? activeGroup.timing.split(',').map(d => d.trim()).filter(Boolean) : [];
    const scheduledDates = generateDatesForMonth(calendarYear, monthNum, timingDays);

    const dateSet = new Set<string>();
    scheduledDates.forEach(d => dateSet.add(toLocalISODate(d)));
    if (activeExportData?.sessions) {
      activeExportData.sessions.forEach(s => dateSet.add(s.session_date));
    }

    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length === 0) return [];

    return sortedDates.map(dateStr => {
      const d = new Date(dateStr + 'T12:00:00');
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayNum = String(d.getDate()).padStart(2, '0');
      const mShort = MONTH_SHORT[month] || String(monthNum);
      const session = activeExportData?.sessions.find(s => s.session_date === dateStr);
      return {
        date: dateStr,
        label: `${dayNum} ${mShort}`,
        subLabel: dayName,
        sessionCode: session?.session_code,
      };
    });
  }, [activeGroup, activeExportData, calendarYear, monthNum, month]);

  // Students mapping for 25 fixed rows per page
  const activeStudents = activeExportData?.students || [];
  const activePrefix = (activeGroup?.id || 'A').trim().toUpperCase();

  const activeStudentMap = useMemo(() => {
    const numMap = new Map<number, (typeof activeStudents)[0]>();
    const idMap = new Map<string, (typeof activeStudents)[0]>();
    let maxN = 25;
    for (const s of activeStudents) {
      idMap.set(s.id.toUpperCase(), s);
      const m = s.id.match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        if (!isNaN(n)) {
          numMap.set(n, s);
          if (n > maxN) maxN = n;
        }
      }
    }
    return { numMap, idMap, maxN };
  }, [activeStudents]);

  const totalPagesForActiveGroup = Math.max(1, Math.ceil(activeStudentMap.maxN / 25));

  // Fast record lookup: student_id -> session_date -> HWStudentRecord
  const recordsLookup = useMemo(() => {
    if (!activeExportData) return {};
    const lookup: Record<string, Record<string, { hw: string; tp: string; pr: string }>> = {};
    for (const rec of activeExportData.records) {
      if (!lookup[rec.student_id]) lookup[rec.student_id] = {};
      const session = activeExportData.sessions.find(s => s.id === rec.session_id);
      if (session) {
        lookup[rec.student_id][session.session_date] = {
          hw: rec.homework_status || '',
          tp: rec.test_prep_status || '',
          pr: rec.practice_status || '',
        };
      }
    }
    return lookup;
  }, [activeExportData]);

  // Group selection handlers
  const isAllGroupsSelected = groups.length > 0 && selectedGroupIds.length === groups.length;

  const selectAllGroups = () => {
    setSelectedGroupIds(groups.map(g => g.id));
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const selectSingleGroup = (gId: string) => {
    setSelectedGroupIds([gId]);
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const toggleGroup = (gId: string) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(gId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== gId);
      } else {
        return [...prev, gId];
      }
    });
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const handleDesktopGroupClick = (gId: string) => {
    if (isAllGroupsSelected) {
      selectSingleGroup(gId);
      return;
    }
    toggleGroup(gId);
  };

  // Helper to prepare data for PDF generation
  const prepareGroupsDataForPDF = async (): Promise<HomeworkReportGroupItem[]> => {
    const missing = selectedGroupIds.filter(id => !exportCache[`${id}_${monthNum}_${academicYear}`]);
    let currentCache = { ...exportCache };
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async id => {
          const data = await fetchHWExport(id, monthNum, academicYear);
          return { id, data };
        })
      );
      for (const res of results) {
        currentCache[`${res.id}_${monthNum}_${academicYear}`] = res.data;
      }
      setExportCache(currentCache);
    }

    return selectedGroupIds.map(gId => {
      const grp: Group = groups.find(g => g.id === gId) || { id: gId, class: '—', timing: '', category: 'Senior' };
      const exp = currentCache[`${gId}_${monthNum}_${academicYear}`];
      const timingDays = grp.timing ? grp.timing.split(',').map(d => d.trim()).filter(Boolean) : [];
      const scheduledDates = generateDatesForMonth(calendarYear, monthNum, timingDays);

      const dateSet = new Set<string>();
      scheduledDates.forEach(d => dateSet.add(toLocalISODate(d)));
      if (exp?.sessions) {
        exp.sessions.forEach(s => dateSet.add(s.session_date));
      }

      const sortedDates = Array.from(dateSet).sort();
      const dates: HWClassColumn[] = sortedDates.map(dateStr => {
        const d = new Date(dateStr + 'T12:00:00');
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const dayNum = String(d.getDate()).padStart(2, '0');
        const mShort = MONTH_SHORT[month] || String(monthNum);
        const session = exp?.sessions.find(s => s.session_date === dateStr);
        return {
          date: dateStr,
          label: `${dayNum} ${mShort}`,
          subLabel: dayName,
          sessionCode: session?.session_code,
        };
      });

      // Build student records
      const lookup: Record<string, Record<string, string>> = {};
      const completedCounts: Record<string, number> = {};

      if (exp) {
        for (const rec of exp.records) {
          if (!lookup[rec.student_id]) lookup[rec.student_id] = {};
          const session = exp.sessions.find(s => s.id === rec.session_id);
          if (session) {
            let val = '';
            if (selectedTrack === 'homework') val = rec.homework_status || '';
            else if (selectedTrack === 'test_prep') val = rec.test_prep_status || '';
            else if (selectedTrack === 'practice') val = rec.practice_status || '';
            else val = rec.homework_status || '';
            lookup[rec.student_id][session.session_date] = val;

            if (val === 'Done' || val === 'Prepared' || val === 'Practiced') {
              completedCounts[rec.student_id] = (completedCounts[rec.student_id] || 0) + 1;
            }
          }
        }
      }

      const students: HomeworkReportStudent[] = (exp?.students || []).map(st => ({
        id: st.id,
        name: st.name,
        class: st.class,
        school: st.school,
        evaluations: lookup[st.id] || {},
        totalCompleted: completedCounts[st.id] || 0,
        totalSessions: exp?.sessions.length || 0,
      }));

      return {
        group: {
          id: grp.id,
          class: grp.class,
          timing: grp.timing,
          category: grp.category,
        },
        dates,
        students,
      };
    });
  };

  // Direct Download PDF Handler (No dropdown, no CSV)
  const handleDownloadPDF = async (trackMode: HWReportTrack | 'all') => {
    if (selectedGroupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }
    setIsDownloading(true);
    try {
      const groupsData = await prepareGroupsDataForPDF();
      if (groupsData.length === 0) {
        toast.error('No report data found for selected groups');
        return;
      }

      await generateHomeworkReportPDF({
        groupsData,
        month,
        academicYear,
        track: trackMode,
        settings,
      });

      const label = trackMode === 'all' ? 'All 3 Tracks' : trackMode === 'homework' ? 'Homework' : trackMode === 'test_prep' ? 'Test Prep' : 'Home Practice';
      toast.success(`Downloaded ${label} Report PDF for ${groupsData.length} group${groupsData.length > 1 ? 's' : ''}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download report';
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct Print Handler
  const handleDirectPrint = async () => {
    if (selectedGroupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }
    setIsPrinting(true);
    const targetWin = window.open('', '_blank');
    if (targetWin) {
      targetWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head><title>Preparing Homework Report...</title></head>
          <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;">
            <div style="text-align:center;">
              <div style="display:inline-block;width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#0284c7;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
              <div style="font-size:15px;font-weight:600;">Generating Vector A4 Landscape Report...</div>
            </div>
            <style>@keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(360deg);} }</style>
          </body>
        </html>
      `);
    }

    try {
      const groupsData = await prepareGroupsDataForPDF();
      if (groupsData.length === 0) {
        if (targetWin && !targetWin.closed) targetWin.close();
        toast.error('No report data found for selected groups');
        return;
      }

      await printHomeworkReportPDF(
        {
          groupsData,
          month,
          academicYear,
          track: selectedTrack,
          settings,
        },
        targetWin
      );
    } catch (err: unknown) {
      if (targetWin && !targetWin.closed) targetWin.close();
      const msg = err instanceof Error ? err.message : 'Failed to print report';
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  // Status styling helper
  const renderStatusCell = (val: string | undefined) => {
    if (!val) return <span className="opacity-0 select-none">-</span>;
    if (val === 'Done' || val === 'Prepared' || val === 'Practiced') {
      const label = val === 'Done' ? 'Done' : val === 'Prepared' ? 'Prep' : 'Pract';
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50 border border-green-200/80 leading-none">
          ✓ {label}
        </span>
      );
    }
    if (val === 'Not Done' || val === 'Not Prepared' || val === 'Not Practiced') {
      const label = val === 'Not Done' ? 'Not Done' : val === 'Not Prepared' ? 'Not Prep' : 'Not Pract';
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/80 leading-none">
          ✗ {label}
        </span>
      );
    }
    if (val === 'Absent' || val === 'On Leave') {
      const label = val === 'Absent' ? 'Absent' : 'Leave';
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 leading-none">
          {label}
        </span>
      );
    }
    return (
      <span className="inline-block px-1 py-0.5 rounded text-[9.5px] font-medium text-gray-500 bg-gray-50 leading-none">
        {val}
      </span>
    );
  };

  const getTrackLabel = (t: HWReportTrack | 'all') => {
    switch (t) {
      case 'all': return 'All';
      case 'homework': return 'H.W.';
      case 'test_prep': return 'Test Prep';
      case 'practice': return 'Practice';
    }
  };

  const getSheetTitle = (t: HWReportTrack) => {
    switch (t) {
      case 'homework': return 'HOMEWORK';
      case 'test_prep': return 'TEST PREPARATION';
      case 'practice': return 'HOME PRACTICE';
    }
  };

  // Tracks to preview on screen
  const tracksToPreview: HWReportTrack[] = selectedTrack === 'all'
    ? ['homework', 'test_prep', 'practice']
    : [selectedTrack];

  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* ─── PAGE HEADER (WITH BOTTOM DIVIDER LINE) ─── */}
      <div className="no-print border-b pb-3 sm:pb-3.5">
        <div className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              <span className="hidden sm:inline">Monthly Homework Reports</span>
              <span className="sm:hidden">Monthly Reports</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              <span className="hidden sm:inline">
                A4 Landscape printable sheets for Homework, Test Preparation, and Home Practice with exact monthly classes
              </span>
              <span className="sm:hidden">
                A4 printable homework tracking sheets
              </span>
            </p>
          </div>

          {/* Action Buttons (Direct Print & Direct Download - No dropdown, No CSV) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={selectedGroupIds.length === 0 || loading || isPrinting}
              className="hidden sm:inline-flex h-9 gap-1.5 px-3 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer hover:bg-muted rounded-md"
              title={`Print ${selectedTrack === 'all' ? 'All 3 Tracks' : getTrackLabel(selectedTrack)} Report`}
            >
              {isPrinting ? (
                <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </Button>

            {/* Direct Download Button */}
            <Button
              size="sm"
              onClick={() => handleDownloadPDF(selectedTrack)}
              disabled={selectedGroupIds.length === 0 || loading || isDownloading}
              className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3.5 text-xs sm:text-sm bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer rounded-md shrink-0 flex items-center justify-center gap-1.5"
              title={isDownloading ? 'Downloading...' : selectedTrack === 'all' ? 'Download All 3 Tracks PDF' : `Download ${getTrackLabel(selectedTrack)} PDF`}
            >
              {isDownloading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDownloading
                  ? 'Downloading...'
                  : selectedTrack === 'all'
                  ? 'Download All 3 Tracks'
                  : `Download ${getTrackLabel(selectedTrack)} PDF`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── FILTER CONTROLS TOOLBAR (DESKTOP - FULL WIDTH LAYOUT) ─── */}
      <div className="no-print hidden sm:flex sm:items-center sm:justify-between sm:gap-2.5 w-full flex-wrap">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Academic Year */}
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="w-[125px] sm:w-[130px] text-xs sm:text-sm h-9 bg-card shadow-2xs hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y} className="text-xs sm:text-sm cursor-pointer">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month */}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[125px] sm:w-[130px] text-xs sm:text-sm h-9 bg-card shadow-2xs hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_CODES.map(m => (
                <SelectItem key={m} value={m} className="text-xs sm:text-sm cursor-pointer">
                  {MONTH_NAMES[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 4-Track Segmented Switcher (All | H.W. | Test Prep | Practice) */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 h-9 shadow-xs">
            {(['all', 'homework', 'test_prep', 'practice'] as const).map((trackKey) => {
              const isSelected = selectedTrack === trackKey;
              const label = getTrackLabel(trackKey);
              const Icon = trackKey === 'all'
                ? Layers
                : trackKey === 'homework'
                ? ClipboardCheck
                : trackKey === 'test_prep'
                ? BookOpen
                : Home;

              return (
                <button
                  key={trackKey}
                  type="button"
                  onClick={() => setSelectedTrack(trackKey)}
                  className={cn(
                    "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 gap-1.5 rounded-md h-7 px-2.5 text-xs cursor-pointer select-none",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 font-medium"
                  )}
                  title={trackKey === 'all' ? 'All 3 Evaluation Tracks' : `${label} Tracking Sheet`}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-primary-foreground" : "")} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Direct Group Toggle Buttons */}
          <div className="flex items-center gap-0.5 p-1 bg-muted/40 dark:bg-muted/25 border border-border/80 rounded-lg shadow-2xs h-9 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={selectAllGroups}
              className={cn(
                "h-7 px-2.5 text-xs rounded-md transition-all cursor-pointer select-none flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
                isAllGroupsSelected
                  ? "bg-primary text-primary-foreground shadow-xs font-bold hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/70 font-semibold"
              )}
              title="Select all groups"
            >
              All
            </button>
            <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />
            <div className="flex items-center gap-0.5">
              {groups.map(g => {
                const isSelected = !isAllGroupsSelected && selectedGroupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleDesktopGroupClick(g.id)}
                    className={cn(
                      "h-7 min-w-[28px] px-2 text-xs rounded-md transition-all cursor-pointer select-none flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs font-bold hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/70 font-semibold"
                    )}
                    title={`Group ${g.id} — ${g.class} (${g.category})`}
                  >
                    {g.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Preview Navigation Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedGroupIds.length > 1 && (
            <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-9">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-none cursor-pointer text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setPreviewGroupIndex(p => Math.max(0, p - 1));
                  setPreviewPageIndex(0);
                }}
                disabled={previewGroupIndex <= 0}
                title="Previous Group"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden md:inline ml-0.5">Prev</span>
              </Button>
              <span className="text-[11px] sm:text-xs font-bold text-foreground px-2.5 border-x leading-9 whitespace-nowrap bg-muted/20">
                Group {activeGroupId} ({previewGroupIndex + 1}/{selectedGroupIds.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-none cursor-pointer text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setPreviewGroupIndex(p => Math.min(selectedGroupIds.length - 1, p + 1));
                  setPreviewPageIndex(0);
                }}
                disabled={previewGroupIndex >= selectedGroupIds.length - 1}
                title="Next Group"
              >
                <span className="hidden md:inline mr-0.5">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {totalPagesForActiveGroup > 1 && (
            <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-9">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 rounded-none cursor-pointer text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => setPreviewPageIndex(p => Math.max(0, p - 1))}
                disabled={previewPageIndex <= 0}
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] sm:text-xs font-bold text-foreground px-2.5 border-x leading-9 whitespace-nowrap bg-muted/20">
                Page {previewPageIndex + 1}/{totalPagesForActiveGroup}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 rounded-none cursor-pointer text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => setPreviewPageIndex(p => Math.min(totalPagesForActiveGroup - 1, p + 1))}
                disabled={previewPageIndex >= totalPagesForActiveGroup - 1}
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── FILTER CONTROLS TOOLBAR (MOBILE) ─── */}
      <div className="no-print space-y-2 sm:hidden">
        <div className="grid grid-cols-3 gap-1.5">
          {/* Academic Year */}
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger size="sm" className="w-full text-xs h-8 bg-card shadow-2xs px-2 truncate hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y} className="text-xs cursor-pointer">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month */}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger size="sm" className="w-full text-xs h-8 bg-card shadow-2xs px-2 font-semibold truncate hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
              <SelectValue>{MONTH_SHORT[month] || month}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_CODES.map(m => (
                <SelectItem key={m} value={m} className="text-xs cursor-pointer">
                  <span className="font-bold mr-1.5">{MONTH_SHORT[m]}</span>
                  <span className="text-muted-foreground text-[11px]">({MONTH_NAMES[m]})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group Dropdown with Checkbox */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 bg-card shadow-2xs px-2 flex items-center justify-between truncate cursor-pointer font-semibold hover:bg-accent/30 hover:border-primary/40 transition-colors"
              >
                <span className="truncate">
                  {isAllGroupsSelected
                    ? 'All Groups'
                    : selectedGroupIds.length === 1
                    ? `Group ${selectedGroupIds[0]}`
                    : `${selectedGroupIds.length} Groups`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1.5 border-b text-[11px] font-semibold text-muted-foreground">
                <span>Select Groups</span>
                <button
                  type="button"
                  onClick={isAllGroupsSelected ? () => selectSingleGroup(groups[0]?.id || 'A') : selectAllGroups}
                  className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                >
                  {isAllGroupsSelected ? 'Single' : 'Select All'}
                </button>
              </div>
              <DropdownMenuCheckboxItem
                checked={isAllGroupsSelected}
                onCheckedChange={selectAllGroups}
                className="text-xs font-bold cursor-pointer"
              >
                All Groups ({groups.length})
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {groups.map(g => (
                <DropdownMenuCheckboxItem
                  key={g.id}
                  checked={selectedGroupIds.includes(g.id)}
                  onCheckedChange={() => toggleGroup(g.id)}
                  className="text-xs cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">Group {g.id}</span>
                    <span className="text-[10px] text-muted-foreground">{g.class} ({g.category})</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile 4-Track Segmented Switcher */}
        <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 h-9 w-full shadow-xs">
          {(['all', 'homework', 'test_prep', 'practice'] as const).map((trackKey) => {
            const isSelected = selectedTrack === trackKey;
            const label = getTrackLabel(trackKey);
            const Icon = trackKey === 'all'
              ? Layers
              : trackKey === 'homework'
              ? ClipboardCheck
              : trackKey === 'test_prep'
              ? BookOpen
              : Home;

            return (
              <button
                key={trackKey}
                type="button"
                onClick={() => setSelectedTrack(trackKey)}
                className={cn(
                  "flex-1 inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 gap-1 rounded-md h-7 px-1 text-[11px] sm:text-xs cursor-pointer select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 font-medium"
                )}
              >
                <Icon className={cn("h-3 w-3 shrink-0", isSelected ? "text-primary-foreground" : "")} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Preview Switchers Strip */}
        {(selectedGroupIds.length > 1 || totalPagesForActiveGroup > 1) && (
          <div className="flex items-center justify-between gap-1.5 text-xs">
            {selectedGroupIds.length > 1 && (
              <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-8 flex-1 justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 rounded-none cursor-pointer text-xs"
                  onClick={() => {
                    setPreviewGroupIndex(p => Math.max(0, p - 1));
                    setPreviewPageIndex(0);
                  }}
                  disabled={previewGroupIndex <= 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[10.5px] font-bold text-foreground px-1 truncate">
                  Group {activeGroupId} ({previewGroupIndex + 1}/{selectedGroupIds.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 rounded-none cursor-pointer text-xs"
                  onClick={() => {
                    setPreviewGroupIndex(p => Math.min(selectedGroupIds.length - 1, p + 1));
                    setPreviewPageIndex(0);
                  }}
                  disabled={previewGroupIndex >= selectedGroupIds.length - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {totalPagesForActiveGroup > 1 && (
              <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-8">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 rounded-none cursor-pointer text-xs"
                  onClick={() => setPreviewPageIndex(p => Math.max(0, p - 1))}
                  disabled={previewPageIndex <= 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[10.5px] font-bold text-foreground px-2 border-x leading-8">
                  {previewPageIndex + 1}/{totalPagesForActiveGroup}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 rounded-none cursor-pointer text-xs"
                  onClick={() => setPreviewPageIndex(p => Math.min(totalPagesForActiveGroup - 1, p + 1))}
                  disabled={previewPageIndex >= totalPagesForActiveGroup - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── PREVIEW DISPLAY AREA (RESPONSIVE A4 LANDSCAPE, NO HORIZONTAL SCROLL) ─── */}
      {loading && !activeExportData ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : !activeExportData ? (
        <Card className="p-12 text-center text-muted-foreground max-w-md mx-auto">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Please select a group to generate the monthly homework report.</p>
        </Card>
      ) : (
        <div className="w-full flex flex-col items-center space-y-3">
          {/* Document Preview Info Strip (Clean & minimal "less context") */}
          <div className="w-full flex items-center justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Group {activeGroupId} · {getTrackLabel(selectedTrack)}</span>
            </span>
          </div>

          <div
            ref={a4ContainerRef}
            className="w-full flex flex-col items-center space-y-4"
          >
            {tracksToPreview.map((track) => {
              const sheetTitle = getSheetTitle(track);

              return (
                <div
                  key={track}
                  className="w-full flex justify-center items-start overflow-hidden py-1 print:overflow-visible print:h-auto print:py-0 print:block"
                  style={{
                    height: a4Scale < 1 ? `${Math.ceil(sheetHeight * a4Scale)}px` : 'auto',
                  }}
                >
                  {/* A4 Landscape Paper Layout (1123px width x 794px minHeight) */}
                  <div
                    ref={sheetRef}
                    style={{
                      width: '1123px',
                      minHeight: '794px',
                      transform: a4Scale < 1 ? `scale(${a4Scale})` : undefined,
                      transformOrigin: 'top center',
                      backgroundColor: '#ffffff',
                    }}
                    className="printable-sheet bg-white text-black font-sans border-[2.5px] border-black rounded-none pt-5 pb-4 px-5 sm:pt-6 sm:pb-4 sm:px-6 shadow-xl ring-1 ring-black/5 flex flex-col justify-start shrink-0 box-border print:transform-none print:w-full print:border-[2px] print:shadow-none print:p-4"
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
                            Monthly {sheetTitle} Tracking Sheet — {MONTH_NAMES[month] || month}{' '}
                            {academicYear}
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
                        <div>
                          <span className="text-gray-700 font-bold">BATCH:</span>{' '}
                          <strong className="font-mono text-black">
                            Group {activeGroup?.id}
                          </strong>{' '}
                          {activeGroup?.class && (
                            <span>({activeGroup.class})</span>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">CATEGORY:</span>{' '}
                          <strong className="text-black">{activeGroup?.category || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">TIMING:</span>{' '}
                          <strong className="text-black">{activeGroup?.timing || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">TRACK:</span>{' '}
                          <strong className="text-red-700 uppercase">{sheetTitle}</strong>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">ENROLLED:</span>{' '}
                          <strong className="text-black">{activeStudents.length} Students</strong>
                        </div>
                        <div>
                          <span className="text-gray-700 font-bold">PAGE:</span>{' '}
                          <strong className="text-black">
                            {previewPageIndex + 1} OF {totalPagesForActiveGroup}
                          </strong>
                        </div>
                      </div>

                      {/* ─── 4. Evaluation Table (Exactly 25 Fixed Rows) ─── */}
                      <div className="border border-black overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse table-fixed">
                          <thead className="bg-gray-100 border-b border-black text-[11px] font-bold">
                            <tr>
                              <th className="p-1.5 font-bold text-black border-r border-black w-14 text-center">
                                ID
                              </th>
                              <th className="p-1.5 font-bold text-black border-r border-black w-[190px]">
                                Student Name
                              </th>
                              <th className="p-1.5 font-bold text-black border-r border-black w-12 text-center">
                                Class
                              </th>
                              <th className="p-1.5 font-bold text-black border-r border-black w-[75px]">
                                School
                              </th>

                              {/* Fixed Number of Class Columns for this Month */}
                              {activeClassColumns.length > 0 ? (
                                activeClassColumns.map((col, idx) => (
                                  <th
                                    key={col.date}
                                    className={`p-1 font-bold text-black ${idx === activeClassColumns.length - 1 ? '' : 'border-r border-black'} text-center`}
                                  >
                                    <div className="truncate leading-tight text-[10px]">{col.label}</div>
                                    <div className="text-[9px] font-normal text-gray-600 leading-tight">({col.subLabel})</div>
                                  </th>
                                ))
                              ) : (
                                Array.from({ length: 8 }).map((_, i) => (
                                  <th
                                    key={i}
                                    className={`p-1 font-bold text-black ${i === 7 ? '' : 'border-r border-black'} text-center`}
                                  >
                                    <div className="leading-tight text-[10px]">Class {i + 1}</div>
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-300">
                            {Array.from({ length: 25 }).map((_, r) => {
                              const serialNo = previewPageIndex * 25 + r + 1;
                              const formattedId = `${activePrefix}${serialNo < 10 ? '0' + serialNo : serialNo}`;
                              const student =
                                activeStudentMap.idMap.get(formattedId) ||
                                activeStudentMap.numMap.get(serialNo) ||
                                null;

                              return (
                                <tr
                                  key={r}
                                  className="h-[27px] text-[11px] bg-white"
                                >
                                  <td className="p-1 text-center font-mono font-bold text-black border-r border-gray-300 w-14">
                                    {formattedId}
                                  </td>
                                  <td className="p-1 font-semibold text-black border-r border-gray-300 w-[190px] truncate">
                                    {student ? student.name : <span className="opacity-0 select-none">-</span>}
                                  </td>
                                  <td className="p-1 text-center text-gray-800 border-r border-gray-300 w-12 truncate">
                                    {student ? student.class || activeGroup?.class || '—' : <span className="opacity-0 select-none">-</span>}
                                  </td>
                                  <td
                                    className="p-1 text-gray-800 border-r border-gray-300 w-[75px] truncate"
                                    title={student?.school || ''}
                                  >
                                    {student ? student.school || '—' : <span className="opacity-0 select-none">-</span>}
                                  </td>

                                  {/* Class Date Columns */}
                                  {activeClassColumns.length > 0 ? (
                                    activeClassColumns.map((col, idx) => {
                                      const rec = student ? recordsLookup[student.id]?.[col.date] : null;
                                      const val = track === 'homework' ? rec?.hw : track === 'test_prep' ? rec?.tp : rec?.pr;
                                      return (
                                        <td
                                          key={col.date}
                                          className={`p-0.5 text-center ${idx === activeClassColumns.length - 1 ? '' : 'border-r border-gray-300'}`}
                                        >
                                          {renderStatusCell(val)}
                                        </td>
                                      );
                                    })
                                  ) : (
                                    Array.from({ length: 8 }).map((_, i) => (
                                      <td
                                        key={i}
                                        className={`p-1 text-center ${i === 7 ? '' : 'border-r border-gray-300'}`}
                                      >
                                        <span className="opacity-0 select-none">-</span>
                                      </td>
                                    ))
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

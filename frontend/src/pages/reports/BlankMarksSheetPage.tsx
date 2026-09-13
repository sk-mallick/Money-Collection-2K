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
import { fetchBlankSheet, type BlankSheetData } from '@/lib/reports-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import type { Group } from '@/lib/constants';
import { MONTH_NAMES, MONTH_CODES, MONTH_SHORT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Printer,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  generateBlankMarksSheetPDF,
  printBlankMarksSheetPDF,
  type BlankMarksSheetGroupItem,
} from '@/lib/pdf';

export default function BlankMarksSheetPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [month, setMonth] = useState<string>('SEP');
  const [sheetsMap, setSheetsMap] = useState<Record<string, BlankSheetData>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Preview navigation state
  const [previewGroupIndex, setPreviewGroupIndex] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  // A4 Landscape scale reference (1123px width x 794px height at 96 DPI)
  const a4ContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState<number>(1);

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
          const initialId = groupsList[0].id;
          setSelectedGroupIds([initialId]);
        }
      } catch (err) {
        console.error('Failed to init blank sheet:', err);
      }
    }
    init();
  }, []);

  // Fetch sheet data for selected groups
  const loadSheetsForGroups = useCallback(async (gIds: string[]) => {
    if (gIds.length === 0) return;
    setLoading(true);
    try {
      const missing = gIds.filter((id) => !sheetsMap[id]);
      if (missing.length > 0) {
        const results = await Promise.all(
          missing.map(async (id) => {
            const data = await fetchBlankSheet(id);
            return { id, data };
          })
        );
        setSheetsMap((prev) => {
          const next = { ...prev };
          for (const res of results) {
            next[res.id] = res.data;
          }
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load blank sheet data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [sheetsMap]);

  useEffect(() => {
    if (selectedGroupIds.length > 0) {
      loadSheetsForGroups(selectedGroupIds);
    }
  }, [selectedGroupIds, loadSheetsForGroups]);

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
  }, [sheetsMap, previewGroupIndex, previewPageIndex]);

  // Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });

  // Current active group and page data for preview
  const activeGroupId = selectedGroupIds[previewGroupIndex] || selectedGroupIds[0];
  const activeSheetData = activeGroupId ? sheetsMap[activeGroupId] : null;
  const activeStudents = activeSheetData?.students || [];
  const activePrefix = (activeSheetData?.group?.id || 'A').trim().toUpperCase();

  // Map students by numeric ID and exact ID string
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

  // Group selection handlers
  const selectAllGroups = () => {
    setSelectedGroupIds(groups.map((g) => g.id));
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const selectSingleGroup = (gId: string) => {
    setSelectedGroupIds([gId]);
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const toggleGroup = (gId: string) => {
    setSelectedGroupIds((prev) => {
      if (prev.includes(gId)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter((id) => id !== gId);
      } else {
        return [...prev, gId];
      }
    });
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
  };

  const handleDesktopGroupClick = (gId: string, e: React.MouseEvent) => {
    if (isAllGroupsSelected) {
      selectSingleGroup(gId);
      return;
    }
    toggleGroup(gId);
  };

  // Helper to get group items for PDF generator
  const prepareGroupsDataForPDF = async (): Promise<BlankMarksSheetGroupItem[]> => {
    const missing = selectedGroupIds.filter((id) => !sheetsMap[id]);
    let currentMap = { ...sheetsMap };
    if (missing.length > 0) {
      const results = await Promise.all(
        missing.map(async (id) => {
          const data = await fetchBlankSheet(id);
          return { id, data };
        })
      );
      for (const res of results) {
        currentMap[res.id] = res.data;
      }
      setSheetsMap(currentMap);
    }

    return selectedGroupIds
      .map((id) => currentMap[id])
      .filter(Boolean)
      .map((s) => ({
        group: s.group,
        students: s.students,
        subjects: s.subjects,
      }));
  };

  // Download PDF Handler (A4 Landscape, each group on separate page, 25 fixed rows per page)
  const handleDownloadPDF = async () => {
    if (selectedGroupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }
    setIsDownloading(true);
    try {
      const groupsData = await prepareGroupsDataForPDF();
      if (groupsData.length === 0) {
        toast.error('No sheet data found for selected groups');
        return;
      }

      await generateBlankMarksSheetPDF({
        groupsData,
        month,
        academicYear,
        settings,
      });

      toast.success(
        `Downloaded ${groupsData.length} group${groupsData.length > 1 ? 's' : ''} blank marks sheet(s)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download blank marks sheet';
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
          <head><title>Preparing Blank Marks Sheets...</title></head>
          <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;">
            <div style="text-align:center;">
              <div style="display:inline-block;width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#0284c7;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
              <div style="font-size:15px;font-weight:600;">Generating Blank Marks Sheet...</div>
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
        toast.error('No sheet data found for selected groups');
        return;
      }

      await printBlankMarksSheetPDF(
        {
          groupsData,
          month,
          academicYear,
          settings,
        },
        targetWin
      );
    } catch (err: unknown) {
      if (targetWin && !targetWin.closed) targetWin.close();
      const msg = err instanceof Error ? err.message : 'Failed to print blank marks sheet';
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  // State helper for group selection
  const isAllGroupsSelected =
    groups.length > 0 && selectedGroupIds.length === groups.length;

  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* ─── PAGE HEADER (WITH BOTTOM DIVIDER LINE) ─── */}
      <div className="no-print border-b pb-3 sm:pb-3.5">
        <div className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Offline Blank Marks Entry Sheet
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              <span className="hidden sm:inline">
                A4 Landscape printable sheets with 25 fixed rows per page for classroom marks entry
              </span>
              <span className="sm:hidden">
                A4 printable marks sheets
              </span>
            </p>
          </div>

          {/* Action Buttons (Print & Download - Bottom-aligned on desktop) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Print Button (Hidden on phone screens, visible on sm and up) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={selectedGroupIds.length === 0 || loading || isPrinting}
              className="hidden sm:inline-flex h-9 gap-1.5 px-3 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer hover:bg-muted rounded-md"
              title="Print exact A4 Landscape marks sheet"
            >
              {isPrinting ? (
                <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </Button>

            {/* Download Button (Icon-only on mobile, full text on desktop) */}
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={selectedGroupIds.length === 0 || loading || isDownloading}
              className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3.5 text-xs sm:text-sm bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer rounded-md shrink-0 flex items-center justify-center gap-1.5"
              title="Download A4 Landscape PDF for selected groups"
            >
              {isDownloading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDownloading
                  ? 'Downloading...'
                  : selectedGroupIds.length > 1
                  ? `Download (${selectedGroupIds.length} Groups)`
                  : 'Download PDF'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── FILTER CONTROLS TOOLBAR (DESKTOP: DIRECT GROUP TOGGLE BUTTONS STRIP) ─── */}
      <div className="no-print hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
        {/* Academic Year */}
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger className="w-[125px] sm:w-[130px] text-xs sm:text-sm h-9 bg-card shadow-2xs hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
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
            {MONTH_CODES.map((m) => (
              <SelectItem key={m} value={m} className="text-xs sm:text-sm cursor-pointer">
                {MONTH_NAMES[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Desktop Direct Group Toggle Buttons in a Single Line */}
        <div className="flex items-center gap-0.5 p-1 bg-muted/40 dark:bg-muted/25 border border-border/80 rounded-lg shadow-2xs h-9">
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
            {groups.map((g) => {
              const isSelected = !isAllGroupsSelected && selectedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={(e) => handleDesktopGroupClick(g.id, e)}
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

        {/* Preview Navigation Switcher (When Multiple Groups or Multiple Pages) */}
        <div className="ml-auto flex items-center gap-2">
          {selectedGroupIds.length > 1 && (
            <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-9">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-none cursor-pointer text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setPreviewGroupIndex((p) => Math.max(0, p - 1));
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
                  setPreviewGroupIndex((p) => Math.min(selectedGroupIds.length - 1, p + 1));
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
                onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
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
                onClick={() => setPreviewPageIndex((p) => Math.min(totalPagesForActiveGroup - 1, p + 1))}
                disabled={previewPageIndex >= totalPagesForActiveGroup - 1}
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── FILTER CONTROLS TOOLBAR (MOBILE: 3 CONTROLS IN 1 LINE WITH 3-LETTER MONTH & GROUP CHECKBOX TOGGLE) ─── */}
      <div className="no-print grid sm:hidden grid-cols-3 gap-1.5">
        {/* Academic Year */}
        <Select value={academicYear} onValueChange={setAcademicYear}>
          <SelectTrigger size="sm" className="w-full text-xs h-8 bg-card shadow-2xs px-2 truncate hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y} className="text-xs cursor-pointer">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month (3-letter codes) */}
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger size="sm" className="w-full text-xs h-8 bg-card shadow-2xs px-2 font-semibold truncate hover:bg-accent/30 hover:border-primary/40 transition-colors cursor-pointer">
            <SelectValue>{MONTH_SHORT[month] || month}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTH_CODES.map((m) => (
              <SelectItem key={m} value={m} className="text-xs cursor-pointer">
                <span className="font-bold mr-1.5">{MONTH_SHORT[m]}</span>
                <span className="text-muted-foreground text-[11px]">({MONTH_NAMES[m]})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Group Dropdown with Tick (✓) Checkbox Toggles */}
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
            {groups.map((g) => (
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

      {/* Mobile Preview Switchers Strip (When Multiple Groups/Pages on Mobile) */}
      {(selectedGroupIds.length > 1 || totalPagesForActiveGroup > 1) && (
        <div className="no-print flex sm:hidden items-center justify-between gap-1.5 text-xs">
          {selectedGroupIds.length > 1 && (
            <div className="flex items-center border rounded-md overflow-hidden bg-card shadow-2xs h-8 flex-1 justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-none cursor-pointer text-xs"
                onClick={() => {
                  setPreviewGroupIndex((p) => Math.max(0, p - 1));
                  setPreviewPageIndex(0);
                }}
                disabled={previewGroupIndex <= 0}
                title="Previous Group"
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
                  setPreviewGroupIndex((p) => Math.min(selectedGroupIds.length - 1, p + 1));
                  setPreviewPageIndex(0);
                }}
                disabled={previewGroupIndex >= selectedGroupIds.length - 1}
                title="Next Group"
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
                onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                disabled={previewPageIndex <= 0}
                title="Previous Page"
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
                onClick={() => setPreviewPageIndex((p) => Math.min(totalPagesForActiveGroup - 1, p + 1))}
                disabled={previewPageIndex >= totalPagesForActiveGroup - 1}
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── PREVIEW DISPLAY AREA (RESPONSIVE A4 LANDSCAPE, NO HORIZONTAL SCROLL) ─── */}
      {loading && !activeSheetData ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : !activeSheetData ? (
        <Card className="p-12 text-center text-muted-foreground max-w-md mx-auto">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Please select a group to generate the offline marks sheet.</p>
        </Card>
      ) : (
        <div className="w-full flex flex-col items-center space-y-2">
          {/* Document Preview Info Strip (Centered) */}
          <div className="w-full flex items-center justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>
                A4 Landscape Preview — Group {activeSheetData.group?.id}
                {activeSheetData.group?.class ? ` (${activeSheetData.group?.class})` : ''}
              </span>
            </span>
          </div>

          <div
            ref={a4ContainerRef}
            className="w-full flex justify-center items-start overflow-hidden py-1 print:overflow-visible print:h-auto print:py-0 print:block"
            style={{
              height: a4Scale < 1 ? `${Math.ceil(794 * a4Scale)}px` : 'auto',
            }}
          >
            {/* A4 Landscape Paper Layout (1123px width x 794px minHeight) */}
            <div
              id="printable-a4-sheet"
              style={{
                width: '1123px',
                minHeight: '794px',
                transform: a4Scale < 1 ? `scale(${a4Scale})` : undefined,
                transformOrigin: 'top center',
                backgroundColor: '#ffffff',
              }}
              className="printable-sheet bg-white text-black font-sans border-[2.5px] border-black rounded-none pt-8 pb-5 px-5 sm:pt-9 sm:pb-6 sm:px-6 shadow-xl ring-1 ring-black/5 flex flex-col justify-start shrink-0 box-border print:transform-none print:w-full print:border-[2px] print:shadow-none print:p-4"
            >
              <div className="space-y-1.5">
                {/* ─── 1. Header & Title Banner (Compact, Less Area) ─── */}
                <div className="text-center space-y-0.5">
                  <h1 className="text-lg sm:text-[20px] font-black tracking-tight leading-tight uppercase font-sans">
                    <span className="text-black">ENGLISH</span>
                    <span className="text-red-600">JIBI</span>{' '}
                    <span className="text-black">CLASSES</span>
                  </h1>
                  <div className="text-center">
                    <span className="inline-block px-3 py-0.5 rounded-full border border-black text-[9.5px] font-bold uppercase tracking-wider bg-gray-50 text-black leading-tight">
                      Monthly Examination Marks Entry Sheet — {MONTH_NAMES[month] || month}{' '}
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
                      Group {activeSheetData.group?.id}
                    </strong>{' '}
                    {activeSheetData.group?.class && (
                      <span>({activeSheetData.group?.class})</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-700 font-bold">CATEGORY:</span>{' '}
                    <strong className="text-black">{activeSheetData.group?.category}</strong>
                  </div>
                  <div>
                    <span className="text-gray-700 font-bold">TIMING:</span>{' '}
                    <strong className="text-black">{activeSheetData.group?.timing || '—'}</strong>
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

                {/* ─── 4. Marks Table (Exactly 25 Fixed Rows with increased row height: h-[27px]) ─── */}
                <div className="border border-black overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-gray-100 border-b border-black text-[11px] font-bold">
                      <tr>
                        <th className="p-1.5 font-bold text-black border-r border-black w-16 text-center">
                          ID
                        </th>
                        <th className="p-1.5 font-bold text-black border-r border-black w-[210px]">
                          Student Name
                        </th>
                        <th className="p-1.5 font-bold text-black border-r border-black w-12 text-center">
                          Class
                        </th>
                        <th className="p-1.5 font-bold text-black border-r border-black w-[75px]">
                          School
                        </th>

                        {/* Subject Header Columns without "Max: ___" */}
                        {activeSheetData.subjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="p-1.5 font-bold text-black border-r border-black text-center"
                          >
                            <div className="truncate leading-tight">{sub.name}</div>
                          </th>
                        ))}

                        <th className="p-1.5 font-bold text-black border-r border-black w-16 text-center">
                          <div className="leading-tight">Total</div>
                        </th>
                        <th className="p-1.5 font-bold text-black w-[105px] text-center">
                          Teacher Notes
                        </th>
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
                            <td className="p-1 text-center font-mono font-bold text-black border-r border-gray-300 w-16">
                              {formattedId}
                            </td>
                            <td className="p-1 font-semibold text-black border-r border-gray-300 w-[210px] truncate">
                              {student ? student.name : <span className="opacity-0 select-none">-</span>}
                            </td>
                            <td className="p-1 text-center text-gray-800 border-r border-gray-300 w-12 truncate">
                              {student ? student.class || '—' : <span className="opacity-0 select-none">-</span>}
                            </td>
                            <td
                              className="p-1 text-gray-800 border-r border-gray-300 w-[75px] truncate"
                              title={student?.school || ''}
                            >
                              {student ? student.school || '—' : <span className="opacity-0 select-none">-</span>}
                            </td>

                            {/* Completely blank subject and total entry cells with identical cell baseline */}
                            {activeSheetData.subjects.map((sub) => (
                              <td
                                key={sub.id}
                                className="p-1 text-center border-r border-gray-300"
                              >
                                <span className="opacity-0 select-none">-</span>
                              </td>
                            ))}

                            <td className="p-1 text-center border-r border-gray-300 w-16">
                              <span className="opacity-0 select-none">-</span>
                            </td>
                            <td className="p-1 text-center w-[105px]">
                              <span className="opacity-0 select-none">-</span>
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

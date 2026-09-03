import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchBlankSheet, type BlankSheetData } from '@/lib/reports-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import type { Group } from '@/lib/constants';
import { MONTH_NAMES, MONTH_CODES } from '@/lib/constants';
import {
  Printer,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
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

  // Multi-group selector modal
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [tempSelectedGroupIds, setTempSelectedGroupIds] = useState<string[]>([]);

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

  // Group selector modes: "all" vs specific group
  const handleGroupSelectChange = (val: string) => {
    if (val === 'all') {
      setSelectedGroupIds(groups.map((g) => g.id));
      setPreviewGroupIndex(0);
      setPreviewPageIndex(0);
    } else {
      setSelectedGroupIds([val]);
      setPreviewGroupIndex(0);
      setPreviewPageIndex(0);
    }
  };

  const openMultiSelectDialog = () => {
    setTempSelectedGroupIds([...selectedGroupIds]);
    setIsMultiSelectOpen(true);
  };

  const toggleGroupInTemp = (gId: string) => {
    setTempSelectedGroupIds((prev) =>
      prev.includes(gId) ? prev.filter((id) => id !== gId) : [...prev, gId]
    );
  };

  const handleApplyMultiSelect = () => {
    if (tempSelectedGroupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }
    setSelectedGroupIds(tempSelectedGroupIds);
    setPreviewGroupIndex(0);
    setPreviewPageIndex(0);
    setIsMultiSelectOpen(false);
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

  // Determine current dropdown value
  const isAllGroupsSelected =
    groups.length > 0 && selectedGroupIds.length === groups.length;
  const isSingleGroupSelected = selectedGroupIds.length === 1;
  const dropdownValue = isAllGroupsSelected
    ? 'all'
    : isSingleGroupSelected
    ? selectedGroupIds[0]
    : 'custom';

  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 w-full">
      {/* ─── TOP STREAMLINED RESPONSIVE TOOLBAR ─── */}
      <div className="no-print space-y-3.5 border-b pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Offline Blank Marks Entry Sheet
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              A4 Landscape printable sheets with 25 fixed rows per page for classroom marks entry
            </p>
          </div>

          {/* Action Buttons (Print & Download) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Print Button (Hidden on phone screens, visible on sm and up) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={selectedGroupIds.length === 0 || loading || isPrinting}
              className="hidden sm:inline-flex h-8 gap-1.5 px-2.5 sm:px-3 text-xs font-semibold shadow-2xs cursor-pointer hover:bg-muted rounded-md"
              title="Print exact A4 Landscape marks sheet"
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
              disabled={selectedGroupIds.length === 0 || loading || isDownloading}
              className="h-8 gap-1.5 px-2.5 sm:px-3.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer rounded-md"
              title="Download A4 Landscape PDF for selected groups"
            >
              {isDownloading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>
                {isDownloading
                  ? 'Downloading...'
                  : selectedGroupIds.length > 1
                  ? `Download (${selectedGroupIds.length} Groups)`
                  : 'Download'}
              </span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Academic Year */}
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="w-[125px] sm:w-[135px] text-xs h-8 bg-card shadow-2xs">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month */}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px] sm:w-[130px] text-xs h-8 bg-card shadow-2xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_CODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {MONTH_NAMES[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group Selector */}
          <Select value={dropdownValue} onValueChange={handleGroupSelectChange}>
            <SelectTrigger className="w-[180px] sm:w-[230px] text-xs h-8 bg-card shadow-2xs">
              <SelectValue placeholder="Select Group">
                {isAllGroupsSelected
                  ? `All Groups (${groups.length})`
                  : isSingleGroupSelected
                  ? `Group ${selectedGroupIds[0]} — ${
                      groups.find((g) => g.id === selectedGroupIds[0])?.class || ''
                    }`
                  : `${selectedGroupIds.length} Groups Selected`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">
                All Groups ({groups.length} Groups)
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">
                  Group {g.id} — {g.class} ({g.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Multi-Group Select Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openMultiSelectDialog}
            className="h-8 px-2 sm:px-2.5 gap-1.5 text-xs shadow-2xs cursor-pointer hover:bg-muted"
            title="Choose specific groups"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Select Specific Groups</span>
            {selectedGroupIds.length > 0 && !isAllGroupsSelected && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                {selectedGroupIds.length}
              </Badge>
            )}
          </Button>

          {/* Preview Navigation Switcher (When Multiple Groups or Multiple Pages) */}
          <div className="ml-auto flex items-center gap-2">
            {selectedGroupIds.length > 1 && (
              <div className="flex items-center border rounded-md overflow-hidden bg-background shadow-2xs h-8">
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
                  <span className="hidden md:inline ml-0.5">Prev Group</span>
                </Button>
                <span className="text-[11px] font-semibold text-muted-foreground px-2 border-x leading-8 whitespace-nowrap">
                  Group {activeGroupId} ({previewGroupIndex + 1} / {selectedGroupIds.length})
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
                  <span className="hidden md:inline mr-0.5">Next Group</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {totalPagesForActiveGroup > 1 && (
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
                  Page {previewPageIndex + 1} / {totalPagesForActiveGroup}
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
        </div>
      </div>

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
        <div className="w-full flex flex-col items-center">
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
              className="printable-sheet bg-white text-black font-sans border-[2.5px] border-black rounded-none p-5 sm:p-6 shadow-md flex flex-col justify-start shrink-0 box-border print:transform-none print:w-full print:border-[2px] print:shadow-none print:p-4"
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
                    <tbody className="divide-y divide-gray-200">
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
                            className={`h-[27px] text-[11px] ${
                              r % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
                            }`}
                          >
                            <td className="p-1 text-center font-mono font-bold text-black border-r border-gray-300 w-16">
                              {formattedId}
                            </td>
                            <td className="p-1 font-semibold text-black border-r border-gray-300 w-[210px] truncate">
                              {student ? student.name : ''}
                            </td>
                            <td className="p-1 text-center text-gray-800 border-r border-gray-300 w-12 truncate">
                              {student ? student.class || '—' : ''}
                            </td>
                            <td
                              className="p-1 text-gray-800 border-r border-gray-300 w-[75px] truncate"
                              title={student?.school || ''}
                            >
                              {student ? student.school || '—' : ''}
                            </td>

                            {/* Completely blank subject and total entry cells as requested */}
                            {activeSheetData.subjects.map((sub) => (
                              <td
                                key={sub.id}
                                className="p-1 text-center border-r border-gray-300"
                              />
                            ))}

                            <td className="p-1 text-center border-r border-gray-300 w-18" />
                            <td className="p-1 text-center w-[110px]" />
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

      {/* ─── MULTI-GROUP SELECTION DIALOG ─── */}
      <Dialog open={isMultiSelectOpen} onOpenChange={setIsMultiSelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Groups to Include</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {tempSelectedGroupIds.length} of {groups.length} groups selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setTempSelectedGroupIds(groups.map((g) => g.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground"
                  onClick={() => setTempSelectedGroupIds([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border rounded-lg">
              {groups.map((g) => {
                const isChecked = tempSelectedGroupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroupInTemp(g.id)}
                    className={`flex items-center justify-between p-2.5 rounded-md border text-left cursor-pointer transition-colors text-xs ${
                      isChecked
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-border hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold">Group {g.id}</div>
                      <div className="text-[10.5px] text-muted-foreground truncate">
                        {g.class} ({g.category})
                      </div>
                    </div>
                    {isChecked && <Check className="h-4 w-4 text-primary shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMultiSelectOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyMultiSelect}
              className="text-xs"
              disabled={tempSelectedGroupIds.length === 0}
            >
              Apply ({tempSelectedGroupIds.length} Groups)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

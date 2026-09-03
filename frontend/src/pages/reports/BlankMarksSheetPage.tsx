import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchBlankSheet, type BlankSheetData } from '@/lib/reports-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import type { Group } from '@/lib/constants';
import { MONTH_NAMES, MONTH_CODES } from '@/lib/constants';
import logoUrl from '@/assets/logo.png';
import { Printer, FileText, GraduationCap, Users } from 'lucide-react';

export default function BlankMarksSheetPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [month, setMonth] = useState<string>('SEP');
  const [sheetData, setSheetData] = useState<BlankSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load groups & settings on mount
  useEffect(() => {
    async function init() {
      try {
        const [settings, groupsList] = await Promise.all([fetchSettings(), fetchGroups()]);
        if (settings.academicYear) {
          setAcademicYear(settings.academicYear);
        }
        setGroups(groupsList);
        if (groupsList.length > 0) {
          setSelectedGroupId(groupsList[0].id);
        }
      } catch (err) {
        console.error('Failed to init blank sheet:', err);
      }
    }
    init();
  }, []);

  // Load blank sheet data when selected group changes
  const loadSheet = useCallback(async (gId: string) => {
    if (!gId) return;
    setLoading(true);
    try {
      const data = await fetchBlankSheet(gId);
      setSheetData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load blank sheet data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadSheet(selectedGroupId);
    }
  }, [selectedGroupId, loadSheet]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });

  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
      {/* Top Controls Bar (Hidden in Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Offline Blank Marks Entry Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and print blank examination mark sheets for offline classroom evaluation
            </p>
          </div>

          <Button
            onClick={() => window.print()}
            disabled={!sheetData || sheetData.students.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Blank Sheet
          </Button>
        </div>

        {/* Filter / Selector Bar */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Academic Year */}
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="flex-1 sm:w-[150px] text-xs sm:text-sm h-9 bg-card">
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

          {/* Month */}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="flex-1 sm:w-[150px] text-xs sm:text-sm h-9 bg-card">
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

          {/* Group */}
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="flex-1 sm:w-[240px] text-xs sm:text-sm h-9 bg-card">
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  Group {g.id} — {g.class} ({g.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sheet Display Area */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : !sheetData ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Please select a group to generate the offline marks sheet.</p>
        </Card>
      ) : (
        /* Printable Sheet Paper Layout */
        <div className="printable-sheet bg-white text-black font-sans border-[2px] border-black rounded-lg p-5 sm:p-7 shadow-sm space-y-4">
          {/* Header Block with Logo & Official Branding */}
          <div className="flex items-center gap-4 pb-2">
            <div className="shrink-0 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="EnglishJibi"
                className="h-16 w-16 sm:h-18 sm:w-18 object-contain rounded-full border border-gray-300 shadow-xs"
              />
            </div>

            <div className="flex-1 text-center pr-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase font-sans">
                <span className="text-black">ENGLISH</span>
                <span className="text-red-600">JIBI</span>{' '}
                <span className="text-black">CLASSES</span>
              </h1>
              <p className="text-xs italic font-semibold text-gray-800 tracking-wide">
                Your Child, Our Responsibility
              </p>
              <p className="text-[11px] text-gray-700 font-medium">
                {sheetData.settings.address || 'Duplex - 37, In front of DAV School, Sailashree Vihar, BBSR.'}
              </p>
              <div className="text-[10px] font-semibold text-sky-800 pt-0.5">
                {sheetData.settings.instagram || '@englishwithchiranjibisir'} · Tel: {sheetData.settings.phone1 || '+91 83289 22917'} / {sheetData.settings.phone2 || '+91 7735812335'}
              </div>
            </div>
          </div>

          {/* Red Separator Line */}
          <div className="h-1 bg-red-600 w-full" />

          <div className="text-center pt-0.5 pb-1">
            <span className="inline-block px-4 py-0.5 rounded-full border border-black text-xs font-black uppercase tracking-wider bg-gray-50 text-black">
              Monthly Examination Marks Entry Sheet — {MONTH_NAMES[month] || month} {academicYear}
            </span>
          </div>

          {/* Group & Batch Meta */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 rounded-sm bg-gray-50 text-xs font-bold border border-black text-black">
            <div>
              <span>BATCH / GROUP:</span>{' '}
              <strong className="font-mono">Group {sheetData.group?.id}</strong>{' '}
              <span>({sheetData.group?.class})</span>
            </div>
            <div>
              <span>CATEGORY:</span>{' '}
              <strong>{sheetData.group?.category}</strong>
            </div>
            <div>
              <span>TIMING:</span>{' '}
              <strong>{sheetData.group?.timing || '—'}</strong>
            </div>
            <div>
              <span>ENROLLED:</span>{' '}
              <strong>{sheetData.students.length} Students</strong>
            </div>
          </div>

          {/* Marks Table */}
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/80 border-b">
                <tr>
                  <th className="p-2.5 font-bold text-muted-foreground border-r w-12 text-center">#</th>
                  <th className="p-2.5 font-bold text-muted-foreground border-r w-16 text-center">ID</th>
                  <th className="p-2.5 font-bold text-muted-foreground border-r min-w-[160px]">Student Name</th>
                  <th className="p-2.5 font-bold text-muted-foreground border-r w-20">Class</th>
                  <th className="p-2.5 font-bold text-muted-foreground border-r min-w-[120px]">School</th>

                  {/* Subject Header Columns (Spacious width for Grammar, Creative, Passage, Vocabulary, Literature, etc.) */}
                  {sheetData.subjects.map((sub) => (
                    <th
                      key={sub.id}
                      className="p-2.5 font-bold text-muted-foreground border-r min-w-[120px] sm:min-w-[135px] text-center"
                    >
                      <div className="text-foreground font-bold">{sub.name}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">Max: ___</div>
                    </th>
                  ))}

                  <th className="p-2.5 font-bold text-muted-foreground border-r min-w-[80px] text-center">Total</th>
                  <th className="p-2.5 font-bold text-muted-foreground min-w-[110px] text-center">Teacher Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sheetData.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + sheetData.subjects.length}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No active students found in this group.
                    </td>
                  </tr>
                ) : (
                  sheetData.students.map((student, idx) => (
                    <tr key={student.id} className="h-10">
                      <td className="p-2 text-center font-mono font-medium text-muted-foreground border-r">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-mono font-bold text-foreground border-r">{student.id}</td>
                      <td className="p-2 font-semibold text-foreground border-r">{student.name}</td>
                      <td className="p-2 text-muted-foreground border-r">{student.class || '—'}</td>
                      <td className="p-2 text-muted-foreground border-r">{student.school || '—'}</td>

                      {/* Blank Subject Cells */}
                      {sheetData.subjects.map((sub) => (
                        <td key={sub.id} className="p-2 text-center border-r">
                          <div className="w-16 h-6 border-b border-dashed mx-auto" />
                        </td>
                      ))}

                      <td className="p-2 text-center border-r">
                        <div className="w-12 h-6 border-b border-dashed mx-auto" />
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-full h-6 border-b border-dashed" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Teacher Signature Footer */}
          <div className="pt-8 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div>Date of Examination: _______________</div>
            <div>Evaluator's Signature: _______________________</div>
          </div>
        </div>
      )}
    </div>
  );
}

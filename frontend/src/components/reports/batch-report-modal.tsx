import { useState, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Download,
  Loader2,
  FolderArchive,
} from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { buildStudentReportCardDoc } from '@/lib/pdf';
import { fetchAllStudentReports, fetchStudentReport, type SingleStudentReportData } from '@/lib/reports-api';
import type { Student, Group } from '@/lib/constants';

interface BatchReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  groups: Group[];
}

// Academic session month sequence (April to March)
const ACADEMIC_MONTHS = [
  'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'
] as const;

interface MonthOption {
  id: number;
  monthCode: string;
  monthName: string;
  year: number;
  label: string; // e.g. "September - 2026"
  badge: string;
  isCurrent: boolean;
}

export function BatchReportModal({
  open,
  onOpenChange,
  students,
  groups,
}: BatchReportModalProps) {
  // Dynamically compute the 3 Month Options from current date (Current to 2 previous months)
  const monthOptions: MonthOption[] = useMemo(() => {
    const now = new Date();
    const options: MonthOption[] = [];

    const badgeLabels = [
      'Current Month',
      'Previous Month',
      '2 Months Prior',
    ];

    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mFull = d.toLocaleString('en-US', { month: 'long' });
      const mShort = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const yr = d.getFullYear();
      const label = `${mFull} - ${yr}`;

      options.push({
        id: i,
        monthCode: mShort,
        monthName: mFull,
        year: yr,
        label,
        badge: badgeLabels[i],
        isCurrent: i === 0,
      });
    }

    return options;
  }, []);

  // Selected cutoff month option
  const [selectedOptionId, setSelectedOptionId] = useState<number>(0);

  // Generation & Download State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const isCancelledRef = useRef(false);

  // Target students is all students
  const targetStudents = students;

  const handleStartBatchDownload = async (optionToUse?: MonthOption) => {
    if (targetStudents.length === 0) {
      toast.error('No students found to download');
      return;
    }

    const chosenOption =
      optionToUse ||
      monthOptions.find((o) => o.id === selectedOptionId) ||
      monthOptions[0];

    const cutoffMonthCode = chosenOption.monthCode;
    const isCurrentFull = chosenOption.isCurrent;
    const cutoffIndex = ACADEMIC_MONTHS.indexOf(cutoffMonthCode as any);

    setIsProcessing(true);
    setProgressPercent(5);
    setStatusMessage('Fetching student data...');
    setProcessedCount(0);
    setTotalCount(targetStudents.length);
    isCancelledRef.current = false;

    try {
      // 1. Fetch report data (fast batch API first, fallback to individual fetches if needed)
      let studentReportsMap = new Map<string, SingleStudentReportData>();
      let commonSettings: Record<string, string> = {};

      try {
        const batchResponse = await fetchAllStudentReports();
        if (batchResponse && Array.isArray(batchResponse.reports) && batchResponse.reports.length > 0) {
          batchResponse.reports.forEach((item) => {
            studentReportsMap.set(item.student.id, item);
          });
          commonSettings = batchResponse.settings || {};
        }
      } catch (err) {
        console.warn('Batch fetch unavailable, falling back to individual fetch:', err);
      }

      // 2. Initialize ZIP archive
      const zip = new JSZip();

      // Helper to determine group folder name
      const getGroupFolderName = (groupId?: string | null, studentClass?: string) => {
        if (!groupId) return 'Unassigned';
        const grp = groups.find((g) => String(g.id) === String(groupId));
        const className = studentClass || grp?.class;
        return className ? `Group ${groupId} (Class ${className})` : `Group ${groupId}`;
      };

      // 3. Generate PDF for each student
      const total = targetStudents.length;

      for (let i = 0; i < total; i++) {
        if (isCancelledRef.current) {
          toast.info('Batch download cancelled');
          break;
        }

        const student = targetStudents[i];
        const sId = student.id;

        setStatusMessage(`Generating PDF (${i + 1}/${total}) — ${student.name || sId}`);
        setProcessedCount(i + 1);
        setProgressPercent(Math.round(10 + ((i + 1) / total) * 75));

        // Get report data for this student
        let reportData = studentReportsMap.get(sId);
        if (!reportData) {
          try {
            const single = await fetchStudentReport(sId);
            reportData = {
              student: single.student,
              results: single.results,
            };
            if (!commonSettings || Object.keys(commonSettings).length === 0) {
              commonSettings = single.settings;
            }
          } catch (e) {
            console.error(`Failed to load report for student ${sId}:`, e);
          }
        }

        // Prepare student object matching PDF builder requirements
        const studentForDoc = {
          id: student.id,
          name: student.name,
          category: student.category,
          class: student.class,
          school: student.school,
          group_id: student.group || (student as any).group_id || '',
          adm_date: student.admDate || (student as any).adm_date || '',
          dob: student.dob,
          contact_no: student.contactNo || (student as any).contact_no,
          father_no: student.fatherNo || (student as any).father_no,
          mother_no: student.motherNo || (student as any).mother_no,
        };

        // Filter results based on chosen cutoff month
        const rawResults = reportData?.results || [];
        const filteredResults = isCurrentFull
          ? rawResults
          : rawResults.filter((r) => {
              const mCode = r.month?.toUpperCase();
              const idx = ACADEMIC_MONTHS.indexOf(mCode as any);
              return idx !== -1 && cutoffIndex !== -1 ? idx <= cutoffIndex : true;
            });

        // Generate official vector A4 PDF doc
        const academicSession = commonSettings?.academicYear || '2026-27';
        const doc = await buildStudentReportCardDoc({
          student: studentForDoc,
          results: filteredResults,
          settings: commonSettings,
          academicSession,
        });

        // Convert to Blob
        const pdfBlob = doc.output('blob');

        // Clean filename: [ID]-[Name]-[MONTH].pdf
        const cleanId = (student.id || 'Student').trim().replace(/[/\\?%*:|"<>]/g, '');
        const cleanName = (student.name || 'Report').trim().replace(/[/\\?%*:|"<>]/g, '');
        const monthDisplay = chosenOption.monthName.toUpperCase();
        const fileName = `${cleanId}-${cleanName}-${monthDisplay}.pdf`;

        // Segregate into Group Folder
        const groupFolder = getGroupFolderName(
          student.group || (student as any).group_id,
          student.class
        );

        zip.folder(groupFolder)?.file(fileName, pdfBlob);

        // Yield to main thread briefly every 4 items to keep browser UI responsive
        if (i % 4 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      if (isCancelledRef.current) {
        setIsProcessing(false);
        return;
      }

      // 4. Compress & Package ZIP
      setStatusMessage('Creating ZIP archive...');
      setProgressPercent(90);

      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setProgressPercent(Math.round(90 + (metadata.percent / 100) * 8));
        }
      );

      // 5. Trigger browser download
      const cleanMonth = chosenOption.monthName.replace(/\s+/g, '_');
      const zipFileName = `Student_Reports_${cleanMonth}_${chosenOption.year}.zip`;

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setProgressPercent(100);
      setStatusMessage('Download complete!');
      toast.success(`Downloaded ${total} report cards in ${zipFileName}!`);

      // Close modal after brief completion feedback
      setTimeout(() => {
        setIsProcessing(false);
        onOpenChange(false);
      }, 900);
    } catch (error) {
      console.error('Batch download failed:', error);
      toast.error('Failed to generate batch reports ZIP');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isProcessing) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!isProcessing}
        className="max-w-[calc(100vw-2rem)] sm:max-w-md h-[345px] sm:h-[350px] p-5 sm:p-6 overflow-hidden flex flex-col justify-between"
      >
        {isProcessing ? (
          /* ONLY LOADER VIEW: Locked Fixed Height, Widened Elements, Premium UI/UX */
          <div className="flex-1 h-full w-full flex flex-col items-center justify-center text-center space-y-3.5 py-1 animate-in fade-in duration-150">
            {/* Enlarged Spinner */}
            <div className="relative flex items-center justify-center">
              <div className="size-18 sm:size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <Loader2 className="size-9 sm:size-10 animate-spin text-primary stroke-[2.4]" />
              </div>
            </div>

            {/* Title & Animated Status Pill */}
            <div className="space-y-1.5 w-full max-w-[360px] sm:max-w-[390px] px-2 flex flex-col items-center">
              <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight">
                Generating Report Cards
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-mono text-muted-foreground max-w-full truncate shadow-2xs">
                <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="truncate">{statusMessage || 'Processing...'}</span>
              </div>
            </div>

            {/* Widened Sleek Progress Bar Track */}
            <div className="w-full max-w-[360px] sm:max-w-[390px] space-y-2 px-1">
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border/50 shadow-inner">
                <div
                  className="h-full bg-primary transition-all duration-200 rounded-full shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono font-medium px-0.5">
                <span>{totalCount > 0 ? `${processedCount} / ${totalCount} students` : 'Preparing...'}</span>
                <span className="font-bold text-primary text-xs">{progressPercent}%</span>
              </div>
            </div>

            {/* Styled Cancel Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                isCancelledRef.current = true;
                setIsProcessing(false);
              }}
              disabled={progressPercent >= 90}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground h-8 px-4 mt-0.5 rounded-lg border-border/70 hover:bg-muted cursor-pointer transition-all"
            >
              Cancel
            </Button>
          </div>
        ) : (
          /* SELECTION VIEW: Minimal, Clean, Responsive UI/UX */
          <>
            <DialogHeader className="space-y-1 text-left pr-6 sm:pr-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 sm:size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <FolderArchive className="size-4 sm:size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-foreground truncate">
                    Download Report Cards (ZIP)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    Select evaluation cutoff month to export
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* 3 Month Options */}
            <div className="space-y-2 pt-1">
              {monthOptions.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99]
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/40 shadow-2xs'
                          : 'border-border/80 bg-card hover:bg-accent/40 hover:border-border'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                        {opt.label}
                      </span>
                    </div>

                    <Badge
                      variant={isSelected ? 'default' : 'secondary'}
                      className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 shrink-0"
                    >
                      {opt.badge}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="border-t pt-3.5 sm:pt-4 mt-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs h-9 sm:h-9 order-2 sm:order-1 cursor-pointer"
              >
                Close
              </Button>

              <Button
                type="button"
                onClick={() => handleStartBatchDownload()}
                disabled={targetStudents.length === 0}
                className="w-full sm:w-auto gap-2 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow-xs order-1 sm:order-2 cursor-pointer active:scale-95 transition-all px-3.5"
              >
                <Download className="size-3.5 shrink-0" />
                <span>Download All ({targetStudents.length})</span>
                <span className="text-[10px] font-mono font-bold bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded leading-none shrink-0">
                  ZIP
                </span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

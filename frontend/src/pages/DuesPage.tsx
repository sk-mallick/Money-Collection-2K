import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDues, useSettings } from '@/hooks/useStudents';
import { DuesPageLoading } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ButtonGroup } from '@/components/ui/button-group';
import { MONTH_CODES, MONTH_NAMES, formatCurrency, getCurrentMonthCode } from '@/lib/constants';
import type { MonthCode } from '@/lib/constants';
import { AlertTriangle, Users, IndianRupee, Calendar, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { 
  FeeReminderModal, 
  renderNoticeBanner, 
  getHeaderImage, 
  getCachedHeaderImage,
  buildFeeReminderMessage
} from '@/components/dues/FeeReminderModal';

function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z" />
      <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z" />
    </svg>
  );
}

// Convert base64 dataURL to Blob synchronously
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export default function DuesPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<MonthCode>(getCurrentMonthCode());
  const { dues, loading } = useDues(selectedMonth);
  const [reminderStudent, setReminderStudent] = useState<(typeof dues)[number] | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Preload announcement header graphic for instant share rendering
  useEffect(() => {
    getHeaderImage();
  }, []);

  const handleOpenReminder = (student: (typeof dues)[number]) => {
    setReminderStudent(student);
    setReminderOpen(true);
  };

  const handleDirectWhatsAppShare = async (student: (typeof dues)[number]) => {
    const selectedMonthName = MONTH_NAMES[selectedMonth] || selectedMonth;
    const instituteName = settings.instituteName || 'ENGLISHJIBI CLASSES';
    const academicYear = settings.academicYear || '2026-27';

    const message = buildFeeReminderMessage({
      student,
      instituteName,
      selectedMonth,
      academicYear,
      lastReceipt: null,
    });

    // Generate notice banner image synchronously
    let imageBlob: Blob | null = null;
    let imageFile: File | null = null;
    try {
      const canvas = document.createElement('canvas');
      const headerImg = getCachedHeaderImage();
      renderNoticeBanner(canvas, {
        student,
        instituteName,
        phone1: settings.phone1 || '',
        phone2: settings.phone2 || '',
        selectedMonthName,
        selectedMonth,
        academicYear,
        lastReceipt: null,
        headerImg,
      });

      const dataUrl = canvas.toDataURL('image/png');
      imageBlob = dataUrlToBlob(dataUrl);
      imageFile = new File(
        [imageBlob],
        `Fee_Reminder_${student.id}_${student.name.replace(/\s+/g, '_')}.png`,
        { type: 'image/png' }
      );
    } catch (e) {
      console.warn('Notice banner generation failed:', e);
    }

    // 1. Copy BOTH Image and Text to clipboard first so it's always ready in clipboard
    if (imageBlob && navigator.clipboard && window.ClipboardItem) {
      try {
        const textBlob = new Blob([message], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': imageBlob,
            'text/plain': textBlob,
          }),
        ]);
      } catch {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': imageBlob }),
          ]);
        } catch {
          // ignore
        }
      }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        // ignore
      }
    }

    // 2. On Mobile (Android / iOS): Use Web Share API Level 2 to share both image and text directly into WhatsApp!
    if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          text: message,
          title: 'Fee Reminder Notice',
        });
        toast.success('Notice shared with image and text!');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('Mobile Web Share failed, falling back:', err);
      }
    }

    // 3. Fallback: Open WhatsApp Share (manual picker) with text pre-filled and image ready in clipboard
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = waUrl;
    }

    toast.success('Opening WhatsApp share!', {
      description: 'Notice image & text are copied — in WhatsApp, select chat and press Paste to attach notice image!',
      duration: 5000,
    });
  };

  const totalOutstanding = dues.reduce((sum, d) => sum + d.outstandingDue, 0);

  if (loading) return <DuesPageLoading />;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6 w-full">
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Dues List</h1>
          <Badge className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-full shrink-0 font-bold bg-red-600 text-white dark:bg-red-500 border-none shadow-sm">
            {dues.length}
          </Badge>
        </div>
        <div className="shrink-0">
          <Select value={selectedMonth} onValueChange={v => setSelectedMonth(v as MonthCode)}>
            <SelectTrigger className="w-[140px] h-9 text-xs sm:text-sm font-medium bg-card/50 border hover:bg-accent/50 transition-colors">
              <Calendar className="mr-2 size-4 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="mt-1">
              {MONTH_CODES.map(month => (
                <SelectItem key={month} value={month}>{MONTH_NAMES[month]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="shadow-xs border bg-card/45 backdrop-blur-md py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2.5 px-3 sm:px-3.5">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase truncate">Total Defaulters</CardTitle>
            <Users className="size-3.5 text-muted-foreground/70 shrink-0" />
          </CardHeader>
          <CardContent className="p-2.5 px-3 sm:px-3.5 pt-0">
            <p className="text-lg sm:text-xl font-bold tracking-tight">{dues.length}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">for {MONTH_NAMES[selectedMonth]}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs border bg-card/45 backdrop-blur-md py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2.5 px-3 sm:px-3.5">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase truncate">Total Outstanding</CardTitle>
            <IndianRupee className="size-3.5 text-muted-foreground/70 shrink-0" />
          </CardHeader>
          <CardContent className="p-2.5 px-3 sm:px-3.5 pt-0">
            <p className="text-lg sm:text-xl font-bold tracking-tight truncate">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">unpaid fees this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Dues Table */}
      {dues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <AlertTriangle className="size-6 text-emerald-500" />
          </div>
          <p className="text-lg font-medium">All Clear!</p>
          <p className="text-sm text-muted-foreground">Every student has paid for {MONTH_NAMES[selectedMonth]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List View */}
          <div className="block sm:hidden space-y-2">
            {dues.map(student => (
              <Card key={student.id} className="overflow-hidden border bg-card/45 backdrop-blur-md transition-all duration-300 hover:bg-card/70 py-0 gap-0 rounded-xl">
                <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
                  {/* Student Info Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-semibold text-sm text-foreground leading-none truncate">{student.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap leading-none">
                      <Badge className={student.category === 'Junior' ? 'font-mono font-bold text-[9px] px-1.5 py-0.5 leading-tight bg-blue-600 text-white dark:bg-blue-500 border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'font-mono font-bold text-[9px] px-1.5 py-0.5 leading-tight bg-red-600 text-white dark:bg-red-500 border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                        {student.id}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-medium text-muted-foreground">{student.pendingMonths} month{student.pendingMonths > 1 ? 's' : ''} due (₹{student.outstandingDue} due)</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-semibold text-foreground">Fee: {formatCurrency(student.feePerMonth)}/m</span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <ButtonGroup>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="size-9 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all shadow-2xs" 
                            onClick={() => handleDirectWhatsAppShare(student)}
                            title="Share fee reminder on WhatsApp"
                          >
                            <WhatsAppIcon className="size-4.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share on WhatsApp</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="size-9 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-95 transition-transform" 
                            onClick={() => navigate(`/mcms/collect?studentId=${student.id}`)}
                          >
                            <IndianRupee className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Collect Fee</TooltipContent>
                      </Tooltip>
                    </ButtonGroup>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Fee/Month</TableHead>
                    <TableHead className="hidden sm:table-cell font-semibold">Dues</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dues.map(student => (
                    <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">{student.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{student.category}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={student.category === 'Junior' ? 'bg-blue-600 text-white dark:bg-blue-500 text-xs font-bold border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'bg-red-600 text-white dark:bg-red-500 text-xs font-bold border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                          {student.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(student.feePerMonth)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs font-bold border-none bg-red-600 text-white dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 transition-colors">
                            {student.pendingMonths} month{student.pendingMonths > 1 ? 's' : ''}
                          </Badge>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(student.outstandingDue)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ButtonGroup>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 active:scale-95 transition-transform" 
                                  onClick={() => handleOpenReminder(student)}
                                >
                                  <BellRing className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Notice & Reminder</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" 
                                  onClick={() => navigate(`/mcms/collect?studentId=${student.id}`)}
                                >
                                  <IndianRupee className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Collect Fee</TooltipContent>
                            </Tooltip>
                          </ButtonGroup>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Fee Reminder Modal */}
      <FeeReminderModal
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        student={reminderStudent}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}

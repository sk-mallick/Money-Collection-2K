import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Share2, 
  ExternalLink, 
  RotateCcw, 
  Sparkles,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fetchStudentReceipts } from '@/lib/api';
import { useSettings, getAdmAcademicIndex } from '@/hooks/useStudents';
import { MONTH_NAMES, MONTH_CODES, MONTH_SHORT, formatCurrency, formatDate } from '@/lib/constants';
import type { Student, Receipt, Payment, MonthCode } from '@/lib/constants';
import noticeHeaderUrl from '@/assets/important-notice-header.jpg';

export type DueStudent = Student & {
  pendingMonths: number;
  outstandingDue: number;
  payments?: Payment[];
};

interface FeeReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: DueStudent | null;
  selectedMonth: MonthCode;
}

export function computeQuarterlyReminderDetails(
  student: DueStudent,
  lastReceipt: Receipt | null,
  selectedMonth: MonthCode,
  academicYear: string = '2026-27'
) {
  let lastPaidCodes: string[] = [];
  let lastPaidDate = '';

  if (lastReceipt && lastReceipt.months && lastReceipt.months.length > 0) {
    lastPaidCodes = [...lastReceipt.months].sort(
      (a, b) => MONTH_CODES.indexOf(a as MonthCode) - MONTH_CODES.indexOf(b as MonthCode)
    );
    lastPaidDate = lastReceipt.generatedOn;
  } else if (student.payments && student.payments.length > 0) {
    const paidPayments = student.payments.filter(
      (p) => p.paid && (p.amount === 0 || p.amount >= student.feePerMonth)
    );
    if (paidPayments.length > 0) {
      const sortedByMonth = [...paidPayments].sort(
        (a, b) => MONTH_CODES.indexOf(a.month as MonthCode) - MONTH_CODES.indexOf(b.month as MonthCode)
      );
      const dates = sortedByMonth.map((p) => p.date).filter(Boolean).sort();
      const latestDate = dates.length > 0 ? dates[dates.length - 1] : '';
      const latestBatch = latestDate
        ? sortedByMonth.filter((p) => p.date === latestDate)
        : sortedByMonth.slice(-3);
      lastPaidCodes = latestBatch.map((p) => p.month);
      lastPaidDate = latestDate;
    }
  }

  const allPaidCodes: string[] = [];
  if (lastReceipt && lastReceipt.months && lastReceipt.months.length > 0) {
    allPaidCodes.push(...lastReceipt.months);
  }
  if (student.payments && student.payments.length > 0) {
    student.payments
      .filter((p) => p.paid && (p.amount === 0 || p.amount >= student.feePerMonth))
      .forEach((p) => {
        if (!allPaidCodes.includes(p.month)) allPaidCodes.push(p.month);
      });
  }

  let nextStartIdx = 0;
  if (allPaidCodes.length > 0) {
    const validIndices = allPaidCodes
      .map((m) => MONTH_CODES.indexOf(m as MonthCode))
      .filter((i) => i >= 0);
    const maxPaidIdx = validIndices.length > 0 ? Math.max(...validIndices) : 0;
    nextStartIdx = (maxPaidIdx + 1) % 12;
  } else {
    const admIdx = getAdmAcademicIndex(student.admDate, academicYear);
    nextStartIdx = admIdx >= 0 && admIdx < 12 ? admIdx : Math.max(0, MONTH_CODES.indexOf(selectedMonth));
  }

  const nextDueCodes = [0, 1, 2].map((offset) => MONTH_CODES[(nextStartIdx + offset) % 12]);

  const lastPaidMonthsStr =
    lastPaidCodes.length > 0
      ? lastPaidCodes.map((c) => MONTH_NAMES[c] || c).join(', ')
      : 'None (New Admission)';

  const lastPaidDateStr =
    lastPaidCodes.length > 0 && lastPaidDate
      ? formatDate(lastPaidDate)
      : 'N/A';

  const nextDueMonthsStr = nextDueCodes.map((c) => MONTH_NAMES[c] || c).join(', ');

  const bannerLastPaidLine1 =
    lastPaidCodes.length > 0
      ? `${lastPaidCodes.map((c) => MONTH_SHORT[c] || c).join(', ')} (${lastPaidCodes.length} Month${
          lastPaidCodes.length > 1 ? 's' : ''
        })`
      : 'None (New Admission)';

  const bannerLastPaidLine2 =
    lastPaidCodes.length > 0 && lastPaidDate
      ? `Paid on: ${formatDate(lastPaidDate)}`
      : 'No prior payment recorded';

  const bannerNextDueLine1 = `${nextDueCodes.map((c) => MONTH_SHORT[c] || c).join(', ')} (3 Months)`;

  return {
    lastPaidCodes,
    lastPaidDate,
    nextDueCodes,
    lastPaidMonthsStr,
    lastPaidDateStr,
    nextDueMonthsStr,
    bannerLastPaidLine1,
    bannerLastPaidLine2,
    bannerNextDueLine1,
  };
}

export function buildFeeReminderMessage(params: {
  student: DueStudent;
  instituteName: string;
  selectedMonth: MonthCode;
  academicYear?: string;
  lastReceipt?: Receipt | null;
}): string {
  const info = computeQuarterlyReminderDetails(
    params.student,
    params.lastReceipt || null,
    params.selectedMonth,
    params.academicYear || '2026-27'
  );

  return [
    `Dear parents,`,
    `Kindly pay the tuition fees for *${params.student.name}* as the next quarter is due.`,
    ``,
    `• *Last Paid:* ${info.lastPaidMonthsStr}`,
    `• *Paid Date:* ${info.lastPaidDateStr}`,
    `• *Next Due:* ${info.nextDueMonthsStr}`,
    ``,
    `Regards,`,
    `${params.instituteName.toUpperCase()}`,
  ].join('\n');
}

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

// Preload and cache header image
let cachedHeaderImage: HTMLImageElement | null = null;
export function getCachedHeaderImage(): HTMLImageElement | null {
  return (cachedHeaderImage && cachedHeaderImage.complete && cachedHeaderImage.naturalWidth > 0)
    ? cachedHeaderImage
    : null;
}
export function getHeaderImage(): Promise<HTMLImageElement> {
  if (cachedHeaderImage && cachedHeaderImage.complete && cachedHeaderImage.naturalWidth > 0) {
    return Promise.resolve(cachedHeaderImage);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = noticeHeaderUrl;
    img.onload = () => {
      cachedHeaderImage = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(img);
    };
  });
}

export function FeeReminderModal({
  open,
  onOpenChange,
  student,
  selectedMonth,
}: FeeReminderModalProps) {
  const { settings } = useSettings();
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [customText, setCustomText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [copiedType, setCopiedType] = useState<'image' | 'text' | 'all' | null>(null);
  const [headerImg, setHeaderImg] = useState<HTMLImageElement | null>(cachedHeaderImage);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const instituteName = settings.instituteName || 'ENGLISHJIBI CLASSES';
  const selectedMonthName = MONTH_NAMES[selectedMonth] || selectedMonth;

  // Preload announcement header graphic
  useEffect(() => {
    getHeaderImage().then((img) => {
      setHeaderImg(img);
    });
  }, []);

  // Build new quarterly message format
  const generateMessage = useCallback((receipt: Receipt | null) => {
    if (!student) return '';
    return buildFeeReminderMessage({
      student,
      instituteName,
      selectedMonth,
      academicYear: settings.academicYear || '2026-27',
      lastReceipt: receipt,
    });
  }, [student, instituteName, selectedMonth, settings.academicYear]);

  // Fetch receipts when opened
  useEffect(() => {
    if (!open || !student) {
      setLastReceipt(null);
      return;
    }

    let isMounted = true;
    fetchStudentReceipts(student.id)
      .then((receipts) => {
        if (!isMounted) return;
        if (receipts && receipts.length > 0) {
          const latest = receipts[0];
          setLastReceipt(latest);
          setCustomText(generateMessage(latest));
        } else {
          setLastReceipt(null);
          setCustomText(generateMessage(null));
        }
      })
      .catch(() => {
        if (isMounted) {
          setLastReceipt(null);
          setCustomText(generateMessage(null));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, student, generateMessage]);

  // Render Notice Banner Image onto Canvas
  useEffect(() => {
    if (!open || !student) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    renderNoticeBanner(canvas, {
      student,
      instituteName,
      phone1: settings.phone1 || '',
      phone2: settings.phone2 || '',
      selectedMonthName,
      selectedMonth,
      academicYear: settings.academicYear || '2026-27',
      lastReceipt,
      headerImg,
    });

    try {
      const dataUrl = canvas.toDataURL('image/png');
      setImageDataUrl(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) setImageBlob(blob);
      }, 'image/png');
    } catch (err) {
      console.error('Canvas export error:', err);
    }
  }, [open, student, lastReceipt, instituteName, settings.phone1, settings.phone2, selectedMonthName, headerImg]);

  // Download Notice Image Helper
  const handleDownloadImage = () => {
    if (!imageDataUrl || !student) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `Fee_Reminder_${student.id}_${student.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Image (PNG) directly to clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) {
      toast.error('Image preview is preparing, please retry in a moment');
      return;
    }

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopiedType('image');
        toast.success('Notice image copied to clipboard! Press Ctrl+V in WhatsApp to paste.', { duration: 3500 });
        setTimeout(() => setCopiedType(null), 2500);
      } else {
        handleDownloadImage();
        toast.info('Clipboard image copy not supported. Notice image downloaded.');
      }
    } catch {
      handleDownloadImage();
      toast.info('Browser clipboard image restriction. Image downloaded to device.');
    }
  };

  // Copy Message Text
  const handleCopyText = async () => {
    if (!customText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(customText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = customText;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedType('text');
      toast.success('Notice text copied to clipboard!');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      toast.error('Failed to copy text');
    }
  };

  // Copy All (Both Image + Text properly copied to clipboard)
  const handleCopyAll = async () => {
    if (!imageBlob || !customText) {
      toast.error('Notice preview is still preparing, please retry in a moment');
      return;
    }

    let copiedSuccessfully = false;

    // Prepare text and clean HTML representations (without giant base64 to avoid clipboard sanitizer errors)
    const textBlob = new Blob([customText], { type: 'text/plain' });
    const formattedHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a;">
        ${customText
          .split('\n')
          .map((line) => {
            if (!line.trim()) return '<br/>';
            const boldFormatted = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
            return `<div>${boldFormatted}</div>`;
          })
          .join('')}
      </div>
    `.trim();
    const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });

    // 1. Try multi-MIME write: image/png + text/plain + text/html
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': imageBlob,
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
        copiedSuccessfully = true;
      } catch (err1) {
        console.warn('Attempt 1 (image + text + html) failed:', err1);
        // 2. Try writing image/png + text/plain
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': imageBlob,
              'text/plain': textBlob,
            }),
          ]);
          copiedSuccessfully = true;
        } catch (err2) {
          console.warn('Attempt 2 (image + text) failed:', err2);
          // 3. Try writing image/png alone
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': imageBlob }),
            ]);
            copiedSuccessfully = true;
          } catch (err3) {
            console.warn('Attempt 3 (image only) failed:', err3);
          }
        }
      }
    }

    if (copiedSuccessfully) {
      setCopiedType('all');
      toast.success('Both Notice Image & Text copied to clipboard!', {
        description: 'Press Ctrl+V in WhatsApp, Word, or Chat to paste.',
        duration: 4500,
      });
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      // Fallback: write text to clipboard
      try {
        await navigator.clipboard.writeText(customText);
        setCopiedType('all');
        toast.success('Notice message text copied to clipboard!');
        setTimeout(() => setCopiedType(null), 2500);
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  // Share both Image and Text to WhatsApp
  const handleShareWhatsApp = async () => {
    if (!student || !customText) return;

    // 1. Always copy BOTH image & text to clipboard first so Ctrl+V is ready in WhatsApp Web
    const textBlob = new Blob([customText], { type: 'text/plain' });
    if (imageBlob && navigator.clipboard && window.ClipboardItem) {
      try {
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
    }

    // 2. On Mobile (Android / iOS): Use Web Share API Level 2 to share both image file and text caption directly into WhatsApp!
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && imageBlob && navigator.canShare) {
      try {
        const imageFile = new File(
          [imageBlob],
          `Fee_Reminder_${student.id}_${student.name.replace(/\s+/g, '_')}.png`,
          { type: 'image/png' }
        );

        if (navigator.canShare({ files: [imageFile] })) {
          await navigator.share({
            files: [imageFile],
            text: customText,
            title: 'Fee Reminder Notice',
          });
          toast.success('Notice shared with image and text!');
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('Native mobile share failed, falling back to WhatsApp Web:', err);
      }
    }

    // 3. Desktop / Web Fallback: Open WhatsApp with manual contact selection (?text=...)
    // Pre-filled text opens in chat, and since the notice image is copied to clipboard, pressing Ctrl+V attaches the image!
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    toast.success('Opening WhatsApp with message text!', {
      description: 'Notice image & text are copied — in WhatsApp, select parent and press Ctrl+V to attach notice image!',
      duration: 6000,
    });
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] sm:w-full max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-5 overflow-hidden gap-3 rounded-2xl shadow-2xl border bg-background/98">
        {/* Hidden Canvas for crisp rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <DialogHeader className="border-b pb-2.5 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-12 sm:pr-16">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-md bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 shrink-0">
                  <Sparkles className="size-3" />
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Fee Reminder Notice
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="font-semibold text-foreground">{student.name}</span> ({student.id}) • {student.pendingMonths} month{student.pendingMonths > 1 ? 's' : ''} due
              </DialogDescription>
            </div>
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-1 shadow-xs border-none shrink-0 whitespace-nowrap">
              {formatCurrency(student.outstandingDue)} Due
            </Badge>
          </div>
        </DialogHeader>

        {/* Modal Body: Compact WhatsApp Preview */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 pb-1">
          {/* Notice Image Preview (Direct image, no outer wrapper div) */}
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Important Notice Banner"
              className="w-full h-auto max-h-[280px] object-contain rounded-xl shadow-xs"
            />
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Rendering announcement banner...
            </div>
          )}

          {/* Short Text Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-0.5">
              <span>WhatsApp Message Draft</span>
              <button
                type="button"
                onClick={() => setCustomText(generateMessage(lastReceipt))}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                title="Reset message"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </div>

            <div className="rounded-xl border bg-card p-3 shadow-2xs">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={6}
                className="w-full resize-none bg-transparent text-xs font-sans text-foreground leading-relaxed focus:outline-none border-none p-0"
                placeholder="Message draft..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons: Distinct Copy Image, Copy Text, and WhatsApp Share */}
        <DialogFooter className="mt-2 sm:mt-3 pt-3.5 sm:pt-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            {/* Copy Image Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 text-xs font-medium shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 rounded-xl border border-input",
                copiedType === 'image'
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-600"
                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
              )}
              onClick={handleCopyImage}
              title="Copy Notice Image to clipboard"
            >
              {copiedType === 'image' ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Image Copied!</span>
                </>
              ) : (
                <>
                  <ImageIcon className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Copy Image</span>
                </>
              )}
            </Button>

            {/* Copy Text Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 text-xs font-medium shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 rounded-xl border border-input",
                copiedType === 'text'
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-600"
                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
              )}
              onClick={handleCopyText}
              title="Copy Message Text to clipboard"
            >
              {copiedType === 'text' ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Text Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Copy Text</span>
                </>
              )}
            </Button>
          </div>

          {/* Share to WhatsApp Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-full sm:w-auto h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 border-none flex items-center justify-center gap-1.5"
            onClick={handleShareWhatsApp}
          >
            <WhatsAppIcon className="size-4 shrink-0" />
            <span>WhatsApp</span>
            <ExternalLink className="size-3 ml-0.5 opacity-75 shrink-0" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Crisp Notice Banner Generator with Full Required Details ───────────────────────────
export function renderNoticeBanner(
  canvas: HTMLCanvasElement,
  data: {
    student: DueStudent;
    instituteName: string;
    phone1?: string;
    phone2?: string;
    selectedMonthName: string;
    selectedMonth?: MonthCode;
    academicYear?: string;
    lastReceipt: Receipt | null;
    headerImg: HTMLImageElement | null;
  }
) {
  const width = 1200;
  const height = 760;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Red Outer Frame Border
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  // ─── 1. Header Banner: High-Resolution Announcement Graphic ───
  if (data.headerImg && data.headerImg.complete && data.headerImg.naturalWidth > 0) {
    // Slicing complete announcement graphic with full height (megaphone + soundwaves + IMPORTANT NOTICE! + announcement subtitle)
    const sx = 20;
    const sy = 85;
    const sWidth = 1336;
    const sHeight = 465;
    ctx.drawImage(data.headerImg, sx, sy, sWidth, sHeight, 80, 10, 1040, 310);
  } else {
    // Elegant fallback banner
    const fallbackGrad = ctx.createLinearGradient(0, 0, width, 0);
    fallbackGrad.addColorStop(0, '#991B1B');
    fallbackGrad.addColorStop(0.5, '#DC2626');
    fallbackGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(35, 12, 1130, 300);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px Impact, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IMPORTANT NOTICE!', width / 2, 150);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('OFFICIAL TUITION FEE INTIMATION', width / 2, 200);
    ctx.textAlign = 'left';
  }

  // ─── 2. Institution Ribbon Bar (Y = 326, H = 48 -> ends at 374) ───
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(35, 326, width - 70, 48);

  ctx.fillStyle = '#FEF08A';
  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`TUITION FEE REMINDER  •  ${data.instituteName.toUpperCase()}`, width / 2, 357);
  ctx.textAlign = 'left';

  // ─── 3. Student Profile Card (Y = 390, H = 116 -> ends at 506, 16px gap) ───
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(35, 390, width - 70, 116, 12);
  ctx.fill();
  ctx.stroke();

  // Student Name (vertically balanced with right column)
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.student.name.toUpperCase(), 60, 436);

  // Badges: ID, Category, Class, School
  let badgeX = 60;
  const badges = [
    { label: `ID: ${data.student.id}`, bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    { label: `Category: ${data.student.category}`, bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    { label: `Class: ${data.student.class || 'N/A'}`, bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
    ...(data.student.school ? [{ label: `School: ${data.student.school}`, bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }] : []),
  ];

  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  badges.forEach((b) => {
    const textWidth = ctx.measureText(b.label).width;
    const pad = 12;
    ctx.fillStyle = b.bg;
    ctx.strokeStyle = b.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, 452, textWidth + pad * 2, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = b.text;
    ctx.fillText(b.label, badgeX + pad, 471);
    badgeX += textWidth + pad * 2 + 10;
  });

  // Right Side: Quarter reminder label (vertically centered in 390..506)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('NEXT QUARTER DUE', width - 60, 422);

  ctx.fillStyle = '#DC2626';
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.fillText('3 MONTHS', width - 60, 460);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Monthly Fee: ${formatCurrency(data.student.feePerMonth)}/m`, width - 60, 484);
  ctx.textAlign = 'left';

  // ─── 4. Last Paid & Next Due Info Grid (Y = 522, H = 96 -> ends at 618, 16px gap) ───
  const gridH = 96;
  const gridY = 522;
  const cardGap = 16;
  const halfW = (width - 70 - cardGap) / 2;

  const fallbackMonthCode = (data.selectedMonth ||
    (data.selectedMonthName.toUpperCase().substring(0, 3) as MonthCode)) as MonthCode;

  const qInfo = computeQuarterlyReminderDetails(
    data.student,
    data.lastReceipt,
    fallbackMonthCode,
    data.academicYear || '2026-27'
  );

  const twoCards = [
    {
      label: 'LAST PAYMENT RECEIVED',
      line1: qInfo.bannerLastPaidLine1,
      line2: qInfo.bannerLastPaidLine2,
      color: '#0284C7',
    },
    {
      label: 'NEXT DUE (3-MONTH QUARTER)',
      line1: qInfo.bannerNextDueLine1,
      line2: `Fee: ${formatCurrency(data.student.feePerMonth)}/m  •  Advance Cycle`,
      color: '#D97706',
    },
  ];

  twoCards.forEach((card, idx) => {
    const x = 35 + idx * (halfW + cardGap);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, gridY, halfW, gridH, 10);
    ctx.fill();
    ctx.stroke();

    // Color dot
    ctx.fillStyle = card.color;
    ctx.beginPath();
    ctx.arc(x + 24, gridY + 24, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(card.label, x + 36, gridY + 28);

    // Line 1 (months)
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText(card.line1, x + 20, gridY + 56);

    // Line 2 (date or fee)
    ctx.fillStyle = '#64748B';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(card.line2, x + 20, gridY + 78);
  });

  // ─── 5. Bottom Notice & Contact Strip (Y = 634, H = 90 -> ends at 724, 16px gap, 36px bottom margin) ───
  ctx.fillStyle = '#FEF2F2';
  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(35, 634, width - 70, 90, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('Kindly arrange for the clearance of pending fees at your earliest convenience.', 58, 672);
  ctx.fillStyle = '#7F1D1D';
  ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('If already paid, kindly ignore this notice or share the receipt with us.', 58, 696);

  // Contact info right aligned
  const phoneList = [data.phone1, data.phone2].filter(Boolean).join('  /  ');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(phoneList ? `📞 Contact: ${phoneList}` : data.instituteName, width - 58, 672);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.instituteName.toUpperCase(), width - 58, 696);
  ctx.textAlign = 'left';
}

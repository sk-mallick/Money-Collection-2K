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
import { useSettings } from '@/hooks/useStudents';
import { MONTH_NAMES, formatCurrency, formatDate } from '@/lib/constants';
import type { Student, Receipt, MonthCode } from '@/lib/constants';
import noticeHeaderUrl from '@/assets/important-notice-header.jpg';

interface FeeReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: (Student & { pendingMonths: number; outstandingDue: number }) | null;
  selectedMonth: MonthCode;
}

// Preload and cache header image
let cachedHeaderImage: HTMLImageElement | null = null;
function getHeaderImage(): Promise<HTMLImageElement> {
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

  // Short, professional, simple worded draft (no excessive context)
  const generateMessage = useCallback((receipt: Receipt | null) => {
    if (!student) return '';

    let lastPaymentStr = 'None';
    if (receipt) {
      const amt = formatCurrency(receipt.totalRecv || receipt.amtPaid);
      const date = formatDate(receipt.generatedOn);
      lastPaymentStr = `${amt} (${date})`;
    }

    const nextDueStr = receipt?.nextDue && receipt.nextDue !== 'N/A' && receipt.nextDue !== 'NONE'
      ? receipt.nextDue.toUpperCase()
      : selectedMonthName.toUpperCase();

    return [
      `Dear parents,`,
      `Kindly pay the tuition fees for *${student.name}* as the period of ${student.pendingMonths} month${student.pendingMonths > 1 ? 's' : ''} is pending.`,
      ``,
      `• *Total Due:* ${formatCurrency(student.outstandingDue)}`,
      `• *Last Payment:* ${lastPaymentStr}`,
      `• *Next Due:* ${nextDueStr}`,
      ``,
      `Regards,`,
      `*${instituteName.toUpperCase()}*`,
    ].join('\n');
  }, [student, instituteName, selectedMonthName]);

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
            <Share2 className="size-3.5 shrink-0" />
            <span>WhatsApp</span>
            <ExternalLink className="size-3 ml-0.5 opacity-75 shrink-0" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Crisp Notice Banner Generator with Full Required Details ───────────────────────────
function renderNoticeBanner(
  canvas: HTMLCanvasElement,
  data: {
    student: Student & { pendingMonths: number; outstandingDue: number };
    instituteName: string;
    phone1?: string;
    phone2?: string;
    selectedMonthName: string;
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

  // ─── 2. Institution Ribbon Bar (Y = 328) ───
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(35, 328, width - 70, 48);

  ctx.fillStyle = '#FEF08A';
  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`TUITION FEE REMINDER  •  ${data.instituteName.toUpperCase()}`, width / 2, 359);
  ctx.textAlign = 'left';

  // ─── 3. Student Profile & Dues Card (Y = 388) ───
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(35, 388, width - 70, 118, 12);
  ctx.fill();
  ctx.stroke();

  // Student Name
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.student.name.toUpperCase(), 60, 432);

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
    ctx.roundRect(badgeX, 450, textWidth + pad * 2, 26, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = b.text;
    ctx.fillText(b.label, badgeX + pad, 468);
    badgeX += textWidth + pad * 2 + 10;
  });

  // Right Side: Due Amount & Overdue Badge
  ctx.textAlign = 'right';
  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('TOTAL OUTSTANDING DUE', width - 60, 422);

  ctx.fillStyle = '#DC2626';
  ctx.font = '900 46px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatCurrency(data.student.outstandingDue), width - 60, 468);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${data.student.pendingMonths} Month(s) Pending   •   Monthly Fee: ${formatCurrency(data.student.feePerMonth)}/m`, width - 60, 492);
  ctx.textAlign = 'left';

  // ─── 4. Structured Payment & Due Detail Grid (Y = 518) ───
  const gridW = (width - 100) / 4; // 4 columns
  const gridH = 82;
  const gridY = 518;

  let lastPaymentText = 'No prior payment';
  if (data.lastReceipt) {
    const amt = formatCurrency(data.lastReceipt.totalRecv || data.lastReceipt.amtPaid);
    const date = formatDate(data.lastReceipt.generatedOn);
    lastPaymentText = `${amt} (${date})`;
  }
  const nextDueText = data.lastReceipt?.nextDue && data.lastReceipt.nextDue !== 'N/A' && data.lastReceipt.nextDue !== 'NONE'
    ? data.lastReceipt.nextDue.toUpperCase()
    : `${data.selectedMonthName.toUpperCase()} 2026`;

  const details = [
    { label: 'LAST PAYMENT', val: lastPaymentText, color: '#0284C7' },
    { label: 'NEXT DUE PERIOD', val: nextDueText, color: '#D97706' },
    { label: 'INTIMATION MONTH', val: `${data.selectedMonthName} 2026`, color: '#7C3AED' },
    { label: 'NOTICE DATE', val: formatDate(new Date().toISOString()), color: '#059669' },
  ];

  details.forEach((item, idx) => {
    const x = 35 + idx * (gridW + 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, gridY, gridW, gridH, 8);
    ctx.fill();
    ctx.stroke();

    // Color Indicator Dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x + 18, gridY + 24, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(item.label, x + 30, gridY + 28);

    // Value
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(item.val, x + 18, gridY + 58);
  });

  // ─── 5. Bottom Notice & Contact Strip (Y = 612) ───
  ctx.fillStyle = '#FEF2F2';
  ctx.strokeStyle = '#FECACA';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(35, 612, width - 70, 95, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#991B1B';
  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('Kindly arrange for the clearance of pending fees at your earliest convenience.', 55, 650);
  ctx.fillStyle = '#7F1D1D';
  ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('If already paid, kindly ignore this notice or share the receipt with us.', 55, 674);

  // Contact info right aligned
  const phoneList = [data.phone1, data.phone2].filter(Boolean).join('  /  ');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(phoneList ? `📞 Contact: ${phoneList}` : data.instituteName, width - 55, 652);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.instituteName.toUpperCase(), width - 55, 676);
  ctx.textAlign = 'left';
}

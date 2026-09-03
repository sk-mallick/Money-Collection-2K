import jsPDF from 'jspdf';
import type { Receipt, Payment } from './constants';
import { formatDate, MONTH_SHORT, formatReceiptPeriod, MONTH_NAMES, MONTH_CODES, formatMonthNamesWithBrackets, applyReceiptToPayments } from './constants';
import { fetchSettings } from './api';
import logoUrl from '@/assets/logo.png';

/**
 * Format currency for PDF (uses "Rs." prefix since jsPDF standard Helvetica font can't render the Unicode rupee symbol)
 */
export function pdfCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${formatted}`;
}

export interface FeeBreakdownRow {
  label: string;
  value: string;
  isHighlight?: boolean;
}

/**
 * Build a structured, professional fees breakdown for receipt PDF.
 * Only includes rows with non-zero amounts (e.g. Amount Paid, Admission Fee, Previous Dues, Remaining Balance).
 * The last row is always TOTAL RECEIVED.
 */
export function getReceiptFeesBreakdown(receipt: Receipt): FeeBreakdownRow[] {
  const rows: FeeBreakdownRow[] = [];

  // 1. Amount Paid (core payment amount for selected months)
  const amtPaid = receipt.amtPaid ?? 0;
  rows.push({
    label: 'Amount Paid',
    value: pdfCurrency(amtPaid),
  });

  // 2. Admission Fee (only if > 0)
  if (receipt.admissionFee && receipt.admissionFee > 0) {
    rows.push({
      label: 'Admission Fee',
      value: pdfCurrency(receipt.admissionFee),
    });
  }

  // 3. Previous Dues (only if > 0)
  if (receipt.prevDue && receipt.prevDue > 0) {
    rows.push({
      label: 'Previous Dues',
      value: pdfCurrency(receipt.prevDue),
    });
  }

  // 4. Remaining Balance (only if > 0)
  if (receipt.remainingAmount !== undefined && receipt.remainingAmount > 0) {
    rows.push({
      label: 'Remaining Balance',
      value: pdfCurrency(receipt.remainingAmount),
    });
  }

  // If only 1 item exists (e.g. Amount Paid), insert an empty row in between for balanced aesthetic proportion
  if (rows.length === 1) {
    rows.push({
      label: '',
      value: '',
    });
  }

  // 5. TOTAL RECEIVED (always last)
  rows.push({
    label: 'TOTAL RECEIVED',
    value: pdfCurrency(receipt.totalRecv),
    isHighlight: true,
  });

  return rows;
}

/**
 * Format the full date/time for the generation band
 */
function formatReceiptGeneratedTime(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const day = String(date.getDate()).padStart(2, '0');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year} at ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return isoStr;
  }
}

/**
 * Load an image URL and convert to Base64
 */
function loadImageBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
}

/**
 * Helper to check if a month is before admission date
 */
function isMonthNotJoined(admDateStr: string | undefined, monthCode: string): boolean {
  if (!admDateStr) return false;
  const admDate = new Date(admDateStr);
  const admYear = admDate.getFullYear();
  const admMonth = admDate.getMonth() + 1; // 1-indexed
  
  const MONTH_CALENDAR_MAP: Record<string, { calendarMonth: number }> = {
    MAR: { calendarMonth: 3 }, APR: { calendarMonth: 4 }, MAY: { calendarMonth: 5 },
    JUN: { calendarMonth: 6 }, JUL: { calendarMonth: 7 }, AUG: { calendarMonth: 8 },
    SEP: { calendarMonth: 9 }, OCT: { calendarMonth: 10 }, NOV: { calendarMonth: 11 },
    DEC: { calendarMonth: 12 }, JAN: { calendarMonth: 1 }, FEB: { calendarMonth: 2 },
  };
  
  const monthMeta = MONTH_CALENDAR_MAP[monthCode];
  if (!monthMeta) return false;
  
  const academicYearStart = admMonth >= 3 ? admYear : admYear - 1;
  const targetCalendarMonth = monthMeta.calendarMonth;
  const targetYear = (monthCode === 'JAN' || monthCode === 'FEB') ? academicYearStart + 1 : academicYearStart;
  
  const targetDate = new Date(targetYear, targetCalendarMonth - 1, 1);
  const comparisonAdmDate = new Date(admDate.getFullYear(), admDate.getMonth(), 1);
  
  return targetDate < comparisonAdmDate;
}

/**
 * Draw a rounded rectangle helper
 */
function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: 'F' | 'S' | 'FD' = 'F'
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}


/**
 * Generate a colorful, professional PDF receipt matching the old Excel design
 */
export async function generateReceiptPDF(receipt: Receipt, payments: Payment[] = []): Promise<void> {
  const settings = await fetchSettings();
  const doc = new jsPDF('p', 'mm', [210, 210]);
  
  // Apply this receipt to payments to get the updated payments state for the PDF render
  const updatedPayments = applyReceiptToPayments(payments, receipt, receipt.feePerMonth, receipt.admDate);
  
  const pageWidth = 210;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Tables should not connect/touch the outer card border (3mm padding)
  const leftColX = margin + 3; // 15mm
  const halfColWidth = 88; // 88mm
  const rightColX = leftColX + halfColWidth + 4; // 107mm
  
  // ─── Load Logo Image ──────────────────────────────────
  let logoBase64 = '';
  try {
    logoBase64 = await loadImageBase64(logoUrl);
  } catch (err) {
    console.error('Failed to load logo image, using fallback rendering', err);
  }

  // ─── Colors (Vibrant/Original matching Excel) ────────
  const redColor = [220, 38, 38] as [number, number, number];       // Separator Band, Money Receipt, Next Due header
  const blueColor = [0, 153, 224] as [number, number, number];      // Student Profile & Month Grid headers
  const greenColor = [0, 176, 80] as [number, number, number];     // Fees Details header
  const yellowColor = [255, 192, 0] as [number, number, number];    // Footer generation band
  const orangeColor = [217, 119, 6] as [number, number, number];    // N/A (Waiver) header/status
  const blackColor = [0, 0, 0] as [number, number, number];
  const whiteColor = [255, 255, 255] as [number, number, number];
  
  const borderLight = [0, 0, 0] as [number, number, number];        // Sharp black borders
  const borderDark = [0, 0, 0] as [number, number, number];
  
  const labelBgColor = [255, 242, 204] as [number, number, number]; // Light yellow/orange cell backgrounds (matching Excel)
  const highlightBgColor = [255, 242, 204] as [number, number, number]; // Light yellow box inner bg
  const highlightGreenBg = [240, 253, 250] as [number, number, number]; // Soft teal highlight for Total Received

  // ─── 1. HEADER SECTION ───────────────────────────────
  const logoSize = 26;
  const logoX = pageWidth - margin - logoSize - 4;
  const logoY = 14;
  const headerCenterX = leftColX + (logoX - leftColX) / 2;

  // Title / Institute Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  
  const rawTitle = (settings.instituteName || receipt.school || 'ENGLISHJIBI CLASSES').toUpperCase();
  if (rawTitle === 'ENGLISHJIBI CLASSES') {
    const part1 = "ENGLISH";
    const part2 = "JIBI";
    const part3 = " CLASSES";
    
    const w1 = doc.getTextWidth(part1);
    const w2 = doc.getTextWidth(part2);
    const w3 = doc.getTextWidth(part3);
    
    const totalWidth = w1 + w2 + w3;
    const titleStartX = headerCenterX - totalWidth / 2;
    
    doc.setTextColor(...blackColor);
    doc.text(part1, titleStartX, 24);
    
    doc.setTextColor(...redColor);
    doc.text(part2, titleStartX + w1, 24);
    
    doc.setTextColor(...blackColor);
    doc.text(part3, titleStartX + w1 + w2, 24);
  } else {
    doc.setTextColor(...blackColor);
    doc.text(rawTitle, headerCenterX, 24, { align: 'center' });
  }
  
  // Tagline
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.0);
  doc.setTextColor(80, 80, 80);
  doc.text('Your Child  Our Responsibility', headerCenterX, 29.5, { align: 'center' });
  
  // Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(...blackColor);
  const address = settings.address || 'Duplex - 37, In front of DAV School, Sailashree Vihar, BBSR.';
  doc.text(address, headerCenterX, 34, { align: 'center' });
  
  // Phone & Social
  const phone1 = settings.phone1 || '+91 8328922917';
  const phone2 = settings.phone2 || '+91 7735812335';
  const contactText = `Telegram: @englishwithchiranjibisir   |   Phone: ${phone1} / ${phone2}`;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(...blackColor);
  doc.text(contactText, headerCenterX, 39, { align: 'center' });

  // Draw Logo in Top-Right
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
  } else {
    // Draw circular fallback logo
    doc.setFillColor(10, 37, 83);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
    doc.setTextColor(...whiteColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('EJ', logoX + logoSize / 2, logoY + logoSize / 2 + 1.5, { align: 'center' });
  }

  // ─── 2. SEPARATOR BAND ───────────────────────────────
  doc.setFillColor(...redColor);
  doc.rect(margin, 44, contentWidth, 3.5, 'F');

  // ─── 3. "MONEY RECEIPT" LABEL ────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...redColor);
  doc.text('MONEY RECEIPT', pageWidth / 2, 56, { align: 'center' });

  // ─── 4. TWO-COLUMN LAYOUT (PROFILE & FEES) ───────────
  const topColumnsY = 60;

  // 4a. Left: Student's Profile
  doc.setFillColor(...blueColor);
  doc.setDrawColor(...borderDark);
  doc.setLineWidth(0.35);
  doc.rect(leftColX, topColumnsY, halfColWidth, 7.5, 'FD');
  
  doc.setFontSize(10.0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...whiteColor);
  doc.text("Student's Profile", leftColX + halfColWidth / 2, topColumnsY + 5.2, { align: 'center' });

  // Profile Table Grid
  const profileRowH = 5.6;
  const labelColW = 38;
  const valColW = halfColWidth - labelColW;
  
  const profileFields = [
    { label: 'STUDENT ID', value: receipt.studentId },
    { label: 'STUDENT NAME', value: receipt.studentName },
    { label: 'TUITION GROUP', value: receipt.category.toUpperCase() },
    { label: 'CLASS', value: receipt.class || '-' },
    { label: 'SCHOOL', value: receipt.school || '-' },
    { label: 'ADMISSION DATE', value: receipt.admDate ? formatDate(receipt.admDate) : '-' }
  ];

  profileFields.forEach((field, i) => {
    const rowY = topColumnsY + 7.5 + (i * profileRowH);
    
    // Draw cells
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    
    // Draw label cell bg
    doc.setFillColor(...labelBgColor);
    doc.rect(leftColX, rowY, labelColW, profileRowH, 'F');
    
    // Draw borders
    doc.rect(leftColX, rowY, labelColW, profileRowH, 'S');
    doc.rect(leftColX + labelColW, rowY, valColW, profileRowH, 'S');
    
    // Label Text (no colon, regular weight)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...blackColor);
    doc.text(field.label, leftColX + 3, rowY + 4.0);
    
    // Value Text (bold, size 9.0)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(...blackColor);
    doc.text(String(field.value), leftColX + labelColW + 3, rowY + 4.0);
  });

  // 4b. Right: Fees Details
  doc.setFillColor(...greenColor);
  doc.setDrawColor(...borderDark);
  doc.setLineWidth(0.35);
  doc.rect(rightColX, topColumnsY, halfColWidth, 7.5, 'FD');
  
  doc.setFontSize(10.0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...whiteColor);
  doc.text("Fees Details", rightColX + halfColWidth / 2, topColumnsY + 5.2, { align: 'center' });

  // Fees Details fields breakdown (only non-zero data rows + TOTAL RECEIVED)
  const feesFields = getReceiptFeesBreakdown(receipt);

  // Total height of Student's Profile table body = profileFields.length * profileRowH = 6 * 5.6 = 33.6mm
  const targetBodyH = 33.6;

  // Dynamically allocate height between Period header row and Fees data rows
  let periodH = 8.0;
  if (feesFields.length <= 2) {
    periodH = 8.6;
  } else if (feesFields.length === 3) {
    periodH = 8.1;
  } else if (feesFields.length === 4) {
    periodH = 8.0;
  } else {
    periodH = 7.6;
  }

  const feesRowH = (targetBodyH - periodH) / feesFields.length;

  // Period / Months Title row inside Fees Details
  const periodY = topColumnsY + 7.5;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.25);
  doc.rect(rightColX, periodY, halfColWidth, periodH, 'S');
  
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blackColor);
  const formattedPeriod = formatMonthNamesWithBrackets(formatReceiptPeriod(receipt));
  doc.text(formattedPeriod.toUpperCase(), rightColX + halfColWidth / 2, periodY + (periodH / 2) + 1.4, { align: 'center' });

  // Render Fees rows
  feesFields.forEach((field, i) => {
    const rowY = periodY + periodH + (i * feesRowH);
    
    // Set cell borders
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    
    const textOffsetY = (feesRowH / 2) + 1.2;

    if (field.isHighlight) {
      // Highlight background
      doc.setFillColor(...highlightGreenBg);
      doc.rect(rightColX, rowY, halfColWidth - 30, feesRowH, 'FD');
      doc.rect(rightColX + halfColWidth - 30, rowY, 30, feesRowH, 'FD');
      
      // Highlight text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(feesRowH >= 8.0 ? 10.0 : 9.5);
      doc.setTextColor(...greenColor);
      doc.text(field.label, rightColX + 2.5, rowY + textOffsetY);
      doc.text(field.value, rightColX + halfColWidth - 2.5, rowY + textOffsetY, { align: 'right' });
    } else {
      // Normal row
      doc.rect(rightColX, rowY, halfColWidth - 30, feesRowH, 'S');
      doc.rect(rightColX + halfColWidth - 30, rowY, 30, feesRowH, 'S');
      
      // Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(feesRowH >= 8.0 ? 9.0 : 8.5);
      doc.setTextColor(...blackColor);
      doc.text(field.label, rightColX + 2.5, rowY + textOffsetY);
      
      // Value
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blackColor);
      doc.text(field.value, rightColX + halfColWidth - 2.5, rowY + textOffsetY, { align: 'right' });
    }
  });

  // ─── 5. BOTTOM SECTION (MONTH TABLE & NEXT DUE) ──────
  const bottomY = 106;

  // 5a. Left: Month / Status Table
  doc.setFillColor(...blueColor);
  doc.setDrawColor(...borderDark);
  doc.setLineWidth(0.35);
  
  // Draw two header columns instead of one merged box
  const monthRowH = 6.25;
  const monthColW = 38;
  const statusColW = halfColWidth - monthColW;
  
  doc.rect(leftColX, bottomY, monthColW, 7.5, 'FD');
  doc.rect(leftColX + monthColW, bottomY, statusColW, 7.5, 'FD');
  
  // Table header text
  doc.setFontSize(10.0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...whiteColor);
  doc.text("MONTH", leftColX + monthColW / 2, bottomY + 5.2, { align: 'center' });
  doc.text("STATUS", leftColX + monthColW + statusColW / 2, bottomY + 5.2, { align: 'center' });

  // Month Table Rows (12 months)
  MONTH_CODES.forEach((monthCode, i) => {
    const rowY = bottomY + 7.5 + (i * monthRowH);
    const monthName = MONTH_NAMES[monthCode].toUpperCase();
    
    // Determine status
    let statusText = '';
    let isDue = false;
    let isPaidText = false;
    let isNaText = false;
    let isWaiverText = false;

    const isNotJoinedYet = isMonthNotJoined(receipt.admDate, monthCode);
    if (isNotJoinedYet) {
      statusText = 'NOT JOINED';
      isNaText = true;
    } else {
      // Find month in payments
      const paymentRec = updatedPayments.find(p => p.month === monthCode);
      if (paymentRec && paymentRec.paid) {
        const amt = paymentRec.amount;
        if (amt >= receipt.feePerMonth) {
          statusText = 'PAID';
          isPaidText = true;
        } else if (amt > 0) {
          statusText = `Rs. ${receipt.feePerMonth - amt} DUE`;
          isDue = true;
        } else if (amt === 0) {
          statusText = 'N/A (WAIVER)';
          isWaiverText = true;
        }
      } else if (receipt.months.includes(monthCode)) {
        // If it's part of the current receipt months
        if (receipt.amtPaid === 0 && receipt.totalRecv === 0) {
          statusText = 'N/A (WAIVER)';
          isWaiverText = true;
        } else {
          const isPaidOff = receipt.remainingAmount === 0;
          if (isPaidOff) {
            statusText = 'PAID';
            isPaidText = true;
          } else {
            // If this specific month is partially paid
            statusText = receipt.remainingMonths?.includes(MONTH_SHORT[monthCode])
              ? `Rs. ${receipt.remainingAmount} DUE`
              : 'PAID';
            if (statusText.includes('DUE')) {
              isDue = true;
            } else {
              isPaidText = true;
            }
          }
        }
      }
    }

    // Set borders
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    doc.rect(leftColX, rowY, monthColW, monthRowH, 'S');
    doc.rect(leftColX + monthColW, rowY, statusColW, monthRowH, 'S');
    
    // Draw month name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(...blackColor);
    doc.text(monthName, leftColX + 4, rowY + 4.0);
    
    // Draw status with color
    doc.setFontSize(9.0);
    if (isPaidText) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor); // Vibrant green matching Excel
    } else if (isDue) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...redColor); // Vibrant red matching Excel
    } else if (isWaiverText) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...orangeColor); // Vibrant orange/amber for Waiver
    } else if (isNaText) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120); // Muted gray
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...blackColor);
    }
    
    doc.text(statusText, leftColX + monthColW + statusColW / 2, rowY + 4.0, { align: 'center' });
  });

  // 5b. Right: Next Payment Due By
  doc.setFillColor(...redColor);
  doc.setDrawColor(...borderDark);
  doc.setLineWidth(0.35);
  doc.rect(rightColX, bottomY, halfColWidth, 7.5, 'FD');
  
  doc.setFontSize(10.0);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...whiteColor);
  doc.text("NEXT PAYMENT DUE BY", rightColX + halfColWidth / 2, bottomY + 5.2, { align: 'center' });

  // Due Outer Body Box (encloses due highlight, notes, and signatures to match the left column height)
  const dueBoxY = bottomY + 7.5;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.25);
  doc.rect(rightColX, dueBoxY, halfColWidth, 75.0, 'S');
  
  // Highlight background inside due box (light yellow/orange matching Excel)
  doc.setFillColor(...highlightBgColor);
  doc.rect(rightColX + 4, dueBoxY + 4, halfColWidth - 8, 15, 'F');
  doc.setDrawColor(...redColor);
  doc.setLineWidth(0.35);
  doc.rect(rightColX + 4, dueBoxY + 4, halfColWidth - 8, 15, 'S');
  
  // Directly render the nextDue value inside the highlighted box
  doc.setFontSize(14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...redColor);
  const formattedNextDue = formatMonthNamesWithBrackets(receipt.nextDue || 'N/A');
  doc.text(formattedNextDue.toUpperCase(), rightColX + halfColWidth / 2, dueBoxY + 13.0, { align: 'center' });

  // Note guidelines
  const noteBoxY = dueBoxY + 23;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.0);
  doc.setTextColor(80, 80, 80);
  doc.text('Please pay the fees before the due date.', rightColX + 4, noteBoxY);
  doc.text('Keep this receipt for future reference.', rightColX + 4, noteBoxY + 4.0);
  doc.text('Fees once paid are non-refundable.', rightColX + 4, noteBoxY + 8.0);

  // 5c. Right Bottom: Signatures
  const sigY = dueBoxY + 54;
  doc.setLineWidth(0.25);
  doc.setDrawColor(...blackColor);
  
  // Teacher's Sign Line
  doc.line(rightColX + 4, sigY, rightColX + 39, sigY);
  // Parent's Sign Line
  doc.line(rightColX + halfColWidth - 39, sigY, rightColX + halfColWidth - 4, sigY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(...blackColor);
  doc.text('* CHIRANJIBI SIR *', rightColX + 21.5, sigY - 2.5, { align: 'center' });
  
  doc.text("Teacher's Sign", rightColX + 21.5, sigY + 3.5, { align: 'center' });
  doc.text("Parent's Sign", rightColX + halfColWidth - 21.5, sigY + 3.5, { align: 'center' });

  // Generation Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('This is a computer-generated receipt.', rightColX + halfColWidth / 2, sigY + 10.0, { align: 'center' });
  doc.text('No signature is required if not collected in person.', rightColX + halfColWidth / 2, sigY + 13.5, { align: 'center' });

  // ─── 6. OUTER CARD BORDER ───────────────────────────
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.65);
  doc.rect(margin, 12, contentWidth, 186.0, 'S');

  // ─── 7. FOOTER GENERATION BAND ──────────────────────
  const footerY = 190;
  doc.setFillColor(...yellowColor);
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.35);
  doc.rect(leftColX, footerY, 180, 5.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...blackColor);
  const genTimeText = `RECEIPT IS GENERATED ON : ${formatReceiptGeneratedTime(receipt.generatedOn)}`;
  doc.text(genTimeText, pageWidth / 2, footerY + 4.0, { align: 'center' });

  // ─── SAVE FILE ───────────────────────────────────────
  const firstMonth = MONTH_SHORT[receipt.months[0]] || receipt.months[0];
  const lastMonth = MONTH_SHORT[receipt.months[receipt.months.length - 1]] || receipt.months[receipt.months.length - 1];
  const safeName = receipt.studentName.replace(/\s+/g, '_');
  const fileName = `${receipt.studentId}-${safeName}-${firstMonth}-${lastMonth}.pdf`;

  doc.save(fileName);
}

export interface StudentReportPDFData {
  student: {
    id: string;
    name: string;
    category?: string;
    class?: string;
    school?: string;
    adm_date?: string;
    dob?: string;
    group_id?: string;
    father_no?: string;
    mother_no?: string;
    contact_no?: string;
  };
  results?: Array<{
    id: string | number;
    result_period_id: string | number;
    month: string;
    academic_year: string;
    status: string;
    total_obtained: number | string | null;
    total_max: number | string | null;
    percentage: number | string | null;
    class_rank?: number | string | null;
    marks?: Array<{
      subject_name: string;
      obtained_marks: number | null;
      max_marks: number;
      is_absent?: boolean | number;
    }>;
  }>;
  settings?: {
    instituteName?: string;
    address?: string;
    phone1?: string;
    phone2?: string;
    instagram?: string;
    teacherName?: string;
    adminName?: string;
  };
  academicSession?: string;
}

/**
 * Helper to convert inline SVG string to PNG Data URL via an offscreen canvas
 */
function createSvgIconDataUrl(svgContent: string, width: number = 48, height: number = 48): Promise<string> {
  return new Promise((resolve) => {
    try {
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Fallback vector send/telegram icon if image render is unavailable
 */
function drawFallbackSendIcon(doc: jsPDF, x: number, y: number, s: number = 3.2) {
  doc.setFillColor(14, 165, 233);
  doc.triangle(x, y + s, x + s, y + s * 0.45, x, y, 'F');
}

/**
 * Fallback vector phone icon if image render is unavailable
 */
function drawFallbackPhoneIcon(doc: jsPDF, x: number, y: number, s: number = 3.2) {
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, s * 0.75, s, 0.4, 0.4, 'S');
}

/**
 * Internal builder to generate the exact vector A4 Student Report Card jsPDF instance
 */
export async function buildStudentReportCardDoc(data: StudentReportPDFData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2; // 194mm

  // SVGs for Contact Icons matching the Preview UI
  const sendSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>`;
  const phoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  // Load logo & render contact icons in parallel
  const [logoBase64, sendIconBase64, phoneIconBase64] = await Promise.all([
    loadImageBase64(logoUrl).catch(() => ''),
    createSvgIconDataUrl(sendSvg),
    createSvgIconDataUrl(phoneSvg),
  ]);

  // Colors
  const blackColor: [number, number, number] = [0, 0, 0];
  const redColor: [number, number, number] = [220, 38, 38];
  const darkGray: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [243, 244, 246];
  const amberColor: [number, number, number] = [146, 64, 14];

  // Helper date formatter
  const formatDt = (dateStr?: string) => {
    if (!dateStr) return 'NIL';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${mNames[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatMk = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
  };

  const getGrd = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined) return '—';
    const num = Number(percentage);
    if (isNaN(num)) return '—';
    if (num >= 90) return 'A+';
    if (num >= 80) return 'A';
    if (num >= 70) return 'B+';
    if (num >= 60) return 'B';
    if (num >= 50) return 'C';
    if (num >= 40) return 'D';
    return 'E';
  };

  // ─── 1. HEADER SECTION ──────────────────────────────────
  const logoSize = 25;
  const logoX = margin + 3.5;
  const logoY = margin + 3.5; // 11.5mm
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
  }

  const headerCenterX = pageWidth / 2 + 6;

  // Title: "ENGLISHJIBI CLASSES"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  const part1 = "ENGLISH";
  const part2 = "JIBI";
  const part3 = " CLASSES";
  const w1 = doc.getTextWidth(part1);
  const w2 = doc.getTextWidth(part2);
  const w3 = doc.getTextWidth(part3);
  const totalW = w1 + w2 + w3;
  const titleX = headerCenterX - totalW / 2;

  doc.setTextColor(...blackColor);
  doc.text(part1, titleX, logoY + 6.8);
  doc.setTextColor(...redColor);
  doc.text(part2, titleX + w1, logoY + 6.8);
  doc.setTextColor(...blackColor);
  doc.text(part3, titleX + w1 + w2, logoY + 6.8);

  // Tagline
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text('Your Child, Our Responsibility', headerCenterX, logoY + 11.8, { align: 'center' });

  // Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 45);
  const addr = data.settings?.address || 'Duplex-37, In front of DAV School, Sailashree Vihar, Bhubaneswar';
  doc.text(addr, headerCenterX, logoY + 16.2, { align: 'center' });

  // Social & Phones Line with Icons & generous spacing
  const phone1 = data.settings?.phone1 || '+91 83289 22917';
  const phone2 = data.settings?.phone2 || '+91 7735812335';
  const phoneStr = `${phone1} / ${phone2}`;
  const insta = data.settings?.instagram || '@englishwithchiranjibisir';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  const iconW = 3.2;
  const iconH = 3.2;
  const iconTextSpacing = 1.6;
  const groupSpacing = 9; // generous spacing between Instagram and Phone

  const instaTextW = doc.getTextWidth(insta);
  const phoneTextW = doc.getTextWidth(phoneStr);

  const instaGroupW = iconW + iconTextSpacing + instaTextW;
  const phoneGroupW = iconW + iconTextSpacing + phoneTextW;
  const totalContactW = instaGroupW + groupSpacing + phoneGroupW;
  const contactStartX = headerCenterX - totalContactW / 2;
  const contactY = logoY + 21.0;

  // Render Instagram / Send group
  let curContactX = contactStartX;
  if (sendIconBase64) {
    doc.addImage(sendIconBase64, 'PNG', curContactX, contactY - 2.5, iconW, iconH);
  } else {
    drawFallbackSendIcon(doc, curContactX, contactY - 2.5, iconW);
  }
  curContactX += iconW + iconTextSpacing;
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text(insta, curContactX, contactY);
  curContactX += instaTextW + groupSpacing;

  // Render Phone group
  if (phoneIconBase64) {
    doc.addImage(phoneIconBase64, 'PNG', curContactX, contactY - 2.5, iconW, iconH);
  } else {
    drawFallbackPhoneIcon(doc, curContactX, contactY - 2.5, iconW);
  }
  curContactX += iconW + iconTextSpacing;
  doc.setTextColor(7, 89, 133); // sky-800
  doc.text(phoneStr, curContactX, contactY);

  // Red separator line
  const redLineY = 38.5;
  doc.setFillColor(...redColor);
  doc.rect(margin, redLineY, contentWidth, 1.2, 'F');

  // ─── 2. ACADEMIC SESSION & SUBTITLE ───────────────────────
  const sessionY = 45.0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...amberColor);
  doc.text(`ACADEMIC SESSION: ${data.academicSession || '2026-27'}`, pageWidth / 2, sessionY, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Official Annual Report Card', pageWidth / 2, sessionY + 4.5, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(...blackColor);
  doc.text("Student's Profile", pageWidth / 2, sessionY + 9.5, { align: 'center' });
  const profTitleW = doc.getTextWidth("Student's Profile");
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - profTitleW / 2, sessionY + 10.3, pageWidth / 2 + profTitleW / 2, sessionY + 10.3);

  // ─── 3. STUDENT PROFILE (2-Column Key-Value) ───────────────
  const profY = sessionY + 15; // 60.0mm
  const col1KeyX = margin + 4;
  const col1ValX = col1KeyX + 38;
  const col2KeyX = margin + 100;
  const col2ValX = col2KeyX + 36;
  const rowStep = 4.8; // Expanded row step for comfortable vertical rhythm

  const leftRows = [
    { key: 'STUDENT ID', val: data.student.id || 'NIL' },
    { key: 'STUDENT NAME', val: (data.student.name || 'NIL').toUpperCase() },
    { key: "FATHER'S CONTACT", val: data.student.father_no || 'NIL' },
    { key: "MOTHER'S CONTACT", val: data.student.mother_no || 'NIL' },
    { key: 'PERSONAL CONTACT', val: data.student.contact_no || 'NIL' },
  ];

  const rightRows = [
    { key: 'CLASS', val: data.student.class || 'NIL' },
    { key: 'SCHOOL', val: data.student.school || 'NIL' },
    { key: 'ADMISSION DATE', val: formatDt(data.student.adm_date) },
    { key: 'DATE OF BIRTH', val: formatDt(data.student.dob) },
    { key: 'TUITION GROUP', val: `Group ${data.student.group_id || 'NIL'}` },
  ];

  for (let i = 0; i < leftRows.length; i++) {
    const curY = profY + i * rowStep;
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...darkGray);
    doc.text(leftRows[i].key, col1KeyX, curY);
    doc.text(':', col1ValX - 2, curY);
    doc.setTextColor(...blackColor);
    doc.text(leftRows[i].val, col1ValX, curY);

    // Right column
    doc.setTextColor(...darkGray);
    doc.text(rightRows[i].key, col2KeyX, curY);
    doc.text(':', col2ValX - 2, curY);
    doc.setTextColor(...blackColor);
    doc.text(rightRows[i].val, col2ValX, curY);
  }

  // Subtle profile divider
  const profDividerY = profY + leftRows.length * rowStep + 1.5; // ~85.5mm
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.25);
  doc.line(margin + 4, profDividerY, margin + contentWidth - 4, profDividerY);

  // ─── 4. RESULT SUMMARY ──────────────────────────────────
  const summaryTitleY = profDividerY + 5.5; // ~91.0mm
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...amberColor);
  doc.text('RESULT SUMMARY', pageWidth / 2, summaryTitleY, { align: 'center' });
  const sumTitleW = doc.getTextWidth('RESULT SUMMARY');
  doc.setDrawColor(...amberColor);
  doc.line(pageWidth / 2 - sumTitleW / 2, summaryTitleY + 1.0, pageWidth / 2 + sumTitleW / 2, summaryTitleY + 1.0);

  // ─── 5. 12-MONTH RESULT MATRIX TABLE ─────────────────────
  const tableStartY = summaryTitleY + 4.5; // ~95.5mm
  const tableX = margin + 4;
  const tableW = contentWidth - 8; // 186mm
  const headerH = 7.0; // taller header
  const rowH = 7.2;    // taller rows for comfortable readability (total: 86.4mm)

  const subjects = ['OLYMPIAD', 'GRAMMAR', 'CREATIVE', 'PASSAGE', 'VOCABULARY'];
  const monthCodes = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
  const monthNamesMap: Record<string, string> = {
    APR: 'APRIL', MAY: 'MAY', JUN: 'JUNE', JUL: 'JULY', AUG: 'AUGUST',
    SEP: 'SEPTEMBER', OCT: 'OCTOBER', NOV: 'NOVEMBER', DEC: 'DECEMBER',
    JAN: 'JANUARY', FEB: 'FEBRUARY', MAR: 'MARCH'
  };

  // Column widths: Month (26), 5 Subjects (23 each = 115), Total (23), % (22) = 186mm
  const colWidths = [26, 23, 23, 23, 23, 23, 23, 22];
  const colHeaders = ['MONTH', ...subjects, 'TOTAL', '%'];

  // Draw Header Row
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.35);
  doc.rect(tableX, tableStartY, tableW, headerH, 'FD');

  let curColX = tableX;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...blackColor);

  for (let c = 0; c < colHeaders.length; c++) {
    const cw = colWidths[c];
    if (c > 0) {
      doc.line(curColX, tableStartY, curColX, tableStartY + headerH);
    }
    const centerCellX = curColX + cw / 2;
    doc.text(colHeaders[c], centerCellX, tableStartY + 4.8, { align: 'center' });
    curColX += cw;
  }

  // Draw 12 Month Rows
  const resultsList = data.results || [];
  const resultsByMonth = new Map<string, typeof resultsList[0]>();
  resultsList.forEach((r) => {
    resultsByMonth.set(r.month.toUpperCase(), r);
  });

  for (let m = 0; m < monthCodes.length; m++) {
    const mCode = monthCodes[m];
    const mName = monthNamesMap[mCode] || mCode;
    const rowY = tableStartY + headerH + m * rowH;
    const res = resultsByMonth.get(mCode);
    const isAbsent = res?.status === 'Absent';

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...blackColor);
    doc.setLineWidth(0.25);
    doc.rect(tableX, rowY, tableW, rowH, 'FD');

    // Build marks map
    const marksMap = new Map<string, { obt: number | null; max: number; isAbsent?: boolean }>();
    if (res && res.marks) {
      res.marks.forEach((mk) => {
        marksMap.set(mk.subject_name.toLowerCase(), {
          obt: mk.obtained_marks,
          max: mk.max_marks,
          isAbsent: Boolean(mk.is_absent),
        });
      });
    }

    let cellX = tableX;
    for (let c = 0; c < colWidths.length; c++) {
      const cw = colWidths[c];
      if (c > 0) {
        doc.line(cellX, rowY, cellX, rowY + rowH);
      }

      if (c === 0) {
        // Month name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...blackColor);
        doc.text(mName, cellX + 3, rowY + 4.9);
      } else if (c >= 1 && c <= 5) {
        // Subject marks
        const subName = subjects[c - 1];
        const mk = marksMap.get(subName.toLowerCase());
        if (res) {
          if (isAbsent || mk?.isAbsent) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...redColor);
            doc.text('A', cellX + cw / 2, rowY + 4.9, { align: 'center' });
          } else if (mk && mk.obt !== null) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...blackColor);
            doc.text(`${formatMk(mk.obt)}/${formatMk(mk.max)}`, cellX + cw / 2, rowY + 4.9, { align: 'center' });
          }
        }
      } else if (c === 6) {
        // Total
        if (res) {
          if (isAbsent) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...redColor);
            doc.text('ABSENT', cellX + cw / 2, rowY + 4.9, { align: 'center' });
          } else if (res.total_obtained !== null) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...blackColor);
            doc.text(`${formatMk(res.total_obtained)}/${formatMk(res.total_max)}`, cellX + cw / 2, rowY + 4.9, { align: 'center' });
          }
        }
      } else if (c === 7) {
        // Percentage
        if (res) {
          if (isAbsent) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...redColor);
            doc.text('ABS', cellX + cw / 2, rowY + 4.9, { align: 'center' });
          } else if (res.percentage !== null) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...blackColor);
            doc.text(`${Math.round(Number(res.percentage) || 0)}%`, cellX + cw / 2, rowY + 4.9, { align: 'center' });
          }
        }
      }

      cellX += cw;
    }
  }

  // ─── 6. SUMMARY STATS (3 KPI BOXES) ──────────────────────
  const tableBottomY = tableStartY + headerH + monthCodes.length * rowH; // ~188.9mm
  const kpiY = tableBottomY + 4.5; // ~193.4mm
  const kpiH = 13.5; // Tall, legible KPI boxes

  // Calculate stats
  const attendedResults = resultsList.filter((r) => r.status !== 'Absent' && r.total_obtained !== null);
  const attendedCount = attendedResults.length;
  const validScores = attendedResults.map((r) => Number(r.percentage)).filter((p) => !isNaN(p));
  const avgPct = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const grade = getGrd(avgPct);

  // Outer 3-box container
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.35);
  doc.rect(tableX, kpiY, tableW, kpiH, 'FD');

  const kpiColW = tableW / 3;
  // Box 1 Divider
  doc.line(tableX + kpiColW, kpiY, tableX + kpiColW, kpiY + kpiH);
  // Box 2 Divider
  doc.line(tableX + kpiColW * 2, kpiY, tableX + kpiColW * 2, kpiY + kpiH);

  // Box 1 Content
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 100, 100);
  doc.text('EXAMS ATTENDED', tableX + kpiColW / 2, kpiY + 4.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(...blackColor);
  doc.text(`${attendedCount} of 12 Months`, tableX + kpiColW / 2, kpiY + 10.0, { align: 'center' });

  // Box 2 Content
  doc.setFontSize(6.8);
  doc.setTextColor(100, 100, 100);
  doc.text('CUMULATIVE AVG', tableX + kpiColW + kpiColW / 2, kpiY + 4.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(...blackColor);
  doc.text(`${avgPct}%`, tableX + kpiColW + kpiColW / 2, kpiY + 10.0, { align: 'center' });

  // Box 3 Content
  doc.setFontSize(6.8);
  doc.setTextColor(100, 100, 100);
  doc.text('OVERALL GRADE', tableX + kpiColW * 2 + kpiColW / 2, kpiY + 4.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...redColor);
  doc.text(grade, tableX + kpiColW * 2 + kpiColW / 2, kpiY + 10.0, { align: 'center' });

  // ─── 7. FEEDBACK BOX ─────────────────────────────────────
  const fbY = kpiY + kpiH + 4.5; // ~211.4mm
  const fbH = 26; // Generous height for written feedback
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.35);
  doc.rect(tableX, fbY, tableW, fbH, 'FD');

  // Feedback tab header
  const tabW = 30;
  const tabH = 5.5;
  doc.setFillColor(249, 250, 251);
  doc.rect(tableX, fbY, tabW, tabH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...blackColor);
  doc.text('FEEDBACK', tableX + 3.5, fbY + 3.9);

  // ─── 8. SIGNATURES & DATES ───────────────────────────────
  const sigY = 265.0; // Anchored near bottom of A4 for balanced, professional proportions
  doc.setLineWidth(0.3);
  doc.setDrawColor(...blackColor);

  // Teacher signature line
  const teacherLineW = 58;
  const teacherLineX = tableX + 4;
  doc.line(teacherLineX, sigY, teacherLineX + teacherLineW, sigY);

  const teacherName = data.settings?.teacherName || data.settings?.adminName || 'CHIRANJIBI SIR';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...blackColor);
  doc.text(`* ${teacherName} *`, teacherLineX + 2, sigY - 2.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Teacher's Signature", teacherLineX + 2, sigY + 4.5);

  // Parent signature line
  const parentLineW = 58;
  const parentLineX = tableX + tableW - parentLineW - 4;
  doc.line(parentLineX, sigY, parentLineX + parentLineW, sigY);

  const todayStr = formatDt(new Date().toISOString());
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(todayStr, parentLineX + parentLineW - 2, sigY - 2.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Parent's Signature & Date", parentLineX + parentLineW - 2, sigY + 4.5, { align: 'right' });

  // ─── 9. OUTER A4 BORDER ──────────────────────────────────
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.65);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2, 'S');

  return doc;
}

/**
 * Generate official high-quality vector A4 Student Report Card PDF & trigger download
 */
export async function generateStudentReportCardPDF(data: StudentReportPDFData): Promise<void> {
  const doc = await buildStudentReportCardDoc(data);

  const resultsList = data.results || [];
  const attendedResults = resultsList.filter((r) => r.status !== 'Absent' && r.total_obtained !== null);
  const latestResult =
    attendedResults.length > 0
      ? attendedResults[attendedResults.length - 1]
      : resultsList.length > 0
      ? resultsList[resultsList.length - 1]
      : null;

  const monthCodes = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
  const monthNamesMap: Record<string, string> = {
    APR: 'APRIL', MAY: 'MAY', JUN: 'JUNE', JUL: 'JULY', AUG: 'AUGUST',
    SEP: 'SEPTEMBER', OCT: 'OCTOBER', NOV: 'NOVEMBER', DEC: 'DECEMBER',
    JAN: 'JANUARY', FEB: 'FEBRUARY', MAR: 'MARCH'
  };

  const monthCode = latestResult
    ? latestResult.month.toUpperCase()
    : new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const monthDisplay = monthNamesMap[monthCode] || monthCode;

  const cleanId = (data.student.id || 'Student').trim().replace(/[/\\?%*:|"<>]/g, '');
  const cleanName = (data.student.name || 'Report').trim().replace(/[/\\?%*:|"<>]/g, '');
  const fileName = `${cleanId}-${cleanName}-${monthDisplay}.pdf`;

  doc.save(fileName);
}

/**
 * Direct Print official vector A4 Student Report Card PDF:
 * Opens the exact vector PDF with autoPrint so the browser print dialog
 * renders the exact same output as the downloaded PDF.
 */
export async function printStudentReportCardPDF(
  data: StudentReportPDFData,
  targetWindow?: Window | null
): Promise<void> {
  const doc = await buildStudentReportCardDoc(data);
  doc.autoPrint();

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = blobUrl;
  } else {
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // Fallback: use an invisible iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.location.href = blobUrl;
          }
        }, 150);
      };
    }
  }
}

// ─── BLANK MARKS ENTRY SHEET (A4 LANDSCAPE MULTI-GROUP) ───────────────

export interface BlankMarksSheetStudent {
  id: string;
  name: string;
  class?: string;
  school?: string;
}

export interface BlankMarksSheetSubject {
  id: number | string;
  name: string;
  category?: string;
}

export interface BlankMarksSheetGroupItem {
  group: {
    id: string;
    class?: string;
    timing?: string;
    category?: string;
  };
  students: BlankMarksSheetStudent[];
  subjects: BlankMarksSheetSubject[];
}

export interface BlankMarksSheetPDFOptions {
  groupsData: BlankMarksSheetGroupItem[];
  month: string;
  academicYear: string;
  settings?: Record<string, string>;
}

/**
 * Builds an official A4 Landscape jsPDF document for Offline Blank Marks Entry Sheets.
 * Each selected group starts on a separate page.
 * Each page contains exactly 25 fixed rows.
 */
export async function buildBlankMarksSheetsDoc(options: BlankMarksSheetPDFOptions): Promise<jsPDF> {
  const { groupsData, month, academicYear, settings = {} } = options;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 7;
  const marginTop = 12; // 7mm base + 5mm (0.5cm) extra top margin for stapling
  const marginBottom = 6;
  const contentWidth = pageWidth - marginX * 2; // 283mm
  const contentHeight = pageHeight - marginTop - marginBottom; // 192mm

  // Asset loading (logo, send icon, phone icon)
  const sendSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;
  const phoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  const [logoBase64, sendIconUrl, phoneIconUrl] = await Promise.all([
    loadImageBase64(logoUrl).catch(() => ''),
    createSvgIconDataUrl(sendSvg),
    createSvgIconDataUrl(phoneSvg),
  ]);

  const blackColor: [number, number, number] = [0, 0, 0];
  const redColor: [number, number, number] = [220, 38, 38];
  const monthName = MONTH_NAMES[month] || month;

  let isFirstPageOfDoc = true;

  for (const groupItem of groupsData) {
    const { group, students, subjects } = groupItem;
    const prefix = (group.id || 'A').trim().toUpperCase();

    // Map students by numeric ID and string ID
    const studentMapByNumber = new Map<number, BlankMarksSheetStudent>();
    const studentMapById = new Map<string, BlankMarksSheetStudent>();
    let maxIdNum = 25;

    for (const s of students) {
      studentMapById.set(s.id.toUpperCase(), s);
      const match = s.id.match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (!isNaN(n)) {
          studentMapByNumber.set(n, s);
          if (n > maxIdNum) maxIdNum = n;
        }
      }
    }

    const totalStudents = students.length;
    const totalPagesForGroup = Math.max(1, Math.ceil(maxIdNum / 25));

    for (let pageIdx = 0; pageIdx < totalPagesForGroup; pageIdx++) {
      if (!isFirstPageOfDoc) {
        doc.addPage('a4', 'l');
      }
      isFirstPageOfDoc = false;

      // 1. Outer Border (Starts at Y=12mm for 0.5cm extra top stapling margin)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.rect(marginX, marginTop, contentWidth, contentHeight, 'S');

      // 2. Compact Streamlined Header Section
      const headerCenterX = pageWidth / 2;

      // Title: "ENGLISHJIBI CLASSES"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14.5);
      const part1 = 'ENGLISH';
      const part2 = 'JIBI';
      const part3 = ' CLASSES';
      const w1 = doc.getTextWidth(part1);
      const w2 = doc.getTextWidth(part2);
      const w3 = doc.getTextWidth(part3);
      const totalW = w1 + w2 + w3;
      const titleX = headerCenterX - totalW / 2;

      doc.setTextColor(...blackColor);
      doc.text(part1, titleX, marginTop + 4.8);
      doc.setTextColor(...redColor);
      doc.text(part2, titleX + w1, marginTop + 4.8);
      doc.setTextColor(...blackColor);
      doc.text(part3, titleX + w1 + w2, marginTop + 4.8);

      // Title Banner
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(0, 0, 0);
      const sheetTitle = `MONTHLY EXAMINATION MARKS ENTRY SHEET — ${monthName.toUpperCase()} ${academicYear}`;
      doc.text(sheetTitle, headerCenterX, marginTop + 8.4, { align: 'center' });

      // Red Divider
      doc.setFillColor(220, 38, 38);
      doc.rect(marginX + 1.5, marginTop + 10.3, contentWidth - 3, 0.7, 'F');

      // Group & Batch Meta Banner
      const metaY = marginTop + 12.3;
      const metaH = 5.0;
      const tableLeftX = marginX + 1.5;
      const tableWidth = contentWidth - 3; // 280mm
      doc.setFillColor(245, 246, 248);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(tableLeftX, metaY, tableWidth, metaH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const colSpacing = tableWidth / 5;
      doc.text(`BATCH: Group ${group.id} (${group.class || '—'})`, tableLeftX + 3, metaY + 3.5);
      doc.text(`CATEGORY: ${group.category || '—'}`, tableLeftX + colSpacing + 2, metaY + 3.5);
      doc.text(`TIMING: ${group.timing || '—'}`, tableLeftX + colSpacing * 2 + 2, metaY + 3.5);
      doc.text(`ENROLLED: ${totalStudents} Students`, tableLeftX + colSpacing * 3 + 2, metaY + 3.5);
      doc.text(`PAGE: ${pageIdx + 1} OF ${totalPagesForGroup}`, tableLeftX + colSpacing * 4 + 2, metaY + 3.5);

      // 3. Marks Table (Exactly 25 rows with row height: 6.65mm)
      const tableTopY = marginTop + 18.5; // Y = 30.5mm
      const headerH = 6.0;
      const rowH = 6.65; // 25 * 6.65 = 166.25mm, total table = 172.25mm (ends at 202.75mm inside 204mm border)

      // Column widths: Class & School reduced as requested to allocate max width to subjects
      const colIdW = 16;
      const colNameW = 56;
      const colClassW = 12; // reduced width (fits 'Class' and '6th'/'10th')
      const colSchoolW = 18; // reduced width (fits 'School' and school acronyms)
      const colTotalW = 16;
      const colNotesW = 24;

      const fixedWidths = colIdW + colNameW + colClassW + colSchoolW + colTotalW + colNotesW; // 142mm
      const remainingForSubjects = tableWidth - fixedWidths; // 138mm
      const numSubjects = subjects.length > 0 ? subjects.length : 5;
      const subColW = remainingForSubjects / numSubjects;

      interface ColDef {
        title: string;
        width: number;
        align: 'left' | 'center' | 'right';
      }

      const columns: ColDef[] = [
        { title: 'ID', width: colIdW, align: 'center' },
        { title: 'Student Name', width: colNameW, align: 'left' },
        { title: 'Class', width: colClassW, align: 'center' },
        { title: 'School', width: colSchoolW, align: 'left' },
      ];

      // Subjects header: NO "Max: ___" as requested
      for (const sub of subjects) {
        columns.push({
          title: sub.name,
          width: subColW,
          align: 'center',
        });
      }

      // Total header: NO "Max: ___" as requested
      columns.push({ title: 'Total', width: colTotalW, align: 'center' });
      columns.push({ title: 'Teacher Notes', width: colNotesW, align: 'center' });

      // Draw Header Row
      doc.setFillColor(235, 237, 240);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(tableLeftX, tableTopY, tableWidth, headerH, 'FD');

      let curColX = tableLeftX;
      for (const col of columns) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);

        const textX = col.align === 'center'
          ? curColX + col.width / 2
          : curColX + 2;

        doc.text(col.title, textX, tableTopY + 4.1, { align: col.align });

        // Column vertical border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(curColX + col.width, tableTopY, curColX + col.width, tableTopY + headerH);

        curColX += col.width;
      }

      // 25 Fixed Rows (Ordered ID 1 to 25; even if student absent, show ID and leave blank)
      for (let r = 0; r < 25; r++) {
        const curRowY = tableTopY + headerH + r * rowH;
        const serialNo = pageIdx * 25 + r + 1;
        const formattedId = `${prefix}${serialNo < 10 ? '0' + serialNo : serialNo}`;
        const student = studentMapById.get(formattedId) || studentMapByNumber.get(serialNo) || null;

        // Alternating subtle background tint
        if (r % 2 === 1) {
          doc.setFillColor(250, 250, 252);
          doc.rect(tableLeftX, curRowY, tableWidth, rowH, 'F');
        }

        // Row border
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.line(tableLeftX, curRowY + rowH, tableLeftX + tableWidth, curRowY + rowH);

        let cellX = tableLeftX;
        for (let c = 0; c < columns.length; c++) {
          const col = columns[c];

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0, 0, 0);

          if (c === 0) {
            // ID in order 1..25 (always written even if student does not exist)
            doc.setFont('courier', 'bold');
            doc.text(formattedId, cellX + col.width / 2, curRowY + 4.4, { align: 'center' });
          } else if (c === 1) {
            // Student Name (blank if not enrolled)
            if (student) {
              doc.setFont('helvetica', 'bold');
              doc.text(student.name, cellX + 2, curRowY + 4.4);
            }
          } else if (c === 2) {
            // Class (blank if not enrolled)
            if (student) {
              doc.text(student.class || '—', cellX + col.width / 2, curRowY + 4.4, { align: 'center' });
            }
          } else if (c === 3) {
            // School (blank if not enrolled)
            if (student) {
              const sch = student.school || '—';
              const maxW = col.width - 2.5;
              const schText = doc.getTextWidth(sch) > maxW ? sch.slice(0, 9) + '..' : sch;
              doc.text(schText, cellX + 1.5, curRowY + 4.4);
            }
          }
          // Note: Subject, Total, and Teacher Notes cells are kept completely blank as requested

          // Vertical column line
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(cellX + col.width, curRowY, cellX + col.width, curRowY + rowH);

          cellX += col.width;
        }
      }

      // Outer table border outline
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(tableLeftX, tableTopY, tableWidth, headerH + 25 * rowH, 'S');
    }
  }

  return doc;
}

/**
 * Generates and downloads the official A4 Landscape Blank Marks Sheets PDF for all selected groups.
 */
export async function generateBlankMarksSheetPDF(options: BlankMarksSheetPDFOptions): Promise<void> {
  const doc = await buildBlankMarksSheetsDoc(options);
  const { groupsData, month, academicYear } = options;
  const fileName = groupsData.length === 1
    ? `Group_${groupsData[0].group.id}_${month}_${academicYear}_Blank_Marks_Sheet.pdf`
    : `Selected_Groups_${month}_${academicYear}_Blank_Marks_Sheet.pdf`;
  doc.save(fileName);
}

/**
 * Direct Print official vector A4 Landscape Blank Marks Sheet PDF.
 */
export async function printBlankMarksSheetPDF(
  options: BlankMarksSheetPDFOptions,
  targetWindow?: Window | null
): Promise<void> {
  const doc = await buildBlankMarksSheetsDoc(options);
  doc.autoPrint();

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = blobUrl;
  } else {
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.location.href = blobUrl;
          }
        }, 150);
      };
    }
  }
}
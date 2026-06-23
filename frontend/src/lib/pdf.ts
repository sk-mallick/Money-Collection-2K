import jsPDF from 'jspdf';
import type { Receipt, Payment } from './constants';
import { formatDate, MONTH_SHORT, formatReceiptPeriod, MONTH_NAMES, MONTH_CODES, formatMonthNamesWithBrackets, applyReceiptToPayments } from './constants';
import { fetchSettings } from './api';
import logoUrl from '@/assets/logo.png';

/**
 * Format currency for PDF (uses "Rs." prefix since jsPDF standard Helvetica font can't render the Unicode rupee symbol)
 */
function pdfCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${formatted}`;
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

  // Period / Months Title row inside Fees Details
  const periodY = topColumnsY + 7.5;
  const periodH = 9.0;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.25);
  doc.rect(rightColX, periodY, halfColWidth, periodH, 'S');
  
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blackColor);
  const formattedPeriod = formatMonthNamesWithBrackets(formatReceiptPeriod(receipt));
  doc.text(formattedPeriod.toUpperCase(), rightColX + halfColWidth / 2, periodY + 6.0, { align: 'center' });

  // Fees details fields
  const feesFields = [
    { label: 'Amount Paid', value: pdfCurrency(receipt.amtPaid) },
    { label: 'Previous Dues', value: pdfCurrency(receipt.prevDue) },
    { label: 'Remaining Balance', value: receipt.remainingAmount !== undefined ? pdfCurrency(receipt.remainingAmount) : 'Rs. 0' },
    { label: 'TOTAL RECEIVED', value: pdfCurrency(receipt.totalRecv), isHighlight: true }
  ];

  const feesRowH = 6.1;
  feesFields.forEach((field, i) => {
    const rowY = periodY + periodH + (i * feesRowH);
    
    // Set cell borders
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    
    if (field.isHighlight) {
      // Highlight background
      doc.setFillColor(...highlightGreenBg);
      doc.rect(rightColX, rowY, halfColWidth - 30, feesRowH, 'FD');
      doc.rect(rightColX + halfColWidth - 30, rowY, 30, feesRowH, 'FD');
      
      // Highlight text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.0);
      doc.setTextColor(...greenColor);
      doc.text(field.label, rightColX + 2.5, rowY + 4.3);
      doc.text(field.value, rightColX + halfColWidth - 2.5, rowY + 4.3, { align: 'right' });
    } else {
      // Normal row
      doc.rect(rightColX, rowY, halfColWidth - 30, feesRowH, 'S');
      doc.rect(rightColX + halfColWidth - 30, rowY, 30, feesRowH, 'S');
      
      // Normal text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...blackColor);
      doc.text(field.label, rightColX + 2.5, rowY + 4.3);
      
      // Bold value
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blackColor);
      doc.text(field.value, rightColX + halfColWidth - 2.5, rowY + 4.3, { align: 'right' });
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

    const isNotJoinedYet = isMonthNotJoined(receipt.admDate, monthCode);
    if (isNotJoinedYet) {
      statusText = 'NA';
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
          statusText = 'NA';
          isNaText = true;
        }
      } else if (receipt.months.includes(monthCode)) {
        // If it's part of the current receipt months
        if (receipt.amtPaid === 0 && receipt.totalRecv === 0) {
          statusText = 'NA';
          isNaText = true;
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
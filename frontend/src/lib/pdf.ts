import jsPDF from 'jspdf';
import type { Receipt } from './constants';
import { formatDate, MONTH_SHORT, formatReceiptPeriod } from './constants';
import { fetchSettings } from './api';

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
 * Generate a professional, table-based PDF receipt
 * Visual design matches the grid-based zinc monochrome aesthetic from the React reference component
 */
export async function generateReceiptPDF(receipt: Receipt): Promise<void> {
  const settings = await fetchSettings();
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  
  // ─── Grid Geometry ───────────────────────────────────
  const cardX = margin;
  const cardY = 20;
  const cardWidth = contentWidth;
  const padding = 8;
  const innerX = cardX + padding; // 26
  const innerEndX = cardX + cardWidth - padding; // 184
  const innerW = innerEndX - innerX; // 158
  const centerX = pageWidth / 2; // 105
  
  let y = cardY + padding; // Starts at 28mm

  // ─── Color Palette (Zinc/Monochrome Theme) ───────────
  const zinc900 = [24, 24, 27] as [number, number, number];    // Main text / titles
  const zinc800 = [39, 39, 42] as [number, number, number];    // Table header / dark text
  const zinc700 = [63, 63, 70] as [number, number, number];    // Secondary labels / bold subtext
  const zinc500 = [113, 113, 122] as [number, number, number];  // Sub-labels / neutral text
  const zinc400 = [161, 161, 170] as [number, number, number];  // Light labels / lines
  const zinc300 = [212, 212, 216] as [number, number, number];  // Cell borders / dividers
  const zinc100 = [244, 244, 245] as [number, number, number];  // Total bar / accent band bg
  const zinc50  = [249, 249, 250] as [number, number, number];  // Table label cell bg
  const white   = [255, 255, 255] as [number, number, number];

  // ─── 1. HEADER SECTION ───────────────────────────────
  doc.setFont('helvetica', 'bold');
  
  // Institute Name (Uppercase, bold, size 12)
  doc.setFontSize(12);
  doc.setTextColor(...zinc900);
  const instituteName = (settings.instituteName || receipt.school || 'INSTITUTE NAME').toUpperCase();
  doc.text(instituteName, centerX, y + 3.5, { align: 'center' });
  y += 6.5;

  // Address (Medium, size 8, zinc-500)
  if (settings.address) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc500);
    doc.text(settings.address, centerX, y + 2.5, { align: 'center' });
    y += 5.5;
  }

  // Phone Numbers (Medium, size 8, zinc-500)
  const phones = [settings.phone1, settings.phone2].filter(Boolean).join('  |  ');
  if (phones) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc500);
    doc.text(`Phone: ${phones}`, centerX, y + 2.5, { align: 'center' });
    y += 6.5;
  }

  // Header bottom border (zinc-800, thick 0.6mm border-b-2)
  doc.setDrawColor(...zinc800);
  doc.setLineWidth(0.6);
  doc.line(innerX, y, innerEndX, y);
  y += 4.5;

  // ─── 2. "FEE RECEIPT" LABEL BAND ─────────────────────
  // Clean zinc-100 rounded strip
  doc.setFillColor(...zinc100);
  roundedRect(doc, innerX, y, innerW, 5.5, 0.5, 'F');
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc800);
  // Wide-spaced letter design to mimic "tracking-widest"
  doc.text('F E E   R E C E I P T', centerX, y + 3.8, { align: 'center' });
  y += 5.5 + 4.5;

  // ─── 3. META INFO ROW ────────────────────────────────
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  
  // Left: Receipt No
  doc.text(`Receipt No: ${receipt.id}`, innerX, y);
  
  // Right: Date
  doc.text(`Date: ${formatDate(receipt.generatedOn)}`, innerEndX, y, { align: 'right' });
  y += 5.5;

  // ─── 4. STUDENT DETAILS TABLE ────────────────────────
  const tableY = y;
  const col1W = 35;
  const col2W = 83;
  const col3W = 40;
  const rowH = 7.2;

  const x1 = innerX;
  const x2 = x1 + col1W; // 61
  const x3 = x2 + col2W; // 144
  const x4 = x3 + col3W; // 184

  // Draw background fills for label cells
  doc.setFillColor(...zinc50);
  doc.rect(x1, tableY, col1W, rowH, 'F');              // Student Name label bg
  doc.rect(x3, tableY, col3W, rowH * 2, 'F');          // Student ID rowspan bg
  doc.rect(x1, tableY + rowH, col1W, rowH, 'F');       // Class label bg
  doc.rect(x1, tableY + rowH * 2, col1W, rowH, 'F');   // Category label bg
  doc.rect(x3, tableY + rowH * 2, col3W, rowH, 'F');   // Fee/Month label bg
  doc.rect(x1, tableY + rowH * 3, col1W, rowH, 'F');   // School label bg

  // Grid Borders
  doc.setDrawColor(...zinc300);
  doc.setLineWidth(0.25);
  doc.rect(x1, tableY, innerW, rowH * 4, 'S');         // Outer table border
  
  // Vertical splitters
  doc.line(x2, tableY, x2, tableY + rowH * 4);
  doc.line(x3, tableY, x3, tableY + rowH * 4);
  
  // Horizontal splitters
  doc.line(x1, tableY + rowH, x3, tableY + rowH);      // Row 1 bottom (only to X3)
  doc.line(x1, tableY + rowH * 2, x4, tableY + rowH * 2); // Row 2 bottom
  doc.line(x1, tableY + rowH * 3, x4, tableY + rowH * 3); // Row 3 bottom

  // Text inside student details
  doc.setFontSize(8.5);
  const textYOffset = 4.8;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('Student Name', x1 + 2.5, tableY + textYOffset);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text(receipt.studentName, x2 + 2.5, tableY + textYOffset);

  // Student ID rowspan cell
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('Student ID', x3 + 2.5, tableY + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.setFontSize(9);
  doc.text(receipt.studentId, x3 + 2.5, tableY + 9.5);

  // Row 2
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('Class', x1 + 2.5, tableY + rowH + textYOffset);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text(receipt.class || '-', x2 + 2.5, tableY + rowH + textYOffset);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('Category', x1 + 2.5, tableY + rowH * 2 + textYOffset);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text(receipt.category, x2 + 2.5, tableY + rowH * 2 + textYOffset);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('Fee/Month', x3 + 2.5, tableY + rowH * 2 + textYOffset);

  // Row 4
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc700);
  doc.text('School', x1 + 2.5, tableY + rowH * 3 + textYOffset);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text(receipt.school || '-', x2 + 2.5, tableY + rowH * 3 + textYOffset, { maxWidth: col2W - 5 });

  doc.text(pdfCurrency(receipt.feePerMonth), x3 + 2.5, tableY + rowH * 3 + textYOffset);

  y = tableY + rowH * 4 + 5.5; // Update Y position after table

  // ─── 5. PAYMENT DETAILS TABLE ────────────────────────
  const payX1 = innerX;
  const payX2 = payX1 + 123; // 149
  const payX3 = innerEndX;   // 184
  const headerH = 7;
  const descRowH = 13.5;
  const prevDueRowH = 7.2;
  const totalRowH = 8.5;
  const remainingRowH = 7.2;

  const totalFee = receipt.months.length * receipt.feePerMonth;
  const adjustedAmount = totalFee - receipt.amtPaid - (receipt.remainingAmount || 0);
  const hasAdjustment = adjustedAmount > 0;
  const adjustedRowH = 7.2;

  const hasPrevDue = receipt.prevDue > 0;
  const hasRemaining = receipt.remainingAmount !== undefined && (receipt.remainingAmount > 0 || (receipt.remainingAmount === 0 && !!receipt.remainingMonths));
  const payTableH = headerH + descRowH + (hasAdjustment ? adjustedRowH : 0) + (hasPrevDue ? prevDueRowH : 0) + totalRowH + (hasRemaining ? remainingRowH : 0);

  // Header Row Background (zinc-800)
  doc.setFillColor(...zinc800);
  doc.rect(payX1, y, innerW, headerH, 'F');

  // Header Text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('DESCRIPTION', payX1 + 3, y + 4.8);
  doc.text('AMOUNT', payX3 - 3, y + 4.8, { align: 'right' });

  // Description Row Text
  const monthsStr = receipt.months.map(m => MONTH_SHORT[m] || m).join(', ');
  
  // Line 1: Fee for [period]
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text('Fee for: ', payX1 + 3, y + headerH + 4.5);
  const feeLabelW = doc.getTextWidth('Fee for: ');
  doc.setFont('helvetica', 'bold');
  doc.text(formatReceiptPeriod(receipt), payX1 + 3 + feeLabelW, y + headerH + 4.5);

  // Line 2: Months description
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc500);
  doc.text(`Months: ${monthsStr || '—'}`, payX1 + 3, y + headerH + 8.5);

  // Line 3: Multiplier string
  doc.text(`${receipt.months.length} month${receipt.months.length > 1 ? 's' : ''} x ${pdfCurrency(receipt.feePerMonth)}/month`, payX1 + 3, y + headerH + 11.8);

  // Description Row Amount (Total Fee)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text(pdfCurrency(totalFee), payX3 - 3, y + headerH + 7.8, { align: 'right' });

  // Adjusted Row (previously paid) & Previous Back-Dues Row
  let currentPayY = y + headerH + descRowH;
  if (hasAdjustment) {
    // Label
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc700);
    doc.text('Adjusted (Previously Paid)', payX1 + 3, currentPayY + 4.8);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc900);
    doc.text(`-${pdfCurrency(adjustedAmount)}`, payX3 - 3, currentPayY + 4.8, { align: 'right' });
    
    currentPayY += adjustedRowH;
  }
  if (hasPrevDue) {
    // Label
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc700);
    doc.text('Previous Back-Dues', payX1 + 3, currentPayY + 4.8);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc900);
    doc.text(pdfCurrency(receipt.prevDue), payX3 - 3, currentPayY + 4.8, { align: 'right' });
    
    currentPayY += prevDueRowH;
  }

  // Total Received Row (zinc-100)
  doc.setFillColor(...zinc100);
  doc.rect(payX1, currentPayY, innerW, totalRowH, 'F');

  // Label
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc900);
  doc.text('Total Received', payX1 + 3, currentPayY + 5.5);

  // Value
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfCurrency(receipt.totalRecv), payX3 - 3, currentPayY + 5.5, { align: 'right' });

  // Remaining Balance Row (if any)
  if (hasRemaining) {
    const remainingY = currentPayY + totalRowH;
    
    // Draw thin horizontal separator line
    doc.setDrawColor(...zinc300);
    doc.setLineWidth(0.25);
    doc.line(payX1, remainingY, payX3, remainingY);

    const isPaidOff = receipt.remainingAmount === 0;

    if (isPaidOff) {
      // Light green background fill
      doc.setFillColor(240, 253, 244);
      doc.rect(payX1, remainingY, innerW, remainingRowH, 'F');

      const greenLabel = `Remaining Balance (Fully Paid for ${receipt.remainingMonths})`;

      // Label in green
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61); // Dark green text
      doc.text(greenLabel, payX1 + 3, remainingY + 4.8);

      // Value in green
      doc.setFont('helvetica', 'bold');
      doc.text(pdfCurrency(0), payX3 - 3, remainingY + 4.8, { align: 'right' });
    } else {
      // Light red background fill
      doc.setFillColor(254, 242, 242);
      doc.rect(payX1, remainingY, innerW, remainingRowH, 'F');

      // Label in red
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28); // Dark red text
      const remainingLabel = receipt.remainingMonths ? `Remaining Balance (${receipt.remainingMonths})` : 'Remaining Balance';
      doc.text(remainingLabel, payX1 + 3, remainingY + 4.8);

      // Value in red
      doc.setFont('helvetica', 'bold');
      doc.text(pdfCurrency(receipt.remainingAmount!), payX3 - 3, remainingY + 4.8, { align: 'right' });
    }
  }

  // Table Borders & Grid Lines
  doc.setDrawColor(...zinc300);
  doc.setLineWidth(0.25);
  doc.rect(payX1, y, innerW, payTableH, 'S'); // Outer border

  // Horizontal cell borders
  doc.line(payX1, y + headerH, payX3, y + headerH);
  doc.line(payX1, y + headerH + descRowH, payX3, y + headerH + descRowH);
  
  let gridLineY = y + headerH + descRowH;
  if (hasAdjustment) {
    doc.line(payX1, gridLineY + adjustedRowH, payX3, gridLineY + adjustedRowH);
    gridLineY += adjustedRowH;
  }
  if (hasPrevDue) {
    doc.line(payX1, gridLineY + prevDueRowH, payX3, gridLineY + prevDueRowH);
  }

  // Vertical grid splitter
  doc.line(payX2, y, payX2, y + payTableH);

  y += payTableH + 5.5; // Update Y position after payment table

  // ─── 6. DUES & NOTES SECTION ─────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  if (receipt.nextDue) {
    doc.setTextColor(...zinc700);
    doc.text('Next Dues:', innerX, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc500);
    doc.text(receipt.nextDue, innerX + 18, y + 3);
    y += 4.5;
  }

  if (receipt.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc700);
    doc.text('Notes:', innerX, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...zinc500);
    
    // Auto-wrap note content
    const notesLines = doc.splitTextToSize(receipt.notes, innerW - 15) as string[];
    doc.text(notesLines, innerX + 12, y + 3);
    y += 4.5 + (notesLines.length - 1) * 3.5;
  }

  y += 2; // Spacing before footer

  // ─── 7. FOOTER / SIGNATURES SECTION ──────────────────
  // Left: Generation Details
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc500);
  doc.text(`Generated: ${formatDate(receipt.generatedOn)}`, innerX, y + 3);
  doc.text(`By: ${receipt.generatedBy}`, innerX, y + 6.5);

  // Right: Signature Line
  const sigLineW = 24;
  const sigLineX = innerEndX - sigLineW;
  doc.setDrawColor(...zinc300);
  doc.setLineWidth(0.25);
  doc.line(sigLineX, y + 3, innerEndX, y + 3);

  // Signature Text
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...zinc500);
  const sigTextX = sigLineX + sigLineW / 2;
  doc.text('Authorized Signature', sigTextX, y + 6.5, { align: 'center' });

  // ─── 8. OUTER CARD BOUNDARY ──────────────────────────
  const cardEndY = y + 10.5;
  const cardH = cardEndY - cardY;
  
  doc.setDrawColor(...zinc300);
  doc.setLineWidth(0.35);
  roundedRect(doc, cardX, cardY, cardWidth, cardH, 2.5, 'S');

  // ─── 9. BOTTOM WATERMARK (OUTSIDE CARD) ──────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...zinc400);
  doc.text(
    'This is a computer-generated receipt and does not require a physical signature.',
    centerX,
    cardEndY + 8,
    { align: 'center' }
  );

  // ─── SAVE FILE ───────────────────────────────────────
  const firstMonth = MONTH_SHORT[receipt.months[0]] || receipt.months[0];
  const lastMonth = MONTH_SHORT[receipt.months[receipt.months.length - 1]] || receipt.months[receipt.months.length - 1];
  const safeName = receipt.studentName.replace(/\s+/g, '_');
  const fileName = `${receipt.id}-${receipt.studentId}-${safeName}-${firstMonth}-${lastMonth}.pdf`;

  doc.save(fileName);
}

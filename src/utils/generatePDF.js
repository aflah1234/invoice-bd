const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generatePDF = (order, type = 'quotation') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const filename = `${type}-${order.orderNumber}-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, '../../uploads/docs');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, filename);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = 595.28;   // A4 width in points
    const H = 841.89;   // A4 height

    // ── Colors ──────────────────────────────────────────
    const RED    = '#C0392B';
    const DARK   = '#1C1C1C';
    const GRAY   = '#555555';
    const LGRAY  = '#F5F5F5';
    const WHITE  = '#FFFFFF';
    const ACCENT = '#E8E8E8';

    // ── TOP HEADER BAR ───────────────────────────────────
    // Red top-left block
    doc.rect(0, 0, 220, 90).fill(RED);

    // Dark top-right block
    doc.rect(370, 0, W - 370, 90).fill(DARK);

    // Brand name in red block
    doc.font('Helvetica-Bold').fontSize(20).fillColor(WHITE)
      .text(order.storeName || 'STORE NAME', 20, 20, { width: 190 });
    doc.font('Helvetica').fontSize(9).fillColor('#ffcccc')
      .text('QUOTATION & INVOICE PLATFORM', 20, 48, { width: 190 });

    // QUOTATION / INVOICE label in dark block
    doc.font('Helvetica-Bold').fontSize(26).fillColor(WHITE)
      .text(type === 'invoice' ? 'INVOICE' : 'QUOTATION', 375, 28, { width: 200 });

    // ── RED DIAGONAL ACCENT (bottom of header) ───────────
    doc.polygon([220, 0], [370, 0], [350, 90], [220, 90]).fill(RED);

    // ── INVOICE META (below header) ─────────────────────
    const metaY = 105;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(RED)
      .text(`${type === 'invoice' ? 'Invoice' : 'Quotation'} No:`, 30, metaY);
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(`  #${order.orderNumber}`, 120, metaY);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(RED)
      .text('Date:', 380, metaY);
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(`  ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 410, metaY);

    // ── BILL TO ──────────────────────────────────────────
    const billY = 125;
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
      .text('INVOICE TO.  ', 30, billY, { continued: true });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(RED)
      .text(order.customerName.toUpperCase());

    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(order.customerPhone || '', 30, billY + 18);
    if (order.customerEmail) {
      doc.text(order.customerEmail, 30, billY + 30);
    }
    if (order.deliveryAddress) {
      doc.text(order.deliveryAddress, 30, billY + 42);
    }

    // Store contact on right
    doc.font('Helvetica').fontSize(9).fillColor(GRAY);
    const contactLines = [
      order.storeName || '',
      order.storePhone || '',
      order.storeEmail || '',
      order.storeAddress || '',
    ].filter(Boolean);
    contactLines.forEach((line, i) => {
      doc.text(line, 350, billY + i * 12, { width: 210, align: 'right' });
    });

    // ── DIVIDER ──────────────────────────────────────────
    const divY = billY + 65;
    doc.rect(30, divY, W - 60, 1).fill(ACCENT);

    // ── ITEMS TABLE HEADER ───────────────────────────────
    const tableTop = divY + 10;
    const colX = { desc: 30, unit: 310, qty: 400, total: 470 };
    const rowH  = 22;

    // Header row — red background
    doc.rect(30, tableTop, W - 60, rowH).fill(RED);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE);
    doc.text('ITEM DESCRIPTION', colX.desc + 8, tableTop + 7);
    doc.text('UNIT PRICE',       colX.unit,     tableTop + 7, { width: 80, align: 'center' });
    doc.text('QTY',              colX.qty,      tableTop + 7, { width: 60, align: 'center' });
    doc.text('TOTAL',            colX.total,    tableTop + 7, { width: 75, align: 'right' });

    // ── ITEM ROWS ────────────────────────────────────────
    let y = tableTop + rowH;
    order.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? WHITE : LGRAY;
      doc.rect(30, y, W - 60, rowH).fill(bg);

      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      doc.text(item.name, colX.desc + 8, y + 7, { width: 270 });
      doc.text(`$${item.price.toFixed(2)}`, colX.unit, y + 7, { width: 80, align: 'center' });
      doc.text(`${item.quantity} ${item.unit}`, colX.qty, y + 7, { width: 60, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(9).fillColor(RED);
      doc.text(`$${item.subtotal.toFixed(2)}`, colX.total, y + 7, { width: 75, align: 'right' });

      y += rowH;
    });

    // ── BOTTOM SECTION ───────────────────────────────────
    const bottomY = Math.max(y + 20, 580);

    // ── LEFT: Payment / Notes ────────────────────────────
    if (order.customerNote || order.ownerNote) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(RED)
        .text('NOTES', 30, bottomY);
      doc.font('Helvetica').fontSize(8).fillColor(GRAY);
      if (order.customerNote) doc.text(`Customer: ${order.customerNote}`, 30, bottomY + 14, { width: 230 });
      if (order.ownerNote)    doc.text(`Store: ${order.ownerNote}`,       30, bottomY + 26, { width: 230 });
    }

    // ── RIGHT: Totals box ────────────────────────────────
    const totX = 350;
    let totY = bottomY;
    const totW = W - totX - 30;
    const totRowH = 20;

    const drawTotalRow = (label, value, isBold, bgColor, textColor) => {
      if (bgColor) doc.rect(totX, totY, totW, totRowH).fill(bgColor);
      const fnt = isBold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fnt).fontSize(9).fillColor(textColor || DARK)
        .text(label, totX + 5, totY + 6, { width: totW / 2 });
      doc.font(fnt).fontSize(9).fillColor(textColor || DARK)
        .text(`$${parseFloat(value).toFixed(2)}`, totX + totW / 2, totY + 6, { width: totW / 2 - 5, align: 'right' });
      totY += totRowH;
    };

    drawTotalRow('Subtotal:', order.subtotal, false, LGRAY);
    if (order.discount > 0) drawTotalRow('Discount:', order.discount, false, WHITE);
    if (order.tax > 0)      drawTotalRow(`Tax:`,      order.tax,      false, LGRAY);

    // Grand total — red row
    doc.rect(totX, totY, totW, totRowH + 4).fill(RED);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
      .text('GRAND TOTAL', totX + 5, totY + 6, { width: totW / 2 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
      .text(`$${order.total.toFixed(2)}`, totX + totW / 2, totY + 6, { width: totW / 2 - 5, align: 'right' });
    totY += totRowH + 4;

    // ── FOOTER BAR ───────────────────────────────────────
    const footerY = H - 45;
    doc.rect(0, footerY, W, 45).fill(DARK);
    doc.rect(0, footerY, 6, 45).fill(RED); // left red accent

    doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
      .text('Thank You For Your Business', 0, footerY + 16, { align: 'center', width: W });

    // ── RED BOTTOM ACCENT TRIANGLES ──────────────────────
    doc.rect(0, footerY - 6, W, 6).fill(RED);

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

module.exports = generatePDF;

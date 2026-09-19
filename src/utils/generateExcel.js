const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generate an Excel quotation or invoice for an order.
 * @param {Object} order  - Populated order object
 * @param {string} type   - 'quotation' | 'invoice'
 * @returns {Promise<string>} - Absolute path to generated Excel file
 */
const generateExcel = async (order, type = 'quotation') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type === 'invoice' ? 'Invoice' : 'Quotation');

  const filename = `${type}-${order.orderNumber}-${Date.now()}.xlsx`;
  const outputDir = path.join(__dirname, '../../uploads/docs');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, filename);

  // ── Column widths ──────────────────────────────────────────────
  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'name', width: 30 },
    { key: 'qty', width: 10 },
    { key: 'unit', width: 10 },
    { key: 'price', width: 14 },
    { key: 'subtotal', width: 14 },
  ];

  // ── Title ──────────────────────────────────────────────────────
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = type === 'invoice' ? 'INVOICE' : 'QUOTATION';
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:F2');
  const numCell = sheet.getCell('A2');
  numCell.value = `${type === 'invoice' ? 'Invoice' : 'Quotation'} #: ${order.orderNumber}`;
  numCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A3:F3');
  const dateCell = sheet.getCell('A3');
  dateCell.value = `Date: ${new Date(order.createdAt).toLocaleDateString()}`;
  dateCell.alignment = { horizontal: 'center' };

  sheet.addRow([]);

  // ── Store & Customer ───────────────────────────────────────────
  sheet.addRow(['Store:', order.storeName, '', 'Customer:', order.customerName, '']);
  sheet.addRow(['', '', '', 'Phone:', order.customerPhone, '']);
  if (order.customerEmail) {
    sheet.addRow(['', '', '', 'Email:', order.customerEmail, '']);
  }

  sheet.addRow([]);

  // ── Items header ───────────────────────────────────────────────
  const headerRow = sheet.addRow(['#', 'Item', 'Qty', 'Unit', 'Price', 'Subtotal']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // ── Items rows ─────────────────────────────────────────────────
  order.items.forEach((item, idx) => {
    const row = sheet.addRow([
      idx + 1,
      item.name,
      item.quantity,
      item.unit,
      item.price,
      item.subtotal,
    ]);
    // Format price columns
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '#,##0.00';
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  sheet.addRow([]);

  // ── Totals ─────────────────────────────────────────────────────
  const addTotal = (label, value) => {
    const row = sheet.addRow(['', '', '', '', label, value]);
    row.getCell(5).font = { bold: true };
    row.getCell(6).numFmt = '#,##0.00';
  };

  addTotal('Subtotal:', order.subtotal);
  if (order.tax) addTotal('Tax:', order.tax);
  if (order.discount) addTotal('Discount:', -order.discount);

  const totalRow = sheet.addRow(['', '', '', '', 'TOTAL:', order.total]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12 };
  totalRow.getCell(6).numFmt = '#,##0.00';

  // ── Notes ──────────────────────────────────────────────────────
  if (order.customerNote || order.ownerNote) {
    sheet.addRow([]);
    if (order.customerNote) sheet.addRow(['Note (Customer):', order.customerNote]);
    if (order.ownerNote) sheet.addRow(['Note (Store):', order.ownerNote]);
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

module.exports = generateExcel;

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch {
  PDFDocument = null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatMoney(amount, currency = 'NPR') {
  const num = Number(amount || 0);
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapePdfText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Generates a safe attachment filename for a payslip download.
 * Never trusts user-supplied filenames; strips all non-alphanumeric characters.
 */
export function buildSafePayslipFilename(employeeCode, year, month) {
  const safeCode = String(employeeCode || 'EMP').replace(/[^A-Za-z0-9_-]/g, '');
  const safeYear = String(Number(year) || 2026);
  const safeMonth = String(Number(month) || 1).padStart(2, '0');
  return `Payslip_${safeCode}_${safeYear}_${safeMonth}.pdf`;
}

/**
 * Generates a valid, structured PDF 1.4 binary buffer on demand from database rows.
 * Uses pdfkit if installed, or our built-in deterministic PDF 1.4 vector/table renderer.
 */
export async function generatePayslipPdfBuffer({ payslip, employee }) {
  const monthName = MONTH_NAMES[(Number(payslip.pay_period_month) || 1) - 1] || 'Month';
  const periodTitle = `${monthName} ${payslip.pay_period_year}`;
  const cur = payslip.currency || 'NPR';

  if (PDFDocument) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('EMPLOYEE SELF-SERVICE PORTAL', { align: 'left' });
      doc.fontSize(11).fillColor('#475569').text(`Confidential Monthly Payslip - ${periodTitle}`);
      doc.moveDown(1);

      doc.fillColor('#0f172a').fontSize(11);
      doc.text(`Employee Name: ${employee.legal_name}`);
      doc.text(`Employee ID: ${employee.employee_code}`);
      doc.text(`Department: ${employee.department} (${employee.designation})`);
      doc.text(`Pay Period: ${payslip.pay_period_start} to ${payslip.pay_period_end}`);
      doc.text(`Payment Date: ${payslip.payment_date}`);
      doc.text(`Bank Account (Masked): ${payslip.bank_account_masked}`);
      doc.moveDown(1);

      doc.fontSize(12).text('Earnings', { underline: true });
      doc.fontSize(10);
      doc.text(`Basic Salary: ${formatMoney(payslip.basic_salary, cur)}`);
      doc.text(`House Rent Allowance (HRA): ${formatMoney(payslip.hra, cur)}`);
      doc.text(`Transport Allowance: ${formatMoney(payslip.transport_allowance, cur)}`);
      doc.text(`Medical Allowance: ${formatMoney(payslip.medical_allowance, cur)}`);
      doc.text(`Special Allowance: ${formatMoney(payslip.special_allowance, cur)}`);
      doc.fontSize(11).text(`Gross Earnings: ${formatMoney(payslip.gross_earnings, cur)}`);
      doc.moveDown(1);

      doc.fontSize(12).text('Deductions', { underline: true });
      doc.fontSize(10);
      doc.text(`Income Tax (TDS): ${formatMoney(payslip.income_tax, cur)}`);
      doc.text(`Provident Fund (PF): ${formatMoney(payslip.provident_fund, cur)}`);
      doc.text(`Social Security Tax: ${formatMoney(payslip.social_security_tax, cur)}`);
      doc.text(`Professional Tax: ${formatMoney(payslip.professional_tax, cur)}`);
      doc.fontSize(11).text(`Total Deductions: ${formatMoney(payslip.total_deductions, cur)}`);
      doc.moveDown(1);

      doc.fontSize(14).text(`NET PAY: ${formatMoney(payslip.net_pay, cur)}`);
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#64748b').text(
        'System-generated confidential document. Generated on demand by Employee Self-Service Portal.',
        { align: 'center' }
      );
      doc.end();
    });
  }

  // Native deterministic PDF 1.4 generator with clean vector boxes, rules, and typography
  const ops = [];

  // Header Banner (#0f766e Teal accent bar + Dark slate title)
  ops.push('0.059 0.463 0.431 rg');
  ops.push('50 765 495 45 re f');
  ops.push('BT /F2 15 Tf 1 1 1 rg 65 790 Td (EMPLOYEE SELF-SERVICE PORTAL) Tj ET');
  ops.push(`BT /F1 10 Tf 0.9 0.96 0.95 rg 65 774 Td (CONFIDENTIAL PAYSLIP  |  ${escapePdfText(periodTitle.toUpperCase())}) Tj ET`);

  // Employee Metadata Box
  ops.push('0.96 0.97 0.98 rg');
  ops.push('50 675 495 78 re f');
  ops.push('0.82 0.85 0.88 RG 0.75 w 50 675 495 78 re S');

  const metaLeft = [
    ['Employee Name:', employee.legal_name],
    ['Employee Code:', employee.employee_code],
    ['Department:', employee.department],
    ['Designation:', employee.designation]
  ];
  const metaRight = [
    ['Pay Period:', `${payslip.pay_period_start} to ${payslip.pay_period_end}`],
    ['Payment Date:', String(payslip.payment_date)],
    ['Bank Account:', payslip.bank_account_masked],
    ['PAN (Masked):', employee.tax_pan_masked || 'PAN-****-900']
  ];

  let y = 736;
  for (let i = 0; i < metaLeft.length; i++) {
    ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 62 ${y} Td (${escapePdfText(metaLeft[i][0])}) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 145 ${y} Td (${escapePdfText(metaLeft[i][1])}) Tj ET`);
    ops.push(`BT /F2 9 Tf 0.28 0.33 0.41 rg 310 ${y} Td (${escapePdfText(metaRight[i][0])}) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 395 ${y} Td (${escapePdfText(metaRight[i][1])}) Tj ET`);
    y -= 16;
  }

  // Earnings & Deductions Table Header
  ops.push('0.12 0.16 0.23 rg');
  ops.push('50 638 495 22 re f');
  ops.push('BT /F2 9.5 Tf 1 1 1 rg 62 645 Td (EARNINGS) Tj ET');
  ops.push('BT /F2 9.5 Tf 1 1 1 rg 215 645 Td (AMOUNT) Tj ET');
  ops.push('BT /F2 9.5 Tf 1 1 1 rg 305 645 Td (DEDUCTIONS) Tj ET');
  ops.push('BT /F2 9.5 Tf 1 1 1 rg 465 645 Td (AMOUNT) Tj ET');

  const earningsRows = [
    ['Basic Salary', formatMoney(payslip.basic_salary, cur)],
    ['House Rent Allowance (HRA)', formatMoney(payslip.hra, cur)],
    ['Transport Allowance', formatMoney(payslip.transport_allowance, cur)],
    ['Medical Allowance', formatMoney(payslip.medical_allowance, cur)],
    ['Special Allowance', formatMoney(payslip.special_allowance, cur)]
  ];

  const deductionRows = [
    ['Income Tax (TDS)', formatMoney(payslip.income_tax, cur)],
    ['Provident Fund (PF)', formatMoney(payslip.provident_fund, cur)],
    ['Social Security Tax', formatMoney(payslip.social_security_tax, cur)],
    ['Professional Tax', formatMoney(payslip.professional_tax, cur)],
    ['', '']
  ];

  y = 620;
  for (let i = 0; i < earningsRows.length; i++) {
    if (i % 2 === 1) {
      ops.push('0.98 0.98 0.99 rg');
      ops.push(`50 ${y - 6} 495 20 re f`);
    }
    ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 62 ${y} Td (${escapePdfText(earningsRows[i][0])}) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 200 ${y} Td (${escapePdfText(earningsRows[i][1])}) Tj ET`);
    if (deductionRows[i][0]) {
      ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 305 ${y} Td (${escapePdfText(deductionRows[i][0])}) Tj ET`);
      ops.push(`BT /F1 9 Tf 0.06 0.09 0.16 rg 450 ${y} Td (${escapePdfText(deductionRows[i][1])}) Tj ET`);
    }
    y -= 20;
  }

  // Totals Row
  ops.push('0.93 0.95 0.97 rg');
  ops.push(`50 ${y - 8} 495 24 re f`);
  ops.push('0.75 0.79 0.84 RG 0.75 w 50 512 495 148 re S');
  ops.push('0.75 0.79 0.84 RG 0.75 w 295 512 m 295 660 l S');

  ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 62 ${y} Td (Gross Earnings) Tj ET`);
  ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 200 ${y} Td (${escapePdfText(formatMoney(payslip.gross_earnings, cur))}) Tj ET`);
  ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 305 ${y} Td (Total Deductions) Tj ET`);
  ops.push(`BT /F2 9.5 Tf 0.06 0.09 0.16 rg 450 ${y} Td (${escapePdfText(formatMoney(payslip.total_deductions, cur))}) Tj ET`);

  // Net Pay Callout Box
  ops.push('0.94 0.99 0.98 rg');
  ops.push('50 455 495 40 re f');
  ops.push('0.059 0.463 0.431 RG 1.2 w 50 455 495 40 re S');
  ops.push('BT /F2 11 Tf 0.059 0.463 0.431 rg 65 471 Td (NET PAYABLE AMOUNT) Tj ET');
  ops.push(`BT /F2 13 Tf 0.06 0.09 0.16 rg 390 470 Td (${escapePdfText(formatMoney(payslip.net_pay, cur))}) Tj ET`);

  // Footer Notice
  ops.push('BT /F1 8 Tf 0.4 0.45 0.52 rg 50 420 Td (This is a system-generated confidential payslip produced on demand. No physical signature is required.) Tj ET');
  ops.push(`BT /F1 8 Tf 0.4 0.45 0.52 rg 50 406 Td (Payslip Reference ID: ${escapePdfText(payslip.id)}  |  Status: ${escapePdfText(payslip.status)}) Tj ET`);

  const contentStream = ops.join('\n');
  const streamByteLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamByteLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'binary');
}

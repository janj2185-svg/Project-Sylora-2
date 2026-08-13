#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = path.join(root, 'docs/audit/SYLORA_AUDIT_COMBINED.md');
const cssPath = path.join(root, 'docs/audit/pdf-style.css');
const htmlPath = path.join(root, 'docs/audit/SYLORA_AUDIT_COMBINED.html');
const pdfPath = path.join(root, 'docs/audit/SYLORA_AUDIT_COMBINED.pdf');
const pdfCopy = path.join(root, 'audit/SYLORA_FORENSIC_AUDIT_2026-08-13.pdf');
const executivePdf = path.join(root, 'docs/audit/SYLORA_EXECUTIVE_SUMMARY.pdf');

const md = fs.readFileSync(mdPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const executiveMd = fs.readFileSync(path.join(root, 'docs/audit/SYLORA_FULL_AUDIT.md'), 'utf8');

marked.setOptions({ gfm: true, breaks: false });

function buildHtml(bodyMd, title) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${css}
  @page { size: A4; margin: 18mm 16mm; }
  .cover { text-align:center; padding: 80px 20px 40px; page-break-after: always; }
  .cover h1 { font-size: 28pt; margin-bottom: 8px; }
  .cover p { color: #555; font-size: 12pt; }
  hr { page-break-before: always; }
</style>
</head>
<body>
<section class="cover">
  <p style="letter-spacing:.12em;font-size:11pt;color:#4a3aff">PROJECT SYLORA 2</p>
  <h1>${title}</h1>
  <p>Baseline state assessment · 2026-08-13</p>
  <p style="margin-top:40px;font-size:10pt;color:#888">Evidence-based forensic audit</p>
</section>
${marked.parse(bodyMd)}
</body>
</html>`;
}

async function renderPdf(html, outPath) {
  const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${path.join(root, 'tmp', 'chrome-pdf-' + Date.now())}`]
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}

const fullHtml = buildHtml(md, 'Forensic Audit Report');
fs.writeFileSync(htmlPath, fullHtml);
await renderPdf(fullHtml, pdfPath);
fs.copyFileSync(pdfPath, pdfCopy);

const execHtml = buildHtml(executiveMd, 'Executive Audit Summary');
await renderPdf(execHtml, executivePdf);

const stat = fs.statSync(pdfPath);
console.log(`Full PDF: ${pdfPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Copy: ${pdfCopy}`);
console.log(`Executive PDF: ${executivePdf} (${(fs.statSync(executivePdf).size / 1024 / 1024).toFixed(2)} MB)`);
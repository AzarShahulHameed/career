import * as XLSX from 'xlsx';
import { Application } from './api';

const COLUMNS: { header: string; get: (a: Application) => string | number }[] = [
  { header: 'Candidate name', get: (a) => a.candidateName },
  { header: 'Email', get: (a) => a.email },
  { header: 'Phone', get: (a) => a.phone ?? '' },
  { header: 'Nationality', get: (a) => a.nationality ?? '' },
  { header: 'Current location', get: (a) => a.currentLocation ?? '' },
  { header: 'Current role', get: (a) => a.currentRole ?? '' },
  { header: 'Years experience', get: (a) => a.yearsExperience ?? '' },
  { header: 'LinkedIn', get: (a) => a.linkedinUrl ?? '' },
  { header: 'Portfolio', get: (a) => a.portfolioUrl ?? '' },
  { header: 'Role applied for', get: (a) => a.job.title },
  { header: 'Department', get: (a) => a.job.department },
  { header: 'Location', get: (a) => a.job.location },
  { header: 'Company', get: (a) => a.job.company?.name ?? '' },
  { header: 'Source', get: (a) => a.source },
  { header: 'Status', get: (a) => a.status },
  { header: 'Applied on', get: (a) => new Date(a.createdAt).toLocaleString() },
];

function rows(applications: Application[]): (string | number)[][] {
  return [COLUMNS.map((c) => c.header), ...applications.map((a) => COLUMNS.map((c) => c.get(a)))];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportApplicationsCsv(applications: Application[], filename = 'applications.csv') {
  const csv = rows(applications).map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportApplicationsXlsx(applications: Application[], filename = 'applications.xlsx') {
  const worksheet = XLSX.utils.aoa_to_sheet(rows(applications));
  worksheet['!cols'] = COLUMNS.map(() => ({ wch: 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
  XLSX.writeFile(workbook, filename);
}

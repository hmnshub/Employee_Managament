/**
 * Secure HTTP client for the Employee Self-Service Portal.
 * - Never talks to Supabase directly; only talks to the Node API.
 * - Keeps the per-session CSRF token in memory ONLY (never in localStorage or URL).
 * - Sends `credentials: 'include'` so the HttpOnly session cookie is attached automatically.
 * - Automatically attaches `X-CSRF-Token` on POST, PATCH, PUT, DELETE requests.
 */

const rawBaseUrl = import.meta.env?.VITE_API_BASE_URL || '';
const API_BASE = rawBaseUrl.replace(/\/+$/, '');

let inMemoryCsrfToken = null;

export function setCsrfToken(token) {
  inMemoryCsrfToken = token || null;
}

export function getCsrfToken() {
  return inMemoryCsrfToken;
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, query } = {}) {
  let url = `${API_BASE}${path}`;
  if (query && typeof query === 'object') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const upperMethod = method.toUpperCase();
  const reqHeaders = {
    Accept: 'application/json',
    ...headers
  };

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(upperMethod) && inMemoryCsrfToken) {
    reqHeaders['X-CSRF-Token'] = inMemoryCsrfToken;
  }

  const response = await fetch(url, {
    method: upperMethod,
    headers: reqHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errObj = payload?.error || {};
    const error = new Error(errObj.message || 'Request could not be completed.');
    error.status = response.status;
    error.code = errObj.code || 'API_ERROR';
    error.fieldErrors = errObj.fieldErrors || {};
    error.correlationId = errObj.correlationId || response.headers.get('X-Correlation-Id');
    throw error;
  }

  return payload;
}

/**
 * Downloads a payslip PDF binary via authenticated fetch and triggers browser save dialog.
 * Never exposes public URLs or puts tokens in query parameters.
 */
export async function downloadPayslipPdf(payslipId, fallbackFilename = 'Payslip.pdf') {
  const url = `${API_BASE}/api/payslips/${encodeURIComponent(payslipId)}/download`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const errObj = payload?.error || {};
    const error = new Error(errObj.message || 'Could not download payslip PDF.');
    error.status = response.status;
    error.correlationId = errObj.correlationId;
    throw error;
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : fallbackFilename;

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
  return filename;
}

/**
 * Formats ISO date ("2026-08-10" or UTC timestamp) into human-readable format ("10 Aug 2026").
 */
export function formatHumanDate(dateStr, includeTime = false) {
  if (!dateStr) return '—';
  const date = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  const opts = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  return new Intl.DateTimeFormat('en-GB', opts).format(date);
}

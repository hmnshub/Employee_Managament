import React, { useEffect, useState, useCallback } from 'react';
import { Download, Shield } from 'lucide-react';
import { apiRequest, downloadPayslipPdf, formatHumanDate } from '../api/client.js';
import {
  ErrorBanner,
  PaginationControls,
  StatusBadge,
  SuccessBanner,
  TableSkeleton
} from '../components/AppShell.jsx';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function PayslipsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState('2026');
  const [sortBy, setSortBy] = useState('pay_period_year');
  const [sortOrder, setSortOrder] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/payslips', {
        query: { page, pageSize: 10, year: yearFilter, sortBy, sortOrder }
      });
      setItems(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, yearFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const handleDownload = async (ps) => {
    setDownloadingId(ps.id);
    setError(null);
    setSuccessMsg('');
    try {
      const filename = await downloadPayslipPdf(
        ps.id,
        `Payslip_${ps.pay_period_year}_${String(ps.pay_period_month).padStart(2, '0')}.pdf`
      );
      setSuccessMsg(`Downloaded confidential PDF payslip: ${filename}`);
    } catch (err) {
      setError(err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Confidential Payslips</h2>
          <p className="page-description">
            Payslips are generated on demand from verified payroll records and streamed over an ownership-checked connection with <code>Cache-Control: no-store</code>.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={fetchPayslips} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      <section className="card">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--accent-primary)" />
            <h3 className="card-title">Issued monthly payslips</h3>
          </div>

          <div className="table-filters">
            <label htmlFor="payslip-year-filter" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Year:
            </label>
            <select
              id="payslip-year-filter"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            <label htmlFor="payslip-sort" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Sort:
            </label>
            <select
              id="payslip-sort"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortBy(f);
                setSortOrder(o);
                setPage(1);
              }}
            >
              <option value="pay_period_year:desc">Pay period (newest first)</option>
              <option value="pay_period_year:asc">Pay period (oldest first)</option>
              <option value="net_pay:desc">Net pay (highest)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="empty-state">No payslips found for the selected filter.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pay period</th>
                    <th>Period dates</th>
                    <th>Payment date</th>
                    <th>Gross earnings</th>
                    <th>Total deductions</th>
                    <th>Net pay</th>
                    <th>Bank account (masked)</th>
                    <th>Status</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ps) => {
                    const mName = MONTH_NAMES[(Number(ps.pay_period_month) || 1) - 1] || 'Month';
                    return (
                      <tr key={ps.id}>
                        <td style={{ fontWeight: 600 }}>
                          {mName} {ps.pay_period_year}
                        </td>
                        <td>
                          {formatHumanDate(ps.pay_period_start)} – {formatHumanDate(ps.pay_period_end)}
                        </td>
                        <td>{formatHumanDate(ps.payment_date)}</td>
                        <td>
                          {ps.currency} {Number(ps.gross_earnings).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          {ps.currency}{' '}
                          {Number(ps.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {ps.currency} {Number(ps.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <code>{ps.bank_account_masked}</code>
                        </td>
                        <td>
                          <StatusBadge status={ps.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={downloadingId === ps.id}
                            onClick={() => handleDownload(ps)}
                          >
                            <Download size={13} />
                            <span>{downloadingId === ps.id ? 'Generating...' : 'Download PDF'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

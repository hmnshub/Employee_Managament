import React, { useEffect, useState, useCallback } from 'react';
import { Lock, Save } from 'lucide-react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import { ErrorBanner, SuccessBanner, TableSkeleton } from '../components/AppShell.jsx';

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiRequest('/api/employees/me');
      setProfile(res.data.profile);
      const addr = res.data.address;
      if (addr) {
        setForm({
          version: addr.version,
          residential_line1: addr.residential_line1 || '',
          residential_line2: addr.residential_line2 || '',
          residential_city: addr.residential_city || '',
          residential_state: addr.residential_state || '',
          residential_postal_code: addr.residential_postal_code || '',
          residential_country: addr.residential_country || 'NP',
          mailing_same_as_residential: Boolean(addr.mailing_same_as_residential),
          mailing_line1: addr.mailing_line1 || '',
          mailing_line2: addr.mailing_line2 || '',
          mailing_city: addr.mailing_city || '',
          mailing_state: addr.mailing_state || '',
          mailing_postal_code: addr.mailing_postal_code || '',
          mailing_country: addr.mailing_country || 'NP',
          updated_at: addr.updated_at
        });
      }
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFieldChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const payload = {
        version: form.version,
        residential_line1: form.residential_line1,
        residential_line2: form.residential_line2 || null,
        residential_city: form.residential_city,
        residential_state: form.residential_state,
        residential_postal_code: form.residential_postal_code,
        residential_country: form.residential_country,
        mailing_same_as_residential: form.mailing_same_as_residential,
        mailing_line1: form.mailing_same_as_residential ? form.residential_line1 : form.mailing_line1,
        mailing_line2: form.mailing_same_as_residential ? form.residential_line2 || null : form.mailing_line2 || null,
        mailing_city: form.mailing_same_as_residential ? form.residential_city : form.mailing_city,
        mailing_state: form.mailing_same_as_residential ? form.residential_state : form.mailing_state,
        mailing_postal_code: form.mailing_same_as_residential ? form.residential_postal_code : form.mailing_postal_code,
        mailing_country: form.mailing_same_as_residential ? form.residential_country : form.mailing_country
      };

      const res = await apiRequest('/api/employees/me/address', {
        method: 'PATCH',
        body: payload
      });
      const updated = res.data.address;
      setForm({
        version: updated.version,
        residential_line1: updated.residential_line1 || '',
        residential_line2: updated.residential_line2 || '',
        residential_city: updated.residential_city || '',
        residential_state: updated.residential_state || '',
        residential_postal_code: updated.residential_postal_code || '',
        residential_country: updated.residential_country || 'NP',
        mailing_same_as_residential: Boolean(updated.mailing_same_as_residential),
        mailing_line1: updated.mailing_line1 || '',
        mailing_line2: updated.mailing_line2 || '',
        mailing_city: updated.mailing_city || '',
        mailing_state: updated.mailing_state || '',
        mailing_postal_code: updated.mailing_postal_code || '',
        mailing_country: updated.mailing_country || 'NP',
        updated_at: updated.updated_at
      });
      setSuccessMsg(`Address updated and recorded in audit trail (optimistic lock v${updated.version}).`);
    } catch (err) {
      setSubmitError(err);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} />;
  if (loadError) return <ErrorBanner error={loadError} onRetry={fetchProfile} />;
  if (!profile) return null;

  const LockedField = ({ label, value, id }) => (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        <span>{label}</span>
        <span className="locked-badge" title="Managed by HR; read-only for employees">
          <Lock size={11} /> Locked
        </span>
      </label>
      <input id={id} type="text" className="form-input" value={value || '—'} readOnly aria-readonly="true" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Employee Profile & Address</h2>
          <p className="page-description">
            Employment record fields are read-only. You may update your residential and mailing addresses below.
          </p>
        </div>
      </div>

      {/* Section 1: Authoritative Read-Only Employee Profile (F2) */}
      <section className="card" aria-labelledby="readonly-profile-heading">
        <div className="card-header">
          <h3 id="readonly-profile-heading" className="card-title">
            Official Employment Record (Read-Only)
          </h3>
          <span className="locked-badge">
            <Lock size={12} /> Protected by backend authorization policy
          </span>
        </div>

        <div className="grid-3">
          <LockedField id="ro-emp-code" label="Employee ID" value={profile.employee_code} />
          <LockedField id="ro-legal-name" label="Legal name" value={profile.legal_name} />
          <LockedField id="ro-department" label="Department" value={profile.department} />
          <LockedField id="ro-designation" label="Designation" value={profile.designation} />
          <LockedField id="ro-joining-date" label="Joining date" value={formatHumanDate(profile.joining_date)} />
          <LockedField
            id="ro-manager"
            label="Reporting manager"
            value={
              profile.manager
                ? `${profile.manager.legal_name} (${profile.manager.employee_code})`
                : 'Direct / Executive'
            }
          />
          <LockedField id="ro-nid" label="National ID (masked)" value={profile.national_id_masked} />
          <LockedField id="ro-pan" label="Tax PAN (masked)" value={profile.tax_pan_masked} />
          <LockedField id="ro-bank" label="Payroll bank account (masked)" value={profile.bank_account_masked} />
        </div>
      </section>

      {/* Section 2: Editable Residential & Mailing Address (F3) */}
      {form && (
        <section className="card" aria-labelledby="editable-address-heading">
          <div className="card-header">
            <h3 id="editable-address-heading" className="card-title">
              Residential & Mailing Address
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Version v{form.version} · Last updated {formatHumanDate(form.updated_at, true)}
            </span>
          </div>

          <ErrorBanner error={submitError} />
          <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

          <form onSubmit={handleSubmit} noValidate>
            <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Residential Address
            </h4>
            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="res-line1" className="form-label">
                  Residential address line 1 *
                </label>
                <input
                  id="res-line1"
                  type="text"
                  className={`form-input ${fieldErrors.residential_line1 ? 'has-error' : ''}`}
                  value={form.residential_line1}
                  onChange={(e) => handleFieldChange('residential_line1', e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.residential_line1 && (
                  <div className="field-error">{fieldErrors.residential_line1}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="res-line2" className="form-label">
                  Residential address line 2 (Ward / Tole)
                </label>
                <input
                  id="res-line2"
                  type="text"
                  className={`form-input ${fieldErrors.residential_line2 ? 'has-error' : ''}`}
                  value={form.residential_line2}
                  onChange={(e) => handleFieldChange('residential_line2', e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.residential_line2 && (
                  <div className="field-error">{fieldErrors.residential_line2}</div>
                )}
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label htmlFor="res-city" className="form-label">
                  City / Municipality *
                </label>
                <input
                  id="res-city"
                  type="text"
                  className={`form-input ${fieldErrors.residential_city ? 'has-error' : ''}`}
                  value={form.residential_city}
                  onChange={(e) => handleFieldChange('residential_city', e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.residential_city && (
                  <div className="field-error">{fieldErrors.residential_city}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="res-state" className="form-label">
                  Province / State *
                </label>
                <input
                  id="res-state"
                  type="text"
                  className={`form-input ${fieldErrors.residential_state ? 'has-error' : ''}`}
                  value={form.residential_state}
                  onChange={(e) => handleFieldChange('residential_state', e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.residential_state && (
                  <div className="field-error">{fieldErrors.residential_state}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="res-postal" className="form-label">
                  Postal code *
                </label>
                <input
                  id="res-postal"
                  type="text"
                  className={`form-input ${fieldErrors.residential_postal_code ? 'has-error' : ''}`}
                  value={form.residential_postal_code}
                  onChange={(e) => handleFieldChange('residential_postal_code', e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.residential_postal_code && (
                  <div className="field-error">{fieldErrors.residential_postal_code}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="res-country" className="form-label">
                  Country (ISO-2) *
                </label>
                <input
                  id="res-country"
                  type="text"
                  maxLength={2}
                  className={`form-input ${fieldErrors.residential_country ? 'has-error' : ''}`}
                  value={form.residential_country}
                  onChange={(e) => handleFieldChange('residential_country', e.target.value.toUpperCase())}
                  disabled={submitting}
                  required
                />
                {fieldErrors.residential_country && (
                  <div className="field-error">{fieldErrors.residential_country}</div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ margin: '12px 0 16px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.mailing_same_as_residential}
                  onChange={(e) => handleFieldChange('mailing_same_as_residential', e.target.checked)}
                  disabled={submitting}
                />
                <span style={{ fontWeight: 500 }}>Mailing address is the same as my residential address</span>
              </label>
            </div>

            {!form.mailing_same_as_residential && (
              <>
                <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  Mailing Address
                </h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="mail-line1" className="form-label">
                      Mailing address line 1 *
                    </label>
                    <input
                      id="mail-line1"
                      type="text"
                      className={`form-input ${fieldErrors.mailing_line1 ? 'has-error' : ''}`}
                      value={form.mailing_line1}
                      onChange={(e) => handleFieldChange('mailing_line1', e.target.value)}
                      disabled={submitting}
                      required
                    />
                    {fieldErrors.mailing_line1 && (
                      <div className="field-error">{fieldErrors.mailing_line1}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mail-line2" className="form-label">
                      Mailing address line 2
                    </label>
                    <input
                      id="mail-line2"
                      type="text"
                      className={`form-input ${fieldErrors.mailing_line2 ? 'has-error' : ''}`}
                      value={form.mailing_line2}
                      onChange={(e) => handleFieldChange('mailing_line2', e.target.value)}
                      disabled={submitting}
                    />
                    {fieldErrors.mailing_line2 && (
                      <div className="field-error">{fieldErrors.mailing_line2}</div>
                    )}
                  </div>
                </div>

                <div className="grid-4">
                  <div className="form-group">
                    <label htmlFor="mail-city" className="form-label">
                      Mailing city *
                    </label>
                    <input
                      id="mail-city"
                      type="text"
                      className={`form-input ${fieldErrors.mailing_city ? 'has-error' : ''}`}
                      value={form.mailing_city}
                      onChange={(e) => handleFieldChange('mailing_city', e.target.value)}
                      disabled={submitting}
                      required
                    />
                    {fieldErrors.mailing_city && (
                      <div className="field-error">{fieldErrors.mailing_city}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mail-state" className="form-label">
                      Mailing province / state *
                    </label>
                    <input
                      id="mail-state"
                      type="text"
                      className={`form-input ${fieldErrors.mailing_state ? 'has-error' : ''}`}
                      value={form.mailing_state}
                      onChange={(e) => handleFieldChange('mailing_state', e.target.value)}
                      disabled={submitting}
                      required
                    />
                    {fieldErrors.mailing_state && (
                      <div className="field-error">{fieldErrors.mailing_state}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mail-postal" className="form-label">
                      Mailing postal code *
                    </label>
                    <input
                      id="mail-postal"
                      type="text"
                      className={`form-input ${fieldErrors.mailing_postal_code ? 'has-error' : ''}`}
                      value={form.mailing_postal_code}
                      onChange={(e) => handleFieldChange('mailing_postal_code', e.target.value)}
                      disabled={submitting}
                      required
                    />
                    {fieldErrors.mailing_postal_code && (
                      <div className="field-error">{fieldErrors.mailing_postal_code}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mail-country" className="form-label">
                      Mailing country (ISO-2) *
                    </label>
                    <input
                      id="mail-country"
                      type="text"
                      maxLength={2}
                      className={`form-input ${fieldErrors.mailing_country ? 'has-error' : ''}`}
                      value={form.mailing_country}
                      onChange={(e) => handleFieldChange('mailing_country', e.target.value.toUpperCase())}
                      disabled={submitting}
                      required
                    />
                    {fieldErrors.mailing_country && (
                      <div className="field-error">{fieldErrors.mailing_country}</div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Save size={15} />
                <span>{submitting ? 'Saving address...' : 'Save address changes'}</span>
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

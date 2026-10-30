import { AppError } from '../utils/errors.js';

/**
 * Sanitizes plain text input by stripping dangerous HTML tags, script blocks,
 * event handlers, and control characters to prevent stored XSS.
 */
export function sanitizePlainText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*[a-zA-Z0-9:-]+[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on[a-z]+\s*=/gi, '')
    .trim();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const POSTAL_REGEX = /^[A-Za-z0-9 -]{3,12}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;
const SAFE_TEXT_REGEX = /^[^<>]*$/;

export function isValidUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function isValidIsoDate(val) {
  if (typeof val !== 'string' || !DATE_REGEX.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateUuidParam(id, paramName = 'id') {
  if (!isValidUuid(id)) {
    throw AppError.badRequest(`Invalid ${paramName}: must be a valid UUID`, {
      [paramName]: `Must be a valid UUID`
    });
  }
  return id.toLowerCase();
}

/**
 * Password policy validator (PDF Section 8 + prompt):
 * - Minimum 12 characters, maximum 128 characters
 * - At least one uppercase, one lowercase, one number, and one special character
 */
export function validatePasswordStrength(password, fieldName = 'password') {
  const errors = {};
  if (typeof password !== 'string') {
    errors[fieldName] = 'Password is required';
    return { valid: false, errors };
  }
  if (password.length < 12) {
    errors[fieldName] = 'Password must be at least 12 characters long';
  } else if (password.length > 128) {
    errors[fieldName] = 'Password cannot exceed 128 characters';
  } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errors[fieldName] = 'Password must include uppercase, lowercase, number, and special character';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates POST /api/auth/login body
 */
export function validateLoginInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!rawEmail) {
    fieldErrors.email = 'Email address is required';
  } else if (rawEmail.length > 254 || !EMAIL_REGEX.test(rawEmail)) {
    fieldErrors.email = 'Enter a valid email address';
  }

  if (!password) {
    fieldErrors.password = 'Password is required';
  } else if (password.length < 12) {
    fieldErrors.password = 'Password must be at least 12 characters long';
  } else if (password.length > 128) {
    fieldErrors.password = 'Password cannot exceed 128 characters';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Please correct the highlighted login fields.', fieldErrors);
  }

  return { email: rawEmail, password };
}

/**
 * Validates PATCH /api/employees/me/address body
 * Rejects any attempt to include read-only employee profile fields.
 */
const READONLY_PROFILE_FIELDS = [
  'employee_code',
  'employeeCode',
  'employee_id',
  'employeeId',
  'legal_name',
  'legalName',
  'department',
  'designation',
  'joining_date',
  'joiningDate',
  'manager_id',
  'managerId',
  'role',
  'salary',
  'basic_salary'
];

export function validateAddressUpdateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }

  const fieldErrors = {};

  for (const forbidden of READONLY_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, forbidden)) {
      fieldErrors[forbidden] = `${forbidden} is a read-only profile field and cannot be modified`;
    }
  }

  const version = body.version;
  if (!Number.isInteger(version) || version < 1) {
    fieldErrors.version = 'A valid positive integer version is required for optimistic locking';
  }

  function checkLine(val, key, label, required = true) {
    if (val === undefined || val === null || val === '') {
      if (required) fieldErrors[key] = `${label} is required`;
      return null;
    }
    if (typeof val !== 'string') {
      fieldErrors[key] = `${label} must be text`;
      return null;
    }
    if (!SAFE_TEXT_REGEX.test(val)) {
      fieldErrors[key] = `${label} cannot contain HTML tags or angle brackets`;
      return null;
    }
    const cleaned = sanitizePlainText(val);
    if (required && cleaned.length < 3) {
      fieldErrors[key] = `${label} must be at least 3 characters`;
    } else if (cleaned.length > 200) {
      fieldErrors[key] = `${label} cannot exceed 200 characters`;
    }
    return cleaned || null;
  }

  function checkPlace(val, key, label) {
    if (typeof val !== 'string' || !val.trim()) {
      fieldErrors[key] = `${label} is required`;
      return '';
    }
    if (!SAFE_TEXT_REGEX.test(val)) {
      fieldErrors[key] = `${label} cannot contain HTML tags`;
      return '';
    }
    const cleaned = sanitizePlainText(val);
    if (cleaned.length < 2 || cleaned.length > 100) {
      fieldErrors[key] = `${label} must be between 2 and 100 characters`;
    }
    return cleaned;
  }

  function checkPostal(val, key, label) {
    if (typeof val !== 'string' || !val.trim()) {
      fieldErrors[key] = `${label} is required`;
      return '';
    }
    const cleaned = val.trim();
    if (!POSTAL_REGEX.test(cleaned)) {
      fieldErrors[key] = `${label} must be 3 to 12 alphanumeric characters`;
    }
    return cleaned;
  }

  function checkCountry(val, key, label) {
    if (typeof val !== 'string' || !val.trim()) {
      fieldErrors[key] = `${label} is required`;
      return '';
    }
    const cleaned = val.trim().toUpperCase();
    if (!COUNTRY_REGEX.test(cleaned)) {
      fieldErrors[key] = `${label} must be a 2-letter ISO country code (e.g. NP)`;
    }
    return cleaned;
  }

  const residential_line1 = checkLine(body.residential_line1, 'residential_line1', 'Residential address line 1', true);
  const residential_line2 = checkLine(body.residential_line2, 'residential_line2', 'Residential address line 2', false);
  const residential_city = checkPlace(body.residential_city, 'residential_city', 'Residential city');
  const residential_state = checkPlace(body.residential_state, 'residential_state', 'Residential province/state');
  const residential_postal_code = checkPostal(body.residential_postal_code, 'residential_postal_code', 'Residential postal code');
  const residential_country = checkCountry(body.residential_country || 'NP', 'residential_country', 'Residential country');

  const mailing_same_as_residential = Boolean(body.mailing_same_as_residential);

  let mailing_line1 = residential_line1;
  let mailing_line2 = residential_line2;
  let mailing_city = residential_city;
  let mailing_state = residential_state;
  let mailing_postal_code = residential_postal_code;
  let mailing_country = residential_country;

  if (!mailing_same_as_residential) {
    mailing_line1 = checkLine(body.mailing_line1, 'mailing_line1', 'Mailing address line 1', true);
    mailing_line2 = checkLine(body.mailing_line2, 'mailing_line2', 'Mailing address line 2', false);
    mailing_city = checkPlace(body.mailing_city, 'mailing_city', 'Mailing city');
    mailing_state = checkPlace(body.mailing_state, 'mailing_state', 'Mailing province/state');
    mailing_postal_code = checkPostal(body.mailing_postal_code, 'mailing_postal_code', 'Mailing postal code');
    mailing_country = checkCountry(body.mailing_country || 'NP', 'mailing_country', 'Mailing country');
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Address validation failed. Please check the highlighted fields.', fieldErrors);
  }

  return {
    version,
    residential_line1,
    residential_line2,
    residential_city,
    residential_state,
    residential_postal_code,
    residential_country,
    mailing_same_as_residential,
    mailing_line1,
    mailing_line2,
    mailing_city,
    mailing_state,
    mailing_postal_code,
    mailing_country
  };
}

/**
 * Validates POST /api/leaves body
 */
export function validateCreateLeaveInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};

  const leave_type_id = typeof body.leave_type_id === 'string' ? body.leave_type_id.trim() : '';
  if (!isValidUuid(leave_type_id)) {
    fieldErrors.leave_type_id = 'Select a valid leave type';
  }

  const start_date = typeof body.start_date === 'string' ? body.start_date.trim() : '';
  const end_date = typeof body.end_date === 'string' ? body.end_date.trim() : '';

  if (!isValidIsoDate(start_date)) {
    fieldErrors.start_date = 'Start date must be a valid date in YYYY-MM-DD format';
  }
  if (!isValidIsoDate(end_date)) {
    fieldErrors.end_date = 'End date must be a valid date in YYYY-MM-DD format';
  }

  let total_days = 0;
  if (!fieldErrors.start_date && !fieldErrors.end_date) {
    const startMs = Date.parse(`${start_date}T00:00:00Z`);
    const endMs = Date.parse(`${end_date}T00:00:00Z`);
    if (endMs < startMs) {
      fieldErrors.end_date = 'End date must be on or after the start date.';
    } else {
      total_days = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      if (total_days > 60) {
        fieldErrors.end_date = 'Single leave request cannot exceed 60 consecutive days';
      }
      const startYear = Number(start_date.slice(0, 4));
      const endYear = Number(end_date.slice(0, 4));
      if (startYear !== endYear) {
        fieldErrors.end_date = 'Leave request dates must fall within the same calendar year';
      }
    }
  }

  const rawReason = typeof body.reason === 'string' ? body.reason : '';
  if (!SAFE_TEXT_REGEX.test(rawReason)) {
    fieldErrors.reason = 'Reason cannot contain HTML tags or angle brackets';
  } else {
    const cleanedReason = sanitizePlainText(rawReason);
    if (cleanedReason.length < 5) {
      fieldErrors.reason = 'Please provide a reason of at least 5 characters';
    } else if (cleanedReason.length > 500) {
      fieldErrors.reason = 'Reason cannot exceed 500 characters';
    }
  }

  let idempotency_key = null;
  if (body.idempotency_key !== undefined && body.idempotency_key !== null && body.idempotency_key !== '') {
    if (typeof body.idempotency_key !== 'string' || body.idempotency_key.length > 100 || !/^[A-Za-z0-9_-]+$/.test(body.idempotency_key)) {
      fieldErrors.idempotency_key = 'Idempotency key must be alphanumeric (max 100 chars)';
    } else {
      idempotency_key = body.idempotency_key;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Leave request validation failed.', fieldErrors);
  }

  return {
    leave_type_id: leave_type_id.toLowerCase(),
    start_date,
    end_date,
    total_days,
    reason: sanitizePlainText(rawReason),
    idempotency_key
  };
}

/**
 * Validates PATCH /api/leaves/:id/decision body
 */
export function validateLeaveDecisionInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};

  const decision = typeof body.decision === 'string' ? body.decision.trim().toUpperCase() : '';
  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    fieldErrors.decision = 'Decision must be either APPROVED or REJECTED';
  }

  let comment = null;
  if (body.comment !== undefined && body.comment !== null && body.comment !== '') {
    if (typeof body.comment !== 'string' || !SAFE_TEXT_REGEX.test(body.comment)) {
      fieldErrors.comment = 'Decision comment cannot contain HTML tags';
    } else {
      comment = sanitizePlainText(body.comment);
      if (comment.length > 500) {
        fieldErrors.comment = 'Decision comment cannot exceed 500 characters';
      }
    }
  }

  if (decision === 'REJECTED' && (!comment || comment.length < 3)) {
    fieldErrors.comment = 'Please provide a brief comment (at least 3 characters) when rejecting a leave request';
  }

  let version = null;
  if (body.version !== undefined && body.version !== null) {
    if (!Number.isInteger(body.version) || body.version < 1) {
      fieldErrors.version = 'Version must be a positive integer';
    } else {
      version = body.version;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Invalid leave decision parameters.', fieldErrors);
  }

  return { decision, comment, version };
}

/**
 * Generic pagination, sort, and filter query validator with strict allow-lists.
 * Rejects any unexpected or malicious SQL/NoSQL injection payloads in query params.
 */
export function validateListQuery(query, {
  allowedSortFields = ['created_at'],
  defaultSortField = 'created_at',
  defaultSortOrder = 'desc',
  allowedFilters = {}
} = {}) {
  const fieldErrors = {};

  let page = 1;
  if (query.page !== undefined && query.page !== '') {
    const p = Number(query.page);
    if (!Number.isInteger(p) || p < 1 || p > 10000) {
      fieldErrors.page = 'Page must be an integer between 1 and 10000';
    } else {
      page = p;
    }
  }

  let pageSize = 10;
  const rawLimit = query.pageSize ?? query.limit;
  if (rawLimit !== undefined && rawLimit !== '') {
    const l = Number(rawLimit);
    if (!Number.isInteger(l) || l < 1 || l > 50) {
      fieldErrors.pageSize = 'Page size must be an integer between 1 and 50';
    } else {
      pageSize = l;
    }
  }

  let sortBy = defaultSortField;
  if (query.sortBy !== undefined && query.sortBy !== '') {
    if (typeof query.sortBy !== 'string' || !allowedSortFields.includes(query.sortBy)) {
      fieldErrors.sortBy = `Invalid sortBy field. Allowed values: ${allowedSortFields.join(', ')}`;
    } else {
      sortBy = query.sortBy;
    }
  }

  let sortOrder = defaultSortOrder;
  if (query.sortOrder !== undefined && query.sortOrder !== '') {
    const ord = typeof query.sortOrder === 'string' ? query.sortOrder.toLowerCase() : '';
    if (ord !== 'asc' && ord !== 'desc') {
      fieldErrors.sortOrder = 'sortOrder must be asc or desc';
    } else {
      sortOrder = ord;
    }
  }

  const filters = {};
  for (const [key, rule] of Object.entries(allowedFilters)) {
    const val = query[key];
    if (val === undefined || val === '') continue;
    if (typeof val !== 'string') {
      fieldErrors[key] = `Invalid filter parameter ${key}`;
      continue;
    }
    if (rule.type === 'enum') {
      const upper = val.toUpperCase();
      if (!rule.values.includes(upper)) {
        fieldErrors[key] = `${key} must be one of: ${rule.values.join(', ')}`;
      } else {
        filters[key] = upper;
      }
    } else if (rule.type === 'uuid') {
      if (!isValidUuid(val)) {
        fieldErrors[key] = `${key} must be a valid UUID`;
      } else {
        filters[key] = val.toLowerCase();
      }
    } else if (rule.type === 'int') {
      const n = Number(val);
      if (!Number.isInteger(n) || (rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
        fieldErrors[key] = `${key} must be an integer between ${rule.min ?? '*'} and ${rule.max ?? '*'}`;
      } else {
        filters[key] = n;
      }
    } else if (rule.type === 'search') {
      // Allow only safe alphanumeric + spaces/hyphens/dots/@ for directory search
      const trimmed = val.trim();
      if (trimmed.length > 80 || !/^[a-zA-Z0-9 .@_-]+$/.test(trimmed)) {
        fieldErrors[key] = `${key} contains invalid characters`;
      } else {
        filters[key] = trimmed;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Invalid query parameters.', fieldErrors);
  }

  return { page, pageSize, sortBy, sortOrder, filters };
}

/**
 * Validates System Admin user creation/update inputs
 */
export function validateAdminCreateUserInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    fieldErrors.email = 'Valid email address is required';
  }

  const pwCheck = validatePasswordStrength(body.password, 'password');
  if (!pwCheck.valid) {
    Object.assign(fieldErrors, pwCheck.errors);
  }

  const role = typeof body.role === 'string' ? body.role.trim().toUpperCase() : '';
  if (!['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    fieldErrors.role = 'Role must be EMPLOYEE, MANAGER, HR_ADMIN, or SYSTEM_ADMIN';
  }

  const legal_name = typeof body.legal_name === 'string' && SAFE_TEXT_REGEX.test(body.legal_name)
    ? sanitizePlainText(body.legal_name)
    : '';
  if (legal_name.length < 3 || legal_name.length > 150) {
    fieldErrors.legal_name = 'Legal name must be between 3 and 150 characters';
  }

  const department = typeof body.department === 'string' && SAFE_TEXT_REGEX.test(body.department)
    ? sanitizePlainText(body.department)
    : '';
  if (department.length < 2 || department.length > 100) {
    fieldErrors.department = 'Department is required (2-100 chars)';
  }

  const designation = typeof body.designation === 'string' && SAFE_TEXT_REGEX.test(body.designation)
    ? sanitizePlainText(body.designation)
    : '';
  if (designation.length < 2 || designation.length > 100) {
    fieldErrors.designation = 'Designation is required (2-100 chars)';
  }

  const employee_code = typeof body.employee_code === 'string' ? body.employee_code.trim().toUpperCase() : '';
  if (!/^EMP-[0-9]{4}$/.test(employee_code)) {
    fieldErrors.employee_code = 'Employee code must match format EMP-XXXX (e.g. EMP-1011)';
  }

  let manager_id = null;
  if (body.manager_id !== undefined && body.manager_id !== null && body.manager_id !== '') {
    if (typeof body.manager_id === 'string' && UUID_REGEX.test(body.manager_id.trim())) {
      manager_id = body.manager_id.trim();
    } else {
      fieldErrors.manager_id = 'Manager ID must be a valid UUID';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('User creation validation failed.', fieldErrors);
  }

  return { email, password: body.password, role, legal_name, department, designation, employee_code, manager_id };
}

export function validateAdminUpdateUserInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};
  const updates = {};

  if (body.role !== undefined) {
    const r = typeof body.role === 'string' ? body.role.trim().toUpperCase() : '';
    if (!['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(r)) {
      fieldErrors.role = 'Role must be EMPLOYEE, MANAGER, HR_ADMIN, or SYSTEM_ADMIN';
    } else {
      updates.role = r;
    }
  }

  if (body.status !== undefined) {
    const s = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';
    if (!['ACTIVE', 'LOCKED', 'ARCHIVED'].includes(s)) {
      fieldErrors.status = 'Status must be ACTIVE, LOCKED, or ARCHIVED';
    } else {
      updates.status = s;
    }
  }

  if (body.manager_id !== undefined) {
    if (body.manager_id === null || body.manager_id === '') {
      updates.manager_id = null;
    } else if (typeof body.manager_id === 'string' && UUID_REGEX.test(body.manager_id.trim())) {
      updates.manager_id = body.manager_id.trim();
    } else {
      fieldErrors.manager_id = 'Manager ID must be a valid UUID or empty';
    }
  }

  if (Object.keys(updates).length === 0 && Object.keys(fieldErrors).length === 0) {
    fieldErrors.general = 'Provide at least role, status, or manager_id to update';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Invalid user update parameters.', fieldErrors);
  }

  return updates;
}

export function validateCreateLeaveTypeInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a JSON object');
  }
  const fieldErrors = {};
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z_]{2,32}$/.test(code)) {
    fieldErrors.code = 'Code must be 2-32 uppercase letters or underscores';
  }
  const name = typeof body.name === 'string' && SAFE_TEXT_REGEX.test(body.name) ? sanitizePlainText(body.name) : '';
  if (name.length < 3 || name.length > 100) {
    fieldErrors.name = 'Name must be between 3 and 100 characters';
  }
  const description = typeof body.description === 'string' && SAFE_TEXT_REGEX.test(body.description)
    ? sanitizePlainText(body.description)
    : '';
  if (description.length < 5 || description.length > 500) {
    fieldErrors.description = 'Description must be between 5 and 500 characters';
  }
  const default_annual_quota = Number(body.default_annual_quota);
  if (!Number.isInteger(default_annual_quota) || default_annual_quota < 1 || default_annual_quota > 365) {
    fieldErrors.default_annual_quota = 'Default annual quota must be an integer between 1 and 365';
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw AppError.badRequest('Invalid leave type configuration.', fieldErrors);
  }
  return {
    code,
    name,
    description,
    default_annual_quota,
    is_paid: body.is_paid !== undefined ? Boolean(body.is_paid) : true
  };
}

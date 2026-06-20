import { describe, it, expect } from 'vitest';
import { getMonthLabelWithYear, formatCurrency, formatReceiptPeriod } from '../lib/constants';
import { getAdmAcademicIndex } from '../hooks/useStudents';
import type { Receipt } from '../lib/constants';

describe('Financial Calculations & Formatter Unit Tests', () => {
  describe('getMonthLabelWithYear', () => {
    it('returns formatted label for months in starting year', () => {
      expect(getMonthLabelWithYear('MAR', '2026-27')).toBe('Mar 26');
      expect(getMonthLabelWithYear('DEC', '2026-27')).toBe('Dec 26');
    });

    it('returns formatted label for months in ending year (JAN, FEB)', () => {
      expect(getMonthLabelWithYear('JAN', '2026-27')).toBe('Jan 27');
      expect(getMonthLabelWithYear('FEB', '2026-27')).toBe('Feb 27');
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers into Indian Rupees currency format without fraction digits', () => {
      // Note: Intl format can use non-breaking spaces or different representations of INR depending on env,
      // but the numeric format should match. Let's normalize spaces for assertion or verify digits.
      const formatted = formatCurrency(1500).replace(/\s/g, ' ');
      // Usually either "₹1,500" or "INR 1,500". en-IN normally produces "₹1,500"
      expect(formatted).toContain('1,500');
      expect(formatted).toContain('₹');
    });
  });

  describe('getAdmAcademicIndex', () => {
    it('returns 0 if date is undefined', () => {
      expect(getAdmAcademicIndex(undefined, '2026-27')).toBe(0);
    });

    it('returns 0 if student joined in a prior academic year', () => {
      // Admission: 2025-05-10, Active Year: 2026-27
      expect(getAdmAcademicIndex('2025-05-10', '2026-27')).toBe(0);
    });

    it('returns 12 if student joined in a future academic year', () => {
      // Admission: 2027-05-10, Active Year: 2026-27
      expect(getAdmAcademicIndex('2027-05-10', '2026-27')).toBe(12);
    });

    it('returns correct index if student joined in the current academic year', () => {
      // Current year: 2026. Academic year starting in March.
      // MAR: 0, APR: 1, MAY: 2, ..., FEB: 11
      expect(getAdmAcademicIndex('2026-03-01', '2026-27')).toBe(0); // MAR
      expect(getAdmAcademicIndex('2026-04-15', '2026-27')).toBe(1); // APR
      expect(getAdmAcademicIndex('2026-12-25', '2026-27')).toBe(9); // DEC
      expect(getAdmAcademicIndex('2027-01-10', '2026-27')).toBe(10); // JAN (part of 2026-27 cycle)
    });
  });

  describe('formatReceiptPeriod', () => {
    it('returns period unchanged if it already contains numbers', () => {
      const receipt: Receipt = {
        id: 'JR-260605-A1',
        studentId: '123',
        studentName: 'Test Student',
        category: 'Junior',
        class: '5th',
        school: 'School',
        feePerMonth: 500,
        period: 'Mar 26 – Apr 26',
        months: ['MAR', 'APR'],
        amtPaid: 1000,
        prevDue: 0,
        totalRecv: 1000,
        nextDue: 'May',
        notes: '',
        generatedOn: new Date().toISOString(),
        generatedBy: 'Admin',
        academicYear: '2026-27',
      };
      expect(formatReceiptPeriod(receipt)).toBe('Mar 26 – Apr 26');
    });

    it('correctly formats legacy receipt periods by appending year suffix', () => {
      const receipt: Receipt = {
        id: 'JR-260605-A2',
        studentId: '123',
        studentName: 'Test Student',
        category: 'Junior',
        class: '5th',
        school: 'School',
        feePerMonth: 500,
        period: 'Mar – Apr', // no year numbers
        months: ['MAR', 'APR'],
        amtPaid: 1000,
        prevDue: 0,
        totalRecv: 1000,
        nextDue: 'May',
        notes: '',
        generatedOn: '2026-06-05T10:00:00Z',
        generatedBy: 'Admin',
        academicYear: '2026-27',
      };
      expect(formatReceiptPeriod(receipt)).toBe('Mar 26 – Apr 26');
    });
  });
});

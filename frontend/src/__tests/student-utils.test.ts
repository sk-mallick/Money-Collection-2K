import { describe, it, expect } from 'vitest';
import { generateStudentIdForGroup } from '../lib/student-utils';
import type { Student } from '../lib/constants';

// Helper to create a minimal dummy student object for testing
function createDummyStudent(id: string, group?: string): Student {
  return {
    id,
    group,
    name: 'Dummy',
    category: 'Junior',
    class: '',
    school: '',
    contactNo: '',
    fatherNo: '',
    motherNo: '',
    admDate: '2026-06-01',
    dob: '',
    feePerMonth: 700,
    notes: '',
    createdAt: '',
    updatedAt: '',
  };
}

describe('generateStudentIdForGroup unit tests', () => {
  it('returns empty string if groupId is empty', () => {
    const result = generateStudentIdForGroup('', []);
    expect(result).toBe('');
  });

  it('starts from 01 if there are no existing students', () => {
    const result = generateStudentIdForGroup('A', []);
    expect(result).toBe('A01');
  });

  it('generates the next sequential ID when no gaps are present', () => {
    const students = [
      createDummyStudent('A01', 'A'),
      createDummyStudent('A02', 'A'),
      createDummyStudent('A03', 'A'),
    ];
    const result = generateStudentIdForGroup('A', students);
    expect(result).toBe('A04');
  });

  it('fills the first empty space/gap in the sequence', () => {
    const students = [
      createDummyStudent('B01', 'B'),
      // B02 is missing!
      createDummyStudent('B03', 'B'),
    ];
    const result = generateStudentIdForGroup('B', students);
    expect(result).toBe('B02');
  });

  it('starts from 01 if the very first ID is missing', () => {
    const students = [
      // A01 is missing!
      createDummyStudent('A02', 'A'),
      createDummyStudent('A03', 'A'),
    ];
    const result = generateStudentIdForGroup('A', students);
    expect(result).toBe('A01');
  });

  it('ignores students from other groups when determining the ID', () => {
    const students = [
      createDummyStudent('A01', 'A'),
      createDummyStudent('A02', 'A'),
      createDummyStudent('C01', 'C'),
    ];
    // Asking for next ID in Group B
    const result = generateStudentIdForGroup('B', students);
    expect(result).toBe('B01');
  });

  it('correctly handles non-padded IDs when identifying gaps', () => {
    const students = [
      createDummyStudent('C1', 'C'), // non-padded representation of 1
      createDummyStudent('C3', 'C'), // non-padded representation of 3
    ];
    const result = generateStudentIdForGroup('C', students);
    expect(result).toBe('C02'); // gap at 2
  });

  it('correctly increments beyond 09 without leading zero', () => {
    const students = Array.from({ length: 9 }, (_, i) => 
      createDummyStudent(`D0${i + 1}`, 'D')
    );
    // D01 through D09 exist
    const result = generateStudentIdForGroup('D', students);
    expect(result).toBe('D10'); // next number is 10, no leading zero
  });
});

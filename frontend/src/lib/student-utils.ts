import type { Student } from './constants';

/**
 * Generates the next available Student ID for a given group prefix, starting from 1
 * and filling in any empty/deleted gaps in the existing students list.
 */
export function generateStudentIdForGroup(groupId: string, allStudents: Student[]): string {
  if (!groupId) return '';
  const prefix = groupId.toUpperCase();
  
  const pattern = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const usedNumbers = new Set<number>();
  
  for (const s of allStudents) {
    const match = s.id.match(pattern);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  }
  
  let nextNum = 1;
  while (true) {
    const suffix = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const constructedId = `${prefix}${suffix}`;
    
    const isIdUsed = allStudents.some(s => s.id.toUpperCase() === constructedId.toUpperCase());
    
    if (!usedNumbers.has(nextNum) && !isIdUsed) {
      return constructedId;
    }
    nextNum++;
  }
}

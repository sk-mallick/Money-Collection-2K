import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api, fetchStudents } from '@/lib/api';
import type { Student } from '@/lib/constants';
import { formatDateISO, formatCurrency } from '@/lib/constants';
import { generateStudentIdForGroup } from '@/lib/student-utils';
import { Loader2, RotateCcw, Info } from 'lucide-react';
import { useGroups } from '@/hooks/useStudents';
import { useSettings } from '@/hooks/useStudents';

const isClass10 = (classStr: string): boolean => {
  if (!classStr) return false;
  return /\b10\b/.test(classStr) || classStr.toLowerCase().includes('10th') || classStr.toLowerCase().includes('ten');
};

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSaved: () => void;
}

export function StudentForm({ open, onOpenChange, student, onSaved }: StudentFormProps) {
  const isEdit = !!student;
  const [loading, setLoading] = useState(false);
  const { groups } = useGroups();
  const { settings } = useSettings();
  const [form, setForm] = useState({
    id: '',
    name: '',
    category: 'Junior' as 'Junior' | 'Senior',
    class: '',
    school: '',
    contactNo: '',
    fatherNo: '',
    motherNo: '',
    admDate: formatDateISO(new Date()),
    dob: '',
    feePerMonth: 1000 as string | number,
    notes: '',
    group: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (student) {
        setForm({
          id: student.id,
          name: student.name,
          category: student.category,
          class: student.class || '',
          school: student.school || '',
          contactNo: student.contactNo || '',
          fatherNo: student.fatherNo || '',
          motherNo: student.motherNo || '',
          admDate: student.admDate || formatDateISO(new Date()),
          dob: student.dob || '',
          feePerMonth: student.feePerMonth,
          notes: student.notes || '',
          group: student.group || '',
        });
      } else {
        setForm({
          id: '',
          name: '',
          category: 'Junior',
          class: '',
          school: '',
          contactNo: '',
          fatherNo: '',
          motherNo: '',
          admDate: formatDateISO(new Date()),
          dob: '',
          feePerMonth: settings.feeJunior ? Number(settings.feeJunior) : 1000,
          notes: '',
          group: '',
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [student, open, settings]);

  const handleGroupChange = async (groupId: string) => {
    const selectedGroupVal = groupId === 'none' ? '' : groupId;
    
    setForm(prev => {
      const updated = { ...prev, group: selectedGroupVal };
      if (!isEdit && selectedGroupVal) {
        const selectedGroupObj = groups.find(g => g.id === selectedGroupVal);
        if (selectedGroupObj) {
          updated.category = selectedGroupObj.category;
          updated.class = selectedGroupObj.class;
          
          const defaultFee = isClass10(selectedGroupObj.class)
            ? 1300
            : (selectedGroupObj.category === 'Junior'
              ? (settings.feeJunior ? Number(settings.feeJunior) : 1000)
              : (settings.feeSenior ? Number(settings.feeSenior) : 1000));
          updated.feePerMonth = defaultFee;
        }
      }
      return updated;
    });

    if (selectedGroupVal) {
      if (isEdit && selectedGroupVal === (student?.group || '')) {
        updateField('id', student?.id || '');
      } else {
        try {
          const allStudents = await fetchStudents();
          const generatedId = generateStudentIdForGroup(selectedGroupVal, allStudents);
          updateField('id', generatedId);
        } catch (err) {
          console.error('Failed to generate student ID:', err);
        }
      }
    } else {
      updateField('id', isEdit ? (student?.id || '') : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentId = form.id.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

    if (!studentId || !form.name.trim() || !form.admDate) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setLoading(true);

    try {
      const studentData = {
        id: studentId,
        name: form.name.trim(),
        category: form.category,
        class: form.class.trim(),
        school: form.school.trim(),
        contactNo: form.contactNo.trim(),
        fatherNo: form.fatherNo.trim(),
        motherNo: form.motherNo.trim(),
        admDate: form.admDate,
        dob: form.dob,
        feePerMonth: Number(form.feePerMonth) || 1000,
        notes: form.notes.trim(),
        group: form.group || undefined,
      };

      if (isEdit) {
        await api.updateStudent(student!.id, studentData);
        toast.success('Student updated successfully');
      } else {
        await api.createStudent(studentData);
        toast.success('Student added successfully');
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('already exists')) {
        toast.error(`Student ID "${form.id}" already exists! Use a unique ID.`);
      } else {
        toast.error(isEdit ? 'Failed to update student' : 'Failed to add student');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (cat: 'Junior' | 'Senior') => {
    updateField('category', cat);
    if (!isEdit) {
      const defaultFee = isClass10(form.class)
        ? 1300
        : (cat === 'Junior'
          ? (settings.feeJunior ? Number(settings.feeJunior) : 1000)
          : (settings.feeSenior ? Number(settings.feeSenior) : 1000));
      updateField('feePerMonth', defaultFee);
    }
  };

  const handleClassChange = (value: string) => {
    setForm(prev => {
      const updated = { ...prev, class: value };
      if (!isEdit) {
        const defaultFee = isClass10(value)
          ? 1300
          : (prev.category === 'Junior'
            ? (settings.feeJunior ? Number(settings.feeJunior) : 1000)
            : (settings.feeSenior ? Number(settings.feeSenior) : 1000));
        updated.feePerMonth = defaultFee;
      }
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription className="sr-only">
            Form for entering student personal details and assigning them to a group batch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Group Batch */}
            <div className="space-y-2">
              <Label htmlFor="group">Group Batch</Label>
              <Select value={form.group || 'none'} onValueChange={handleGroupChange}>
                <SelectTrigger id="group" className="w-full cursor-pointer">
                  <SelectValue placeholder="No Group Assigned" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="none">No Group Assigned</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.id} - {g.class} ({g.timing})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student ID */}
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID *</Label>
              <Input
                id="studentId"
                placeholder="e.g. S01"
                value={form.id}
                onChange={e => updateField('id', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={10}
                required
                className="uppercase"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={form.category} onValueChange={v => handleCategoryChange(v as 'Junior' | 'Senior')}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fee Per Month */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="fee">Fee Per Month (₹) *</Label>
                {(() => {
                  const defaultFee = isClass10(form.class)
                    ? 1300
                    : (form.category === 'Junior'
                      ? Number(settings.feeJunior || '1000')
                      : Number(settings.feeSenior || '1000'));
                  const currentFee = Number(form.feePerMonth);
                  const isCustom = currentFee !== defaultFee && currentFee > 0;

                  if (isCustom) {
                    return (
                      <button
                        type="button"
                        onClick={() => updateField('feePerMonth', defaultFee)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/15 px-1.5 py-0.5 rounded-md"
                      >
                        <RotateCcw className="size-2.5" />
                        Reset to {formatCurrency(defaultFee)}
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
              <Input
                id="fee"
                type="number"
                min={0}
                placeholder={isClass10(form.class) ? "1300" : "1000"}
                value={form.feePerMonth}
                onChange={e => updateField('feePerMonth', e.target.value)}
                required
                className={(() => {
                  const defaultFee = isClass10(form.class)
                    ? 1300
                    : (form.category === 'Junior'
                      ? Number(settings.feeJunior || '1000')
                      : Number(settings.feeSenior || '1000'));
                  const currentFee = Number(form.feePerMonth);
                  return currentFee !== defaultFee && currentFee > 0
                    ? 'border-amber-500/50 focus-visible:ring-amber-500 font-bold'
                    : '';
                })()}
              />
              {(() => {
                const defaultFee = isClass10(form.class)
                  ? 1300
                  : (form.category === 'Junior'
                    ? Number(settings.feeJunior || '1000')
                    : Number(settings.feeSenior || '1000'));
                const currentFee = Number(form.feePerMonth);
                const isCustom = currentFee !== defaultFee && currentFee > 0;

                if (isCustom) {
                  return (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium mt-1">
                      <Info className="size-3 shrink-0" />
                      Custom fee — default for {isClass10(form.class) ? 'Class 10' : form.category} is {formatCurrency(defaultFee)}
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                placeholder="e.g. Class 9"
                value={form.class}
                onChange={e => handleClassChange(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                placeholder="e.g. DAV School"
                value={form.school}
                onChange={e => updateField('school', e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Contact No */}
            <div className="space-y-2">
              <Label htmlFor="contact">Contact No</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="Phone number"
                value={form.contactNo}
                onChange={e => updateField('contactNo', e.target.value)}
                maxLength={15}
              />
            </div>

            {/* Father's No */}
            <div className="space-y-2">
              <Label htmlFor="fatherNo">Father's No</Label>
              <Input
                id="fatherNo"
                type="tel"
                placeholder="Father's phone"
                value={form.fatherNo}
                onChange={e => updateField('fatherNo', e.target.value)}
                maxLength={15}
              />
            </div>

            {/* Mother's No */}
            <div className="space-y-2">
              <Label htmlFor="motherNo">Mother's No</Label>
              <Input
                id="motherNo"
                type="tel"
                placeholder="Mother's phone"
                value={form.motherNo}
                onChange={e => updateField('motherNo', e.target.value)}
                maxLength={15}
              />
            </div>

            {/* Admission Date */}
            <div className="space-y-2">
              <Label htmlFor="admDate">Admission Date *</Label>
              <Input
                id="admDate"
                type="date"
                value={form.admDate}
                onChange={e => updateField('admDate', e.target.value)}
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={e => updateField('dob', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional remarks"
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Update Student' : 'Add Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

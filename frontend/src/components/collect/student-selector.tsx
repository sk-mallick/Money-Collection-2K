import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Student } from '@/lib/constants';

interface StudentSelectorProps {
  search: string;
  setSearch: (val: string) => void;
  filteredStudents: Student[];
  selectStudent: (s: Student) => void;
}

export function StudentSelector({
  search,
  setSearch,
  filteredStudents,
  selectStudent,
}: StudentSelectorProps) {
  return (
    <div className="max-w-md">
      <Label>Search Student</Label>
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {filteredStudents.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {filteredStudents.map(s => (
              <button
                key={s.id}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => selectStudent(s)}
              >
                <span className="font-mono text-xs font-bold text-muted-foreground">{s.id}</span>
                <span className="font-medium">{s.name}</span>
                <Badge
                  className={
                    s.category === 'Junior'
                      ? 'ml-auto bg-blue-600 text-white dark:bg-blue-500 text-xs font-bold border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors'
                      : 'ml-auto bg-red-600 text-white dark:bg-red-500 text-xs font-bold border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'
                  }
                >
                  {s.category}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

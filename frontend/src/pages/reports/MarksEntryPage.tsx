import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MarksEntryPageLoading } from '@/components/loading-skeletons';
import { toast } from 'sonner';
import {
  fetchResultPeriod,
  fetchMarks,
  saveMarks,
  updateResultPeriod,
  type ResultPeriod,
  type StudentResult,
  type StudentMark,
} from '@/lib/reports-api';
import { MONTH_NAMES } from '@/lib/constants';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Lock,
  User,
  Check,
  Layers,
  Copy,
  LayoutList,
  Table as TableIcon,
  ChevronsUpDown,
  X,
  Filter,
  UserX,
  UserCheck,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Keyboard,
  PenLine,
  Settings,
} from 'lucide-react';

// ─── UNIFIED MARKS DROPDOWN + MANUAL INPUT COMPONENT ─────────────────────────────
interface MarksDropdownInputProps {
  obtainedMarks: number | null;
  isAbsent: boolean;
  maxMarks: number;
  onChange: (obtainedMarks: number | null, isAbsent: boolean) => void;
  className?: string;
  isTable?: boolean;
  rowIndex?: number;
  colIndex?: number;
  onNavigate?: (
    rowIndex: number,
    colIndex: number,
    field: 'obtained' | 'max',
    direction: 'next' | 'prev' | 'up' | 'down'
  ) => void;
  inputMode?: 'dropdown' | 'normal';
}

function MarksDropdownInput({
  obtainedMarks,
  isAbsent,
  maxMarks,
  onChange,
  className = '',
  isTable = false,
  rowIndex,
  colIndex,
  onNavigate,
  inputMode = 'dropdown',
}: MarksDropdownInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // Sync internal display value with current props
  useEffect(() => {
    if (isAbsent) {
      setInputValue(isTable ? 'A' : 'Absent');
    } else if (obtainedMarks !== null && obtainedMarks !== undefined) {
      setInputValue(String(obtainedMarks));
    } else {
      setInputValue('');
    }
  }, [obtainedMarks, isAbsent, isTable]);

  // Click outside listener to close dropdown menu & smart placement check
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Determine if dropdown should flip upwards to prevent overlapping / clipping
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > 150) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inputMode === 'dropdown') return;
    const raw = e.target.value;

    const trimmed = raw.trim().toLowerCase();
    if (trimmed === 'a' || trimmed === 'absent') {
      onChange(null, true);
      return;
    }

    // Strictly numbers only: digits and at most one decimal point
    let val = raw.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }

    setInputValue(val);

    if (val === '') {
      onChange(null, false);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if (maxMarks > 0 && num > maxMarks) {
          toast.error(`Marks cannot exceed maximum of ${maxMarks}`);
        }
        onChange(num, false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 0. Jump shortcut '/': prevent '/' from typing into marks and let it bubble to global jump handler
    if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      return;
    }

    // Space key: in dropdown mode, toggle dropdown menu
    if (e.key === ' ' && inputMode === 'dropdown') {
      e.preventDefault();
      setIsOpen(!isOpen);
      return;
    }

    // In dropdown mode, prevent direct typing and Enter key - dropdown means dropdown only
    if (inputMode === 'dropdown') {
      if (
        e.key !== 'Tab' &&
        !e.key.startsWith('Arrow') &&
        e.key !== 'Escape'
      ) {
        e.preventDefault();
        return;
      }
    }

    // 1. Enter key: in normal mode, advances from Secured Mark to Max Mark of this subject
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputMode === 'normal' && onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'obtained', e.shiftKey ? 'prev' : 'next');
      }
      return;
    }

    // 2. Tab key: advances to Max Mark or retreats to previous Max Mark
    if (e.key === 'Tab') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'obtained', e.shiftKey ? 'prev' : 'next');
      }
      return;
    }

    // 3. Arrow Down: move down to same subject for next student
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'obtained', 'down');
      }
      return;
    }

    // 4. Arrow Up: move up to same subject for previous student
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'obtained', 'up');
      }
      return;
    }

    // 5. Arrow Right: when at the end of input, advance to Max Mark of this subject
    if (e.key === 'ArrowRight') {
      if (inputRef.current && (inputRef.current.selectionStart === inputRef.current.value.length || inputRef.current.value === '')) {
        e.preventDefault();
        if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
          onNavigate(rowIndex, colIndex, 'obtained', 'next');
        }
      }
      return;
    }

    // 6. Arrow Left: when at beginning of input, retreat to previous cell
    if (e.key === 'ArrowLeft') {
      if (inputRef.current && inputRef.current.selectionStart === 0 && inputRef.current.selectionEnd === 0) {
        e.preventDefault();
        if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
          onNavigate(rowIndex, colIndex, 'obtained', 'prev');
        }
      }
      return;
    }

    // 7. Instant Absent with 'a' or 'A' key
    if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (inputMode === 'dropdown') return;
      e.preventDefault();
      onChange(null, true);
      return;
    }

    // 8. Strictly block any non-numeric characters (letters, symbols, punctuation, spaces)
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      !(e.key >= '0' && e.key <= '9') &&
      e.key !== '.'
    ) {
      e.preventDefault();
      return;
    }

    // Prevent duplicate decimal points
    if (e.key === '.' && inputValue.includes('.')) {
      e.preventDefault();
      return;
    }
  };

  const handleSelectAbsent = () => {
    onChange(null, true);
    setIsOpen(false);
  };

  const handleSelectNumber = (num: number) => {
    onChange(num, false);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, false);
    setIsOpen(false);
    if (inputMode === 'normal' && inputRef.current) inputRef.current.focus();
  };

  const marksListRef = useRef<HTMLDivElement>(null);

  // Generate integer dropdown options (from maxMarks down to 0, up to 500)
  const numberOptions = useMemo(() => {
    const max = maxMarks && maxMarks > 0 ? Math.min(maxMarks, 500) : 150;
    const list: number[] = [];
    for (let i = max; i >= 0; i--) {
      list.push(i);
    }
    return list;
  }, [maxMarks]);

  useEffect(() => {
    if (isOpen && marksListRef.current && obtainedMarks !== null && !isAbsent) {
      setTimeout(() => {
        const target = marksListRef.current?.querySelector<HTMLElement>(`[data-num="${obtainedMarks}"]`);
        if (target) {
          target.scrollIntoView({ block: 'nearest' });
        }
      }, 10);
    }
  }, [isOpen, obtainedMarks, isAbsent]);

  const isExceeded = !isAbsent && maxMarks > 0 && obtainedMarks !== null && obtainedMarks > maxMarks;

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <div
        className={`flex items-center rounded-md border transition-all ${
          isAbsent
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : isExceeded
            ? 'border-destructive bg-destructive/5 ring-1 ring-destructive'
            : obtainedMarks !== null
            ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
            : 'border-input bg-card'
        }`}
      >
        {isAbsent ? (
          /* When Absent: Click or keyboard focus to open dropdown, edit, or navigate */
          <div
            tabIndex={0}
            data-marks-container="true"
            data-row={rowIndex}
            data-col={colIndex}
            onClick={() => {
              if (inputMode === 'normal') {
                onChange(null, false);
                setTimeout(() => {
                  if (inputRef.current) inputRef.current.focus();
                }, 10);
              } else {
                setIsOpen(!isOpen);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (inputMode === 'normal' && onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', e.shiftKey ? 'prev' : 'next');
                }
                return;
              }
              if (e.key === 'Tab') {
                e.preventDefault();
                if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', e.shiftKey ? 'prev' : 'next');
                }
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', 'down');
                }
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', 'up');
                }
                return;
              }
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', 'next');
                }
                return;
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
                  onNavigate(rowIndex, colIndex, 'obtained', 'prev');
                }
                return;
              }
              if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                onChange(Number(e.key), false);
                return;
              }
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                onChange(null, false);
                return;
              }
            }}
            className={`flex-1 flex items-center w-full cursor-pointer select-none outline-none focus:ring-1 focus:ring-primary ${
              isTable ? 'h-8 text-xs' : 'h-8 text-xs sm:text-sm'
            }`}
          >
            {isTable ? (
              <span
                className={`w-full font-mono font-bold text-center text-destructive ${
                  inputMode === 'normal' ? 'px-1' : 'pl-5 pr-1'
                }`}
              >
                A
              </span>
            ) : (
              <div className="flex items-center gap-1.5 font-bold font-mono pl-2">
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                <span className="hidden sm:inline text-destructive">Absent</span>
                <span className="sm:hidden font-black text-destructive">A</span>
              </div>
            )}
            {inputMode !== 'normal' && (
              <div
                className={`${
                  isTable ? 'w-5 pr-1.5' : 'w-6 pr-1.5'
                } flex items-center justify-center text-destructive/70 hover:text-destructive cursor-pointer focus:outline-none shrink-0 ${
                  !isTable ? 'ml-auto' : ''
                }`}
              >
                <ChevronDown
                  className={`${
                    isTable ? 'h-3 w-3' : 'h-3.5 w-3.5'
                  } shrink-0 transition-transform duration-150 ${
                    isOpen ? 'rotate-180 text-destructive' : ''
                  }`}
                />
              </div>
            )}
          </div>
        ) : (
          /* Number Input: interactive div in dropdown mode (never opens mobile keyboard), real input in normal mode */
          <div className="flex items-center w-full">
            {inputMode === 'dropdown' ? (
              <div
                ref={divRef}
                tabIndex={0}
                role="combobox"
                aria-expanded={isOpen}
                data-marks-input="true"
                data-row={rowIndex}
                data-col={colIndex}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`w-full font-mono font-bold text-center bg-transparent outline-none cursor-pointer select-none flex items-center justify-center ${
                  isTable ? 'h-8 text-xs pl-5 pr-1' : 'h-8 text-xs sm:text-sm pl-6 pr-1.5'
                }`}
                title="Select marks from dropdown"
              >
                {inputValue !== '' ? (
                  <span>{inputValue}</span>
                ) : (
                  <span className="text-muted-foreground/60 font-semibold">0</span>
                )}
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                data-marks-input="true"
                data-row={rowIndex}
                data-col={colIndex}
                className={`w-full font-mono font-bold text-center bg-transparent outline-none placeholder:text-muted-foreground/60 placeholder:font-semibold ${
                  isTable
                    ? 'h-8 text-xs px-1'
                    : 'h-8 text-xs sm:text-sm px-1.5'
                }`}
                title="Enter marks"
              />
            )}
            {inputMode !== 'normal' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                className={`${
                  isTable ? 'w-5 pr-1.5' : 'w-6 pr-1.5'
                } flex items-center justify-center text-muted-foreground/70 hover:text-foreground cursor-pointer focus:outline-none shrink-0`}
                title="Select marks or Absent"
                tabIndex={-1}
              >
                <ChevronDown
                  className={`${
                    isTable ? 'h-3 w-3' : 'h-3.5 w-3.5'
                  } shrink-0 transition-transform duration-150 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Compact Dropdown Menu for Marks & Absent (Only when not in normal input mode) */}
      {inputMode !== 'normal' && isOpen && (
        <div
          className={`absolute left-0 z-50 w-full min-w-[70px] bg-popover text-popover-foreground border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: '180px' }}
        >
          {/* Top Option: Absent */}
          <div className="p-0.5 border-b bg-destructive/5">
            <button
              type="button"
              onClick={handleSelectAbsent}
              className="w-full text-center py-1 rounded text-xs font-bold text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Absent</span>
              <span className="sm:hidden">A</span>
            </button>
          </div>

          {/* Clean Number List */}
          <div
            ref={marksListRef}
            className="overflow-y-auto max-h-[120px] p-0.5 divide-y divide-border/20"
          >
            {numberOptions.map((num) => (
              <button
                key={num}
                type="button"
                data-num={num}
                onClick={() => handleSelectNumber(num)}
                className={`w-full text-center py-1 text-xs font-mono rounded hover:bg-accent transition-colors cursor-pointer ${
                  !isAbsent && obtainedMarks === num
                    ? 'bg-primary/15 text-primary font-bold'
                    : ''
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Option: Clear */}
          <div className="p-0.5 border-t bg-muted/20">
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-center py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAXIMUM MARKS DROPDOWN + MANUAL INPUT COMPONENT ────────────────────────
interface MaxMarksDropdownInputProps {
  value: number;
  onChange: (val: string) => void;
  className?: string;
  isTable?: boolean;
  inputMode?: 'dropdown' | 'normal';
  rowIndex?: number;
  colIndex?: number;
  onNavigate?: (
    rowIndex: number,
    colIndex: number,
    field: 'obtained' | 'max',
    direction: 'next' | 'prev' | 'up' | 'down'
  ) => void;
}

function MaxMarksDropdownInput({
  value,
  onChange,
  className = '',
  isTable = false,
  inputMode = 'dropdown',
  rowIndex,
  colIndex,
  onNavigate,
}: MaxMarksDropdownInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value === 0 ? '' : String(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > 150) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
      if (listRef.current && value >= 10) {
        setTimeout(() => {
          const target = listRef.current?.querySelector<HTMLElement>(`[data-num="${value}"]`);
          if (target) {
            target.scrollIntoView({ block: 'nearest' });
          }
        }, 10);
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inputMode === 'dropdown') return;
    const raw = e.target.value;
    // Strictly numbers only: strip out any non-digit characters
    const val = raw.replace(/\D/g, '');
    setInputValue(val);
    const num = parseInt(val, 10);
    if (val === '') {
      onChange('');
    } else if (!isNaN(num) && num >= 0 && num <= 500) {
      onChange(String(num));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 0. Jump shortcut '/': prevent '/' from typing into max marks
    if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      return;
    }

    // Space key: in dropdown mode, toggle dropdown menu
    if (e.key === ' ' && inputMode === 'dropdown') {
      e.preventDefault();
      setIsOpen(!isOpen);
      return;
    }

    // In dropdown mode, prevent direct typing and Enter key - dropdown means dropdown only
    if (inputMode === 'dropdown') {
      if (
        e.key !== 'Tab' &&
        !e.key.startsWith('Arrow') &&
        e.key !== 'Escape'
      ) {
        e.preventDefault();
        return;
      }
    }

    // 1. Enter key: in normal mode, advances from Max Mark to next subject's Obtained Marks,
    //    or on the last subject of this student, automatically triggers Done & Next Student
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputMode === 'normal' && onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'max', e.shiftKey ? 'prev' : 'next');
      }
      return;
    }

    // 2. Tab key: advances to next subject's Obtained Marks or retreats to current Obtained Marks
    if (e.key === 'Tab') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'max', e.shiftKey ? 'prev' : 'next');
      }
      return;
    }

    // 3. Arrow Down: move down to same max marks for next student
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'max', 'down');
      }
      return;
    }

    // 4. Arrow Up: move up to same max marks for previous student
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
        onNavigate(rowIndex, colIndex, 'max', 'up');
      }
      return;
    }

    // 5. Arrow Right: when at end of input, advance to next subject's obtained marks
    if (e.key === 'ArrowRight') {
      if (inputRef.current && (inputRef.current.selectionStart === inputRef.current.value.length || inputRef.current.value === '')) {
        e.preventDefault();
        if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
          onNavigate(rowIndex, colIndex, 'max', 'next');
        }
      }
      return;
    }

    // 6. Arrow Left: when at beginning of input, retreat to current subject's obtained marks
    if (e.key === 'ArrowLeft') {
      if (inputRef.current && inputRef.current.selectionStart === 0 && inputRef.current.selectionEnd === 0) {
        e.preventDefault();
        if (onNavigate && rowIndex !== undefined && colIndex !== undefined) {
          onNavigate(rowIndex, colIndex, 'max', 'prev');
        }
      }
      return;
    }

    // 7. Strictly block any non-digit characters (letters, dots, symbols, spaces)
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      !(e.key >= '0' && e.key <= '9')
    ) {
      e.preventDefault();
      return;
    }
  };

  const handleSelectOption = (num: number) => {
    onChange(String(num));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    if (inputMode === 'normal' && inputRef.current) inputRef.current.focus();
  };

  // Full 10 to 150 range options with no limitation
  const maxOptions = useMemo(() => {
    const list: number[] = [];
    for (let i = 150; i >= 10; i--) {
      list.push(i);
    }
    if (value > 150 && !list.includes(value)) {
      list.unshift(value);
    }
    return list;
  }, [value]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <div className="flex items-center rounded-md border transition-all border-input bg-muted/30 hover:bg-muted/45 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary focus-within:bg-card">
        <div className="flex items-center w-full">
          {inputMode === 'dropdown' ? (
            <div
              ref={divRef}
              tabIndex={0}
              role="combobox"
              aria-expanded={isOpen}
              data-max-marks-input="true"
              data-row={rowIndex}
              data-col={colIndex}
              onClick={() => setIsOpen(!isOpen)}
              onKeyDown={handleKeyDown}
              className={`w-full font-mono font-bold text-center bg-transparent outline-none cursor-pointer select-none flex items-center justify-center ${
                isTable
                  ? 'h-8 text-xs pl-5 pr-1'
                  : 'h-8 text-xs sm:text-sm pl-6 pr-1.5'
              }`}
              title="Select maximum marks from dropdown"
            >
              {inputValue !== '' ? (
                <span>{inputValue}</span>
              ) : (
                <span className="text-muted-foreground/75 font-semibold tracking-wide text-[10px] sm:text-xs">
                  MAX
                </span>
              )}
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="MAX"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              data-max-marks-input="true"
              data-row={rowIndex}
              data-col={colIndex}
              className={`w-full font-mono font-bold text-center bg-transparent outline-none placeholder:text-muted-foreground/75 placeholder:font-semibold placeholder:tracking-wide ${
                isTable
                  ? 'h-8 text-xs px-1 placeholder:text-[10px]'
                  : 'h-8 text-xs sm:text-sm px-1.5 placeholder:text-[11px] sm:placeholder:text-xs'
              }`}
              title="Maximum marks (10 to 150 range)"
            />
          )}
          {inputMode !== 'normal' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={`${
                isTable ? 'w-5 pr-1.5' : 'w-6 pr-1.5'
              } flex items-center justify-center text-muted-foreground/70 hover:text-foreground cursor-pointer focus:outline-none shrink-0`}
              title="Select maximum marks (10 to 150 range)"
              tabIndex={-1}
            >
              <ChevronDown
                className={`${
                  isTable ? 'h-3 w-3' : 'h-3.5 w-3.5'
                } shrink-0 transition-transform duration-150 ${
                  isOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {inputMode !== 'normal' && isOpen && (
        <div
          className={`absolute left-0 z-50 w-full min-w-[75px] bg-popover text-popover-foreground border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: '180px' }}
        >
          {/* Full Range List (150 down to 10) with NO limitation */}
          <div
            ref={listRef}
            className="overflow-y-auto max-h-[140px] p-0.5 divide-y divide-border/20"
          >
            {maxOptions.map((num) => (
              <button
                key={num}
                type="button"
                data-num={num}
                onClick={() => handleSelectOption(num)}
                className={`w-full text-center py-1 text-xs font-mono rounded hover:bg-accent transition-colors cursor-pointer ${
                  value === num ? 'bg-primary/15 text-primary font-bold' : ''
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Option: Clear */}
          <div className="p-0.5 border-t bg-muted/20">
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-center py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN MARKS ENTRY PAGE ───────────────────────────────────────────────────
export default function MarksEntryPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<ResultPeriod | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [initialStudentsJson, setInitialStudentsJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewModeState] = useState<'accordion' | 'table'>(() => {
    // On phone / mobile screen size (< 640px), always open with Cards ('accordion')
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'accordion';
    }
    try {
      const saved = localStorage.getItem('marks_entry_view_mode');
      if (saved === 'table' || saved === 'accordion') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'accordion';
  });

  const setViewMode = (
    modeOrUpdater: 'accordion' | 'table' | ((prev: 'accordion' | 'table') => 'accordion' | 'table')
  ) => {
    // On phone / mobile screen size (< 640px), always enforce Cards ('accordion')
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewModeState('accordion');
      return;
    }
    setViewModeState((prev) => {
      const next = typeof modeOrUpdater === 'function' ? modeOrUpdater(prev) : modeOrUpdater;
      try {
        localStorage.setItem('marks_entry_view_mode', next);
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  // Automatically enforce Cards on phone screens (< 640px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setViewModeState('accordion');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [inputMode, setInputModeState] = useState<'dropdown' | 'normal'>(() => {
    try {
      const saved = localStorage.getItem('marks_input_mode');
      if (saved === 'normal' || saved === 'dropdown') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'dropdown';
  });

  const setInputMode = (
    modeOrUpdater: 'dropdown' | 'normal' | ((prev: 'dropdown' | 'normal') => 'dropdown' | 'normal')
  ) => {
    setInputModeState((prev) => {
      const next = typeof modeOrUpdater === 'function' ? modeOrUpdater(prev) : modeOrUpdater;
      try {
        localStorage.setItem('marks_input_mode', next);
      } catch {
        // Ignore localStorage errors
      }
      toast.info(
        next === 'normal'
          ? 'Switched to Normal Input Mode'
          : 'Switched to Dropdown Input Mode'
      );
      return next;
    });
  };

  // Column Visibility State for Data Table (School, Total, %, Rank can be toggled; all OFF by default)
  const [columnVisibility, setColumnVisibility] = useState<{
    school: boolean;
    total: boolean;
    percentage: boolean;
    rank: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('marks_entry_column_visibility');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          school: parsed.school !== undefined ? parsed.school : false,
          total: parsed.total !== undefined ? parsed.total : false,
          percentage: parsed.percentage !== undefined ? parsed.percentage : false,
          rank: parsed.rank !== undefined ? parsed.rank : false,
        };
      }
    } catch {
      // Ignore localStorage errors
    }
    return {
      school: false,
      total: false,
      percentage: false,
      rank: false,
    };
  });

  const updateColumnVisibility = (updater: (prev: typeof columnVisibility) => typeof columnVisibility) => {
    setColumnVisibility((prev) => {
      const updated = updater(prev);
      try {
        localStorage.setItem('marks_entry_column_visibility', JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  };

  // Table Column Sorting State
  const [tableSorting, setTableSorting] = useState<{
    column: string;
    direction: 'asc' | 'desc' | null;
  }>({
    column: 'studentId',
    direction: 'asc',
  });

  const toggleSort = (columnKey: string) => {
    setTableSorting((prev) => {
      if (prev.column === columnKey) {
        if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
        if (prev.direction === 'desc') return { column: 'studentId', direction: 'asc' };
      }
      return { column: columnKey, direction: 'asc' };
    });
  };

  // Track expanded student dropdown states (studentResultId -> boolean)
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});

  // Check unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialStudentsJson) return false;
    return JSON.stringify(students) !== initialStudentsJson;
  }, [students, initialStudentsJson]);

  // Warn before browser unload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!periodId) return;
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const [periodData, marksData] = await Promise.all([
        fetchResultPeriod(periodId),
        fetchMarks(periodId),
      ]);
      setPeriod(periodData);
      setStudents(marksData);
      setInitialStudentsJson(JSON.stringify(marksData));

      // Expand the first student by default only on initial full page load
      if (!isSilent && marksData.length > 0) {
        setExpandedStudents({ [marksData[0].studentResultId]: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load marks';
      toast.error(msg);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [periodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subject headers
  const subjects = useMemo(() => {
    if (students.length === 0) return [];
    return students[0].marks.map((m) => ({
      subjectId: m.subjectId,
      subjectName: m.subjectName,
      displayOrder: m.displayOrder,
      defaultMax: m.maxMarks,
    }));
  }, [students]);

  // Responsive grid columns class based on subject count:
  // - Mobile phone screens (< sm / < 640px): 1 subject card per row (grid-cols-1)
  // - Tablet & intermediate screens (sm: >= 640px, such as 725px): 2 subject cards per row (sm:grid-cols-2)
  // - Desktop screens (lg: >= 1024px): All subjects laid out in a single horizontal row
  const subjectGridColsClass = useMemo(() => {
    const count = subjects.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    if (count === 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5';
    if (count === 6) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6';
  }, [subjects.length]);

  // Toggle single student dropdown
  const toggleStudentExpanded = (studentResultId: number) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentResultId]: !prev[studentResultId],
    }));
  };

  // Expand all / Collapse all
  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    students.forEach((s) => {
      all[s.studentResultId] = true;
    });
    setExpandedStudents(all);
  };

  const handleCollapseAll = () => {
    setExpandedStudents({});
  };

  // Helper to recalculate student statistics
  const recalculateStudentStats = (student: StudentResult) => {
    const totalSubjects = student.marks.length;
    if (totalSubjects === 0) return;

    let absentCount = 0;
    let enteredCount = 0;
    let totalObt = 0;
    let totalMax = 0;

    for (const m of student.marks) {
      totalMax += m.maxMarks;
      if (m.isAbsent) {
        absentCount++;
        enteredCount++;
      } else if (m.obtainedMarks !== null && m.obtainedMarks !== undefined) {
        enteredCount++;
        totalObt += m.obtainedMarks;
      }
    }

    if (enteredCount === 0) {
      student.status = 'Incomplete';
      student.totalObtained = null;
      student.totalMax = totalMax;
      student.percentage = null;
    } else if (absentCount === totalSubjects) {
      student.status = 'Absent';
      student.totalObtained = null;
      student.totalMax = totalMax;
      student.percentage = null;
      student.classRank = null;
      student.groupRank = null;
    } else {
      student.status = enteredCount === totalSubjects ? 'Present' : 'Incomplete';
      student.totalObtained = totalObt;
      student.totalMax = totalMax;
      student.percentage = totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
    }
  };

  // Helper to check if a student has all marks filled or marked absent
  const isStudentComplete = (student: StudentResult) => {
    if (student.status === 'Absent') return true;
    if (!student.marks || student.marks.length === 0) return false;
    return student.marks.every(
      (m) => m.isAbsent || (m.obtainedMarks !== null && m.obtainedMarks !== undefined)
    );
  };

  // Update mark via dropdown / manual input
  const updateSubjectValue = (
    studentIndex: number,
    markIndex: number,
    obtainedMarks: number | null,
    isAbsent: boolean
  ) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      const mark = student.marks[markIndex];

      mark.obtainedMarks = obtainedMarks;
      mark.isAbsent = isAbsent;

      recalculateStudentStats(student);
      return next;
    });
  };

  // Batch toggle all subjects for a student (Mark All Absent / Mark All Present)
  const markAllSubjectsForStudent = (studentIndex: number, isAbsent: boolean) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];

      student.marks.forEach((m) => {
        m.isAbsent = isAbsent;
        if (isAbsent) {
          m.obtainedMarks = null;
        }
      });

      recalculateStudentStats(student);
      return next;
    });

    toast.info(
      isAbsent
        ? 'All subjects marked Absent'
        : 'All subjects marked Present'
    );
  };

  // Ref for double-click detection on clear button (resets max marks if tapped twice within 2s)
  const lastClearClickRef = useRef<{ studentResultId: number; time: number } | null>(null);

  // Clear marks for a student: single tap clears secured marks, double tap also resets max marks to default
  const handleClearStudentMarks = (studentIndex: number, studentResultId: number) => {
    const now = Date.now();
    const isDoubleTap =
      lastClearClickRef.current &&
      lastClearClickRef.current.studentResultId === studentResultId &&
      now - lastClearClickRef.current.time < 2000;

    if (isDoubleTap) {
      lastClearClickRef.current = null;
      setStudents((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
        const student = next[studentIndex];
        if (!student) return prev;

        student.marks.forEach((m) => {
          m.isAbsent = false;
          m.obtainedMarks = null;
          m.maxMarks = 0;
          m.isDefaultMax = false;
        });

        recalculateStudentStats(student);
        return next;
      });

      toast.success('Marks cleared');
    } else {
      lastClearClickRef.current = { studentResultId, time: now };
      setStudents((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
        const student = next[studentIndex];
        if (!student) return prev;

        student.marks.forEach((m) => {
          m.isAbsent = false;
          m.obtainedMarks = null;
        });

        recalculateStudentStats(student);
        return next;
      });

      toast.info('Secured marks cleared');
    }
  };

  // Toggle all subjects for a student as Absent or Present
  const toggleAllAbsentForStudent = (studentIndex: number) => {
    const current = students[studentIndex];
    if (!current) return;
    const isCurrentlyAllAbsent =
      current.marks.length > 0 && current.marks.every((m) => m.isAbsent);
    const newAbsent = !isCurrentlyAllAbsent;

    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      if (!student) return prev;

      student.marks.forEach((m) => {
        m.isAbsent = newAbsent;
        if (newAbsent) {
          m.obtainedMarks = null;
        }
      });

      student.status = newAbsent ? 'Absent' : 'Present';
      recalculateStudentStats(student);
      return next;
    });

    const isNowAbsent = !(
      students[studentIndex]?.marks.length > 0 &&
      students[studentIndex]?.marks.every((m) => m.isAbsent)
    );
    toast.info(
      isNowAbsent
        ? 'All subjects marked Absent'
        : 'All subjects marked Present'
    );
  };

  // Backward compatibility alias for clear
  const clearAllMarksForStudent = (studentIndex: number) => {
    const student = students[studentIndex];
    if (student) {
      handleClearStudentMarks(studentIndex, student.studentResultId);
    }
  };

  // Live update for manual maximum marks of a subject for a student
  const updateStudentMaxMark = (studentIndex: number, markIndex: number, maxStr: string) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      if (!student) return prev;
      const mark = student.marks[markIndex];
      if (!mark) return prev;

      const num = maxStr === '' ? 0 : parseInt(maxStr, 10);
      if (isNaN(num) || num < 0) return prev;

      mark.maxMarks = num;
      mark.isDefaultMax = false;

      // Adjust obtained if it now exceeds max
      if (mark.obtainedMarks !== null && num > 0 && mark.obtainedMarks > num) {
        mark.obtainedMarks = num;
      }

      recalculateStudentStats(student);
      return next;
    });
  };

  // "Done / Close" button handler for a student: collapses current student and opens the next one
  const handleDoneStudent = (currentStudentResultId: number, currentFilteredIndex: number) => {
    setExpandedStudents((prev) => {
      const updated = { ...prev, [currentStudentResultId]: false };

      // Find next student in filtered list
      const nextStudent = filteredStudents[currentFilteredIndex + 1];
      if (nextStudent) {
        updated[nextStudent.studentResultId] = true;
      }

      return updated;
    });

    toast.success('Marks recorded for this student');

    const nextRow = currentFilteredIndex + 1;
    if (nextRow < filteredStudents.length) {
      setTimeout(() => {
        const targetInput = document.querySelector<HTMLElement>(
          `[data-marks-input="true"][data-row="${nextRow}"][data-col="0"]`
        );
        if (targetInput) {
          targetInput.focus();
          if (targetInput instanceof HTMLInputElement) {
            targetInput.select();
          }
        }
      }, 50);
    }
  };

  // Copy max marks from current student to ONLY the next student card
  const handleCopyMaxMarksToNext = (sourceStudent: StudentResult, currentFilteredIndex: number) => {
    const nextStudent = filteredStudents[currentFilteredIndex + 1];
    if (!nextStudent) {
      toast.info('Last student reached');
      return;
    }

    const sourceMaxMap = new Map<number, number>();
    sourceStudent.marks.forEach((m) => sourceMaxMap.set(m.subjectId, m.maxMarks));

    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const target = next.find((s) => s.studentResultId === nextStudent.studentResultId);
      if (!target) return prev;

      for (const m of target.marks) {
        const srcMax = sourceMaxMap.get(m.subjectId);
        if (srcMax !== undefined) {
          m.maxMarks = srcMax;
          m.isDefaultMax = false;
          if (m.obtainedMarks !== null && srcMax > 0 && m.obtainedMarks > srcMax) {
            m.obtainedMarks = srcMax;
          }
        }
      }

      recalculateStudentStats(target);
      return next;
    });

    toast.success(`Max marks copied to ${nextStudent.name}`);
  };

  const handleSave = async () => {
    if (!periodId) return;
    setSaving(true);
    try {
      const payload = students.map((s) => ({
        studentResultId: s.studentResultId,
        status: s.status,
        marks: s.marks.map((m) => ({
          markId: m.markId,
          obtainedMarks: m.obtainedMarks,
          isAbsent: m.isAbsent,
          maxMarks: m.maxMarks,
          isDefaultMax: m.isDefaultMax,
        })),
      }));

      await saveMarks(periodId, payload);
      toast.success('Marks saved successfully');
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save marks';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!periodId) return;
    try {
      await updateResultPeriod(periodId, { status: 'Published' });
      toast.success('Result published and finalized');
      setPublishDialogOpen(false);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(msg);
    }
  };

  const handleRevertToDraft = async () => {
    if (!periodId) return;
    try {
      await updateResultPeriod(periodId, { status: 'Draft' });
      toast.success('Result reverted to Draft');
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revert';
      toast.error(msg);
    }
  };

  // Filtered view of students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.school.toLowerCase().includes(searchTerm.toLowerCase());

      const absentCount = s.marks.filter((m) => m.isAbsent).length;
      const totalSubjects = s.marks.length;

      let matchesStatus = true;
      if (filterStatus === 'pending') {
        matchesStatus = !isStudentComplete(s);
      } else if (filterStatus === 'completed') {
        matchesStatus = isStudentComplete(s);
      } else if (filterStatus === 'present_full') {
        matchesStatus = isStudentComplete(s) && absentCount === 0;
      } else if (filterStatus === 'partial_absent') {
        matchesStatus = absentCount > 0 && absentCount < totalSubjects;
      } else if (filterStatus === 'all_absent') {
        matchesStatus = s.status === 'Absent' || (totalSubjects > 0 && absentCount === totalSubjects);
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, filterStatus]);

  // Check if any student is currently expanded (in Accordion View)
  const hasAnyExpanded = useMemo(() => {
    return filteredStudents.some((s) => !!expandedStudents[s.studentResultId]);
  }, [filteredStudents, expandedStudents]);

  // Smart single toggle: if any (or all) are expanded -> collapse all; if none -> expand all
  const handleToggleExpandAll = () => {
    if (hasAnyExpanded) {
      setExpandedStudents({});
    } else {
      const all: Record<number, boolean> = {};
      filteredStudents.forEach((s) => {
        all[s.studentResultId] = true;
      });
      setExpandedStudents(all);
    }
  };

  // Sorted and filtered students for Data Table view
  const sortedAndFilteredStudents = useMemo(() => {
    const list = [...filteredStudents];
    if (!tableSorting.direction) return list;

    const { column, direction } = tableSorting;
    const factor = direction === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      if (column === 'studentId') {
        return a.studentId.localeCompare(b.studentId, undefined, { numeric: true }) * factor;
      }
      if (column === 'name') {
        return a.name.localeCompare(b.name) * factor;
      }
      if (column === 'school') {
        return (a.school || '').localeCompare(b.school || '') * factor;
      }
      if (column === 'total') {
        const aVal = a.totalObtained ?? -1;
        const bVal = b.totalObtained ?? -1;
        return (aVal - bVal) * factor;
      }
      if (column === 'percentage') {
        const aVal = a.percentage ?? -1;
        const bVal = b.percentage ?? -1;
        return (aVal - bVal) * factor;
      }
      if (column === 'rank') {
        const aVal = a.groupRank ?? 999999;
        const bVal = b.groupRank ?? 999999;
        return (aVal - bVal) * factor;
      }
      if (column.startsWith('subject_')) {
        const subId = Number(column.replace('subject_', ''));
        const aMark = a.marks.find((m) => m.subjectId === subId);
        const bMark = b.marks.find((m) => m.subjectId === subId);
        const aVal = aMark?.isAbsent ? -1 : aMark?.obtainedMarks ?? -1;
        const bVal = bMark?.isAbsent ? -1 : bMark?.obtainedMarks ?? -1;
        return (aVal - bVal) * factor;
      }
      return 0;
    });
  }, [filteredStudents, tableSorting]);

  const completedCount = useMemo(() => students.filter(isStudentComplete).length, [students]);

  const fullyAbsentCount = useMemo(
    () =>
      students.filter(
        (s) => s.status === 'Absent' || (s.marks.length > 0 && s.marks.every((m) => m.isAbsent))
      ).length,
    [students]
  );

  const partialAbsentCount = useMemo(
    () =>
      students.filter((s) => {
        const abs = s.marks.filter((m) => m.isAbsent).length;
        return abs > 0 && abs < s.marks.length;
      }).length,
    [students]
  );

  // Spreadsheet Keyboard Navigation (Enter, Tab, Arrows)
  // Flow: Subject N Secured Marks -> Subject N Max Marks -> Subject N+1 Secured Marks ... -> on last subject's Max Marks: Done & Next Student
  const handleCellNavigate = useCallback(
    (
      rowIndex: number,
      colIndex: number,
      currentField: 'obtained' | 'max',
      direction: 'next' | 'prev' | 'up' | 'down'
    ) => {
      const currentList = viewMode === 'table' ? sortedAndFilteredStudents : filteredStudents;
      const totalRows = currentList.length;
      const totalCols = subjects.length;
      if (totalRows === 0 || totalCols === 0) return;

      let targetRow = rowIndex;
      let targetCol = colIndex;
      let targetField: 'obtained' | 'max' = currentField;

      if (direction === 'next') {
        if (currentField === 'obtained') {
          // Secured Mark -> Max Mark of the SAME subject
          targetRow = rowIndex;
          targetCol = colIndex;
          targetField = 'max';
        } else {
          // currentField === 'max'
          if (colIndex < totalCols - 1) {
            // Max Mark -> NEXT subject's Secured Mark
            targetRow = rowIndex;
            targetCol = colIndex + 1;
            targetField = 'obtained';
          } else {
            // Last subject's Max Mark completed! Automatically Done & Next Student
            if (rowIndex < totalRows - 1) {
              targetRow = rowIndex + 1;
              targetCol = 0;
              targetField = 'obtained';
            } else {
              // Last student finished
              if (viewMode === 'accordion') {
                const currentStudent = currentList[rowIndex];
                if (currentStudent) {
                  setExpandedStudents((prev) => ({
                    ...prev,
                    [currentStudent.studentResultId]: false,
                  }));
                }
              }
              toast.success('All student marks completed!');
              return;
            }
          }
        }
      } else if (direction === 'prev') {
        if (currentField === 'max') {
          // Max Mark -> Secured Mark of the SAME subject
          targetRow = rowIndex;
          targetCol = colIndex;
          targetField = 'obtained';
        } else {
          // currentField === 'obtained'
          if (colIndex > 0) {
            // Secured Mark -> PREVIOUS subject's Max Mark
            targetRow = rowIndex;
            targetCol = colIndex - 1;
            targetField = 'max';
          } else {
            // First subject's Secured Mark -> Previous student's last subject Max Mark
            if (rowIndex > 0) {
              targetRow = rowIndex - 1;
              targetCol = totalCols - 1;
              targetField = 'max';
            }
          }
        }
      } else if (direction === 'down') {
        if (rowIndex < totalRows - 1) {
          targetRow = rowIndex + 1;
          targetCol = colIndex;
          targetField = currentField;
        }
      } else if (direction === 'up') {
        if (rowIndex > 0) {
          targetRow = rowIndex - 1;
          targetCol = colIndex;
          targetField = currentField;
        }
      }

      // If in accordion mode: collapse current student and expand next student when advancing
      if (viewMode === 'accordion') {
        const currentStudent = currentList[rowIndex];
        const targetStudent = currentList[targetRow];

        if (targetRow > rowIndex && currentStudent && targetStudent) {
          setExpandedStudents((prev) => ({
            ...prev,
            [currentStudent.studentResultId]: false,
            [targetStudent.studentResultId]: true,
          }));
          toast.success(`Marks recorded for ${currentStudent.name}`);
        } else if (targetRow < rowIndex && targetStudent) {
          setExpandedStudents((prev) => ({
            ...prev,
            [targetStudent.studentResultId]: true,
          }));
        }
      }

      // Allow DOM to adjust if card expanded, then focus and select text in target input
      const focusTarget = () => {
        if (targetField === 'max') {
          const maxInput = document.querySelector<HTMLElement>(
            `[data-max-marks-input="true"][data-row="${targetRow}"][data-col="${targetCol}"]`
          );
          if (maxInput) {
            maxInput.focus();
            if (maxInput instanceof HTMLInputElement) {
              maxInput.select();
            }
            return true;
          }
        } else {
          const targetInput = document.querySelector<HTMLElement>(
            `[data-marks-input="true"][data-row="${targetRow}"][data-col="${targetCol}"]`
          );
          if (targetInput) {
            targetInput.focus();
            if (targetInput instanceof HTMLInputElement) {
              targetInput.select();
            }
            return true;
          }
          const targetCell = document.querySelector<HTMLElement>(
            `[data-marks-container="true"][data-row="${targetRow}"][data-col="${targetCol}"]`
          );
          if (targetCell) {
            targetCell.focus();
            return true;
          }
        }
        return false;
      };

      setTimeout(() => {
        if (!focusTarget()) {
          setTimeout(() => {
            if (!focusTarget()) {
              setTimeout(focusTarget, 100);
            }
          }, 60);
        }
      }, 35);
    },
    [viewMode, sortedAndFilteredStudents, filteredStudents, subjects.length]
  );

  // Jump to Last Filled Input Field or First Input Field ('/' shortcut)
  const handleJumpToFirstOrLastFilled = useCallback(() => {
    const currentList = viewMode === 'table' ? sortedAndFilteredStudents : filteredStudents;
    if (currentList.length === 0) {
      toast.info('No students available to focus');
      return;
    }

    // 1. Scan from bottom to top, right to left to locate the last filled cell
    let lastFilledPos: {
      rowIndex: number;
      colIndex: number;
      student: StudentResult;
      subjectName: string;
    } | null = null;

    for (let r = currentList.length - 1; r >= 0; r--) {
      const s = currentList[r];
      if (!s.marks || s.marks.length === 0) continue;
      for (let c = s.marks.length - 1; c >= 0; c--) {
        const m = s.marks[c];
        if (m.isAbsent || (m.obtainedMarks !== null && m.obtainedMarks !== undefined)) {
          lastFilledPos = {
            rowIndex: r,
            colIndex: c,
            student: s,
            subjectName: m.subjectName,
          };
          break;
        }
      }
      if (lastFilledPos) break;
    }

    // 2. Check current focused element's data-row and data-col
    const activeEl = document.activeElement as HTMLElement | null;
    const activeRowStr = activeEl?.getAttribute('data-row');
    const activeColStr = activeEl?.getAttribute('data-col');

    const isCurrentlyAtLastFilled =
      lastFilledPos !== null &&
      activeRowStr !== null &&
      activeColStr !== null &&
      Number(activeRowStr) === lastFilledPos.rowIndex &&
      Number(activeColStr) === lastFilledPos.colIndex;

    // 3. Determine destination:
    // If already at last filled -> jump to first input (toggle)
    // Otherwise -> jump to last filled input (or first input if nothing is filled yet)
    let targetRow = 0;
    let targetCol = 0;
    let targetStudent = currentList[0];
    let feedbackMsg = '';

    if (isCurrentlyAtLastFilled || !lastFilledPos) {
      targetRow = 0;
      targetCol = 0;
      targetStudent = currentList[0];
      feedbackMsg = `Jumped to first student: ${targetStudent.name}`;
    } else {
      targetRow = lastFilledPos.rowIndex;
      targetCol = lastFilledPos.colIndex;
      targetStudent = lastFilledPos.student;
      feedbackMsg = `Jumped to last filled: ${targetStudent.name} (${lastFilledPos.subjectName})`;
    }

    // 4. In accordion mode, expand target student card if collapsed
    if (viewMode === 'accordion' && targetStudent) {
      setExpandedStudents((prev) => ({
        ...prev,
        [targetStudent.studentResultId]: true,
      }));
    }

    // 5. Focus & select the target input / container smoothly
    setTimeout(() => {
      const targetInput = document.querySelector<HTMLElement>(
        `[data-marks-input="true"][data-row="${targetRow}"][data-col="${targetCol}"]`
      );

      if (targetInput) {
        targetInput.focus();
        if (targetInput instanceof HTMLInputElement) {
          targetInput.select();
        }
        targetInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const targetContainer = document.querySelector<HTMLElement>(
          `[data-marks-container="true"][data-row="${targetRow}"][data-col="${targetCol}"]`
        );
        if (targetContainer) {
          targetContainer.focus();
          targetContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 40);

    toast.info(feedbackMsg, { duration: 1500 });
  }, [viewMode, sortedAndFilteredStudents, filteredStudents]);

  // Global keyboard shortcuts (Ctrl+S, Ctrl+F, Ctrl+Shift+T, ?, /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+S / Cmd+S: Save Marks
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) {
          handleSave();
        }
        return;
      }

      // 2. Ctrl+F / Cmd+F: Focus Search Bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 3. Ctrl+Shift+T: Toggle View Mode (Table / Cards)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'table' ? 'accordion' : 'table'));
        return;
      }

      // 4. '?' or Ctrl+/ to open Keyboard Shortcuts modal
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
      if ((e.key === '?' && !isTyping) || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 5. '/' Shortcut: Jump to Last Filled Input Field or First Input Field
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement as HTMLElement | null;
        // Never hijack '/' when typing in the search input
        if (activeEl === searchInputRef.current) {
          return;
        }
        // Do not intercept if inside a modal dialog
        if (activeEl?.closest('[role="dialog"]')) {
          return;
        }
        // Do not intercept if editing regular inputs like max-marks without data-marks-input
        if (activeEl?.tagName === 'INPUT' && !activeEl.hasAttribute('data-marks-input')) {
          return;
        }
        if (activeEl?.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault();
        handleJumpToFirstOrLastFilled();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, handleSave, handleJumpToFirstOrLastFilled]);

  if (loading) {
    return <MarksEntryPageLoading />;
  }

  if (!period) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">Result Period Not Found</h2>
        <Button onClick={() => navigate('/reports/monthly')}>Back to Results</Button>
      </div>
    );
  }

  const isPublished = period.status === 'Published';

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
        <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 w-full max-w-[99vw] 2xl:max-w-[1850px] mx-auto min-h-[85vh]">
          {/* Top Header Bar */}
      {/* Top Header Bar */}
      <div className="bg-card p-3.5 sm:p-4 rounded-xl border shadow-xs w-full">
        {/* MOBILE VIEW (< sm) */}
        <div className="sm:hidden space-y-2">
          {/* Top Title & Group Info + Icon-only Back Button on the right */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
            <div className="space-y-0.5 min-w-0 flex-1">
              <h1 className="text-base font-black tracking-tight text-foreground leading-snug truncate">
                {MONTH_NAMES[period.month] || period.month} {period.academic_year} Marks Entry
              </h1>
              <div className="text-xs text-muted-foreground font-medium">
                Group <strong className="text-foreground">{period.group_id}</strong>{' '}
                {period.group_class ? `(${period.group_class})` : ''}
              </div>
            </div>

            {/* Back Button (Icon Only) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (window.confirm('You have unsaved changes. Do you really want to leave?')) {
                    navigate('/reports/monthly');
                  }
                } else {
                  navigate('/reports/monthly');
                }
              }}
              className="h-8 w-8 p-0 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Back to Monthly Reports"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Centered Single Line: Counts + Badges (Unsaved Changes, Draft, Senior) */}
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap text-center py-0.5">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedCount}</strong>/{students.length} done
              </span>
              {partialAbsentCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {partialAbsentCount} partial
                  </span>
                </>
              )}
              {fullyAbsentCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-destructive font-semibold">{fullyAbsentCount} absent</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 justify-center">
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse text-[10px] font-bold px-1.5 py-0.5 shadow-xs">
                  Unsaved Changes
                </Badge>
              )}
              <Badge
                variant={isPublished ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'}
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
              >
                {period.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0.5">
                {period.category}
              </Badge>
              {period.period_code && (
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0.5 font-bold border border-border/60 bg-muted/70 text-foreground">
                  {period.period_code}
                </Badge>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons in a Single Line: Reset, Marks, Finalize */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={saving}
              className="text-xs h-9 font-medium justify-center px-2 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 shrink-0" />
              Reset
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs h-9 font-bold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground justify-center px-2 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 mr-1 shrink-0" />
              {saving ? 'Saving...' : 'Marks'}
            </Button>

            {!isPublished ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPublishDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold justify-center px-2 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1 shrink-0" />
                Finalize
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevertToDraft}
                className="text-xs h-9 font-medium justify-center px-2 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5 mr-1 shrink-0" />
                Revert
              </Button>
            )}
          </div>
        </div>

        {/* DESKTOP VIEW (>= sm) */}
        <div className="hidden sm:flex sm:flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
              {MONTH_NAMES[period.month] || period.month} {period.academic_year} Marks Entry
            </h1>
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>
                Group <strong className="text-foreground">{period.group_id}</strong>{' '}
                {period.group_class ? `(${period.group_class})` : ''}
              </span>
              <span>•</span>
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedCount}</strong> of{' '}
                {students.length} completed
              </span>
              {partialAbsentCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {partialAbsentCount} partial absent
                  </span>
                </>
              )}
              {fullyAbsentCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-destructive font-semibold">{fullyAbsentCount} all absent</span>
                </>
              )}
            </div>
          </div>

          {/* Desktop Right Side: Top Badges (from right to left) + Bottom Action Buttons */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Top Badges Row: Unsaved Changes (on left side), Draft status, Senior category */}
            <div className="flex items-center gap-2 justify-end flex-wrap">
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse text-xs font-bold px-2.5 py-0.5 shadow-xs">
                  Unsaved Changes
                </Badge>
              )}
              <Badge
                variant={isPublished ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                {period.status}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold">
                {period.category}
              </Badge>
              {period.period_code && (
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 border border-border/60 bg-muted/70 text-foreground font-bold tracking-wide">
                  {period.period_code}
                </Badge>
              )}
            </div>

            {/* Bottom Row: Action Buttons */}
            <ButtonGroup aria-label="Marks entry actions">
              <Button variant="outline" size="sm" onClick={() => loadData()} disabled={saving} className="text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs min-w-[95px] font-bold shadow-xs bg-primary hover:bg-primary/90 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>

              <ButtonGroupSeparator />

              {!isPublished ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPublishDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Finalize
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleRevertToDraft} className="text-xs">
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Revert to Draft
                </Button>
              )}

              <ButtonGroupSeparator />

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Do you really want to leave?')) {
                      navigate('/reports/monthly');
                    }
                  } else {
                    navigate('/reports/monthly');
                  }
                }}
                className="text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>

      {/* Search, Filter, and View Mode Toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 justify-between">
          {/* Search Bar + Separate Standalone Settings Button */}
          <div className="flex items-center gap-2 w-full flex-1 min-w-[200px]">
            {/* Standalone Search Bar (Not fused, standard rounded borders) */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="Search student name, roll number, school... (Ctrl+F)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 text-xs sm:text-sm h-9 bg-card rounded-md shadow-xs border"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Standalone Setting Button (Separate button OUTSIDE Search Bar, at same position) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden h-9 w-9 shrink-0 rounded-md bg-card hover:bg-accent border shadow-xs cursor-pointer relative"
                  title="Settings & Filters"
                  aria-label="Settings and Filters"
                >
                  <Settings className="h-4 w-4 text-foreground" />
                  {filterStatus !== 'all' && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-60 p-1.5 shadow-xl border bg-popover text-popover-foreground z-50 rounded-xl space-y-1"
              >
                {/* 1. Header with Title & Reset Button */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b mb-0.5">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    Settings & Filters
                  </span>
                  {(searchTerm.trim() !== '' || filterStatus !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                      className="text-[11px] font-medium text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* 2. Input Mode Switcher (Sleek segmented pills) */}
                <div className="px-2 py-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Input Mode
                  </div>
                  <div className="grid grid-cols-2 p-0.5 rounded-lg bg-muted/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setInputMode('dropdown')}
                      className={`flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        inputMode === 'dropdown'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ChevronDown className="h-3 w-3" />
                      <span>Dropdown</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('normal')}
                      className={`flex items-center justify-center gap-1 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        inputMode === 'normal'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PenLine className="h-3 w-3" />
                      <span>Normal</span>
                    </button>
                  </div>
                </div>

                {/* 3. Cards Expand / Collapse All */}
                {viewMode === 'accordion' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleToggleExpandAll}
                      className="cursor-pointer text-xs py-1.5 px-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {hasAnyExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span>{hasAnyExpanded ? 'Collapse All Cards' : 'Expand All Cards'}</span>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}

                {/* 4. Filter by Status (Clean native Radix Radio Group) */}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Filter By Status
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterStatus} onValueChange={setFilterStatus}>
                  <DropdownMenuRadioItem value="all" className="text-xs cursor-pointer py-1.5">
                    <span>All Students</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{students.length}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pending" className="text-xs cursor-pointer py-1.5">
                    <span>Pending</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{students.length - completedCount}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed" className="text-xs cursor-pointer py-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Completed</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{completedCount}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="present_full" className="text-xs cursor-pointer py-1.5">
                    <span>All Present</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="partial_absent" className="text-xs cursor-pointer py-1.5">
                    <span className="text-amber-500 font-semibold">Partial Absent</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{partialAbsentCount}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="all_absent" className="text-xs cursor-pointer py-1.5">
                    <span className="text-destructive font-semibold">All Absent</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{fullyAbsentCount}</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Toolbar (Hidden on phone/mobile screens) */}
          <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 sm:flex-initial w-auto sm:w-[175px] text-xs sm:text-sm h-9 bg-card">
                <SelectValue placeholder="Filter Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students ({students.length})</SelectItem>
                <SelectItem value="pending">Pending ({students.length - completedCount})</SelectItem>
                <SelectItem value="completed">Completed ({completedCount})</SelectItem>
                <SelectItem value="present_full">All Present</SelectItem>
                <SelectItem value="partial_absent">Partial Absent ({partialAbsentCount})</SelectItem>
                <SelectItem value="all_absent">All Absent ({fullyAbsentCount})</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Expand All / Collapse All (in Accordion View) */}
            {viewMode === 'accordion' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleExpandAll}
                className="h-9 w-[116px] gap-1.5 px-2.5 text-xs font-semibold cursor-pointer bg-card shadow-xs hover:bg-accent justify-center"
                title={hasAnyExpanded ? 'Collapse all student cards' : 'Expand all student cards'}
              >
                {hasAnyExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Collapse All</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Expand All</span>
                  </>
                )}
              </Button>
            )}

            {/* Columns Visibility Dropdown (Visible on Table view) */}
            {viewMode === 'table' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-auto min-w-[116px] gap-1.5 px-2.5 text-xs font-semibold cursor-pointer bg-card shadow-xs hover:bg-accent justify-center"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Columns</span>
                    {(columnVisibility.school ||
                      columnVisibility.total ||
                      columnVisibility.percentage ||
                      columnVisibility.rank) && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-xl border bg-popover text-popover-foreground z-50 rounded-xl">
                  <div className="flex items-center justify-between px-2 py-1 text-xs">
                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Toggle Columns
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateColumnVisibility(() => ({
                            school: true,
                            total: true,
                            percentage: true,
                            rank: true,
                          }))
                        }
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        All On
                      </button>
                      <span className="text-muted-foreground text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateColumnVisibility(() => ({
                            school: false,
                            total: false,
                            percentage: false,
                            rank: false,
                          }))
                        }
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        All Off
                      </button>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.school}
                    onCheckedChange={(val) =>
                      updateColumnVisibility((prev) => ({ ...prev, school: !!val }))
                    }
                    className="text-xs cursor-pointer"
                  >
                    School
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.total}
                    onCheckedChange={(val) =>
                      updateColumnVisibility((prev) => ({ ...prev, total: !!val }))
                    }
                    className="text-xs cursor-pointer"
                  >
                    Total Marks
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.percentage}
                    onCheckedChange={(val) =>
                      updateColumnVisibility((prev) => ({ ...prev, percentage: !!val }))
                    }
                    className="text-xs cursor-pointer"
                  >
                    Percentage (%)
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.rank}
                    onCheckedChange={(val) =>
                      updateColumnVisibility((prev) => ({ ...prev, rank: !!val }))
                    }
                    className="text-xs cursor-pointer"
                  >
                    Group Rank
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* View Mode Switcher (Desktop only: on phone screens Cards is always active and switcher is hidden) */}
            <div className="hidden sm:flex items-center border rounded-lg p-0.5 bg-muted/40 h-9">
              <Button
                variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('accordion')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
              >
                <LayoutList className="h-3.5 w-3.5 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
              >
                <TableIcon className="h-3.5 w-3.5 mr-1" />
                Table
              </Button>
            </div>

            {/* Input Mode Switcher (Dropdown / Normal Input) */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 h-9">
              <Button
                variant={inputMode === 'dropdown' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('dropdown')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                title="Dropdown Mode: Select marks and maximums from interactive dropdown menus"
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Dropdown
              </Button>
              <Button
                variant={inputMode === 'normal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('normal')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                title="Normal Mode: Direct typing into clean numeric input fields without dropdown menus"
              >
                <PenLine className="h-3.5 w-3.5 mr-1" />
                Normal
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {(searchTerm.trim() !== '' || filterStatus !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/30 border text-xs animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Active Filters:</span>
            </span>

            {/* Search chip */}
            {searchTerm.trim() !== '' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>Search: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Status chip */}
            {filterStatus !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <span>
                  Filter:{' '}
                  {filterStatus === 'present_full'
                    ? 'All Present'
                    : filterStatus === 'partial_absent'
                    ? 'Partial Absent'
                    : filterStatus === 'all_absent'
                    ? 'All Absent'
                    : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className="rounded-full p-0.5 hover:bg-blue-500/20 cursor-pointer"
                  title="Clear status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Reset button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-semibold"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset All</span>
            </Button>

            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              Showing <strong className="text-foreground font-bold">{filteredStudents.length}</strong> of{' '}
              {students.length} students
            </span>
          </div>
        )}
      </div>

      {/* ─── VIEW MODE 1: ACCORDION / RESPONSIVE STUDENT CARDS (DEFAULT) ─── */}
      {viewMode === 'accordion' && (
        <div className="space-y-3.5">
          {filteredStudents.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground bg-card">
              <Search className="h-9 w-9 mx-auto mb-2.5 opacity-40 text-muted-foreground" />
              <p className="text-sm font-semibold">No students matched your search or filter criteria.</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search terms or clearing active filters.</p>
            </Card>
          ) : (
            filteredStudents.map((student, filteredIdx) => {
              const originalIndex = students.findIndex(
                (s) => s.studentResultId === student.studentResultId
              );
              const isExpanded = !!expandedStudents[student.studentResultId];
              const complete = isStudentComplete(student);

              const absentCount = student.marks.filter((m) => m.isAbsent).length;
              const isAllAbsent = student.marks.length > 0 && absentCount === student.marks.length;
              const isPartialAbsent = absentCount > 0 && absentCount < student.marks.length;

              return (
                <Card
                  key={student.studentResultId}
                  className={`border transition-all duration-200 shadow-xs ${
                    isExpanded
                      ? 'ring-2 ring-primary/40 border-primary/50 shadow-md bg-card'
                      : 'hover:border-border hover:shadow-xs bg-card'
                  } ${
                    isAllAbsent
                      ? 'bg-destructive/[0.02] border-destructive/25'
                      : isPartialAbsent
                      ? 'bg-amber-500/[0.02] border-amber-500/25'
                      : ''
                  }`}
                >
                  {/* Student Header Card (Click to Expand / Collapse Dropdown) */}
                  <div
                    onClick={() => toggleStudentExpanded(student.studentResultId)}
                    className={`p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 select-none bg-card hover:bg-accent/30 transition-colors ${
                      isExpanded ? 'rounded-t-xl' : 'rounded-xl'
                    }`}
                  >
                    {/* Top on Mobile / Left on Desktop: Student Identity + Mobile-Only Top-Right Chevron */}
                    <div className="flex items-center justify-between gap-2 w-full sm:w-auto min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar / Status Icon */}
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                            isAllAbsent
                              ? 'bg-destructive/15 text-destructive border border-destructive/25'
                              : isPartialAbsent
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                              : complete
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-muted text-muted-foreground border'
                          }`}
                        >
                          {isAllAbsent ? (
                            <span className="text-xs font-black">A</span>
                          ) : complete && !isPartialAbsent ? (
                            <Check className="h-4 w-4 stroke-[2.5]" />
                          ) : (
                            <span className="text-xs font-bold">{student.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Name, Roll & Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-foreground truncate">
                              {student.name}
                            </span>
                            <span className="font-mono text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                              {student.studentId}
                            </span>

                            {/* Dynamic Auto-Computed Status Badge (Desktop Only) */}
                            {isAllAbsent ? (
                              <Badge variant="destructive" className="hidden sm:inline-flex text-[10px] font-bold h-5 px-1.5 uppercase">
                                All Absent
                              </Badge>
                            ) : isPartialAbsent ? (
                              <Badge
                                className="hidden sm:inline-flex text-[10px] font-bold h-5 px-1.5 bg-amber-500 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-500 text-white border-transparent shadow-xs"
                              >
                                {absentCount} {absentCount === 1 ? 'Sub' : 'Subs'} Absent
                              </Badge>
                            ) : complete ? (
                              <Badge
                                className="hidden sm:inline-flex text-[10px] font-bold h-5 px-1.5 bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-600 text-white border-transparent shadow-xs"
                              >
                                ✓ Completed
                              </Badge>
                            ) : (
                              <span className="hidden sm:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                                Pending
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Class: <strong className="text-foreground font-semibold">{student.class || '—'}</strong></span>
                            <span>•</span>
                            <span className="truncate max-w-[150px] sm:max-w-[180px]">{student.school || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile-Only Top-Right Expand/Collapse Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudentExpanded(student.studentResultId);
                        }}
                        className="sm:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                        title={isExpanded ? 'Collapse student' : 'Expand student'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Row on Mobile / Right Section on Desktop */}
                    <div
                      className="flex items-center gap-2 sm:gap-2.5 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Left-Aligned Scores & Status (Mobile: always visible on left; Desktop: visible when closed) */}
                      <div className={`flex items-center gap-2 ${isExpanded ? 'flex sm:hidden' : 'flex'}`}>
                        {isAllAbsent ? (
                          <div className="text-left sm:text-right">
                            <span className="font-mono font-bold text-xs sm:text-sm text-destructive uppercase">
                              Absent
                            </span>
                            <div className="text-[10px] text-muted-foreground">All subjects</div>
                          </div>
                        ) : student.totalObtained !== null ? (
                          <div className="text-left sm:text-right">
                            <div className="font-mono font-bold text-xs sm:text-sm text-foreground">
                              {student.totalObtained} / {student.totalMax}
                            </div>
                            <div
                              className={`text-[11px] font-mono font-bold ${
                                (student.percentage || 0) >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : (student.percentage || 0) < 40
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {student.percentage?.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic text-left sm:text-right">Marks not entered</span>
                        )}
                      </div>

                      {/* Mobile-Only Status Badge on Right Side of Second Row (when collapsed) */}
                      {!isExpanded && (
                        <div className="sm:hidden flex items-center shrink-0">
                          {isAllAbsent ? (
                            <Badge variant="destructive" className="text-[10px] font-bold h-5 px-1.5 uppercase">
                              All Absent
                            </Badge>
                          ) : isPartialAbsent ? (
                            <Badge
                              className="text-[10px] font-bold h-5 px-1.5 bg-amber-500 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-500 text-white border-transparent shadow-xs"
                            >
                              {absentCount} {absentCount === 1 ? 'Sub' : 'Subs'} Absent
                            </Badge>
                          ) : complete ? (
                            <Badge
                              className="text-[10px] font-bold h-5 px-1.5 bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-600 text-white border-transparent shadow-xs"
                            >
                              ✓ Completed
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                              Pending
                            </span>
                          )}
                        </div>
                      )}

                      {/* When Expanded: 3 Compact Icon Action Buttons (Right-aligned on mobile where chevron was, and on right before chevron on desktop) */}
                      {isExpanded && (
                        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto sm:ml-0" onClick={(e) => e.stopPropagation()}>
                          {/* 1. Absent All Icon Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllAbsentForStudent(originalIndex);
                            }}
                            className={`h-8 w-8 rounded-lg transition-colors cursor-pointer ${
                              isAllAbsent
                                ? 'bg-destructive/15 text-destructive border-destructive/40 hover:bg-destructive/25'
                                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30'
                            }`}
                            title={isAllAbsent ? 'Student is Absent (Click to mark Present)' : 'Mark all subjects as Absent'}
                          >
                            {isAllAbsent ? (
                              <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>

                          {/* 2. Copy Max Marks to Next Student Icon Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMaxMarksToNext(student, filteredIdx);
                            }}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                            title="Copy maximum marks to the next student card"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          {/* 3. Clear Marks Icon Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearStudentMarks(originalIndex, student.studentResultId);
                            }}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer transition-colors"
                            title="Clear secured marks (Double-tap within 2s to clear max marks too)"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Desktop-Only Chevron Button (on mobile, chevron is placed at top-right of Row 1) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudentExpanded(student.studentResultId);
                        }}
                        className="hidden sm:block p-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
                        title={isExpanded ? 'Collapse student' : 'Expand student'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ─── EXPANDED DOWN SIDE: SUBJECT MARKS ENTRY FORM ─── */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t bg-muted/15 space-y-4 rounded-b-xl animate-in fade-in duration-150">
                      {/* Subject Marks Entry Grid (Full width across screen, no right gap) */}
                      <div className={`grid ${subjectGridColsClass} gap-2.5 sm:gap-3 w-full`}>
                        {student.marks.map((mark, markIdx) => {
                          const isExceeded =
                            !mark.isAbsent &&
                            mark.obtainedMarks !== null &&
                            mark.obtainedMarks > mark.maxMarks;
                          const isFilled = mark.obtainedMarks !== null && !mark.isAbsent;

                          return (
                            <div
                              key={mark.markId}
                              className={`relative focus-within:z-40 p-2.5 sm:p-3 rounded-xl border transition-all ${
                                mark.isAbsent
                                  ? 'border-destructive/30 bg-destructive/[0.03]'
                                  : isExceeded
                                  ? 'border-destructive bg-destructive/5'
                                  : isFilled
                                  ? 'border-emerald-500/30 bg-card shadow-xs'
                                  : 'border-border bg-card'
                              }`}
                            >
                              {/* Subject Name */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-xs sm:text-sm text-foreground truncate block">
                                  {mark.subjectName}
                                </span>
                              </div>

                              {/* Inputs Row: [ MarksDropdownInput (Equal 50%) ] / [ MaxMarksDropdownInput (Equal 50%) ] */}
                              <div className="flex items-center gap-1.5 w-full">
                                <div className="flex-1 min-w-0">
                                  <MarksDropdownInput
                                    obtainedMarks={mark.obtainedMarks}
                                    isAbsent={mark.isAbsent}
                                    maxMarks={mark.maxMarks}
                                    rowIndex={filteredIdx}
                                    colIndex={markIdx}
                                    onNavigate={handleCellNavigate}
                                    inputMode={inputMode}
                                    onChange={(obt, abs) =>
                                      updateSubjectValue(originalIndex, markIdx, obt, abs)
                                    }
                                  />
                                </div>

                                <span className="text-muted-foreground font-bold text-xs shrink-0">/</span>

                                <div className="flex-1 min-w-0">
                                  <MaxMarksDropdownInput
                                    value={mark.maxMarks}
                                    inputMode={inputMode}
                                    rowIndex={filteredIdx}
                                    colIndex={markIdx}
                                    onNavigate={handleCellNavigate}
                                    onChange={(val) =>
                                      updateStudentMaxMark(originalIndex, markIdx, val)
                                    }
                                  />
                                </div>
                              </div>

                              {isExceeded && (
                                <p className="text-[10px] text-destructive font-semibold mt-1">
                                  Exceeds max ({mark.maxMarks})
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dropdown Footer: Live Calculated Results & Done/Next Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                        {/* Live Total & Percentage Summary */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-muted-foreground">Total Obtained: </span>
                            <strong className="text-sm font-bold text-foreground">
                              {student.totalObtained !== null ? student.totalObtained : '—'}
                            </strong>
                            <span className="text-muted-foreground"> / {student.totalMax}</span>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Percentage: </span>
                            <strong
                              className={`text-sm font-bold ${
                                (student.percentage || 0) >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : (student.percentage || 0) < 40 && student.percentage !== null
                                  ? 'text-destructive'
                                  : 'text-foreground'
                              }`}
                            >
                              {student.percentage !== null
                                ? `${student.percentage.toFixed(2)}%`
                                : isAllAbsent
                                ? 'Absent'
                                : '—'}
                            </strong>
                          </div>
                        </div>

                        {/* Close Dropdown & Move to Next Student Button */}
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDoneStudent(student.studentResultId, filteredIdx)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 px-4 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Done & Next Student
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── VIEW MODE 2: SPREADSHEET TABLE VIEW (DATA TABLE) ─── */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-muted/80 sticky top-0 z-20 backdrop-blur-md border-b">
                <tr>
                  <th className="p-3 font-semibold text-muted-foreground sticky left-0 z-30 bg-muted/95 min-w-[55px] sm:min-w-[60px] text-center border-r">
                    <button
                      type="button"
                      onClick={() => toggleSort('studentId')}
                      className="inline-flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                      title="Sort by Student ID"
                    >
                      <span>ID</span>
                      {tableSorting.column === 'studentId' ? (
                        tableSorting.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground sticky left-[55px] sm:left-[60px] z-30 bg-muted/95 min-w-[150px] sm:min-w-[200px] border-r">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                      title="Sort by Student Name"
                    >
                      <span>Student Name</span>
                      {tableSorting.column === 'name' ? (
                        tableSorting.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </th>

                  {/* School Column (Toggleable in Columns dropdown) */}
                  {columnVisibility.school && (
                    <th className="p-3 font-semibold text-muted-foreground min-w-[140px] sm:min-w-[170px] text-left border-r">
                      <button
                        type="button"
                        onClick={() => toggleSort('school')}
                        className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                        title="Sort by School"
                      >
                        <span>School</span>
                        {tableSorting.column === 'school' ? (
                          tableSorting.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </th>
                  )}

                  {/* Subject Columns (Always ON by default, generous width for marks inputs) */}
                  {subjects.map((sub) => (
                    <th
                      key={sub.subjectId}
                      className="p-3 font-semibold text-muted-foreground min-w-[180px] sm:min-w-[200px] text-center border-r"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(`subject_${sub.subjectId}`)}
                        className="inline-flex flex-col items-center justify-center cursor-pointer select-none hover:text-foreground transition-colors group/sub"
                        title={`Sort by ${sub.subjectName} marks`}
                      >
                        <div className="flex items-center gap-1 font-bold text-foreground text-sm tracking-tight">
                          <span>{sub.subjectName}</span>
                          {tableSorting.column === `subject_${sub.subjectId}` ? (
                            tableSorting.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sub:opacity-60 transition-opacity shrink-0" />
                          )}
                        </div>
                        {sub.defaultMax > 0 && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Max: {sub.defaultMax}
                          </div>
                        )}
                      </button>
                    </th>
                  ))}

                  {/* Total Column (Toggleable in Columns dropdown) */}
                  {columnVisibility.total && (
                    <th className="p-3 font-semibold text-muted-foreground min-w-[95px] text-center border-r bg-muted/60">
                      <button
                        type="button"
                        onClick={() => toggleSort('total')}
                        className="inline-flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                        title="Sort by Total Marks"
                      >
                        <span>Total</span>
                        {tableSorting.column === 'total' ? (
                          tableSorting.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </th>
                  )}

                  {/* Percentage Column (Toggleable in Columns dropdown) */}
                  {columnVisibility.percentage && (
                    <th className="p-3 font-semibold text-muted-foreground min-w-[95px] text-center border-r bg-muted/60">
                      <button
                        type="button"
                        onClick={() => toggleSort('percentage')}
                        className="inline-flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                        title="Sort by Percentage"
                      >
                        <span>%</span>
                        {tableSorting.column === 'percentage' ? (
                          tableSorting.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </th>
                  )}

                  {/* Rank Column (Toggleable in Columns dropdown) */}
                  {columnVisibility.rank && (
                    <th className="p-3 font-semibold text-muted-foreground min-w-[75px] text-center bg-muted/60">
                      <button
                        type="button"
                        onClick={() => toggleSort('rank')}
                        className="inline-flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                        title="Sort by Rank"
                      >
                        <span>Rank</span>
                        {tableSorting.column === 'rank' ? (
                          tableSorting.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedAndFilteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        2 +
                        (columnVisibility.school ? 1 : 0) +
                        subjects.length +
                        (columnVisibility.total ? 1 : 0) +
                        (columnVisibility.percentage ? 1 : 0) +
                        (columnVisibility.rank ? 1 : 0)
                      }
                      className="text-center p-8 text-muted-foreground"
                    >
                      No students match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredStudents.map((student, tableRowIdx) => {
                    const originalIndex = students.findIndex(
                      (s) => s.studentResultId === student.studentResultId
                    );
                    const absentCount = student.marks.filter((m) => m.isAbsent).length;
                    const isAllAbsent = student.marks.length > 0 && absentCount === student.marks.length;

                    return (
                      <tr
                        key={student.studentResultId}
                        className={`hover:bg-accent/40 transition-colors ${
                          isAllAbsent ? 'bg-destructive/5 text-muted-foreground' : ''
                        }`}
                      >
                        {/* Student ID (Sticky) */}
                        <td className="p-2.5 font-mono text-xs font-semibold sticky left-0 z-10 bg-background/95 border-r text-center">
                          {student.studentId}
                        </td>

                        {/* Student Name (Sticky) */}
                        <td className="p-2.5 font-medium sticky left-[55px] sm:left-[60px] z-10 bg-background/95 border-r truncate max-w-[200px]">
                          <div className="truncate font-semibold text-foreground">{student.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Class: {student.class || '—'}
                          </div>
                        </td>

                        {/* School Column */}
                        {columnVisibility.school && (
                          <td className="p-2.5 border-r text-xs text-muted-foreground truncate max-w-[170px]" title={student.school || '—'}>
                            <span className="font-medium text-foreground/80">{student.school || '—'}</span>
                          </td>
                        )}

                        {/* Subject Mark Inputs with direct unified dropdown component */}
                        {student.marks.map((mark, markIdx) => {
                          return (
                            <td key={mark.markId} className="p-2 sm:p-2.5 border-r text-center">
                              <div className="flex items-center justify-center gap-1.5 w-[156px] sm:w-[166px] mx-auto">
                                <div className="flex-1 min-w-0">
                                  <MarksDropdownInput
                                    obtainedMarks={mark.obtainedMarks}
                                    isAbsent={mark.isAbsent}
                                    maxMarks={mark.maxMarks}
                                    isTable={true}
                                    rowIndex={tableRowIdx}
                                    colIndex={markIdx}
                                    onNavigate={handleCellNavigate}
                                    inputMode={inputMode}
                                    onChange={(obt, abs) =>
                                      updateSubjectValue(originalIndex, markIdx, obt, abs)
                                    }
                                    className="w-full"
                                  />
                                </div>

                                <span className="text-muted-foreground text-xs font-bold shrink-0">/</span>

                                <div className="flex-1 min-w-0">
                                  <MaxMarksDropdownInput
                                    value={mark.maxMarks}
                                    isTable={true}
                                    inputMode={inputMode}
                                    rowIndex={tableRowIdx}
                                    colIndex={markIdx}
                                    onNavigate={handleCellNavigate}
                                    className="w-full"
                                    onChange={(val) =>
                                      updateStudentMaxMark(originalIndex, markIdx, val)
                                    }
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Obtained */}
                        {columnVisibility.total && (
                          <td className="p-2.5 text-center font-mono font-bold border-r bg-muted/20">
                            {isAllAbsent ? (
                              '—'
                            ) : student.totalObtained !== null ? (
                              <span>
                                {student.totalObtained}{' '}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  / {student.totalMax}
                                </span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}

                        {/* Percentage */}
                        {columnVisibility.percentage && (
                          <td className="p-2.5 text-center font-mono font-bold border-r bg-muted/20">
                            {isAllAbsent ? (
                              '—'
                            ) : student.percentage !== null ? (
                              <span
                                className={
                                  student.percentage >= 75
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : student.percentage < 40
                                    ? 'text-destructive'
                                    : ''
                                }
                              >
                                {student.percentage.toFixed(2)}%
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}

                        {/* Rank */}
                        {columnVisibility.rank && (
                          <td className="p-2.5 text-center font-mono font-semibold bg-muted/20">
                            {isAllAbsent ? (
                              '—'
                            ) : student.groupRank ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                #{student.groupRank}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title={
          <>
            <span className="sm:hidden">Publish Results</span>
            <span className="hidden sm:inline">Finalize & Publish Results</span>
          </>
        }
        description={
          <>
            <span className="sm:hidden">
              Finalize this period? Report cards will become accessible for viewing and printing.
            </span>
            <span className="hidden sm:inline">
              Publishing will mark this result period as finalized. Report cards will be accessible for printing and students/parents viewing. You can still unlock it later if revisions are needed.
            </span>
          </>
        }
        actionLabel={
          <>
            <span className="sm:hidden">Publish</span>
            <span className="hidden sm:inline">Publish Results</span>
          </>
        }
        onConfirm={handlePublish}
        variant="default"
      />
    </div>
    </ContextMenuTrigger>

    {/* Whole-Page Context Menu */}
    <ContextMenuContent className="w-56 shadow-xl">
      {/* Top Actions (All above buttons except Back) */}
      <ContextMenuItem onClick={handleSave} disabled={saving} className="cursor-pointer font-medium">
        <Save className="h-4 w-4 mr-2 text-primary" />
        <span>Save Marks</span>
        <ContextMenuShortcut>Ctrl+S</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem onClick={() => loadData()} disabled={saving} className="cursor-pointer">
        <RotateCcw className="h-4 w-4 mr-2" />
        <span>Reset</span>
      </ContextMenuItem>

      {!isPublished ? (
        <ContextMenuItem
          onClick={() => setPublishDialogOpen(true)}
          className="cursor-pointer text-emerald-600 focus:text-emerald-600"
        >
          <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />
          <span>Finalize</span>
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={handleRevertToDraft} className="cursor-pointer">
          <Lock className="h-4 w-4 mr-2" />
          <span>Revert to Draft</span>
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />

      {/* Columns Visibility Checkboxes (Matching reference image style) */}
      <ContextMenuCheckboxItem
        checked={columnVisibility.school}
        onCheckedChange={(val) =>
          updateColumnVisibility((prev) => ({ ...prev, school: !!val }))
        }
        className="cursor-pointer text-xs"
      >
        School
      </ContextMenuCheckboxItem>

      <ContextMenuCheckboxItem
        checked={columnVisibility.total}
        onCheckedChange={(val) =>
          updateColumnVisibility((prev) => ({ ...prev, total: !!val }))
        }
        className="cursor-pointer text-xs"
      >
        Total Marks
      </ContextMenuCheckboxItem>

      <ContextMenuCheckboxItem
        checked={columnVisibility.percentage}
        onCheckedChange={(val) =>
          updateColumnVisibility((prev) => ({ ...prev, percentage: !!val }))
        }
        className="cursor-pointer text-xs"
      >
        Percentage (%)
      </ContextMenuCheckboxItem>

      <ContextMenuCheckboxItem
        checked={columnVisibility.rank}
        onCheckedChange={(val) =>
          updateColumnVisibility((prev) => ({ ...prev, rank: !!val }))
        }
        className="cursor-pointer text-xs"
      >
        Group Rank
      </ContextMenuCheckboxItem>

      <ContextMenuSeparator />

      {/* Quick View & Card Actions */}
      {/* View Mode Toggle in Context Menu (Desktop only: phone screen size always stays in Cards) */}
      {typeof window !== 'undefined' && window.innerWidth >= 640 && (
        <ContextMenuItem
          onClick={() => setViewMode(viewMode === 'table' ? 'accordion' : 'table')}
          className="cursor-pointer text-xs"
        >
          {viewMode === 'table' ? (
            <>
              <LayoutList className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Switch to Cards</span>
            </>
          ) : (
            <>
              <TableIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Switch to Table</span>
            </>
          )}
        </ContextMenuItem>
      )}

      {viewMode === 'accordion' && (
        <ContextMenuItem onClick={handleToggleExpandAll} className="cursor-pointer text-xs">
          {hasAnyExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Collapse All</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Expand All</span>
            </>
          )}
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />

      {/* Marks Input Mode Setting: Single 1-Click Toggle between Dropdown and Normal Input */}
      <ContextMenuItem
        onClick={() => setInputMode((prev) => (prev === 'dropdown' ? 'normal' : 'dropdown'))}
        className="cursor-pointer text-xs"
      >
        {inputMode === 'dropdown' ? (
          <>
            <PenLine className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Switch to Normal Input</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Switch to Dropdown Input</span>
          </>
        )}
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* Quick Jump to Last Filled / First Input */}
      <ContextMenuItem onClick={handleJumpToFirstOrLastFilled} className="cursor-pointer text-xs font-medium">
        <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
        <span>Jump to Last Filled / First</span>
        <ContextMenuShortcut>/</ContextMenuShortcut>
      </ContextMenuItem>

      {/* Keyboard Shortcuts Dialog Trigger */}
      <ContextMenuItem onClick={() => setShortcutsModalOpen(true)} className="cursor-pointer text-xs font-medium">
        <Keyboard className="h-4 w-4 mr-2 text-primary" />
        <span>Keyboard Shortcuts</span>
        <ContextMenuShortcut>?</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>

  {/* Keyboard Shortcuts Help Dialog Modal */}
  <Dialog open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription className="text-xs">
              Excel-style navigation and quick grading shortcuts for mouse-free marks entry.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 pt-2 text-xs">
        {/* Section 1: Excel Grid Navigation */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
            <span>Grid Navigation (Excel)</span>
          </h3>
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <span className="text-foreground font-medium block">Jump to Last Filled / First Cell</span>
                <span className="text-[10px] text-muted-foreground">Jump directly to your resume point or start from top</span>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">/</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <span className="text-foreground font-medium block">Next Field (Marks → Max Marks → Next Subject)</span>
                <span className="text-[10px] text-muted-foreground">In Normal Mode: Advances from secured mark to max mark to next subject; on last subject, automatically completes student and opens the next</span>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">Enter</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Same Subject, Next Student (Down)</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">↓</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Same Subject, Previous Student (Up)</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">↑</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-foreground font-medium">Move Left / Right</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">←</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">→</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Fast Grading & Attendance */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
            <span>Fast Grading & Attendance</span>
          </h3>
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Mark Student Absent</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">A</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-foreground font-medium">Enter Marks Directly</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">0 – 9</kbd>
            </div>
          </div>
        </div>

        {/* Section 3: System Shortcuts */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
            <span>Page & Action Shortcuts</span>
          </h3>
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Save All Marks</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">S</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Focus Search Bar</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">F</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Switch View (Table / Cards)</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">Shift</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">T</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-foreground font-medium">Show This Shortcuts Guide</span>
              <kbd className="px-2 py-0.5 rounded bg-muted border font-mono font-semibold text-[11px] shadow-xs">?</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-foreground font-medium">Open Page Context Menu</span>
              <span className="text-muted-foreground font-mono text-[11px]">Right Click</span>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  </>
  );
}

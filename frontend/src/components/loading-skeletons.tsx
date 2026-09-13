import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, CalendarDays, CheckCircle2, Clock, UserX, Trophy, UserRound, FileText } from 'lucide-react';


// Backwards-compatible / Fallback loaders
export function PageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header skeleton */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 sm:w-48" />
          <Skeleton className="h-4 w-48 sm:w-72" />
        </div>
        <Skeleton className="h-9 w-24 sm:w-32 shrink-0" />
      </div>

      {/* Desktop table skeleton */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="page-enter grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </Card>
      ))}
    </div>
  );
}

export function FormLoading() {
  return (
    <div className="page-enter space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * ─── PAGE-SPECIFIC HIGH-FIDELITY LOADING SKELETONS ───────────────────────────────
 */

// 1. Collect Page loading state
export function CollectPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-60" />
      </div>

      {/* Student Selector */}
      <div className="max-w-md space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns (Form/Grid) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info Card */}
          <Card className="p-5 space-y-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4.5 w-24" />
                </div>
              ))}
            </div>
          </Card>

          {/* Month Grid */}
          <Card className="p-5 space-y-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 flex flex-col items-center justify-center space-y-2 h-16 bg-muted/10">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Form Fields */}
          <Card className="p-5 space-y-4 rounded-xl shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-end">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
          </Card>
        </div>

        {/* Right Column (History Table) */}
        <Card className="p-5 space-y-4 rounded-xl shadow-sm h-fit">
          <Skeleton className="h-6 w-36 pb-1" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-14 ml-auto" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// 2. Students Page loading state
export function StudentsPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 sm:w-40" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-9 w-28 sm:w-32 rounded-md shrink-0" />
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-sm">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Mobile Card List View */}
      <div className="block sm:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border bg-card/45 py-0 gap-0 rounded-xl">
            <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-10 rounded-sm" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-4.5 w-12 rounded-full" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-20 font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Class</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Fee/Month</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Admission</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-3.5 w-20" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 3. Receipts Page loading state
export function ReceiptsPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 sm:w-44" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Skeleton className="h-10 w-full sm:max-w-sm rounded-md" />
        <Skeleton className="h-9 w-[180px] rounded-md shrink-0" />
      </div>

      {/* Mobile Card List View */}
      <div className="block sm:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border bg-card/45 py-0 gap-0 rounded-xl">
            <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Receipt No</TableHead>
              <TableHead className="font-semibold">Student</TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">Period</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Amount</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Date</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4.5 w-40" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-3.5 w-20" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 4. Dues Page loading state
export function DuesPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 sm:w-40" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-md shrink-0" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="overflow-hidden transition-all duration-300">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mobile Card List View */}
      <div className="block sm:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border bg-card/45 py-0 gap-0 rounded-xl">
            <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-8 rounded-sm" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Fee/Month</TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">Dues</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-20 rounded-md ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 5. Settings Page loading state
export function SettingsPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-28 sm:w-36" />
        <Skeleton className="mt-2 h-4 w-52 sm:w-72" />
      </div>

      {/* Main Settings Card */}
      <div className="space-y-6">
        {/* Receipt Header Configuration */}
        <Card className="p-5 space-y-4 rounded-xl shadow-sm">
          <div className="border-b pb-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-1 h-3.5 w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </Card>

        {/* 3-Column Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-4 rounded-xl shadow-sm">
              <Skeleton className="h-5 w-32 border-b pb-2" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. About Page loading state
export function AboutPageLoading() {
  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Hero Header Section Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border bg-card/50 p-4 md:p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-64 md:w-80" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4.5 w-12 rounded-full" />
                <Skeleton className="h-4.5 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-5/6 md:w-2/3" />
          </div>
        </div>
      </div>

      {/* Credits Card Skeleton */}
      <Card className="overflow-hidden border border-border/80 shadow-xs pt-0 gap-0">
        <CardHeader className="bg-muted/20 border-b border-border/40 py-4 px-6 mb-5 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-3.5 w-60" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative overflow-hidden rounded-xl border border-border/85 p-5 shadow-xs space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Skeleton className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4.5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
            </div>

            <div className="h-[1px] bg-border/60" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-36 rounded-lg sm:ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 7. Groups Page loading state
export function GroupsPageLoading() {
  return (
    <div className="space-y-6 text-left p-4 md:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground text-sm">
            0 groups configured
          </p>
        </div>
        <Button className="hidden sm:flex items-center cursor-pointer" disabled>
          <Plus className="mr-1.5 h-4 w-4" /> Add Group
        </Button>
        <Button size="sm" className="flex sm:hidden items-center cursor-pointer px-3 h-9 text-xs" disabled>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Group
        </Button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="overflow-hidden flex flex-col justify-between pb-3 border bg-card/45 backdrop-blur-md">
            <div>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                {/* Left: icon + title/desc */}
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-accent animate-pulse shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <div className="h-4 w-20 rounded-md bg-accent animate-pulse" />
                    <div className="h-3 w-14 rounded-md bg-accent animate-pulse" />
                  </div>
                </div>
                {/* Right: badge + menu */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="h-5 w-14 rounded-full bg-accent animate-pulse" />
                  <div className="h-7 w-7 rounded-md bg-accent animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="pb-2 space-y-2">
                {/* "Classes On" info row */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-3.5 w-3.5 rounded-sm bg-accent animate-pulse shrink-0" />
                    <div className="h-3 w-[72px] rounded-md bg-accent animate-pulse" />
                  </div>
                  <div className="h-3 w-20 rounded-md bg-accent animate-pulse" />
                </div>
                {/* "Students" info row */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-3.5 w-3.5 rounded-sm bg-accent animate-pulse shrink-0" />
                    <div className="h-3 w-[58px] rounded-md bg-accent animate-pulse" />
                  </div>
                  <div className="h-3 w-6 rounded-md bg-accent animate-pulse" />
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 8. Reports Dashboard loading state (Pixel-perfect responsive & desktop skeleton)
export function ReportsDashboardLoading() {
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Page Header */}
      <div className="border-b pb-3.5 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Report Cards Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>Academic Year:</span>
              <Skeleton className="h-3.5 sm:h-4 w-16 rounded" />
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: 'Total Students', icon: Users, color: 'text-blue-500', valW: 'w-12 sm:w-16' },
          { label: 'Latest Result', icon: CalendarDays, color: 'text-emerald-500', valW: 'w-20 sm:w-24' },
          { label: 'Completed', icon: CheckCircle2, color: 'text-green-500', valW: 'w-10 sm:w-12' },
          { label: 'Pending', icon: Clock, color: 'text-amber-500', valW: 'w-10 sm:w-12' },
          { label: 'Total Absent', icon: UserX, color: 'text-red-400', valW: 'w-12 sm:w-14' },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color} opacity-80`} />
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <Skeleton className={`h-7 sm:h-8 ${stat.valW} rounded-md`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions — 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Create Monthly Result', icon: Plus, variant: 'default' as const },
            { label: 'View Rankings', icon: Trophy, variant: 'outline' as const },
            { label: 'Student Report Cards', icon: UserRound, variant: 'outline' as const },
            { label: 'Blank Marks Sheet', icon: FileText, variant: 'outline' as const },
          ].map((action, i) => (
            <Button
              key={i}
              variant={action.variant}
              disabled
              className="h-auto py-4 flex flex-col items-center gap-2 text-sm opacity-90 cursor-not-allowed"
            >
              <action.icon className="h-5 w-5" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Result Periods */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Result Periods</h2>
          <Button variant="ghost" size="sm" className="text-xs" disabled>
            View All
          </Button>
        </div>
        <div className="space-y-2">
          {[
            { monthW: 'w-32 sm:w-36', codeW: 'w-16', subW: 'w-48 sm:w-60', statusW: 'w-18' },
            { monthW: 'w-28 sm:w-32', codeW: 'w-18', subW: 'w-44 sm:w-56', statusW: 'w-20' },
            { monthW: 'w-36 sm:w-40', codeW: 'w-16', subW: 'w-52 sm:w-64', statusW: 'w-16' },
            { monthW: 'w-30 sm:w-34', codeW: 'w-16', subW: 'w-40 sm:w-52', statusW: 'w-18' },
            { monthW: 'w-28 sm:w-32', codeW: 'w-18', subW: 'w-48 sm:w-58', statusW: 'w-16' },
          ].map((item, i) => (
            <Card key={i} className="transition-colors">
              <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Skeleton className={`h-4.5 sm:h-5 ${item.monthW} rounded-md`} />
                      <Skeleton className={`h-4.5 ${item.codeW} rounded-full`} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Skeleton className={`h-3.5 ${item.subW} rounded-md`} />
                    </div>
                  </div>
                </div>
                <Skeleton className={`h-5.5 sm:h-6 ${item.statusW} rounded-full shrink-0`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// 9. Monthly Results Page loading state
export function MonthlyResultsPageLoading() {
  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Header */}
      <div className="border-b pb-3 sm:pb-3.5">
        <div className="flex flex-row items-center justify-between gap-3 w-full">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Monthly Results
            </h1>
            <Skeleton className="mt-1 h-3.5 w-56 sm:w-72 rounded" />
          </div>
          <Skeleton className="md:hidden h-8 w-8 sm:h-9 sm:w-24 rounded-md shrink-0" />
        </div>
      </div>

      {/* Desktop: Search & Creation Toolbar */}
      <div className="hidden md:flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 w-full">
          <Skeleton className="h-9 flex-1 min-w-[200px] max-w-sm lg:max-w-md rounded-md" />
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-[125px] rounded-md" />
            <Skeleton className="h-9 w-[135px] rounded-md" />
            <Skeleton className="h-9 w-[135px] rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>

      {/* Mobile: Search & Year */}
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-[125px] rounded-md shrink-0" />
        </div>
      </div>

      {/* Results List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="transition-colors">
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-36 sm:w-44 rounded-md" />
                    <Skeleton className="h-4.5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-48 sm:w-64 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-md hidden sm:block" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 10. Marks Entry Page loading state
export function MarksEntryPageLoading() {
  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Nav Row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      {/* Header Info Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-40 sm:w-56 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-60 sm:w-80 rounded" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b flex items-center justify-between gap-3">
          <Skeleton className="h-8 flex-1 max-w-sm rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12"><Skeleton className="h-4 w-6" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-14" /></TableHead>
              ))}
              <TableHead><Skeleton className="h-4 w-14" /></TableHead>
              <TableHead><Skeleton className="h-4 w-10" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                {Array.from({ length: 4 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-8 w-14 rounded-md" /></TableCell>
                ))}
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 11. Rankings Page loading state
export function RankingsPageLoading() {
  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Header */}
      <div className="border-b pb-3.5 sm:pb-4">
        <div className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-col justify-end">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Academic Rankings
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="hidden sm:block h-3.5 w-72 rounded" />
            </div>
          </div>
          {/* Mobile action buttons */}
          <div className="sm:hidden flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-[168px] rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton className="h-8 flex-1 min-w-0 rounded-md" />
            <Skeleton className="sm:hidden h-8 w-8 rounded-md" />
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-[130px] rounded-md" />
            <Skeleton className="h-8 w-[140px] rounded-md" />
            <Skeleton className="h-8 w-[140px] rounded-md" />
            <Skeleton className="h-8 w-[120px] rounded-md" />
          </div>
        </div>
      </div>

      {/* Content: Ranking Cards */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-4.5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-16"><Skeleton className="h-4 w-10" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableHead key={j}><Skeleton className="h-4 w-12" /></TableHead>
                    ))}
                    <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-10" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableRow key={j}>
                      <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      {Array.from({ length: 3 }).map((_, k) => (
                        <TableCell key={k}><Skeleton className="h-4 w-10" /></TableCell>
                      ))}
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 12. Student Reports Page loading state (Directory View)
export function StudentReportsPageLoading() {
  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Header */}
      <div className="border-b pb-3.5 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Student Report Cards
            </h1>
            <Skeleton className="mt-1 h-3.5 w-52 sm:w-72 rounded" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <Skeleton className="h-9 flex-1 min-w-0 rounded-md" />
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-full sm:w-[120px] rounded-md" />
            <Skeleton className="h-9 w-full sm:w-[120px] rounded-md" />
            <Skeleton className="h-9 w-full sm:w-[120px] rounded-md" />
          </div>
        </div>
      </div>

      {/* Student List Cards */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden border bg-card/60 py-0 gap-0 rounded-xl">
            <CardContent className="p-2.5 sm:p-3 flex items-center justify-between gap-3 px-3 sm:px-3.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <Skeleton className="h-5 w-10 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Skeleton className="h-4 w-32 sm:w-44 rounded" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-3 rounded-sm" />
                    <Skeleton className="h-3 w-24 sm:w-36 rounded" />
                    <Skeleton className="hidden sm:block h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden md:block text-right space-y-1">
                  <Skeleton className="h-3.5 w-16 rounded ml-auto" />
                  <Skeleton className="h-3 w-20 rounded ml-auto" />
                </div>
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 13. Student Reports Detail loading state (when a student report card is loading)
export function StudentReportsDetailLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start w-full">
      {/* Left Panel: KPIs & Contacts */}
      <div className="lg:col-span-4 xl:col-span-4 space-y-4 w-full">
        {/* Mobile Student Details */}
        <Card className="lg:hidden">
          <CardHeader className="p-3 sm:p-3.5 pb-2 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-10 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 pt-2.5">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-2 sm:p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance KPIs */}
        <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
          <CardHeader className="p-3.5 pb-2 border-b border-border/50">
            <Skeleton className="h-3.5 w-36 rounded" />
          </CardHeader>
          <CardContent className="p-3.5">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Contacts */}
        <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
          <CardHeader className="p-3.5 pb-2 border-b border-border/50">
            <Skeleton className="h-3.5 w-28 rounded" />
          </CardHeader>
          <CardContent className="p-3.5 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-b-0">
                <Skeleton className="h-3.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Monthly Exam Records */}
        <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
          <CardHeader className="p-3.5 pb-2 border-b border-border/50">
            <Skeleton className="h-3.5 w-44 rounded" />
          </CardHeader>
          <CardContent className="p-2 space-y-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: A4 Report Card Preview */}
      <div className="lg:col-span-8 xl:col-span-8">
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Report Card Header Skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 text-center">
                <Skeleton className="h-7 w-3/4 mx-auto rounded" />
                <Skeleton className="h-3 w-1/2 mx-auto rounded" />
                <Skeleton className="h-3 w-2/3 mx-auto rounded" />
                <Skeleton className="h-3 w-1/2 mx-auto rounded" />
              </div>
            </div>
            <Skeleton className="h-1 w-full rounded" />
            {/* Session & Title */}
            <div className="text-center space-y-1.5">
              <Skeleton className="h-3.5 w-48 mx-auto rounded" />
              <Skeleton className="h-3 w-36 mx-auto rounded" />
              <Skeleton className="h-3 w-24 mx-auto rounded" />
            </div>
            {/* Student Profile Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 py-2 border-b">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-28 rounded shrink-0" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              ))}
            </div>
            {/* Result Table */}
            <Skeleton className="h-3.5 w-32 mx-auto rounded" />
            <div className="rounded border overflow-hidden">
              <div className="bg-muted/30 p-2 flex items-center gap-1">
                <Skeleton className="h-4 w-16" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-12 flex-1" />
                ))}
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-8" />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-2 flex items-center gap-1 border-t">
                  <Skeleton className="h-3.5 w-16" />
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3.5 w-12 flex-1" />
                  ))}
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 14. Blank Marks Sheet Page loading state
export function BlankMarksSheetPageLoading() {
  return (
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Header */}
      <div className="border-b pb-3 sm:pb-3.5">
        <div className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Offline Blank Marks Entry Sheet
            </h1>
            <Skeleton className="mt-1 h-3.5 w-60 sm:w-96 rounded" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="hidden sm:block h-9 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-28 rounded-md" />
          </div>
        </div>
      </div>

      {/* Desktop Filter Controls */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
        <Skeleton className="h-9 w-[130px] rounded-md" />
        <Skeleton className="h-9 w-[130px] rounded-md" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>

      {/* Mobile Filter Controls */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 flex-1 rounded-md" />
          ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

// 15. Result Settings Page loading state
export function ResultSettingsPageLoading() {
  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Report Card & Subject Settings</h1>
          <Skeleton className="mt-1.5 h-3.5 w-64 sm:w-80 rounded" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md shrink-0" />
      </div>

      {/* Overview Cards: Junior vs Senior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Junior', 'Senior'].map((cat) => (
          <Card key={cat} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-40 rounded" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-1 h-3 w-52 rounded" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: cat === 'Junior' ? 5 : 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 sm:w-20 rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subjects Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
          </div>
          <Skeleton className="mt-1 h-3 w-72 rounded" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 16. Module Selection Page loading state
export function ModuleSelectionPageLoading() {
  return (
    <div className="page-enter min-h-svh flex flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-10 text-center flex flex-col items-center">
        <Skeleton className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl mb-3" />
        <Skeleton className="h-7 sm:h-8 w-44 sm:w-56 mb-2" />
        <Skeleton className="h-4 w-36 sm:w-44" />
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 w-full max-w-2xl">
        {/* Card 1 — MCMS */}
        <div className="flex flex-row md:flex-col items-center md:items-start text-left rounded-2xl border border-border/70 bg-card p-4 sm:p-5 md:p-7 gap-4 md:gap-0 md:min-h-[220px]">
          <Skeleton className="h-15 w-15 sm:h-16 sm:w-16 md:h-13 md:w-13 rounded-2xl md:mb-4 bg-blue-500/20 shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 md:mb-1.5" />
            <Skeleton className="hidden md:block h-4 w-48 sm:w-56 mb-6 mt-1" />
          </div>
          <Skeleton className="md:hidden h-9 w-9 rounded-full shrink-0" />
          <div className="hidden md:flex items-center gap-1.5 mt-auto pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-3.5 rounded" />
          </div>
        </div>

        {/* Card 2 — Student Report Cards */}
        <div className="flex flex-row md:flex-col items-center md:items-start text-left rounded-2xl border border-border/70 bg-card p-4 sm:p-5 md:p-7 gap-4 md:gap-0 md:min-h-[220px]">
          <Skeleton className="h-15 w-15 sm:h-16 sm:w-16 md:h-13 md:w-13 rounded-2xl md:mb-4 bg-emerald-500/20 shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 sm:h-6 w-36 sm:w-44 md:mb-1.5" />
            <Skeleton className="hidden md:block h-4 w-52 sm:w-60 mb-6 mt-1" />
          </div>
          <Skeleton className="md:hidden h-9 w-9 rounded-full shrink-0" />
          <div className="hidden md:flex items-center gap-1.5 mt-auto pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-3.5 rounded" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Skeleton className="mt-8 sm:mt-10 h-3 w-52 opacity-40" />
    </div>
  );
}

// 17. Login Page loading state
export function LoginPageLoading() {
  return (
    <div className="page-enter relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-6 py-12">
      {/* Decorative blurred gradient backgrounds */}
      <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[400px] rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="h-14 w-14 rounded-xl border border-white/10 mb-4 bg-zinc-800" />
          <Skeleton className="h-6 w-20 mb-1.5 bg-zinc-800" />
          <Skeleton className="h-3.5 w-36 bg-zinc-800/70" />
        </div>

        {/* Form fields */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16 bg-zinc-800/70" />
            <Skeleton className="h-10 w-full rounded-md bg-zinc-850/40 border border-zinc-700/40" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16 bg-zinc-800/70" />
            <Skeleton className="h-10 w-full rounded-md bg-zinc-850/40 border border-zinc-700/40" />
          </div>

          <div className="pt-2">
            <Skeleton className="h-10 w-full rounded-md bg-indigo-600/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

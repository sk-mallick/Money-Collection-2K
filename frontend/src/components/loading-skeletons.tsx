import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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


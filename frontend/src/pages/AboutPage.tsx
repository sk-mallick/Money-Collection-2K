import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Code,
  Mail,
  Phone,
  Copy,
  Check,
  Code2,
  Sparkles,
} from 'lucide-react';

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="page-enter space-y-6 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-md p-4 md:p-5 shadow-xs transition-all">
        <div className="absolute top-0 right-0 -z-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-600/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-40 w-40 rounded-full bg-gradient-to-br from-pink-500/5 to-indigo-500/5 blur-2xl" />

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10 text-white">
            <Code2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Money Collection Management System
              </h1>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="h-4.5 bg-indigo-500/5 text-indigo-500 border-indigo-500/20 text-[9px] font-bold px-1.5">
                  v1.0.0
                </Badge>
                <Badge variant="outline" className="h-4.5 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 text-[9px] font-bold px-1.5">
                  PWA Active
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-3xl">
              An offline-first Progressive Web Application designed for streamlined school fee collection, payment tracking, and automated client-side PDF receipt generation.
            </p>
          </div>
        </div>
      </div>

      {/* System Architecture & Design Credits Card */}
      <Card className="overflow-hidden border border-border/80 shadow-xs pt-0 gap-0">
        <CardHeader className="bg-muted/20 border-b border-border/40 py-4 px-6 mb-5">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Code className="h-4 w-4 text-primary" />
            System Architecture & Design Credits
          </CardTitle>
          <CardDescription className="text-xs">
            Engineering metadata and UI/UX design authorship details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Primary: Subham Kumar Mallick Developer Profile */}
          <div className="relative overflow-hidden rounded-xl border border-border/85 bg-gradient-to-br from-card via-muted/5 to-primary/5 p-5 shadow-xs">
            <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-tr from-primary to-primary/40 text-lg font-bold text-primary-foreground shadow-sm select-none">
                SKM
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Subham Kumar Mallick
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Lead Developer
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                  Lead UI/UX Designer & Full-Stack Developer
                </p>
              </div>
            </div>

            <div className="my-4 h-[1px] bg-border/60" />

            <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
              <div className="shadow-3xs flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary/80" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Email Address
                  </p>
                  <a
                    href="mailto:subhammallick454@gmail.com"
                    className="block truncate text-xs font-medium text-foreground/95 hover:underline"
                  >
                    subhammallick454@gmail.com
                  </a>
                </div>
              </div>

              <div className="shadow-3xs flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary/80" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Contact Number
                  </p>
                  <a
                    href="tel:+918114963709"
                    className="block text-xs font-medium text-foreground/95 hover:underline"
                  >
                    +91 8114963709
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href="tel:+918114963709"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:scale-[1.01] hover:bg-primary/95 active:scale-[0.99]"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Designer
              </a>
              <a
                href="mailto:subhammallick454@gmail.com"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground shadow-xs transition-all hover:scale-[1.01] hover:bg-secondary/95 active:scale-[0.99]"
              >
                <Mail className="h-3.5 w-3.5" />
                Send Email
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const info = `Subham Kumar Mallick\nRole: Lead UI/UX Designer & Full-Stack Developer\nPhone: +91 8114963709\nEmail: subhammallick454@gmail.com`
                  navigator.clipboard.writeText(info)
                  setCopied(true)
                  toast.success("Designer details copied to clipboard!")
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="ml-auto h-auto cursor-pointer gap-1.5 rounded-lg border border-border/60 bg-transparent px-3 py-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied Info!" : "Copy Contact Details"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

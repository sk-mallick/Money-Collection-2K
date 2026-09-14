import { useNavigate } from 'react-router-dom';
import { Wallet, GraduationCap, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import logoUrl from '@/assets/favicon.png';

const modules = [
  {
    id: 'mcms',
    title: 'MCMS',
    subtitle: 'Money Collection Management System',
    icon: Wallet,
    path: '/mcms/students',
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  },
  {
    id: 'reports',
    title: 'Student Report Cards',
    subtitle: 'Student Result & Report Card Management',
    icon: GraduationCap,
    path: '/reports/dashboard',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    glowColor: 'rgba(20, 184, 166, 0.15)',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  {
    id: 'homework',
    title: 'Home Work Report',
    subtitle: 'Homework, Test Prep & Practice Tracking',
    icon: ClipboardCheck,
    path: '/homework/dashboard',
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
];

export default function ModuleSelectionPage() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 sm:mb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={logoUrl} alt="EnglishJibi Classes" className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl shadow-lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          EnglishJibi Classes
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Select a module to continue
        </p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 w-full max-w-4xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isHovered = hoveredId === mod.id;

          return (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              onMouseEnter={() => setHoveredId(mod.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(mod.id)}
              onBlur={() => setHoveredId(null)}
              aria-label={`Open ${mod.title} — ${mod.subtitle}`}
              className="group relative flex flex-row md:flex-col items-center md:items-start text-left rounded-2xl border border-border/70 bg-card p-4 sm:p-5 md:p-7 gap-4 md:gap-0 transition-all duration-300 ease-out hover:border-border hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
              style={{
                boxShadow: isHovered ? `0 8px 30px ${mod.glowColor}` : undefined,
              }}
            >
              {/* Big Icon */}
              <div className={`${mod.iconBg} flex items-center justify-center h-15 w-15 sm:h-16 sm:w-16 md:h-13 md:w-13 rounded-2xl shadow-md text-white md:mb-4 shrink-0 transition-transform duration-300 group-hover:scale-105 md:group-hover:scale-110`}>
                <Icon className="h-7.5 w-7.5 sm:h-8 sm:w-8 md:h-6.5 md:w-6.5" strokeWidth={2} />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground tracking-tight md:mb-1">
                  {mod.title}
                </h2>

                {/* Subtitle - hidden on mobile to avoid excessive text, visible on desktop */}
                <p className="hidden md:block text-xs sm:text-sm text-muted-foreground mb-6">
                  {mod.subtitle}
                </p>
              </div>

              {/* Mobile Action Chevron (sleek touch target, no excessive text) */}
              <div className="md:hidden flex items-center justify-center h-9 w-9 rounded-full bg-muted/40 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-all shrink-0">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* Desktop Action hint with "Open Module" */}
              <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-200 mt-auto">
                <span>Open Module</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>

              {/* Gradient accent line at bottom */}
              <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-8 sm:mt-10 text-[11px] text-muted-foreground/60 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        EnglishJibi Classes Management System
      </p>
    </div>
  );
}

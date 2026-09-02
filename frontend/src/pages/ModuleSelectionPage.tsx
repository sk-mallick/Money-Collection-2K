import { useNavigate } from 'react-router-dom';
import { Wallet, GraduationCap, ArrowRight } from 'lucide-react';
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
];

export default function ModuleSelectionPage() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={logoUrl} alt="EnglishJibi Classes" className="h-11 w-11 sm:h-13 sm:w-13 rounded-xl shadow-lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          EnglishJibi Classes
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Select a module to continue
        </p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
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
              className="group relative flex flex-col items-start text-left rounded-2xl border border-border/70 bg-card p-6 sm:p-7 transition-all duration-300 ease-out hover:border-border hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
              style={{
                boxShadow: isHovered ? `0 8px 30px ${mod.glowColor}` : undefined,
              }}
            >
              {/* Icon */}
              <div className={`${mod.iconBg} flex items-center justify-center h-12 w-12 sm:h-13 sm:w-13 rounded-xl shadow-md text-white mb-4 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-6 w-6 sm:h-6.5 sm:w-6.5" strokeWidth={1.9} />
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mb-1">
                {mod.title}
              </h2>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                {mod.subtitle}
              </p>

              {/* Action hint */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-200 mt-auto">
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

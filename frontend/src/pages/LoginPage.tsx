import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logoUrl from '@/assets/favicon.png';
import loginBgDesktopUrl from '@/assets/login-bg-desktop.webp';
import loginBgMobileUrl from '@/assets/login-bg-mobile.webp';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { login, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="relative flex h-screen h-svh w-screen max-w-full items-center justify-center overflow-hidden bg-zinc-950 p-4 select-none">
      {/* Full-bleed crisp responsive background with dedicated Desktop and Mobile artwork */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        <picture>
          <source media="(max-width: 640px)" srcSet={loginBgMobileUrl} />
          <img
            src={loginBgDesktopUrl}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="eager"
            decoding="async"
          />
        </picture>
        {/* Crisp presentation with minimal overlay — zero blur on background */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      {/* Glassmorphic Login Card with subtle blur for clear background visibility */}
      <div className="relative z-10 w-full max-w-[390px] rounded-2xl border border-white/20 bg-zinc-950/80 p-6 sm:p-8 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="flex flex-col items-center mb-6 sm:mb-7">
          <img src={logoUrl} alt="Logo" className="h-13 w-13 rounded-xl shadow-lg border border-white/10 mb-3.5" />
          <h1 className="text-xl font-bold tracking-tight text-white">MCMS</h1>
          <p className="text-xs text-zinc-400 mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-zinc-300">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
              autoComplete="username"
              autoFocus
              disabled={loading}
              className="bg-zinc-850/40 border-zinc-700/40 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500 h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">Password</Label>
            <div className="relative">
              <Input
                ref={passwordRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="bg-zinc-850/40 border-zinc-700/40 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500 h-10 text-sm pr-10"
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 shadow-md shadow-indigo-600/10 transition-all duration-200 mt-2 cursor-pointer" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin text-white" />
                Signing In...
              </>
            ) : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}

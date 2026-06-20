import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import logoUrl from '@/assets/favicon.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      navigate('/students', { replace: true });
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
      navigate('/students', { replace: true });
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-6 py-12">
      {/* Decorative premium blurred gradient backgrounds */}
      <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay for subtle texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[400px] rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center mb-8">
          <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-xl shadow-lg border border-white/10 mb-4" />
          <h1 className="text-xl font-bold tracking-tight text-white">MCMS</h1>
          <p className="text-xs text-zinc-400 mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-zinc-300">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              className="bg-zinc-850/40 border-zinc-700/40 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500 h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">Password</Label>
            <div className="relative">
              <Input
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

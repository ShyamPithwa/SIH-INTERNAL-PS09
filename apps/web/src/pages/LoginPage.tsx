import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

// ─── Password strength checker ───────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 4) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#10b981' };
}

function isPasswordAcceptable(password: string): boolean {
  // Must meet minimum: 8 chars + uppercase + lowercase + number + special char
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Brute-force lockout state ─────────────────────────────────────────────
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Redirect if already logged in ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  // ─── Countdown timer for lockout ──────────────────────────────────────────
  useEffect(() => {
    if (lockedUntil) {
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setCountdown(0);
          setError(null);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // ─── Password strength (only shown during sign-up) ────────────────────────
  const strength = getPasswordStrength(password);
  const showStrength = isSignUp && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block if locked out
    if (isLocked) return;

    // Validate password strength on sign-up
    if (isSignUp && !isPasswordAcceptable(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to confirm.');
        setAttempts(0);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          // ── SECURITY: Generic error message — prevents email enumeration ──
          // Never tell the attacker which field is wrong (email or password)
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          if (newAttempts >= MAX_ATTEMPTS) {
            // Lockout for 60 seconds
            const until = Date.now() + LOCKOUT_SECONDS * 1000;
            setLockedUntil(until);
            setCountdown(LOCKOUT_SECONDS);
            setError(`Too many failed attempts. Account locked for ${LOCKOUT_SECONDS} seconds.`);
          } else {
            const remaining = MAX_ATTEMPTS - newAttempts;
            setError(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`);
          }
          return;
        }

        if (data.session) {
          setAttempts(0);
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      // ── SECURITY: Catch-all also returns generic message ──
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setAttempts(0);
    setLockedUntil(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🔋</div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            BESS Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Create your account to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-2xl border border-white/10 shadow-2xl space-y-5">

          {/* Lockout banner */}
          {isLocked && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
              🔒 Account locked — try again in <span className="font-mono font-bold">{countdown}s</span>
              <div className="ml-auto h-1.5 w-20 bg-red-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${(countdown / LOCKOUT_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error / success */}
          {error && !isLocked && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-red-400 rounded-xl text-sm font-medium">
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
              ✅ {successMsg}
            </div>
          )}

          {/* Attempt indicator (only during login) */}
          {!isSignUp && attempts > 0 && !isLocked && (
            <div className="flex gap-1">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i < attempts ? 'bg-red-500' : 'bg-white/10'}`}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLocked}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition placeholder:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-medium">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white text-sm focus:outline-none focus:border-primary transition placeholder:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password strength meter (sign-up only) */}
              {showStrength && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)' }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color: strength.color }} className="font-semibold">{strength.label}</span>
                    {!isPasswordAcceptable(password) && (
                      <span className="text-slate-500">8+ chars, A-Z, a-z, 0-9, symbol</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading || isLocked || (isSignUp && !isPasswordAcceptable(password))}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-blue-500/20 mt-2"
            >
              {isLocked
                ? `🔒 Locked (${countdown}s)`
                : loading
                  ? (isSignUp ? 'Creating account...' : 'Signing in...')
                  : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>Already have an account?{' '}
                <button onClick={switchMode} className="text-primary hover:underline font-medium">
                  Sign in
                </button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button onClick={switchMode} className="text-primary hover:underline font-medium">
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Security note */}
        <p className="text-center text-[10px] text-slate-600">
          🔐 Protected by rate limiting, input sanitization &amp; JWT authentication
        </p>
      </div>
    </div>
  );
}

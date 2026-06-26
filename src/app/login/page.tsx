"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ flexDirection: 'column', gap: '2rem' }}>
      
      {/* Branding */}
      <div className="anim-fade" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          CollabDo
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>
          Your workspace awaits
        </p>
      </div>

      {/* Login Card */}
      <div className="login-card anim-fade anim-stagger-1">
        
        <h2 style={{ textAlign: 'center', marginBottom: '1.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
          {isSignUp ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--accent)" /> Create Account
            </span>
          ) : (
            'Welcome Back'
          )}
        </h2>
        
        {error && (
          <div className="anim-fade" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input input-lg"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input input-lg"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-3)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          {' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ 
              fontWeight: 600, 
              color: 'var(--accent)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ListTodo, ArrowRight, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.login-anim',
      { opacity: 0, y: 30, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard'); 
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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
    <div ref={containerRef} className="flex-center" style={{ minHeight: '100vh', padding: '2rem', flexDirection: 'column' }}>
      
      <div className="login-anim" style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div className="flex-center" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
          <ListTodo size={40} color="var(--accent-color)" />
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.04em' }}>CollabDo</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '400px' }}>
          The elite workspace for high-performance teams.
        </p>
      </div>

      <div className="panel login-anim" style={{ padding: '3.5rem', width: '100%', maxWidth: '440px', borderRadius: '24px', boxShadow: 'var(--shadow-xl)' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
          {isSignUp ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} color="var(--accent-color)" /> Get Started
            </span>
          ) : (
            'Welcome Back'
          )}
        </h2>
        
        {error && (
          <div className="login-anim" style={{
            background: 'var(--danger)',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="login-anim">
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="you@example.com"
              style={{ padding: '1rem' }}
            />
          </div>
          <div className="login-anim">
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••"
              style={{ padding: '1rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-anim"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Workspace' : 'Enter Workspace')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="login-anim" style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          {' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="btn-ghost"
            style={{ fontWeight: 600, color: 'var(--accent-color)' }}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

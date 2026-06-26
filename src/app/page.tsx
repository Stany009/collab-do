"use client";

import Link from 'next/link';
import { useRef } from 'react';
import { ListTodo, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.hero-anim',
      { opacity: 0, y: 30, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.15, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ padding: '4rem', maxWidth: '800px', textAlign: 'center' }}>
        <div className="hero-anim flex-center" style={{ gap: '1rem', marginBottom: '2rem' }}>
          <ListTodo size={56} color="var(--accent-color)" />
          <h1 style={{ margin: 0, fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 700, letterSpacing: '-0.04em' }}>CollabDo</h1>
        </div>
        
        <p className="hero-anim" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', marginBottom: '3.5rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          The high-performance, distraction-free workspace engineered for modern teams.
        </p>
        
        <div className="hero-anim" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '1.25rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
            Enter Workspace <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}

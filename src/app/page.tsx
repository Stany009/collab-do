"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="page-center" style={{ flexDirection: 'column', gap: '2rem' }}>
      <div className="anim-fade" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 className="hero-text" style={{ marginBottom: '1rem' }}>
          CollabDo
        </h1>
        <p className="anim-fade anim-stagger-1" style={{ color: 'var(--text-2)', fontSize: '1.15rem', lineHeight: 1.6 }}>
          A beautiful, distraction-free workspace for teams who love getting things done together.
        </p>
      </div>
      
      <div className="anim-fade anim-stagger-2" style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/login" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          Get Started <ArrowRight size={18} />
        </Link>
      </div>

      <p className="anim-fade anim-stagger-3" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
        Free forever · No credit card required
      </p>
    </div>
  );
}

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '4rem', maxWidth: '700px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>CollabDo</h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '3rem' }}>
          Experience the future of productivity with our real-time collaborative to-do list. 
          Built for speed, designed for absolute beauty.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Get Started for Free
          </Link>
        </div>
      </div>
    </div>
  );
}

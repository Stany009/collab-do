import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ padding: '4rem', maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '3rem', fontWeight: 700 }}>CollabDo</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>
          A fast, simple, and distraction-free collaborative to-do list.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

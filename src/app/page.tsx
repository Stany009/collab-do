import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
        CollabDo
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        The real-time collaborative to-do list.
      </p>
      <div>
        <Link href="/login" style={{
          background: 'var(--accent-color)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--border-radius)',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          Get Started
        </Link>
      </div>
    </div>
  );
}

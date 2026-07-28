'use client';

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        padding: '2rem',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, hsl(246,75%,58%), hsl(286,75%,60%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 auto 24px',
          }}
        >
          C
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
          You&apos;re offline
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
          CampusCore couldn&apos;t reach the server. Your cached dashboard and tasks are still available —
          reconnect to sync changes.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'hsl(246,75%,58%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

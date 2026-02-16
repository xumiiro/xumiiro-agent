export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a', 
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          fontSize: '10px', 
          letterSpacing: '0.2em', 
          textTransform: 'uppercase',
          marginBottom: '20px'
        }}>
          Xumiiro Agent
        </p>
        <p style={{ fontSize: '11px', color: '#444' }}>
          Status: Online
        </p>
      </div>
    </main>
  )
}

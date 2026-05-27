import { useState } from 'react'

function App() {
  const [receiptData, setReceiptData] = useState(null)

  const testBackendConnection = async () => {
    try {
      // Note: We use POST because your backend endpoint is @app.post
      const response = await fetch('http://127.0.0.1:8000/api/v1/receipts/upload', {
        method: 'POST'
      })
      const data = await response.json()
      setReceiptData(data)
      console.log("Success! Data from Christian's Backend:", data)
    } catch (error) {
      console.error("Connection failed. Is the backend running?", error)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Agri-Sales Tracker</h1>
      <button 
        onClick={testBackendConnection}
        style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px' }}
      >
        Test Backend Connection
      </button>

      {receiptData && (
        <div style={{ marginTop: '20px', padding: '1rem', background: '#f4f4f4' }}>
          <h2>Connection Successful! 🎉</h2>
          <pre>{JSON.stringify(receiptData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App
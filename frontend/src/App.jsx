import { useState } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !date) {
      setError("Please select both a file and a date.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Connect to your FastAPI Python server!
      const response = await fetch('http://10.0.0.80:8000/api/v1/receipts/upload', {
         method: 'POST',
         body: formData,
});

      if (!response.ok) throw new Error("API failed to process the receipt.");

      const data = await response.json();
      setReceiptData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDate('');
    setReceiptData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Agriculture-Sales Tracker</h1>
        <p className="text-gray-450 mb-8">AI-Powered Receipt Extraction</p>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {!receiptData && !loading && (
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label className="font-semibold text-gray-700">Receipt Image</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="border p-2 rounded-md bg-gray-50"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="font-semibold text-gray-700">Transaction Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded-md bg-gray-50"
              />
              <p className="text-gray-500 mb-8">AI can make the process of extracting data from receipts faster, but can also make mistakes.</p>
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Analyze Receipt with AI
            </button>
          </form>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Extracting data with LLaMA Vision...</p>
          </div>
        )}

        {receiptData && !loading && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-green-800">Total Revenue</h2>
                <p className="text-sm text-green-600">Date: {date}</p>
              </div>
              <div className="text-4xl font-bold text-green-700">
                ${receiptData.financials?.total_revenue.toFixed(2)}
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 font-semibold text-gray-700">Item</th>
                    <th className="p-3 font-semibold text-gray-700">Boxes</th>
                    <th className="p-3 font-semibold text-gray-700">Qty</th>
                    <th className="p-3 font-semibold text-gray-700">Price</th>
                    <th className="p-3 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items?.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-800">{item.name}</td>
                      <td className="p-3 text-gray-600">{item.boxes}</td>
                      <td className="p-3 text-gray-600">{item.quantity}</td>
                      <td className="p-3 text-gray-600">${item.unit_price.toFixed(2)}</td>
                      <td className="p-3 font-medium text-gray-800">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={resetForm}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Upload Another Receipt
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
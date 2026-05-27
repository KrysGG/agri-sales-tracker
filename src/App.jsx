import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [zoomScale, setZoomScale] = useState(1);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

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
    formData.append('date', date);

    try {
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

  const handleItemChange = (index, field, value) => {
    const newData = { ...receiptData };
    const newItems = [...newData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unit_price) || 0;
      newItems[index].total = qty * price;
    }

    const newTotalRevenue = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    newData.financials.total_revenue = newTotalRevenue;
    newData.financials.net_profit = newTotalRevenue;
    newData.items = newItems;
    setReceiptData(newData);
  };

  const handleSyncQty = (index) => {
    const newData = { ...receiptData };
    const newItems = [...newData.items];
    
    newItems[index].quantity = newItems[index].boxes;
    
    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].unit_price) || 0;
    newItems[index].total = qty * price;

    const newTotalRevenue = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    newData.financials.total_revenue = newTotalRevenue;
    newData.financials.net_profit = newTotalRevenue;
    
    newData.items = newItems;
    setReceiptData(newData);
  };

  const handleAddRow = () => {
    const newData = { ...receiptData };
    newData.items.push({ name: "", boxes: 0, quantity: 0, unit_price: 0, total: 0 });
    setReceiptData(newData);
  };

  const handleDeleteRow = (index) => {
    const newData = { ...receiptData };
    const newItems = [...newData.items];
    newItems.splice(index, 1);
    
    const newTotalRevenue = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    newData.financials.total_revenue = newTotalRevenue;
    newData.financials.net_profit = newTotalRevenue;
    
    newData.items = newItems;
    setReceiptData(newData);
  };

  const handleFinalSave = async () => {
    try {
      const payload = {
        ...receiptData,
        date: date 
      };

      const response = await fetch('http://10.0.0.80:8000/api/v1/receipts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save to database");

      alert("Success! Verified data has been permanently saved to the database.");
      resetForm(); 
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  };

  const closeModal = () => {
    setIsExpanded(false);
    setTimeout(() => setZoomScale(1), 300);
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setDate(new Date().toISOString().split('T')[0]);
    setReceiptData(null);
    setIsExpanded(false);
    setZoomScale(1);
  };

  return (
    <div className="min-h-screen bg-custom-blend p-8 font-sans relative">
      <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden p-8 border border-white/50">
        
        <div className="mb-8 p-6 bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Agriculture-Sales Tracker</h1>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mt-1">AI-Powered Receipt Extraction</p>
          </div>
          <div className="bg-white p-3 rounded-full shadow-inner">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!receiptData && !loading && (
            <motion.form 
              key="upload-form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleUpload} className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-gray-700">Receipt Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="border border-gray-200 shadow-inner p-2 rounded-md bg-gray-50" />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="font-semibold text-gray-700">Transaction Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 shadow-inner p-2 rounded-md bg-gray-50" />
                  </div>
                </div>

                <div className="min-h-[300px] border border-gray-200 shadow-inner rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {previewUrl ? (
                    <div 
                      className="w-full h-full flex items-center justify-center cursor-zoom-in group"
                      onClick={() => setIsExpanded(true)}
                    >
                      <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} src={previewUrl} alt="Preview" className="max-h-[400px] w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <span className="text-white font-semibold bg-black/50 px-4 py-2 rounded-full flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                          Click to Expand & Pan
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span>Upload Receipt</span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.99]">
                Analyze Receipt with AI
              </button>
              <p className="text-center text-xs text-gray-400 italic mt-2">
                AI extraction is an assistive tool and may occasionally make mistakes. Please verify all data carefully.
              </p>
            </motion.form>
          )}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 font-medium">Extracting data with LLaMA Vision...</p>
            </motion.div>
          )}

          {receiptData && !loading && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-yellow-800">Human Verification Required</h2>
                  <p className="text-sm text-yellow-700">Review and edit the AI extracted data below before saving.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Date: {date}</p>
                  <div className="text-3xl font-bold text-green-700">${receiptData.financials?.total_revenue.toFixed(2)}</div>
                </div>
              </div>

              {previewUrl && (
                <div 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 flex justify-center items-center h-48 shadow-inner overflow-hidden relative group cursor-zoom-in"
                  onClick={() => setIsExpanded(true)}
                >
                  <img src={previewUrl} alt="Original Receipt" className="max-h-full object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                    <span className="text-white font-semibold bg-black/50 px-4 py-2 rounded-full flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                      Click to Expand & Pan
                    </span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white/50 shadow-inner mt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white/50">
                      <th className="p-3 font-semibold text-gray-700">Product Name</th>
                      <th className="p-3 font-semibold text-gray-700 text-center">Boxes</th>
                      <th className="p-1"></th> 
                      <th className="p-3 font-semibold text-gray-700 text-center">Qty</th>
                      <th className="p-3 font-semibold text-gray-700 text-center">Price</th>
                      <th className="p-3 font-semibold text-gray-700">Total</th>
                      <th className="p-3 font-semibold text-gray-700 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-white transition-colors">
                        <td className="p-2">
                          <select 
                            value={item.name} 
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)} 
                            className="w-full p-2 border border-gray-200 shadow-sm rounded-lg bg-white cursor-pointer min-w-[160px] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          >
                            <option value="">Select Product...</option>
                            <option value="Guineos Maduros">Guineos Maduros</option>
                            <option value="Guineos Verdes">Guineos Verdes</option>
                            <option value="Platanos">Platanos</option>
                            <option value="Pina">Pina</option>
                            <option value="Papaya">Papaya</option>
                            <option value="Ninos Guineos">Ninos Guineos</option>
                            <option value="Limones">Limones</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input type="number" value={item.boxes} onChange={(e) => handleItemChange(idx, 'boxes', e.target.value)} className="w-20 p-2 border border-gray-200 shadow-sm rounded-lg bg-white text-center mx-auto focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                        </td>
                        
                        <td className="p-1 text-center align-middle">
                          <button 
                            type="button" 
                            onClick={() => handleSyncQty(idx)} 
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 border border-gray-200 shadow-sm rounded-md transition-colors group flex items-center justify-center mx-auto"
                            title="Match Quantity to Boxes"
                          >
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                            </svg>
                          </button>
                        </td>

                        <td className="p-2 text-center">
                          <input type="number" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className="w-20 p-2 border border-gray-200 shadow-sm rounded-lg bg-white text-center mx-auto focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                        </td>
                        <td className="p-2 text-center">
                          <input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} className="w-24 p-2 border border-gray-200 shadow-sm rounded-lg bg-white text-center mx-auto focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                        </td>
                        <td className="p-3 font-bold text-gray-800">${Number(item.total).toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleDeleteRow(idx)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title="Delete Row">
                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="7" className="p-3 bg-white/50 text-center border-t border-gray-200">
                        <button onClick={handleAddRow} className="text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors py-1 px-3 rounded-md hover:bg-blue-50">+ Add Missing Row</button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex space-x-4 mt-6">
                <button onClick={resetForm} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleFinalSave} className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.99]">
                  Verify & Save to Database
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isExpanded && previewUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden"
            >
              <motion.div 
                className="relative w-full h-full flex items-center justify-center cursor-move"
                onClick={(e) => e.stopPropagation()} 
              >
                <motion.img
                  drag
                  dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                  dragElastic={0.1}
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: zoomScale, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  src={previewUrl}
                  alt="Expanded Receipt"
                  className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl bg-white select-none pointer-events-none"
                />
              </motion.div>

              <button 
                className="absolute top-6 right-6 text-white hover:text-gray-300 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-50"
                onClick={closeModal}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>

              <div 
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-black/60 backdrop-blur-md rounded-full px-2 py-2 border border-white/20 shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setZoomScale(s => Math.max(1, s - 0.5))}
                  className="text-white hover:text-blue-400 p-2 transition-colors disabled:opacity-50"
                  disabled={zoomScale <= 1}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                </button>
                
                <span className="text-white font-medium px-4 min-w-[80px] text-center select-none">
                  {Math.round(zoomScale * 100)}%
                </span>

                <button 
                  onClick={() => setZoomScale(s => Math.min(4, s + 0.5))}
                  className="text-white hover:text-blue-400 p-2 transition-colors disabled:opacity-50"
                  disabled={zoomScale >= 4}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const [formData, setFormData] = useState({ name: '', unit: 'gm', minStockAlert: 10, costPerUnit: 0 });
  const [logData, setLogData] = useState({ type: 'stock-in', quantity: '', remarks: '' });

  useEffect(() => {
    fetchMaterials();
    fetchLogs();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data } = await axios.get('/inventory');
      setMaterials(data);
    } catch (err) {
      toast.error('Failed to load inventory');
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await axios.get('/inventory/logs');
      setLogs(data);
    } catch (err) {
      toast.error('Failed to load inventory logs');
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/inventory', formData);
      toast.success('Material added');
      setShowAddModal(false);
      setFormData({ name: '', unit: 'gm', minStockAlert: 10, costPerUnit: 0 });
      fetchMaterials();
    } catch (err) {
      toast.error('Error adding material');
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/inventory/log', {
        materialId: selectedMaterial._id,
        ...logData,
        quantity: Number(logData.quantity),
      });
      toast.success('Stock updated');
      setShowLogModal(false);
      setLogData({ type: 'stock-in', quantity: '', remarks: '' });
      fetchMaterials();
      fetchLogs();
    } catch (err) {
      toast.error('Error updating stock');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="page-title">Inventory Management</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-gold px-4 py-2 text-sm sm:text-base">
          + Add Material
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-4">Raw Materials</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-brown-700 text-brown-400 text-sm">
                  <th className="py-2 px-2 font-medium">Name</th>
                  <th className="py-2 px-2 font-medium">Current Stock</th>
                  <th className="py-2 px-2 font-medium">Min Alert</th>
                  <th className="py-2 px-2 font-medium">Unit Cost</th>
                  <th className="py-2 px-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-800">
                {materials.map((m) => (
                  <tr key={m._id} className="hover:bg-brown-800/40 transition-colors">
                    <td className="py-3 px-2 font-medium text-cream-100">
                      <div className="flex items-center gap-2">
                        {m.name}
                        {m.currentStock <= m.minStockAlert && (
                          <span className="bg-red-500/15 text-red-300 text-xs px-2 py-1 rounded-full font-bold border border-red-500/30">
                            LOW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`font-semibold ${m.currentStock <= m.minStockAlert ? 'text-red-300' : 'text-emerald-300'}`}>
                        {m.currentStock.toFixed(2)}
                      </span>{' '}
                      <span className="text-sm text-brown-400">{m.unit}</span>
                    </td>
                    <td className="py-3 px-2 text-brown-300">
                      {m.minStockAlert} {m.unit}
                    </td>
                    <td className="py-3 px-2 text-gold-400">Rs {m.costPerUnit}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => {
                          setSelectedMaterial(m);
                          setShowLogModal(true);
                        }}
                        className="btn-outline text-xs"
                      >
                        Update Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-4">Recent Movements</h2>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log._id} className="border border-brown-700 rounded-lg p-3 bg-brown-900/50">
                <div className="text-xs text-brown-400 flex justify-between gap-2">
                  <span>{new Date(log.date).toLocaleString()}</span>
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded ${
                      log.type === 'stock-in'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : log.type === 'wastage'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-brown-700 text-brown-200'
                    }`}
                  >
                    {log.type}
                  </span>
                </div>
                <div className="font-semibold text-cream-100 mt-1">
                  {log.materialId?.name}
                  <span className="text-brown-300 ml-2">
                    {log.type === 'stock-in' ? '+' : '-'}
                    {log.quantity} {log.materialId?.unit}
                  </span>
                </div>
                {log.remarks && <div className="text-xs text-brown-400 italic mt-1">{log.remarks}</div>}
              </div>
            ))}
            {logs.length === 0 && <div className="text-brown-400 text-sm">No movement logs found.</div>}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-cream-100">Add Raw Material</h2>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-brown-300">Name</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-brown-300">Unit</label>
                <select
                  className="input-field"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="gm">Grams (gm)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pcs">Pieces (pcs)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-brown-300">Min Alert</label>
                  <input
                    required
                    type="number"
                    className="input-field"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-brown-300">Cost/Unit (Rs)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-cream-100">Update Stock: {selectedMaterial.name}</h2>
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-brown-300">Type</label>
                <select
                  className="input-field"
                  value={logData.type}
                  onChange={(e) => setLogData({ ...logData, type: e.target.value })}
                >
                  <option value="stock-in">Stock-in (Add)</option>
                  <option value="wastage">Wastage (Subtract)</option>
                  <option value="correction">Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-brown-300">Quantity ({selectedMaterial.unit})</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={logData.quantity}
                  onChange={(e) => setLogData({ ...logData, quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-brown-300">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Purchased from vendor"
                  className="input-field"
                  value={logData.remarks}
                  onChange={(e) => setLogData({ ...logData, remarks: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

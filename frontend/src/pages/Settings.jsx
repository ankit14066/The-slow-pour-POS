import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const [config, setConfig] = useState(null);
  const [logo, setLogo] = useState(null);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/settings');
      setConfig(res.data);
    } catch {
      toast.error('Failed to load settings');
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const save = async () => {
    try {
      await api.put('/settings', config);
      toast.success('Settings saved');
      fetchConfig();
    } catch {
      toast.error('Save failed');
    }
  };

  const uploadLogo = async () => {
    if (!logo) return;
    try {
      const formData = new FormData();
      formData.append('logo', logo);
      await api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Logo uploaded');
      fetchConfig();
    } catch {
      toast.error('Upload failed');
    }
  };

  if (!config) return <div className="p-8 text-brown-300">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="page-title">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="section-title">Shop Profile</h2>
          <input className="input-field" value={config.shopName || ''} onChange={(e) => setConfig({ ...config, shopName: e.target.value })} placeholder="Shop Name" />
          <input className="input-field" value={config.address || ''} onChange={(e) => setConfig({ ...config, address: e.target.value })} placeholder="Address" />
          <input className="input-field" value={config.phone || ''} onChange={(e) => setConfig({ ...config, phone: e.target.value })} placeholder="Phone" />
          <input className="input-field" value={config.gstNumber || ''} onChange={(e) => setConfig({ ...config, gstNumber: e.target.value })} placeholder="GST Number" />
          <div className="flex gap-2">
            <input type="file" className="input-field" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
            <button className="btn-outline" onClick={uploadLogo}>Upload Logo</button>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="section-title">Tax & Receipt</h2>
          <input className="input-field" type="number" value={config.gstPercent || 0} onChange={(e) => setConfig({ ...config, gstPercent: Number(e.target.value) })} placeholder="GST %" />
          <select className="input-field" value={config.taxMode || 'exclusive'} onChange={(e) => setConfig({ ...config, taxMode: e.target.value })}>
            <option value="exclusive">Exclusive</option>
            <option value="inclusive">Inclusive</option>
          </select>
          <input className="input-field" value={config.receiptHeader || ''} onChange={(e) => setConfig({ ...config, receiptHeader: e.target.value })} placeholder="Receipt Header" />
          <input className="input-field" value={config.receiptFooter || ''} onChange={(e) => setConfig({ ...config, receiptFooter: e.target.value })} placeholder="Receipt Footer" />

          <h2 className="section-title mt-4">Printer</h2>
          <select className="input-field" value={config.printer?.paperSize || '80mm'} onChange={(e) => setConfig({ ...config, printer: { ...config.printer, paperSize: e.target.value } })}>
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
          </select>
          <label className="text-brown-300 text-sm flex items-center gap-2"><input type="checkbox" checked={config.printer?.autoPrint || false} onChange={(e) => setConfig({ ...config, printer: { ...config.printer, autoPrint: e.target.checked } })} /> Auto Print</label>
        </div>
      </div>
      <button className="btn-gold" onClick={save}>Save Settings</button>
    </div>
  );
};

export default Settings;

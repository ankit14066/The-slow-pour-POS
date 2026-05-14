import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const DeliveryManagement = () => {
  const { user } = useAuth();
  const [boys, setBoys] = useState([]);
  const [zones, setZones] = useState([]);
  const [orders, setOrders] = useState([]);
  const [performance, setPerformance] = useState([]);

  const [boyForm, setBoyForm] = useState({ name: '', phone: '' });
  const [zoneForm, setZoneForm] = useState({ zoneName: '', minDistance: 0, maxDistance: 0, charge: 0 });

  const fetchAll = async () => {
    try {
      const baseCalls = [
        api.get('/delivery/boys'),
        api.get('/delivery/zones'),
        api.get('/orders?date=' + new Date().toISOString().slice(0, 10)),
      ];

      const [b, z, o] = await Promise.all(baseCalls);
      setBoys(b.data);
      setZones(z.data);
      setOrders(o.data.filter((x) => x.orderType === 'Delivery'));

      if (['owner', 'manager'].includes(user?.role)) {
        const p = await api.get('/delivery/performance');
        setPerformance(p.data);
      } else {
        setPerformance([]);
      }
    } catch {
      toast.error('Failed to load delivery data');
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const createBoy = async (e) => {
    e.preventDefault();
    try {
      await api.post('/delivery/boys', boyForm);
      setBoyForm({ name: '', phone: '' });
      toast.success('Delivery boy added');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const createZone = async (e) => {
    e.preventDefault();
    try {
      await api.post('/delivery/zones', zoneForm);
      setZoneForm({ zoneName: '', minDistance: 0, maxDistance: 0, charge: 0 });
      toast.success('Zone added');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const assign = async (orderId, deliveryBoyId) => {
    try {
      await api.put(`/delivery/orders/${orderId}/assign`, { deliveryBoyId, estimatedMinutes: 30 });
      toast.success('Assigned');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/delivery/orders/${orderId}/status`, { status });
      toast.success('Updated');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="page-title">Delivery Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-3">Add Delivery Boy</h2>
          <form onSubmit={createBoy} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="input-field" placeholder="Name" value={boyForm.name} onChange={(e) => setBoyForm({ ...boyForm, name: e.target.value })} required />
            <input className="input-field" placeholder="Phone" value={boyForm.phone} onChange={(e) => setBoyForm({ ...boyForm, phone: e.target.value })} required />
            <button className="btn-gold" type="submit">Add</button>
          </form>
          <div className="mt-3 space-y-2">
            {boys.map((b) => <div key={b._id} className="text-sm text-brown-300">{b.name} - {b.phone} ({b.isAvailable ? 'Available' : 'Busy'})</div>)}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-3">Delivery Zones</h2>
          <form onSubmit={createZone} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input className="input-field col-span-2 sm:col-span-1" placeholder="Zone" value={zoneForm.zoneName} onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })} required />
            <input className="input-field" type="number" placeholder="Min km" value={zoneForm.minDistance} onChange={(e) => setZoneForm({ ...zoneForm, minDistance: Number(e.target.value) })} required />
            <input className="input-field" type="number" placeholder="Max km" value={zoneForm.maxDistance} onChange={(e) => setZoneForm({ ...zoneForm, maxDistance: Number(e.target.value) })} required />
            <input className="input-field" type="number" placeholder="Charge" value={zoneForm.charge} onChange={(e) => setZoneForm({ ...zoneForm, charge: Number(e.target.value) })} required />
            <button className="btn-gold" type="submit">Add</button>
          </form>
          <div className="mt-3 space-y-2">
            {zones.map((z) => <div key={z._id} className="text-sm text-brown-300">{z.zoneName}: {z.minDistance}-{z.maxDistance}km / Rs {z.charge}</div>)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-3">Delivery Orders</h2>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o._id} className="border border-brown-700 rounded p-3">
              <div className="text-cream-100 font-semibold">#{o.tokenNumber} - {o.delivery?.status || 'order-placed'}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                <select className="input-field max-w-xs" onChange={(e) => assign(o._id, e.target.value)} defaultValue="">
                  <option value="" disabled>Assign delivery boy</option>
                  {boys.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                {['assigned', 'picked-up', 'out-for-delivery', 'delivered'].map((s) => (
                  <button key={s} className="btn-outline text-xs" onClick={() => updateStatus(o._id, s)}>{s}</button>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="text-brown-400">No delivery orders today</div>}
        </div>
      </div>

      {['owner', 'manager'].includes(user?.role) && (
        <div className="card">
          <h2 className="section-title mb-3">Performance</h2>
          <div className="space-y-2">
            {performance.map((p) => (
              <div key={p.deliveryBoyId} className="text-brown-300 text-sm">{p.name}: {p.deliveries} deliveries, avg {p.avgMinutes} min</div>
            ))}
            {performance.length === 0 && <div className="text-brown-400">No performance data</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;

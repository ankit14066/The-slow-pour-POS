import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const emptyForm = {
  code: '', type: 'flat', value: 0, maxUses: 0, perCustomerLimit: 0,
  minOrderAmount: 0, validFrom: '', expiresAt: '', isActive: true,
  isHappyHour: false, happyHourStart: '', happyHourEnd: '', comboPrice: 0,
};

const Offers = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/offers/coupons');
      setCoupons(res.data);
    } catch {
      toast.error('Failed to load offers');
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post('/offers/coupons', form);
      setForm(emptyForm);
      toast.success('Offer created');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const deactivate = async (id) => {
    try {
      await api.patch(`/offers/coupons/${id}/deactivate`);
      toast.success('Deactivated');
      fetchCoupons();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="page-title">Offers & Coupons</h1>

      <div className="card">
        <h2 className="section-title mb-4">Create / Edit Coupon</h2>
        <form onSubmit={createCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="input-field" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
          <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="flat">Flat Discount</option>
            <option value="percent">Percent Discount</option>
            <option value="free-item">Free Item</option>
            <option value="buy-x-get-y">Buy X Get Y</option>
          </select>
          <input className="input-field" type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required />
          <input className="input-field" type="number" placeholder="Min Order" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} />
          <input className="input-field" type="number" placeholder="Max Uses" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
          <input className="input-field" type="number" placeholder="Per Customer Limit" value={form.perCustomerLimit} onChange={(e) => setForm({ ...form, perCustomerLimit: Number(e.target.value) })} />
          <input className="input-field" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          <input className="input-field" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <label className="text-brown-300 text-sm flex items-center gap-2"><input type="checkbox" checked={form.isHappyHour} onChange={(e) => setForm({ ...form, isHappyHour: e.target.checked })} /> Happy Hour</label>
          <input className="input-field" type="time" value={form.happyHourStart} onChange={(e) => setForm({ ...form, happyHourStart: e.target.value })} />
          <input className="input-field" type="time" value={form.happyHourEnd} onChange={(e) => setForm({ ...form, happyHourEnd: e.target.value })} />
          <button className="btn-gold" type="submit">Save Offer</button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title mb-3">All Coupons</h2>
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c._id} className="border border-brown-700 rounded p-3 flex justify-between items-center gap-3">
              <div className="text-sm">
                <div className="text-cream-100 font-semibold">{c.code} ({c.type})</div>
                <div className="text-brown-400">Used: {c.usedCount} | Discount Given: Rs {c.totalDiscountGiven || 0}</div>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-1 rounded ${c.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                {c.isActive && <button className="btn-outline text-xs" onClick={() => deactivate(c._id)}>Deactivate</button>}
              </div>
            </div>
          ))}
          {coupons.length === 0 && <div className="text-brown-400">No offers</div>}
        </div>
      </div>
    </div>
  );
};

export default Offers;

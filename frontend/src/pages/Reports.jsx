import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState(null);
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [coupon, setCoupon] = useState([]);
  const [delivery, setDelivery] = useState(null);

  const [filters, setFilters] = useState({ startDate: '', endDate: '', orderType: '', paymentMode: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, b, c, d, e] = await Promise.all([
        api.get('/reports/sales', { params: filters }),
        api.get('/reports/items', { params: filters }),
        api.get('/reports/staff-performance', { params: filters }),
        api.get('/reports/coupon-effectiveness', { params: filters }),
        api.get('/reports/delivery', { params: filters }),
      ]);
      setSales(a.data);
      setItems(b.data);
      setStaff(c.data);
      setCoupon(d.data);
      setDelivery(e.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const exportFile = async (type, format) => {
    const url = `/reports/export/${format}?type=${type}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h1 className="page-title">Advanced Reports</h1>
        <div className="flex flex-wrap gap-2">
          <input type="date" className="input-field" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="input-field" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          <select className="input-field" value={filters.orderType} onChange={(e) => setFilters({ ...filters, orderType: e.target.value })}>
            <option value="">All Types</option>
            <option value="Dine-in">Dine-in</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Delivery">Delivery</option>
          </select>
          <select className="input-field" value={filters.paymentMode} onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}>
            <option value="">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
          <button className="btn-gold" onClick={fetchAll}>Apply</button>
        </div>
      </div>

      {loading ? <div className="text-brown-400">Loading reports...</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card"><div className="text-brown-400 text-sm">Revenue</div><div className="text-2xl font-bold text-cream-100">Rs {sales?.totalRevenue || 0}</div></div>
            <div className="card"><div className="text-brown-400 text-sm">Orders</div><div className="text-2xl font-bold text-cream-100">{sales?.totalOrders || 0}</div></div>
            <div className="card"><div className="text-brown-400 text-sm">Discount</div><div className="text-2xl font-bold text-cream-100">Rs {sales?.totalDiscount || 0}</div></div>
            <div className="card"><div className="text-brown-400 text-sm">GST</div><div className="text-2xl font-bold text-cream-100">Rs {sales?.totalGst || 0}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-3"><h2 className="section-title">Item-wise Sales</h2><div className="flex gap-2"><button className="btn-outline text-xs" onClick={() => exportFile('sales','csv')}>CSV</button><button className="btn-outline text-xs" onClick={() => exportFile('sales','pdf')}>PDF</button></div></div>
              <div className="space-y-2">{items.slice(0, 10).map((i) => <div key={i.item} className="text-sm text-brown-300">{i.item}: {i.quantity} qty | Rs {Number(i.revenue).toFixed(2)}</div>)}</div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-3"><h2 className="section-title">Staff Performance</h2><div className="flex gap-2"><button className="btn-outline text-xs" onClick={() => exportFile('staff','csv')}>CSV</button><button className="btn-outline text-xs" onClick={() => exportFile('staff','pdf')}>PDF</button></div></div>
              <div className="space-y-2">{staff.map((s, idx) => <div key={idx} className="text-sm text-brown-300">{s.staff}: {s.ordersHandled} orders | Rs {Number(s.revenue).toFixed(2)}</div>)}</div>
            </div>

            <div className="card">
              <h2 className="section-title mb-3">Coupon Effectiveness</h2>
              <div className="space-y-2">{coupon.map((c) => <div key={c._id} className="text-sm text-brown-300">{c.code} ({c.type}) - used {c.usedCount} | discount Rs {c.totalDiscountGiven || 0}</div>)}</div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-3"><h2 className="section-title">Delivery Report</h2><div className="flex gap-2"><button className="btn-outline text-xs" onClick={() => exportFile('delivery','csv')}>CSV</button><button className="btn-outline text-xs" onClick={() => exportFile('delivery','pdf')}>PDF</button></div></div>
              <div className="text-sm text-brown-300 mb-2">On-time: {delivery?.onTimePercent || 0}% | Avg Time: {delivery?.avgDeliveryTime || 0} min</div>
              <div className="space-y-2">{delivery?.ranking?.map((r, idx) => <div key={idx} className="text-sm text-brown-300">{r.deliveryBoy}: {r.deliveries} deliveries, avg {r.avgMinutes} min</div>)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;

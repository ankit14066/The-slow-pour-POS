import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchStats();
    socket.on('order:new', handleUpdate);
    socket.on('order:statusUpdate', handleUpdate);
    socket.on('stock:lowAlert', (data) => {
      toast.error(data.message, { duration: 5000, icon: '⚠️' });
      fetchStats();
    });
    return () => {
      socket.off('order:new', handleUpdate);
      socket.off('order:statusUpdate', handleUpdate);
      socket.off('stock:lowAlert');
    };
  }, [socket]);

  if (loading) return <div className="p-8 text-cream-400">Loading dashboard...</div>;
  if (!stats) return <div className="p-8 text-red-400">Error loading dashboard</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="page-title">Today's Overview</h1>
          <p className="text-brown-400 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {stats.upcomingBirthdays?.length > 0 && (
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse">
            🎂 {stats.upcomingBirthdays.length} Upcoming Birthday(s)!
          </div>
        )}
      </div>

      {stats.lowStockAlerts?.length > 0 && (
        <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-4 rounded-xl flex gap-4 items-start shadow-xl">
          <div className="text-2xl mt-1">⚠️</div>
          <div>
            <h3 className="font-bold text-lg mb-1">Low Stock Alerts</h3>
            <div className="flex flex-wrap gap-2">
              {stats.lowStockAlerts.map(item => (
                <span key={item._id} className="bg-red-950 px-3 py-1 rounded border border-red-800 text-sm">
                  {item.name}: <span className="font-bold">{item.currentStock}</span> {item.unit} (Min: {item.minStockAlert})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-t-4 border-t-gold-500">
          <p className="text-sm text-brown-400 uppercase tracking-wider font-semibold">Total Revenue</p>
          <p className="text-3xl font-display font-bold text-cream-100 mt-2">₹{stats.totalRevenue}</p>
        </div>
        <div className="card">
          <p className="text-sm text-brown-400 uppercase tracking-wider font-semibold">Orders Today</p>
          <p className="text-3xl font-display font-bold text-cream-100 mt-2">{stats.totalOrders}</p>
        </div>
        <div className="card">
          <p className="text-sm text-brown-400 uppercase tracking-wider font-semibold">Avg Order Value</p>
          <p className="text-3xl font-display font-bold text-cream-100 mt-2">₹{stats.avgOrderValue}</p>
        </div>
        <div className="card">
          <p className="text-sm text-brown-400 uppercase tracking-wider font-semibold">Avg Rating (Week)</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-display font-bold text-gold-400">{stats.avgRating || 'N/A'}</p>
            <span className="text-xl text-yellow-500">★</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-4">Recent Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-brown-400 py-4">No orders today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brown-700 text-brown-400 text-sm">
                    <th className="pb-3 px-4 font-medium">Token</th>
                    <th className="pb-3 px-4 font-medium">Time</th>
                    <th className="pb-3 px-4 font-medium">Type</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-800">
                  {stats.recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-brown-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-cream-200">#{order.tokenNumber}</td>
                      <td className="py-3 px-4 text-brown-300">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3 px-4">{order.orderType}</td>
                      <td className="py-3 px-4"><span className={`badge badge-${order.status}`}>{order.status}</span></td>
                      <td className="py-3 px-4 text-right font-bold text-gold-400">₹{order.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-brown-800 to-brown-900">
            <h2 className="text-lg font-bold text-cream-200 mb-4 flex items-center gap-2">
              👥 Customer Stats (Today)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brown-950/50 p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-green-400">{stats.customerStats?.new || 0}</div>
                <div className="text-xs text-brown-300 uppercase tracking-wide mt-1">New</div>
              </div>
              <div className="bg-brown-950/50 p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-blue-400">{stats.customerStats?.returning || 0}</div>
                <div className="text-xs text-brown-300 uppercase tracking-wide mt-1">Returning</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-cream-200 mb-4">🏆 Top Customers</h2>
            {stats.topCustomers?.length > 0 ? (
              <div className="space-y-3">
                {stats.topCustomers.map((c, i) => (
                  <div key={c._id} className="flex justify-between items-center p-3 rounded-lg bg-brown-800/30 border border-brown-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-gray-400 text-gray-900' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-brown-700 text-brown-300'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-cream-100">{c.name}</div>
                        <div className="text-xs text-brown-400">{c.totalOrders} orders</div>
                      </div>
                    </div>
                    <div className="font-bold text-gold-400">₹{c.totalSpent.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-brown-400 text-sm">No customers yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


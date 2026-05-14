import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (q = '') => {
    try {
      const { data } = await axios.get(`/customers?q=${q}`);
      setCustomers(data);
    } catch (err) {
      toast.error('Failed to load customers');
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchCustomers(e.target.value);
  };

  const fetchOrderHistory = async (id) => {
    try {
      const { data } = await axios.get(`/customers/${id}/orders`);
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load order history');
    }
  };

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    fetchOrderHistory(c._id);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="page-title">Customers</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 p-0 overflow-hidden">
          <div className="p-4 border-b border-brown-700">
            <h2 className="text-lg font-bold text-cream-100 mb-3">Customer Directory</h2>
            <input
              type="text"
              placeholder="Search by name or phone"
              className="input-field text-sm"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="max-h-[55vh] lg:max-h-[70vh] overflow-y-auto">
            {customers.map((c) => (
              <button
                key={c._id}
                onClick={() => openCustomer(c)}
                className={`w-full text-left p-4 border-b border-brown-800 transition-colors ${
                  selectedCustomer?._id === c._id
                    ? 'bg-brown-800/70 border-l-4 border-l-gold-500'
                    : 'hover:bg-brown-800/40'
                }`}
              >
                <div className="font-semibold text-cream-100">{c.name}</div>
                <div className="text-sm text-brown-400">{c.phone}</div>
                <div className="flex justify-between items-center mt-2 text-xs font-medium">
                  <span className="text-brown-300">{c.totalOrders} orders</span>
                  <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {c.loyaltyPoints} pts
                  </span>
                </div>
              </button>
            ))}
            {customers.length === 0 && <div className="p-4 text-center text-brown-400">No customers found.</div>}
          </div>
        </div>

        <div className="card lg:col-span-2">
          {selectedCustomer ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-4 border-b border-brown-700">
                <div>
                  <h2 className="text-3xl font-display font-bold text-cream-100">{selectedCustomer.name}</h2>
                  <p className="text-brown-300 mt-1 text-sm">
                    {selectedCustomer.phone}
                    {selectedCustomer.email ? ` | ${selectedCustomer.email}` : ''}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black text-gold-400">{selectedCustomer.loyaltyPoints}</div>
                  <div className="text-xs text-brown-400 uppercase tracking-wide font-bold">Loyalty Points</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-brown-900/60 p-4 rounded-xl border border-brown-700">
                  <div className="text-sm text-brown-400 font-medium">Total Spent</div>
                  <div className="text-xl font-bold text-cream-100">Rs {selectedCustomer.totalSpent.toFixed(2)}</div>
                </div>
                <div className="bg-brown-900/60 p-4 rounded-xl border border-brown-700">
                  <div className="text-sm text-brown-400 font-medium">Joined On</div>
                  <div className="text-xl font-bold text-cream-100">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <h3 className="section-title mb-4">Order History</h3>
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o._id}
                    className="border border-brown-700 p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-brown-900/40 hover:bg-brown-900/60 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-cream-100">Token #{o.tokenNumber} | Rs {o.total}</div>
                      <div className="text-sm text-brown-400">{new Date(o.createdAt).toLocaleString()}</div>
                      <div className="text-xs text-brown-500 mt-1">{o.items.map((i) => i.name).join(', ')}</div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        o.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {o.status}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="text-brown-400 italic">No orders yet.</div>}
              </div>
            </div>
          ) : (
            <div className="min-h-[280px] flex items-center justify-center text-brown-400 font-light text-xl">
              Select a customer to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Customers;

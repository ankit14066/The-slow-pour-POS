import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const statusColors = {
  pending: 'bg-gray-100 border-gray-300',
  preparing: 'bg-amber-100 border-amber-400',
  ready: 'bg-green-100 border-green-500',
};

const Kds = () => {
  const [orders, setOrders] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    fetchActiveOrders();
    
    if (socket) {
      socket.on('order:new', handleNewOrder);
      socket.on('order:statusUpdate', handleStatusUpdate);
    }

    return () => {
      if (socket) {
        socket.off('order:new', handleNewOrder);
        socket.off('order:statusUpdate', handleStatusUpdate);
      }
    };
  }, [socket]);

  const fetchActiveOrders = async () => {
    try {
      const { data } = await axios.get('/orders?date=' + new Date().toISOString().slice(0, 10));
      const active = data.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
      // Sort oldest first
      active.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setOrders(active);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch orders');
    }
  };

  const handleNewOrder = (order) => {
    playNotificationSound();
    setOrders(prev => {
      if (prev.find(o => o._id === order._id)) return prev;
      return [...prev, order].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  };

  const handleStatusUpdate = (order) => {
    setOrders(prev => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        return prev.filter(o => o._id !== order._id);
      }
      return prev.map(o => o._id === order._id ? order : o).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  };

  const playNotificationSound = () => {
    try {
      // Provide a standard beep or use a local file
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch (e) {
      console.log('Audio play failed', e);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const formatTimeElapsed = (dateString) => {
    const elapsedMs = new Date() - new Date(dateString);
    const mins = Math.floor(elapsedMs / 60000);
    return `${mins}m ago`;
  };

  // Auto-refresh elapsed time every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-800 p-4 font-sans">
      <header className="flex justify-between items-center mb-6 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Display System</h1>
        <div className="text-lg">Live Orders: {orders.length}</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {orders.map(order => (
          <div key={order._id} className={`rounded-xl border-l-4 p-4 shadow-lg flex flex-col ${statusColors[order.status] || 'bg-white'}`}>
            <div className="flex justify-between items-start mb-3 border-b border-gray-200 pb-2">
              <div>
                <span className="text-2xl font-black">#{order.tokenNumber}</span>
                <span className="ml-2 text-sm font-semibold uppercase tracking-wider text-gray-500">{order.orderType}</span>
              </div>
              <div className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                {formatTimeElapsed(order.createdAt)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="font-semibold text-gray-800">
                    {item.quantity}x {item.name} {item.size !== 'Regular' ? `(${item.size})` : ''}
                    {item.notes && <div className="text-xs text-red-500 font-medium italic">Note: {item.notes}</div>}
                  </div>
                </div>
              ))}
              {order.notes && (
                <div className="mt-2 text-xs text-red-600 font-bold bg-red-50 p-2 rounded">
                  Order Note: {order.notes}
                </div>
              )}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2">
              <button
                disabled={order.status === 'pending'}
                onClick={() => updateStatus(order._id, 'pending')}
                className={`py-2 text-xs font-bold rounded shadow transition-transform active:scale-95 ${order.status === 'pending' ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                PENDING
              </button>
              <button
                disabled={order.status === 'preparing'}
                onClick={() => updateStatus(order._id, 'preparing')}
                className={`py-2 text-xs font-bold rounded shadow transition-transform active:scale-95 ${order.status === 'preparing' ? 'bg-amber-500 text-white cursor-not-allowed' : 'bg-white text-amber-600 hover:bg-amber-50'}`}
              >
                PREP
              </button>
              <button
                disabled={order.status === 'ready'}
                onClick={() => updateStatus(order._id, 'ready')}
                className={`py-2 text-xs font-bold rounded shadow transition-transform active:scale-95 ${order.status === 'ready' ? 'bg-green-600 text-white cursor-not-allowed' : 'bg-white text-green-600 hover:bg-green-50'}`}
              >
                READY
              </button>
            </div>
            
            {order.status === 'ready' && (
              <button
                onClick={() => updateStatus(order._id, 'completed')}
                className="mt-2 w-full py-2 text-xs font-bold rounded shadow bg-blue-600 text-white hover:bg-blue-700 transition-transform active:scale-95"
              >
                MARK SERVED
              </button>
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-20 text-2xl font-light">
            No active orders. Kitchen is clear! 👨‍🍳
          </div>
        )}
      </div>
    </div>
  );
};

export default Kds;

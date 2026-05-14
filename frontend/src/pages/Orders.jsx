import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { generateReceiptPDF } from '../utils/pdfGenerator';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready, completed
  const { user } = useAuth();
  const socket = useSocket();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchOrders();
    socket.on('order:new', handleUpdate);
    socket.on('order:statusUpdate', handleUpdate);
    return () => {
      socket.off('order:new', handleUpdate);
      socket.off('order:statusUpdate', handleUpdate);
    };
  }, [socket]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      toast.success(`Order marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const cancelOrder = async (id) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const markPaid = async (id) => {
    const mode = prompt('Payment mode? (Cash / UPI / Card)', 'UPI');
    if (!mode) return;
    try {
      await api.patch(`/billing/orders/${id}/pay`, { paymentMode: mode });
      toast.success('Order marked as paid');
    } catch (err) {
      toast.error('Failed to mark paid');
    }
  };

  const generateBill = async (id) => {
    try {
      const res = await api.get(`/billing/orders/${id}/bill`);
      
      // 1. Download the PDF
      generateReceiptPDF(res.data.order);
      
      // 2. Open WhatsApp link with text summary
      toast.success('PDF downloaded! Opening WhatsApp...', { duration: 4000 });
      setTimeout(() => {
        window.open(res.data.whatsappLink, '_blank');
      }, 1000);
      
    } catch (err) {
      console.error('Error generating bill:', err);
      toast.error(err.message || 'Failed to generate bill');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    return o.status === filter;
  });

  if (loading) return <div className="p-8">Loading orders...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="page-title">Order Management</h1>
        <div className="flex bg-brown-900 rounded-lg p-1 border border-brown-700 overflow-x-auto hide-scrollbar">
          {['all', 'active', 'pending', 'preparing', 'ready', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${
                filter === f ? 'bg-brown-800 text-gold-400 shadow' : 'text-brown-400 hover:text-cream-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrders.map(order => (
          <div key={order._id} className="card flex flex-col hover:border-gold-500/30 transition-colors">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-brown-700 pb-3 mb-3 gap-2">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-2xl font-bold text-cream-100">#{order.tokenNumber}</h3>
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                </div>
                <p className="text-sm text-brown-400 mt-1">
                  {order.orderType} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by {order.createdBy?.name || 'Unknown'}
                </p>
              </div>
              <div className="sm:text-right flex sm:block items-center gap-4">
                <p className="font-bold text-gold-400 text-xl">₹{order.total}</p>
                <span className={`badge mt-1 badge-${order.paymentStatus}`}>{order.paymentStatus} {order.paymentMode && `(${order.paymentMode})`}</span>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 space-y-2 mb-4">
              {order.items.map(item => (
                <div key={item._id} className="flex justify-between text-sm">
                  <span className="text-cream-200"><span className="text-brown-400 font-bold mr-2">{item.quantity}x</span>{item.name} {item.size !== 'Regular' && `(${item.size})`}</span>
                  <span className="text-brown-300">₹{item.price * item.quantity}</span>
                </div>
              ))}
              {order.notes && <p className="text-sm text-amber-400/80 bg-amber-500/10 p-2 rounded mt-2 border border-amber-500/20">Note: {order.notes}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-brown-700">
              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <>
                  {order.status === 'pending' && <button onClick={() => updateStatus(order._id, 'preparing')} className="btn-outline text-xs">Mark Preparing</button>}
                  {order.status === 'preparing' && <button onClick={() => updateStatus(order._id, 'ready')} className="btn-outline text-xs">Mark Ready</button>}
                  {order.status === 'ready' && <button onClick={() => updateStatus(order._id, 'completed')} className="btn-gold text-xs">Complete Order</button>}
                  
                  {<button onClick={() => cancelOrder(order._id)} className="text-red-400 hover:bg-red-900/30 px-3 py-1 rounded text-xs ml-auto">Cancel</button>}
                </>
              )}
              
              <div className="ml-auto flex gap-2">
                {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
                  <button onClick={() => markPaid(order._id)} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/40 px-3 py-1 rounded text-xs font-bold transition-colors">Collect Payment</button>
                )}
                <button onClick={() => generateBill(order._id)} className="btn-outline text-xs flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Bill
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && <p className="col-span-full text-brown-400 py-10 text-center text-lg">No orders found.</p>}
      </div>
    </div>
  );
};

export default Orders;


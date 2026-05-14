import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const PosCounter = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [liveOrders, setLiveOrders] = useState([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const socket = useSocket();
  const {
    cart, addToCart, updateQuantity, removeFromCart, clearCart,
    orderType, setOrderType, couponCode, setCouponCode, applyCoupon,
    discountType, setDiscountType, discountValue, setDiscountValue, applyManualDiscount,
    customer, setCustomer, loyaltyPointsUsed, setLoyaltyPointsUsed,
    paymentMode, setPaymentMode, notes, setNotes,
    subtotal, gst, discountAmount, total
  } = useCart();

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loyaltyInput, setLoyaltyInput] = useState('');

  const handleFindOrCreateCustomer = async () => {
    if (customerPhone.length < 10) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    try {
      const res = await api.post('/customers/find-or-create', { phone: customerPhone, name: customerName });
      setCustomer(res.data);
      if (res.data.loyaltyPoints > 0) {
        toast.success(`Customer found! Loyalty Points: ${res.data.loyaltyPoints}`);
      } else {
        toast.success(`Customer set: ${res.data.name}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error finding customer. Name might be required.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, itemRes, orderRes] = await Promise.all([
          api.get('/menu/categories'),
          api.get('/menu/items?available=true'),
          api.get('/orders?status=pending')
        ]);
        setCategories(catRes.data);
        setItems(itemRes.data);
        if (catRes.data.length > 0) setActiveCategory(catRes.data[0]._id);
        
        // Also fetch today's active orders for the bottom bar
        const todayRes = await api.get('/orders');
        setLiveOrders(todayRes.data.filter(o => !['completed', 'cancelled'].includes(o.status)).slice(0, 10));
      } catch (err) {
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const fetchLive = async () => {
      const res = await api.get('/orders');
      setLiveOrders(res.data.filter(o => !['completed', 'cancelled'].includes(o.status)).slice(0, 10));
    };
    socket.on('order:new', fetchLive);
    socket.on('order:statusUpdate', fetchLive);
    return () => {
      socket.off('order:new', fetchLive);
      socket.off('order:statusUpdate', fetchLive);
    };
  }, [socket]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    try {
      const payload = {
        items: cart.map(i => ({ item: i.item, size: i.size, quantity: i.quantity, notes: i.notes })),
        orderType,
        couponCode,
        discountType,
        discountValue,
        notes,
        paymentMode,
        customerId: customer?._id || null,
        loyaltyPointsUsed: loyaltyPointsUsed || 0
      };
      const res = await api.post('/orders', payload);
      toast.success(`Order placed! Token #${res.data.tokenNumber}`);
      clearCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    }
  };

  if (loading) return <div className="p-8">Loading POS...</div>;

  const filteredItems = items.filter(i => i.category?._id === activeCategory);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] relative overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT PANEL: Menu Grid */}
        <div className={`flex-[2] flex flex-col bg-brown-900 border-r border-brown-800 transition-transform w-full md:w-auto ${isMobileCartOpen ? 'hidden md:flex' : 'flex'}`}>
          {/* Category Tabs */}
          <div className="flex overflow-x-auto border-b border-brown-800 hide-scrollbar bg-brown-950 px-4 pt-4">
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(cat._id)}
                className={`whitespace-nowrap px-6 py-3 font-semibold transition-all border-b-2 ${
                  activeCategory === cat._id
                    ? 'text-gold-400 border-gold-500 bg-brown-900'
                    : 'text-brown-400 border-transparent hover:text-cream-200 hover:bg-brown-900/50'
                } rounded-t-lg`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max pb-24 md:pb-6">
            {filteredItems.map(item => (
              <div key={item._id} className="card flex flex-col hover:border-gold-500/50 transition-colors group cursor-pointer" onClick={() => {
                // Quick add regular or first size
                if (item.sizes.length > 0) addToCart(item, item.sizes[1] || item.sizes[0]); // default to M if exists
                else addToCart(item);
              }}>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-cream-100 text-lg leading-tight mb-1 group-hover:text-gold-400 transition-colors">{item.name}</h3>
                  <p className="text-xs text-brown-400 line-clamp-2">{item.description}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-brown-700/50">
                  {item.sizes.length === 0 ? (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cream-200">₹{item.basePrice}</span>
                      <span className="text-xs bg-brown-700 text-brown-300 px-2 py-1 rounded">Add</span>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-between">
                      {item.sizes.map(s => (
                        <button
                          key={s.size}
                          onClick={(e) => { e.stopPropagation(); addToCart(item, s); }}
                          className="flex-1 py-1 px-1 text-xs font-semibold rounded bg-brown-900 border border-brown-700 hover:border-gold-500 hover:text-gold-400 text-cream-300 transition-colors"
                        >
                          {s.size} - ₹{s.price}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <p className="col-span-full text-brown-400 text-center py-10">No items available in this category.</p>}
          </div>
        </div>

        {/* RIGHT PANEL: Cart */}
        <div className={`flex-1 flex flex-col bg-brown-950 min-w-[350px] max-w-full md:max-w-[450px] absolute md:relative inset-0 z-40 transition-transform ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          <div className="p-4 border-b border-brown-800 flex justify-between items-center bg-brown-900">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileCartOpen(false)} className="md:hidden text-brown-400 hover:text-cream-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="font-display text-xl font-bold text-gold-400">Current Order</h2>
            </div>
            <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 transition-colors px-2 py-1">Clear All</button>
          </div>

          <div className="p-4 border-b border-brown-800 flex gap-2">
            {['Dine-in', 'Takeaway', 'Delivery'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md border transition-colors ${
                  orderType === type ? 'bg-brown-800 border-gold-500 text-gold-400' : 'bg-transparent border-brown-700 text-brown-400 hover:text-cream-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-brown-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((i, idx) => (
                <div key={idx} className="flex gap-3 bg-brown-900 p-3 rounded-lg border border-brown-800">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-cream-100 leading-tight">
                        {i.name} {i.size !== 'Regular' && <span className="text-gold-400 text-xs ml-1">({i.size})</span>}
                      </p>
                      <button onClick={() => removeFromCart(i.item, i.size)} className="text-brown-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <p className="text-sm text-brown-400 mt-1">₹{i.price}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-bold text-cream-100">₹{i.price * i.quantity}</p>
                    <div className="flex items-center gap-2 mt-2 bg-brown-950 rounded border border-brown-700">
                      <button onClick={() => updateQuantity(i.item, i.size, i.quantity - 1)} className="px-2 py-0.5 text-brown-300 hover:text-white">-</button>
                      <span className="text-sm font-semibold w-4 text-center">{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.item, i.size, i.quantity + 1)} className="px-2 py-0.5 text-brown-300 hover:text-white">+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Loyalty Section */}
          <div className="bg-brown-950 p-4 border-t border-brown-800">
            {customer ? (
              <div className="flex justify-between items-center bg-brown-900 p-2 rounded border border-brown-700">
                <div>
                  <div className="text-sm font-bold text-cream-200">{customer.name}</div>
                  <div className="text-xs text-brown-400">{customer.phone} • {customer.loyaltyPoints} pts</div>
                </div>
                <button onClick={() => { setCustomer(null); setLoyaltyPointsUsed(0); setLoyaltyInput(''); setCustomerPhone(''); setCustomerName(''); }} className="text-xs text-red-400">Remove</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="input-field py-1 text-sm flex-1" />
                  <input type="text" placeholder="Name (if new)" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input-field py-1 text-sm flex-1" />
                  <button onClick={handleFindOrCreateCustomer} className="btn-outline py-1 px-3 text-sm">Find</button>
                </div>
              </div>
            )}
            
            {customer && customer.loyaltyPoints > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" max={customer.loyaltyPoints} placeholder="Pts to use" value={loyaltyInput} onChange={e => setLoyaltyInput(e.target.value)} className="input-field py-1 text-sm flex-1" />
                <button onClick={() => {
                  const pts = Math.min(Number(loyaltyInput), customer.loyaltyPoints);
                  if (pts > 0) {
                    setLoyaltyPointsUsed(pts);
                    toast.success(`Using ${pts} points (₹${pts} off)`);
                  }
                }} className="btn-outline py-1 px-3 text-sm whitespace-nowrap">Apply Pts</button>
              </div>
            )}
          </div>

          {/* Billing Section */}
          <div className="bg-brown-900 border-t border-brown-800 p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="input-field py-1.5 text-sm uppercase"
              />
              <button onClick={() => applyCoupon(couponCode)} className="btn-outline py-1.5 text-sm whitespace-nowrap">Apply</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={discountType}
                onChange={(e) => {
                  const type = e.target.value;
                  setDiscountType(type);
                  if (type === 'none') setDiscountValue(0);
                }}
                className="input-field py-1.5 text-sm col-span-1"
              >
                <option value="none">No Discount</option>
                <option value="flat">Flat (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
              <input
                type="number"
                min="0"
                placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 50'}
                value={discountType === 'none' ? '' : discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                className="input-field py-1.5 text-sm col-span-1"
                disabled={discountType === 'none'}
              />
              <button
                onClick={() => applyManualDiscount(discountType, discountValue)}
                className="btn-outline py-1.5 text-sm whitespace-nowrap col-span-1"
              >
                Set Discount
              </button>
            </div>
            
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-cream-300"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-brown-400"><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400"><span>Discount</span><span>-₹{discountAmount.toFixed(2)}</span></div>
              )}
              {loyaltyPointsUsed > 0 && (
                <div className="flex justify-between text-pink-400"><span>Loyalty Discount</span><span>-₹{loyaltyPointsUsed.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-xl font-display font-bold text-gold-400 pt-2 border-t border-brown-700/50 mt-2">
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {['Cash', 'UPI', 'Card'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 text-sm font-semibold rounded-md border transition-colors ${
                    paymentMode === mode ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'bg-brown-950 border-brown-700 text-brown-400 hover:text-cream-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              className="btn-gold w-full py-4 text-lg mt-4 uppercase tracking-wider"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Toggle Button */}
      {!isMobileCartOpen && (
        <button 
          onClick={() => setIsMobileCartOpen(true)}
          className="md:hidden absolute bottom-16 right-4 z-30 bg-gold-gradient text-brown-900 p-4 rounded-full shadow-[0_4px_15px_rgba(201,162,39,0.5)] flex items-center justify-center"
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-brown-900">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            )}
          </div>
        </button>
      )}

      {/* BOTTOM BAR: Live Orders Strip */}
      <div className="h-12 bg-brown-950 border-t border-brown-800 flex items-center px-4 overflow-x-auto hide-scrollbar gap-4 z-50 relative">
        <span className="text-xs font-bold text-gold-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></span> Live Orders
        </span>
        <div className="w-px h-6 bg-brown-800"></div>
        {liveOrders.map(order => (
          <div key={order._id} className="flex items-center gap-2 bg-brown-900 border border-brown-800 px-3 py-1 rounded-full whitespace-nowrap shrink-0">
            <span className="font-bold text-cream-200 text-sm">#{order.tokenNumber}</span>
            <span className={`badge text-[10px] badge-${order.status}`}>{order.status}</span>
          </div>
        ))}
        {liveOrders.length === 0 && <span className="text-sm text-brown-500">No active orders</span>}
      </div>
    </div>
  );
};

export default PosCounter;


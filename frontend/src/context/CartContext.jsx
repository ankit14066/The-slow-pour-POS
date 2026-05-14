import { createContext, useContext, useState, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine-in');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [notes, setNotes] = useState('');

  // Discount state based on validated coupon
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);

  // Customer state
  const [customer, setCustomer] = useState(null);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);

  const addToCart = (item, sizeObj = null, customNotes = '') => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item === item._id && i.size === (sizeObj ? sizeObj.size : 'Regular'));
      if (existing) {
        return prev.map((i) =>
          i.item === item._id && i.size === (sizeObj ? sizeObj.size : 'Regular')
            ? { ...i, quantity: i.quantity + 1, notes: customNotes || i.notes }
            : i
        );
      }
      return [
        ...prev,
        {
          item: item._id,
          name: item.name,
          size: sizeObj ? sizeObj.size : 'Regular',
          price: sizeObj ? sizeObj.price : item.basePrice,
          quantity: 1,
          notes: customNotes,
        },
      ];
    });
  };

  const updateQuantity = (itemId, size, qty) => {
    if (qty <= 0) {
      removeFromCart(itemId, size);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.item === itemId && i.size === size ? { ...i, quantity: qty } : i))
    );
  };

  const removeFromCart = (itemId, size) => {
    setCart((prev) => prev.filter((i) => !(i.item === itemId && i.size === size)));
  };

  const clearCart = () => {
    setCart([]);
    setOrderType('Dine-in');
    setCouponCode('');
    setPaymentMode('');
    setNotes('');
    setDiscountType('none');
    setDiscountValue(0);
    setCustomer(null);
    setLoyaltyPointsUsed(0);
  };

  const applyCoupon = async (code) => {
    if (!code) {
      setCouponCode('');
      setDiscountType('none');
      setDiscountValue(0);
      return;
    }
    try {
      const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
      const res = await api.post('/billing/validate-coupon', { code, subtotal });
      setCouponCode(res.data.coupon.code);
      setDiscountType(res.data.coupon.type);
      setDiscountValue(res.data.coupon.value);
      toast.success(`Coupon ${res.data.coupon.code} applied!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setCouponCode('');
      setDiscountType('none');
      setDiscountValue(0);
    }
  };

  const applyManualDiscount = (type, value) => {
    const parsedValue = Number(value) || 0;
    setCouponCode('');
    if (type === 'none' || parsedValue <= 0) {
      setDiscountType('none');
      setDiscountValue(0);
      return;
    }
    setDiscountType(type);
    setDiscountValue(parsedValue);
  };

  // Compute totals
  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.price * i.quantity, 0), [cart]);
  const gst = useMemo(() => parseFloat((subtotal * 0.05).toFixed(2)), [subtotal]);
  const discountAmount = useMemo(() => {
    if (discountType === 'flat') return parseFloat(Math.min(discountValue, subtotal).toFixed(2));
    if (discountType === 'percent') return parseFloat(((subtotal * discountValue) / 100).toFixed(2));
    return 0;
  }, [subtotal, discountType, discountValue]);
  
  const total = useMemo(() => {
    let t = subtotal + gst - discountAmount;
    if (loyaltyPointsUsed > 0) {
      t -= loyaltyPointsUsed; // 1 pt = 1 rupee
    }
    return parseFloat(Math.max(t, 0).toFixed(2));
  }, [subtotal, gst, discountAmount, loyaltyPointsUsed]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        orderType,
        setOrderType,
        couponCode,
        setCouponCode,
        applyCoupon,
        applyManualDiscount,
        paymentMode,
        setPaymentMode,
        notes,
        setNotes,
        discountType,
        setDiscountType,
        discountValue,
        setDiscountValue,
        customer,
        setCustomer,
        loyaltyPointsUsed,
        setLoyaltyPointsUsed,
        subtotal,
        gst,
        discountAmount,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

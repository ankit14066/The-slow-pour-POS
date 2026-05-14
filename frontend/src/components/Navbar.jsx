import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout, startShift, endShift } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timerTick, setTimerTick] = useState(0);

  useEffect(() => {
    if (user?.role !== 'staff' || !user?.activeShiftStart) return;
    const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [user?.role, user?.activeShiftStart]);

  const getShiftDurationText = () => {
    if (!user?.activeShiftStart) return '00:00:00';
    const elapsedMs = Date.now() - new Date(user.activeShiftStart).getTime();
    const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  if (!user || location.pathname === '/login' || location.pathname === '/kitchen') return null;

  return (
    <nav className="bg-brown-950 border-b border-brown-800 text-cream-200 shadow-md relative z-50">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-8">
          <div className="font-display text-xl sm:text-2xl font-bold bg-gold-gradient text-transparent bg-clip-text">
            The Slow Pour
          </div>
          <div className="hidden md:flex gap-4 font-medium">
            <Link to="/pos" className={`hover:text-gold-400 transition-colors ${location.pathname === '/pos' ? 'text-gold-500' : ''}`}>POS</Link>
            <Link to="/orders" className={`hover:text-gold-400 transition-colors ${location.pathname === '/orders' ? 'text-gold-500' : ''}`}>Orders</Link>
            <Link to="/dashboard" className={`hover:text-gold-400 transition-colors ${location.pathname === '/dashboard' ? 'text-gold-500' : ''}`}>Dashboard</Link>
            {['owner', 'manager'].includes(user.role) && (
              <>
                <Link to="/menu" className={`hover:text-gold-400 transition-colors ${location.pathname === '/menu' ? 'text-gold-500' : ''}`}>Menu Mgmt</Link>
                <Link to="/reports" className={`hover:text-gold-400 transition-colors ${location.pathname === '/reports' ? 'text-gold-500' : ''}`}>Reports</Link>
                <Link to="/inventory" className={`hover:text-gold-400 transition-colors ${location.pathname === '/inventory' ? 'text-gold-500' : ''}`}>Inventory</Link>
                <Link to="/staff" className={`hover:text-gold-400 transition-colors ${location.pathname === '/staff' ? 'text-gold-500' : ''}`}>Staff</Link>
                <Link to="/offers" className={`hover:text-gold-400 transition-colors ${location.pathname === '/offers' ? 'text-gold-500' : ''}`}>Offers</Link>
                <Link to="/settings" className={`hover:text-gold-400 transition-colors ${location.pathname === '/settings' ? 'text-gold-500' : ''}`}>Settings</Link>
              </>
            )}
            <Link to="/customers" className={`hover:text-gold-400 transition-colors ${location.pathname === '/customers' ? 'text-gold-500' : ''}`}>Customers</Link>
            <Link to="/delivery" className={`hover:text-gold-400 transition-colors ${location.pathname === '/delivery' ? 'text-gold-500' : ''}`}>Delivery</Link>
          </div>
        </div>

        {/* User Info & Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-3">
            {['owner', 'manager'].includes(user.role) && <NotificationBell />}
            <span className="text-sm px-2 py-1 bg-brown-800 rounded-md border border-brown-700 uppercase tracking-wider text-gold-400 font-bold">{user.role}</span>
            <span className="font-semibold">{user.name}</span>
            {user.role === 'staff' && user.activeShiftStart && (
              <span className="text-xs px-2 py-1 bg-emerald-900/40 border border-emerald-500/40 rounded text-emerald-300 font-bold">
                Shift: {getShiftDurationText()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {user.role === 'staff' && (
              <>
                <button onClick={startShift} className="text-xs btn-outline py-1 px-2">Start Shift</button>
                <button onClick={endShift} className="text-xs border border-brown-600 text-cream-400 hover:bg-brown-800 py-1 px-2 rounded-lg">End Shift</button>
              </>
            )}
            <button onClick={logout} className="text-sm btn-outline ml-2">Logout</button>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden p-2 text-cream-200" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-brown-900 border-t border-brown-800 p-4 absolute top-full left-0 right-0 shadow-xl">
          <div className="flex flex-col gap-4">
            <Link onClick={() => setIsMenuOpen(false)} to="/pos" className={`block py-2 ${location.pathname === '/pos' ? 'text-gold-500 font-bold' : ''}`}>POS</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/orders" className={`block py-2 ${location.pathname === '/orders' ? 'text-gold-500 font-bold' : ''}`}>Orders</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/dashboard" className={`block py-2 ${location.pathname === '/dashboard' ? 'text-gold-500 font-bold' : ''}`}>Dashboard</Link>
            {['owner', 'manager'].includes(user.role) && (
              <>
                <Link onClick={() => setIsMenuOpen(false)} to="/menu" className={`block py-2 ${location.pathname === '/menu' ? 'text-gold-500 font-bold' : ''}`}>Menu Mgmt</Link>
                <Link onClick={() => setIsMenuOpen(false)} to="/reports" className={`block py-2 ${location.pathname === '/reports' ? 'text-gold-500 font-bold' : ''}`}>Reports</Link>
                <Link onClick={() => setIsMenuOpen(false)} to="/inventory" className={`block py-2 ${location.pathname === '/inventory' ? 'text-gold-500 font-bold' : ''}`}>Inventory</Link>
                <Link onClick={() => setIsMenuOpen(false)} to="/staff" className={`block py-2 ${location.pathname === '/staff' ? 'text-gold-500 font-bold' : ''}`}>Staff</Link>
                <Link onClick={() => setIsMenuOpen(false)} to="/offers" className={`block py-2 ${location.pathname === '/offers' ? 'text-gold-500 font-bold' : ''}`}>Offers</Link>
                <Link onClick={() => setIsMenuOpen(false)} to="/settings" className={`block py-2 ${location.pathname === '/settings' ? 'text-gold-500 font-bold' : ''}`}>Settings</Link>
              </>
            )}
            <Link onClick={() => setIsMenuOpen(false)} to="/customers" className={`block py-2 ${location.pathname === '/customers' ? 'text-gold-500 font-bold' : ''}`}>Customers</Link>
            <Link onClick={() => setIsMenuOpen(false)} to="/delivery" className={`block py-2 ${location.pathname === '/delivery' ? 'text-gold-500 font-bold' : ''}`}>Delivery</Link>
            
            <div className="border-t border-brown-800 my-2 pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 bg-brown-800 rounded border border-brown-700 text-gold-400">{user.role}</span>
                <span>{user.name}</span>
              </div>
              
              <div className="flex gap-2">
                {user.role === 'staff' && (
                  <>
                    <button onClick={startShift} className="text-xs btn-outline py-2 px-3 flex-1">Start Shift</button>
                    <button onClick={endShift} className="text-xs border border-brown-600 py-2 px-3 flex-1 rounded text-cream-400">End Shift</button>
                  </>
                )}
              </div>
              <button onClick={logout} className="text-sm btn-outline py-2 w-full mt-2 text-center text-red-400 border-red-900 hover:bg-red-900/20">Logout</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PosCounter from './pages/PosCounter';
import MenuManagement from './pages/MenuManagement';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Kds from './pages/Kds';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import FeedbackForm from './pages/FeedbackForm';
import StaffManagement from './pages/StaffManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import Offers from './pages/Offers';
import Settings from './pages/Settings';

const MainLayout = () => (
  <div className="flex flex-col h-screen">
    <Navbar />
    <div className="flex-1 overflow-auto">
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><PosCounter /></ProtectedRoute>} />
        <Route path="/menu" element={<ProtectedRoute roles={['owner', 'manager']}><MenuManagement /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['owner', 'manager']}><Reports /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={['owner', 'manager']}><Inventory /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute roles={['owner', 'manager']}><StaffManagement /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute><DeliveryManagement /></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute roles={['owner', 'manager']}><Offers /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['owner', 'manager']}><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <Router>
            <Toaster position="top-right" toastOptions={{ className: 'bg-brown-800 text-cream-200 border border-brown-700' }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/feedback/:orderId" element={<FeedbackForm />} />
              <Route path="/kitchen" element={<ProtectedRoute><Kds /></ProtectedRoute>} />
              <Route path="*" element={<MainLayout />} />
            </Routes>
          </Router>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

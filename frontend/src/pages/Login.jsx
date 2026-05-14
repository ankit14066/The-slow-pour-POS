import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
  const { login, pinLogin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' or 'email'
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // PIN state
  const [pinEmail, setPinEmail] = useState('');
  const [pin, setPin] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return toast.error('PIN must be 4 digits');
    if (!pinEmail) return toast.error('Email required for PIN login');
    try {
      const user = await pinLogin(pinEmail, pin);
      toast.success(`Welcome, ${user.name}`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid PIN');
      setPin('');
    }
  };

  const handleNumpad = (num) => {
    if (pin.length < 4) setPin((prev) => prev + num);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-brown-950/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md card-glass p-8 border-gold-500/20">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold bg-gold-gradient text-transparent bg-clip-text mb-2">The Slow Pour</h1>
          <p className="text-cream-400 font-medium tracking-wide">Point of Sale</p>
        </div>

        <div className="flex bg-brown-900 rounded-lg p-1 mb-6 border border-brown-700">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'pin' ? 'bg-brown-800 text-gold-400 shadow' : 'text-brown-400 hover:text-cream-200'}`}
            onClick={() => { setActiveTab('pin'); setPin(''); }}
          >
            Staff PIN
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'email' ? 'bg-brown-800 text-gold-400 shadow' : 'text-brown-400 hover:text-cream-200'}`}
            onClick={() => setActiveTab('email')}
          >
            Manager / Owner
          </button>
        </div>

        {activeTab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required />
            </div>
            <button type="submit" className="btn-gold w-full mt-4 py-3 text-lg">Sign In</button>
          </form>
        ) : (
          <form onSubmit={handlePinLogin} className="space-y-6">
            <div>
              <label className="label text-center">Staff Email</label>
              <input type="email" value={pinEmail} onChange={(e) => setPinEmail(e.target.value)} className="input-field text-center" placeholder="staff@slowpour.com" required />
            </div>
            
            <div className="flex justify-center gap-4 my-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${pin.length > i ? 'bg-gold-500 border-gold-500 shadow-[0_0_10px_rgba(201,162,39,0.5)]' : 'border-brown-600 bg-transparent'}`}></div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} type="button" onClick={() => handleNumpad(num.toString())} className="h-14 bg-brown-900 border border-brown-700 rounded-xl text-xl font-bold text-cream-200 hover:bg-brown-800 hover:border-gold-500/50 hover:text-gold-400 active:scale-95 transition-all">
                  {num}
                </button>
              ))}
              <div className="h-14"></div>
              <button type="button" onClick={() => handleNumpad('0')} className="h-14 bg-brown-900 border border-brown-700 rounded-xl text-xl font-bold text-cream-200 hover:bg-brown-800 hover:border-gold-500/50 hover:text-gold-400 active:scale-95 transition-all">0</button>
              <button type="button" onClick={handleBackspace} className="h-14 flex items-center justify-center bg-brown-900 border border-brown-700 rounded-xl text-brown-400 hover:bg-brown-800 hover:text-red-400 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
              </button>
            </div>
            
            <button type="submit" disabled={pin.length !== 4 || !pinEmail} className="btn-gold w-full py-3 text-lg mt-4">Unlock POS</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

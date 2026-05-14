import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', pin: '', password: '' });

  const fetchStaff = async () => {
    try {
      const res = await api.get('/auth/staff');
      setStaff(res.data);
    } catch (err) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const createStaff = async (e) => {
    e.preventDefault();
    if (form.pin.length !== 4) return toast.error('PIN must be 4 digits');

    try {
      await api.post('/auth/staff', {
        name: form.name,
        email: form.email,
        pin: form.pin,
        password: form.password || undefined,
      });
      toast.success('Staff added');
      setForm({ name: '', email: '', pin: '', password: '' });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff');
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Delete this staff account?')) return;
    try {
      await api.delete(`/auth/staff/${id}`);
      toast.success('Staff deleted');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff');
    }
  };

  const getTotalShiftHours = (shifts = []) => {
    const totalMs = shifts.reduce((acc, s) => {
      if (!s?.start) return acc;
      const end = s.end ? new Date(s.end).getTime() : Date.now();
      const start = new Date(s.start).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    return (totalMs / (1000 * 60 * 60)).toFixed(2);
  };

  const getLastShiftHours = (shifts = []) => {
    if (!shifts.length) return '0.00';
    const sorted = [...shifts].sort((a, b) => new Date(b.start) - new Date(a.start));
    const last = sorted[0];
    if (!last?.start) return '0.00';
    const end = last.end ? new Date(last.end).getTime() : Date.now();
    const start = new Date(last.start).getTime();
    return ((Math.max(0, end - start)) / (1000 * 60 * 60)).toFixed(2);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="page-title">Staff Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="section-title mb-4">Add Staff</h2>
          <form onSubmit={createStaff} className="space-y-3">
            <input
              className="input-field"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <input
              className="input-field"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="4-digit PIN"
              value={form.pin}
              onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="Password (optional)"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <button className="btn-gold w-full" type="submit">Create Staff</button>
          </form>
          <p className="text-xs text-brown-400 mt-3">Staff can login using Email + PIN from login screen.</p>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="section-title mb-4">Existing Staff</h2>
          {loading ? (
            <p className="text-brown-400">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="text-brown-400">No staff found.</p>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <div key={s._id || s.id} className="border border-brown-700 rounded-lg p-4 flex items-center justify-between gap-3 bg-brown-900/40">
                  <div>
                    <p className="font-semibold text-cream-100">{s.name}</p>
                    <p className="text-sm text-brown-400">{s.email}</p>
                    <div className="text-xs text-brown-300 mt-1">
                      <span>Total: {getTotalShiftHours(s.shifts)} hrs</span>
                      <span className="mx-2">|</span>
                      <span>Last Shift: {getLastShiftHours(s.shifts)} hrs</span>
                      {!s.shifts?.every((x) => x.end) && (
                        <span className="ml-2 text-emerald-300 font-semibold">(Running)</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteStaff(s._id || s.id)} className="text-red-300 border border-red-400/40 px-3 py-1 rounded hover:bg-red-500/10 text-sm">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;

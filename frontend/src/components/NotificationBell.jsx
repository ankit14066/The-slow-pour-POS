import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const socket = useSocket();

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    } catch {
      // ignore for roles without access
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAll = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  const clearAll = async () => {
    await api.delete('/notifications/clear-all');
    load();
  };

  return (
    <div className="relative">
      <button className="relative text-cream-200" onClick={() => setOpen((v) => !v)}>
        <span className="text-lg">??</span>
        {unread > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">{unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-brown-900 border border-brown-700 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-brown-700 flex justify-between">
            <span className="text-cream-100 font-semibold">Notifications</span>
            <div className="flex gap-2 text-xs">
              <button className="text-brown-300" onClick={markAll}>Mark all</button>
              <button className="text-red-300" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <button key={n._id} className={`w-full text-left p-3 border-b border-brown-800 ${n.isRead ? 'opacity-70' : ''}`} onClick={() => markRead(n._id)}>
                <div className="text-cream-100 text-sm font-semibold">{n.title}</div>
                <div className="text-brown-300 text-xs mt-1">{n.message}</div>
              </button>
            ))}
            {notifications.length === 0 && <div className="p-3 text-brown-400 text-sm">No notifications</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

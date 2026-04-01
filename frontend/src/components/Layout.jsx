import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import api from '../api/axios';

export default function Layout() {
  const [openAlertCount, setOpenAlertCount] = useState(0);

  useEffect(() => {
    api.get('/alerts/open?limit=1')
      .then(res => setOpenAlertCount(res.data.alerts?.length || 0))
      .catch(() => {});

    // Also poll open alerts count periodically
    const interval = setInterval(() => {
      api.get('/stats/dashboard')
        .then(res => setOpenAlertCount(res.data.openAlerts || 0))
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar openAlertCount={openAlertCount} />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet context={{ setOpenAlertCount }} />
        </main>
      </div>
    </div>
  );
}

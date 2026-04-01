import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, List, Bell, Server, Layers, Shield, LogOut } from 'lucide-react';
import AlertBadge from './AlertBadge';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/logs', label: 'Logs', icon: List },
  { to: '/alerts', label: 'Alerts', icon: Bell, showBadge: true },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/applications', label: 'Applications', icon: Layers },
  { to: '/audit', label: 'Audit', icon: Shield, adminOnly: true },
];

export default function Sidebar({ openAlertCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary tracking-tight">RT-LMS</h1>
        <p className="text-[10px] text-muted uppercase tracking-widest">Log Management</p>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted hover:text-white hover:bg-bg'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.showBadge && <AlertBadge count={openAlertCount} />}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-sm text-muted hover:text-error transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

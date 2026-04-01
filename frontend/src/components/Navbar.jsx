import { useAuth } from '../context/AuthContext';

const roleBadgeColors = {
  ADMIN: 'bg-purple-900 text-purple-300',
  OPERATOR: 'bg-blue-900 text-blue-300',
  VIEWER: 'bg-gray-700 text-gray-300',
};

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-white">{user.name}</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${roleBadgeColors[user.role] || 'bg-gray-800 text-gray-400'}`}
            >
              {user.role}
            </span>
          </>
        )}
      </div>
    </header>
  );
}

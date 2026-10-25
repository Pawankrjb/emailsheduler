import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api.js';

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSchedulerScroll = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('scheduler')?.scrollIntoView({
          behavior: 'smooth',
        });
      }, 300);
    } else {
      document.getElementById('scheduler')?.scrollIntoView({
        behavior: 'smooth',
      });
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-[#1e1c1c] px-6 py-3.5 shadow-xl">
      <div className="flex items-center gap-3">
        Email<span className="text-gray-400">Scheduler</span>

        <span className="hidden rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 sm:inline-block">
          ReachInbox Scheduler
        </span>
      </div>

      <div className="flex items-center gap-5">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-xs font-medium transition ${
              isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `text-xs font-medium transition ${
              isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          About
        </NavLink>




        <button
          type="button"
          onClick={handleSchedulerScroll}
          className="text-xs font-medium text-gray-400 transition hover:text-white"
        >
          Email Scheduler
        </button>


        <a
          href="http://localhost:4000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-gray-200 transition hover:bg-white/20 hover:text-white md:inline-block"
        >
          📬 Email Queue ↗
        </a>

        {/* User Profile Header (Google User Info) */}
        {user ? (
          <div className="flex items-center gap-3 border-l border-gray-800 pl-4">

            <div className="hidden text-left sm:block">
              <div className="text-xs font-bold leading-none text-white">{user.name}</div>
              <div className="text-[10px] text-gray-400">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 rounded-lg border border-gray-700 px-3 py-1 text-xs font-medium text-gray-400 transition hover:border-red-500/40 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-gray-200"
          >
            Sign In
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

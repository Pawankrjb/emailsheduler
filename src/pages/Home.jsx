import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api.js';
import Navbar from '../component/Navbar.jsx';
import Footer from '../component/Footer.jsx';
import SchedulerDashboard from '../component/EmailScheduler/SchedulerDashboard.jsx';

function Home() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await api.get('/profile');
        setUser(response.data);
        setStatus('logged-in');
      } catch (error) {
        if (error.response?.status === 401) {
          setStatus('logged-out');
        } else {
          setStatus('error');
        }
      }
    }

    checkSession();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1e1c1c] text-white">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          <p className="text-sm font-medium text-gray-300">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (status === 'logged-out' || status === 'error') {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="min-h-screen bg-[#1e1c1c] p-6 text-white sm:p-8">
      <Navbar user={user} />

      {/* ReachInbox Full-stack Email Job Scheduler Section */}
      <section id="scheduler" className="mx-auto my-8 max-w-6xl">
        <SchedulerDashboard />
      </section>

      <Footer />
    </main>
  );
}

export default Home;

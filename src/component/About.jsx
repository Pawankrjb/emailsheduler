
import { useEffect, useState } from 'react';
import api from '../api.js';
import Footer from './Footer';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';



function About() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await api.get('/profile');
        setUser(response.data);
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1c1c] p-8 text-white">
      <Navbar user={user} />

      <section className="max-w-[1300px]  ml-30 px-6 py-12 text-black md:px-10 md:py-16">
        <div className="mx-auto max-w-7xl">
          {/* About Heading */}
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
                About Email Scheduler
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                Schedule Smarter.
                <br />
                Reach Better.
                <br />
                Build Your Network.
              </h1>

              <p className="mt-6 max-w-xl leading-8 text-white">
                Email Scheduler helps you schedule and manage your outreach emails,
                automate follow-ups, and reach the right people at the right time.
                Get personalized scheduling and grow your network with confidence.
              </p>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-7 rounded-lg bg-black px-6 py-3 font-medium text-white transition duration-300 hover:bg-gray-800"
              >
                Start Your Journey
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-gray-100">
                <h2 className="text-xl font-bold text-black">Email Scheduling</h2>
                <p className="mt-3 leading-6 text-gray-600">
                  Schedule emails in advance and automate your outreach workflow.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-gray-100">
                <h2 className="text-xl font-bold text-black">
                  Smart Follow-ups
                </h2>
                <p className="mt-3 leading-6 text-gray-600">
                  Automate follow-up emails and never miss a reply opportunity.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-gray-100">
                <h2 className="text-xl font-bold text-black">Track Deliveries</h2>
                <p className="mt-3 leading-6 text-gray-600">
                  Track email delivery, opens, and replies in real time.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-gray-100">
                <h2 className="text-xl font-bold text-black">User First</h2>
                <p className="mt-3 leading-6 text-gray-600">
                  A simple, intuitive experience designed for fast email outreach.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-gray-200 pt-8 text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Your Emails. Your Outreach. Your Growth.
            </h2>

            <p className="mt-3 text-gray-600">
              Make every email count.
            </p>
          </div>
        </div>
      </section>
      <Footer></Footer>
    </div>
  );
}

export default About;

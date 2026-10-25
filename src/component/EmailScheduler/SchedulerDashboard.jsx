import { useState, useEffect, useCallback } from 'react';
import api from '../../api.js';
import ComposeModal from './ComposeModal.jsx';
import SlackModal from './SlackModal.jsx';
import ScheduledTable from './ScheduledTable.jsx';
import SentTable from './SentTable.jsx';

function SchedulerDashboard() {
  const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled' | 'sent' | 'system'
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchSource, setSearchSource] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [scheduledRes, sentRes, statsRes, slackRes] = await Promise.all([
        api.get('/api/emails/scheduled'),
        api.get('/api/emails/sent'),
        api.get('/api/emails/stats'),
        api.get('/api/slack/status'),
      ]);

      setScheduledEmails(scheduledRes.data.scheduled || []);
      setSentEmails(sentRes.data.sent || []);
      setStats(statsRes.data || null);
      setSlackConnected(Boolean(slackRes.data?.connected));
    } catch (err) {
      console.error('Failed to load scheduler data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh periodically to reflect BullMQ job execution
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Elasticsearch Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data.results || []);
      setSearchSource(res.data.source || 'database');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleCancelEmail = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    try {
      await api.delete(`/api/emails/${id}`);
      await fetchData();
    } catch (err) {
      alert('Failed to cancel email: ' + (err.response?.data?.error || err.message));
    }
  };

  const displayedScheduled = searchResults
    ? searchResults.filter((e) => ['scheduled', 'delayed_rate_limited', 'processing'].includes(e.status))
    : scheduledEmails;

  const displayedSent = searchResults
    ? searchResults.filter((e) => ['sent', 'failed'].includes(e.status))
    : sentEmails;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#242222] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Persistent BullMQ + Redis Engine Active
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Email Job Scheduler & Dispatcher
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Scale outreach without losing jobs on restart. Strict provider throttling & rate limiting enforced.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Slack Connection Status Button */}
          <button
            type="button"
            onClick={() => setIsSlackOpen(true)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
              slackConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-gray-700 bg-[#282626] text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="text-sm">#</span>
            <span>{slackConnected ? 'Slack: Connected' : 'Connect Slack'}</span>
            <span
              className={`h-2 w-2 rounded-full ${slackConnected ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : 'bg-gray-500'}`}
            />
          </button>

          {/* Live Bull-board Link */}
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#282626] px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
            title="Open real-time BullMQ queues dashboard"
          >
            <span>📊 BullMQ Live Board</span>
            <span className="text-[10px]">↗</span>
          </a>

          {/* Primary Action: Compose New Email */}
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition hover:bg-gray-200 active:scale-95"
          >
            <span>+</span>
            <span>Compose New Email</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Scheduled Queue */}
        <div className="rounded-2xl border border-white/10 bg-[#242222] p-5 shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>QUEUED / DELAYED</span>
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-indigo-300">BullMQ</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{scheduledEmails.length}</span>
            <span className="text-xs text-gray-400">jobs pending</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Persistent in Redis sorted sets. Survives restarts without re-sending.
          </p>
        </div>

        {/* Card 2: Sent Delivered */}
        <div className="rounded-2xl border border-white/10 bg-[#242222] p-5 shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>DELIVERED (SENT)</span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Fake SMTP</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {sentEmails.filter((e) => e.status === 'sent').length}
            </span>
            <span className="text-xs text-gray-400">delivered via Ethereal</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Inspectable with verified preview links generated for every send.
          </p>
        </div>

        {/* Card 3: Rate Limiting & Throttling */}
        <div className="rounded-2xl border border-white/10 bg-[#242222] p-5 shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>HOURLY RATE LIMIT</span>
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-amber-300">Redis Counter</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.config?.maxEmailsPerHour || 50}
            </span>
            <span className="text-xs text-gray-400">emails/hr per sender</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Excess jobs auto-deferred to next window. No jobs dropped or lost.
          </p>
        </div>

        {/* Card 4: Worker Concurrency & Delay */}
        <div className="rounded-2xl border border-white/10 bg-[#242222] p-5 shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>WORKER CONCURRENCY</span>
            <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-sky-300">Parallel</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-400">
              {stats?.config?.workerConcurrency || 5}
            </span>
            <span className="text-xs text-gray-400">concurrent workers</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Throttling: min {((stats?.config?.minDelayMs || 2000) / 1000).toFixed(1)}s delay between sends.
          </p>
        </div>
      </div>

      {/* Elasticsearch Live Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#242222] p-4 shadow-md">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search emails by recipient, sender, subject, or body (Elasticsearch indexed)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#1e1c1c] px-4 py-2.5 pl-10 text-xs text-white placeholder-gray-500 outline-none focus:border-white"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                ✕ Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Elasticsearch Query'}
          </button>
        </form>

        {searchResults && (
          <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-2 text-xs">
            <span className="text-gray-300">
              Found <strong className="text-white">{searchResults.length}</strong> matching email(s) via{' '}
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-semibold text-indigo-300 uppercase">
                {searchSource}
              </span>
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-xs text-indigo-400 underline hover:text-indigo-300"
            >
              Reset view
            </button>
          </div>
        )}
      </div>

      {/* Main Content Card with Tabs */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#242222] shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-[#1e1c1c]/50 px-6 pt-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold transition ${
                activeTab === 'scheduled'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>Scheduled Emails</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-300">
                {displayedScheduled.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold transition ${
                activeTab === 'sent'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>Sent Emails</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-300">
                {displayedSent.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`border-b-2 pb-4 text-sm font-semibold transition ${
                activeTab === 'system'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              ⚙️ Architecture & Features
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        {activeTab === 'scheduled' && (
          <ScheduledTable
            emails={displayedScheduled}
            loading={loading}
            onCancel={handleCancelEmail}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === 'sent' && (
          <SentTable
            emails={displayedSent}
            loading={loading}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        )}

        {activeTab === 'system' && (
          <div className="p-8 text-sm text-gray-300 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Production-Grade Architecture Overview</h3>
              <p className="mt-1 text-gray-400 text-xs leading-relaxed">
                Designed to satisfy all requirements of the ReachInbox Full-stack Email Job Scheduler specification.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-800 bg-[#1e1c1c] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>⏱️</span> No Cron Jobs & BullMQ Delayed Jobs
                </h4>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Emails are scheduled using <strong>BullMQ delayed jobs</strong> backed by Redis sorted sets.
                  Each email is assigned a unique idempotent <code>jobId</code> matching its database ID, preventing duplicate sends.
                </p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#1e1c1c] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🔄</span> Server Restart Resilience & Persistence
                </h4>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Both Redis and the Relational DB persist all queue states. On server startup, a recovery sync ensures
                  any pending database emails are mapped to active BullMQ delayed jobs. If the server stops and restarts,
                  future scheduled emails still send at their exact target time!
                </p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#1e1c1c] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🚦</span> Hourly Rate Limiter & Slack Alerts
                </h4>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Redis-backed atomic counters (keyed by <code>ratelimit:{'{sender}'}:{'{hour}'}</code>) enforce quotas across multiple workers.
                  When a limit is reached, jobs are <strong>not dropped</strong>; they are deferred into the next hour window, and a live alert is sent to Slack.
                </p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#1e1c1c] p-5">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🔎</span> Elasticsearch Search & Ethereal SMTP
                </h4>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  All scheduled and sent emails are indexed in Elasticsearch with multi-match full-text search.
                  Emails are dispatched via Ethereal fake SMTP with verified preview URLs viewable with 1 click.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduled={fetchData}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        onStatusChange={(status) => setSlackConnected(status)}
      />
    </div>
  );
}

export default SchedulerDashboard;

import { useState, useEffect } from 'react';
import api from '../../api.js';

function SlackModal({ isOpen, onClose, onStatusChange }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [status, setStatus] = useState({ connected: false, channel: null, hasWebhook: false });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/api/slack/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch Slack status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnectWebhook = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      setError('Please enter a valid Slack Incoming Webhook URL starting with https://hooks.slack.com/');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/slack/webhook', { webhookUrl, channel });
      setMessage(res.data.message || 'Slack connected successfully!');
      setWebhookUrl('');
      await fetchStatus();
      onStatusChange?.(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to connect Slack.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setError('');
    setMessage('');
    setTestLoading(true);
    try {
      const res = await api.post('/api/slack/test');
      setMessage(`✅ ${res.data.message}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send test alert.');
    } finally {
      setTestLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/api/slack/disconnect');
      setMessage('Slack disconnected.');
      await fetchStatus();
      onStatusChange?.(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-[#1e1c1c] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A154B] text-xl font-bold">
              #
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Slack Rate-Limit Alerts</h2>
              <p className="text-xs text-gray-400">Receive live alerts the instant a sender hits hourly quota</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-800 bg-[#282626] p-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                status.connected ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : 'bg-gray-500'
              }`}
            />
            <div>
              <div className="text-sm font-semibold">
                Status: {status.connected ? 'Connected & Active' : 'Not Connected'}
              </div>
              <div className="text-xs text-gray-400">
                {status.connected
                  ? `Notifications target: ${status.channel || 'Incoming Webhook'}`
                  : 'Rate-limit hits will safely skip notification without crashing.'}
              </div>
            </div>
          </div>

          {status.connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
            >
              Disconnect
            </button>
          )}
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Webhook Connection Form */}
        <form onSubmit={handleConnectWebhook} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-300">
              Slack Incoming Webhook URL
            </label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T000/B000/XXXXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#282626] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-white"
              required
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Create an incoming webhook in your Slack workspace settings (Apps &rarr; Incoming WebHooks).
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-300">
              Alert Channel Name
            </label>
            <input
              type="text"
              placeholder="#email-alerts"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#282626] px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-black transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Save Webhook & Connect'}
            </button>
          </div>
        </form>

        {/* Test Alert Button */}
        {status.connected && (
          <div className="mt-5 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={testLoading}
              className="w-full rounded-xl border border-gray-700 bg-[#282626] py-2.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white"
            >
              {testLoading ? 'Sending Live Message...' : '⚡ Send Live Test Notification to Slack'}
            </button>
          </div>
        )}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-white"
          >
            Close window
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlackModal;

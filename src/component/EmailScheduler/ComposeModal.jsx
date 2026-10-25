import { useState } from 'react';
import api from '../../api.js';

function ComposeModal({ isOpen, onClose, onScheduled }) {
  const [sender, setSender] = useState('growth@reachinbox.ai');
  const [customSender, setCustomSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [recipientsList, setRecipientsList] = useState([]);
  const [startTimeType, setStartTimeType] = useState('now');
  const [customStartTime, setCustomStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2); // default 2s min delay
  const [hourlyLimit, setHourlyLimit] = useState(50); // default 50 emails/hr
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  // Extract valid email addresses from text / CSV
  const parseEmails = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    // Deduplicate
    return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  };

  // Handle CSV / text file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const found = parseEmails(content);
        setRecipientsList(found);
        setRecipientsInput(found.join(', '));
      }
    };
    reader.readAsText(file);
  };

  // Handle manual typing/pasting of email leads
  const handleManualRecipientsChange = (e) => {
    const val = e.target.value;
    setRecipientsInput(val);
    setRecipientsList(parseEmails(val));
  };

  // Quick preset loaders for load test demonstrations
  const loadPreset = (count) => {
    const sampleDomains = ['techcorp.com', 'growthlabs.io', 'reachinbox.ai', 'outboxlabs.com', 'startup.co'];
    const generated = [];
    for (let i = 1; i <= count; i++) {
      const domain = sampleDomains[i % sampleDomains.length];
      generated.push(`lead${i}_test@${domain}`);
    }
    setRecipientsList(generated);
    setRecipientsInput(generated.join(', '));
    setSubject(`ReachInbox Outreach Campaign - Batch ${count} Leads`);
    setBody(`Hi there!\n\nThis is a verified test email sent via ReachInbox's BullMQ persistent queue scheduler using Ethereal fake SMTP.\n\nBest regards,\nReachInbox Growth Team`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const effectiveSender = sender === 'custom' ? customSender.trim() : sender;
    if (!effectiveSender) {
      setError('Please select or specify a valid sender email.');
      return;
    }

    if (recipientsList.length === 0) {
      setError('Please provide at least one recipient email address or upload a CSV file.');
      return;
    }

    if (!subject.trim()) {
      setError('Subject cannot be empty.');
      return;
    }

    if (!body.trim()) {
      setError('Email body cannot be empty.');
      return;
    }

    let calculatedStartTime = null;
    if (startTimeType === 'custom' && customStartTime) {
      calculatedStartTime = new Date(customStartTime).toISOString();
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/emails/schedule', {
        sender: effectiveSender,
        recipients: recipientsList,
        subject: subject.trim(),
        body: body.trim(),
        startTime: calculatedStartTime,
        delayBetweenEmails: Number(delayBetweenEmails),
        hourlyLimit: Number(hourlyLimit),
      });

      console.log('Scheduled response:', response.data);
      onScheduled?.(response.data);
      onClose();
    } catch (err) {
      console.error('Schedule failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to schedule emails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-[#1e1c1c] p-6 text-white shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Compose & Schedule Email</h2>
            <p className="mt-1 text-sm text-gray-400">
              Configure persistent BullMQ delayed queue, provider throttling, and rate limits.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Sender Selection */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-200">
              Sender Email (Multi-Sender Support)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#282626] px-4 py-2.5 text-sm text-white outline-none focus:border-white"
              >
                <option value="growth@reachinbox.ai">growth@reachinbox.ai (Primary)</option>
                <option value="outreach@acme.com">outreach@acme.com (Enterprise)</option>
                <option value="sales@reachinbox.ai">sales@reachinbox.ai (Inbound)</option>
                <option value="custom">Custom sender address...</option>
              </select>

              {sender === 'custom' && (
                <input
                  type="email"
                  placeholder="e.g. founder@mycompany.com"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-[#282626] px-4 py-2.5 text-sm text-white outline-none focus:border-white"
                  required
                />
              )}
            </div>
          </div>

          {/* Lead CSV/Text File Upload */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-200">
                Email Leads (CSV / TXT upload or manual list)
              </label>
              {recipientsList.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                  ✓ {recipientsList.length} lead{recipientsList.length === 1 ? '' : 's'} detected
                </span>
              )}
            </div>

            {/* Drag & Drop / File Input */}
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-700 bg-[#282626]/60 p-4 text-center">
              <input
                type="file"
                id="csvUpload"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="csvUpload"
                className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white"
              >
                📁 Click to upload <span className="underline">Leads CSV or Text file</span>
              </label>
              {fileName && <p className="text-xs text-gray-400">Loaded file: {fileName}</p>}

              {/* Demo Load Presets */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-400">Quick Test Presets:</span>
                <button
                  type="button"
                  onClick={() => loadPreset(5)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/20 hover:text-white"
                >
                  +5 Leads
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset(25)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/20 hover:text-white"
                >
                  +25 Leads
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset(100)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/20 hover:text-white"
                >
                  +100 Leads (Stress Demo)
                </button>
              </div>
            </div>

            {/* Manual Textarea */}
            <textarea
              rows={3}
              placeholder="Or paste comma/line-separated emails (e.g. alex@acme.com, sarah@corp.com)"
              value={recipientsInput}
              onChange={handleManualRecipientsChange}
              className="mt-2 w-full rounded-xl border border-gray-700 bg-[#282626] p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-white"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-200">
              Subject Line
            </label>
            <input
              type="text"
              placeholder="e.g. Scaling outbound outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#282626] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-200">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Write your email content here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-[#282626] p-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white"
              required
            />
          </div>

          {/* Scheduling & Throttling Controls */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-800 bg-[#242222] p-4 sm:grid-cols-3">
            {/* Start Time */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Start Time
              </label>
              <select
                value={startTimeType}
                onChange={(e) => setStartTimeType(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#282626] px-2.5 py-1.5 text-xs text-white outline-none"
              >
                <option value="now">Immediate (Now)</option>
                <option value="custom">Schedule For Later</option>
              </select>

              {startTimeType === 'custom' && (
                <input
                  type="datetime-local"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-700 bg-[#282626] px-2 py-1 text-xs text-white outline-none"
                  required
                />
              )}
            </div>

            {/* Delay between each email */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Delay Between Sends
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="3600"
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#282626] px-2.5 py-1.5 text-xs text-white outline-none"
                />
                <span className="text-xs text-gray-400">seconds</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Provider throttling (min 2s recommended)</p>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Hourly Limit
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#282626] px-2.5 py-1.5 text-xs text-white outline-none"
                />
                <span className="text-xs text-gray-400">/ hour</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Reschedules on limit hit</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black shadow-lg transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
                  Scheduling Jobs...
                </>
              ) : (
                <>
                  Schedule {recipientsList.length > 0 ? `${recipientsList.length} Emails` : 'Email'}
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComposeModal;

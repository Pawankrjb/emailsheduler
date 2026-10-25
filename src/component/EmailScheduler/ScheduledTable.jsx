function ScheduledTable({ emails, loading, onCancel, onComposeClick }) {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl">
          ⏱️
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">No Scheduled Emails</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          You don't have any emails currently waiting in the BullMQ queue. Compose a new email or load a batch of leads to begin.
        </p>
        <button
          type="button"
          onClick={onComposeClick}
          className="mt-5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black shadow-md transition hover:bg-gray-200"
        >
          Compose New Email →
        </button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delayed_rate_limited':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Rate-Limited (Rescheduled)
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-spin" />
            Processing
          </span>
        );
      case 'scheduled':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Queued (Delayed)
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="border-b border-gray-800 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
          <tr>
            <th className="px-6 py-4 font-semibold">Recipient Lead</th>
            <th className="px-6 py-4 font-semibold">Sender</th>
            <th className="px-6 py-4 font-semibold">Subject</th>
            <th className="px-6 py-4 font-semibold">Scheduled For</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {emails.map((item) => (
            <tr key={item.id} className="transition hover:bg-white/[0.02]">
              <td className="px-6 py-4">
                <div className="font-semibold text-white">{item.recipient}</div>
                <div className="text-[11px] text-gray-500">ID: {item.id}</div>
              </td>
              <td className="px-6 py-4 text-xs text-gray-400">{item.sender}</td>
              <td className="px-6 py-4">
                <div className="max-w-xs truncate text-xs font-medium text-gray-200">
                  {item.subject}
                </div>
                {item.error_message && (
                  <div className="mt-1 max-w-xs truncate text-[11px] text-amber-400">
                    ℹ️ {item.error_message}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-xs text-gray-300">
                {new Date(item.scheduled_at).toLocaleString()}
                <div className="text-[10px] text-gray-500">
                  Delay: {item.delay_ms / 1000}s • Limit: {item.hourly_limit}/hr
                </div>
              </td>
              <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onCancel(item.id)}
                  className="rounded-lg border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 hover:border-red-500/40"
                  title="Remove from queue"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScheduledTable;

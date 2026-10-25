function SentTable({ emails, loading, onComposeClick }) {
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
          ✉️
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">No Sent Emails Yet</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          Once your scheduled emails are delivered through fake SMTP (Ethereal Email), they will appear here along with verifiable preview links.
        </p>
        <button
          type="button"
          onClick={onComposeClick}
          className="mt-5 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black shadow-md transition hover:bg-gray-200"
        >
          Compose & Send Now →
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="border-b border-gray-800 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
          <tr>
            <th className="px-6 py-4 font-semibold">Recipient</th>
            <th className="px-6 py-4 font-semibold">Sender</th>
            <th className="px-6 py-4 font-semibold">Subject</th>
            <th className="px-6 py-4 font-semibold">Delivered At</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Ethereal Preview</th>
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
                  <div className="mt-1 max-w-xs truncate text-[11px] text-red-400">
                    ❌ {item.error_message}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-xs text-gray-300">
                {item.sent_at ? new Date(item.sent_at).toLocaleString() : 'N/A'}
              </td>
              <td className="px-6 py-4">
                {item.status === 'sent' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Delivered (Sent)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Failed
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {item.preview_url ? (
                  <a
                    href={item.preview_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/30 hover:text-white"
                  >
                    <span>View in Ethereal</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">No URL</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SentTable;

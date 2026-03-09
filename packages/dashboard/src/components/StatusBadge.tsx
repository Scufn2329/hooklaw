const STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  async: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  sync: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  enabled: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  disabled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}

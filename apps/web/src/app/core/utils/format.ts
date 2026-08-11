export function money(value: number | string | null | undefined, currency = 'USD'): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function moneyExact(value: number | string | null | undefined, currency = 'USD'): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-success/15 text-success',
    paid: 'bg-success/15 text-success',
    completed: 'bg-success/15 text-success',
    lead: 'bg-sky-400/15 text-sky-300',
    planned: 'bg-sky-400/15 text-sky-300',
    draft: 'bg-muted/20 text-muted',
    sent: 'bg-primary/15 text-primary',
    overdue: 'bg-danger/15 text-danger',
    cancelled: 'bg-muted/20 text-muted',
    archived: 'bg-muted/20 text-muted',
    on_hold: 'bg-warn/15 text-warn',
  };
  return map[status] ?? 'bg-elevated text-muted';
}

export function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary } from '../../core/models/models';
import { labelize, money, shortDate, statusClass } from '../../core/utils/format';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">Overview</p>
        <h1 class="font-display text-3xl font-semibold tracking-tight">Business pulse</h1>
        <p class="mt-1 text-sm text-muted">
          Cashflow, pipeline, and clients at a glance
          @if (data()?.dbSource) {
            <span class="ml-2 rounded-full bg-elevated px-2 py-0.5 text-xs">
              DB: {{ data()?.dbSource === 'neon' ? 'Neon Postgres' : 'PGLite (local)' }}
            </span>
          }
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a routerLink="/app/invoices" class="btn-secondary">New invoice</a>
        <a routerLink="/app/clients" class="btn-primary">Add client</a>
      </div>
    </div>

    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="card h-28 animate-pulse bg-elevated/40"></div>
        }
      </div>
    } @else if (error()) {
      <div class="card border-danger/30 p-6 text-danger">{{ error() }}</div>
    } @else if (data()) {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (kpi of kpis(data()!); track kpi.label) {
          <div class="card p-5">
            <div class="text-xs font-semibold uppercase tracking-wide text-muted">{{ kpi.label }}</div>
            <div class="mt-2 font-display text-3xl font-semibold" [ngClass]="kpi.tone">{{ kpi.value }}</div>
            <div class="mt-1 text-xs text-muted">{{ kpi.hint }}</div>
          </div>
        }
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-5">
        <div class="card p-5 xl:col-span-3">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-lg font-semibold">Paid revenue</h2>
            <span class="text-xs text-muted">Last 12 months</span>
          </div>
          <div class="h-64">
            <canvas #revenueChart></canvas>
          </div>
        </div>

        <div class="card p-5 xl:col-span-2">
          <h2 class="mb-4 font-display text-lg font-semibold">Invoice status</h2>
          <div class="mx-auto h-56 max-w-xs">
            <canvas #statusChart></canvas>
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-lg font-semibold">Recent invoices</h2>
            <a routerLink="/app/invoices" class="text-sm font-semibold text-primary hover:underline">View all</a>
          </div>
          <div class="space-y-3">
            @for (inv of data()!.recentInvoices; track inv.id) {
              <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/30 px-3 py-3">
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ inv.number }} · {{ inv.client_name }}</div>
                  <div class="text-xs text-muted">Due {{ shortDate(inv.due_date) }}</div>
                </div>
                <div class="text-right">
                  <div class="font-semibold">{{ money(inv.total) }}</div>
                  <span class="badge mt-1" [ngClass]="statusClass(inv.status)">{{ labelize(inv.status) }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-sm text-muted">No invoices yet.</p>
            }
          </div>
        </div>

        <div class="card p-5">
          <h2 class="mb-4 font-display text-lg font-semibold">Top clients by revenue</h2>
          <div class="space-y-3">
            @for (c of data()!.topClients; track c.id; let i = $index) {
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {{ i + 1 }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">{{ c.name }}</div>
                  <div class="truncate text-xs text-muted">{{ c.company || 'Independent' }}</div>
                </div>
                <div class="font-semibold text-primary">{{ money(c.revenue) }}</div>
              </div>
            }
          </div>

          <h3 class="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Project pipeline</h3>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            @for (p of data()!.pipeline; track p.status) {
              <div class="rounded-xl border border-border bg-bg/40 px-3 py-2">
                <div class="text-xs text-muted">{{ labelize(p.status) }}</div>
                <div class="font-semibold">{{ p.count }} · {{ money(p.budget) }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  @ViewChild('revenueChart') revenueRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusRef?: ElementRef<HTMLCanvasElement>;

  data = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal('');
  private charts: Chart[] = [];
  private viewReady = false;

  readonly money = money;
  readonly shortDate = shortDate;
  readonly statusClass = statusClass;
  readonly labelize = labelize;

  ngAfterViewInit() {
    this.viewReady = true;
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        queueMicrotask(() => this.renderCharts(d));
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load dashboard');
      },
    });
  }

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
  }

  kpis(d: DashboardSummary) {
    return [
      { label: 'Paid YTD', value: money(d.kpis.paidYtd), hint: 'Collected revenue', tone: 'text-fg' },
      { label: 'Outstanding', value: money(d.kpis.outstanding), hint: 'Sent + overdue', tone: 'text-primary' },
      { label: 'Overdue', value: money(d.kpis.overdue), hint: 'Needs follow-up', tone: 'text-danger' },
      { label: 'Active projects', value: String(d.kpis.activeProjects), hint: 'In flight', tone: 'text-fg' },
      { label: 'Clients', value: String(d.kpis.clients), hint: 'Active + leads', tone: 'text-fg' },
      { label: 'Expenses MTD', value: money(d.kpis.expensesMtd), hint: 'This month', tone: 'text-warn' },
    ];
  }

  private renderCharts(d: DashboardSummary) {
    if (!this.viewReady) return;
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    if (this.revenueRef?.nativeElement) {
      this.charts.push(
        new Chart(this.revenueRef.nativeElement, {
          type: 'bar',
          data: {
            labels: d.revenueByMonth.map((r) => r.month),
            datasets: [
              {
                label: 'Paid',
                data: d.revenueByMonth.map((r) => Number(r.total)),
                backgroundColor: 'rgba(20, 184, 166, 0.75)',
                borderRadius: 8,
                maxBarThickness: 36,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#8b9bb0' }, grid: { display: false } },
              y: {
                ticks: {
                  color: '#8b9bb0',
                  callback: (v) => '$' + Number(v).toLocaleString(),
                },
                grid: { color: 'rgba(39,49,64,0.8)' },
              },
            },
          },
        }),
      );
    }

    if (this.statusRef?.nativeElement) {
      const colors: Record<string, string> = {
        draft: '#8b9bb0',
        sent: '#14b8a6',
        paid: '#34d399',
        overdue: '#f87171',
        cancelled: '#4b5563',
      };
      this.charts.push(
        new Chart(this.statusRef.nativeElement, {
          type: 'doughnut',
          data: {
            labels: d.invoicesByStatus.map((s) => labelize(s.status)),
            datasets: [
              {
                data: d.invoicesByStatus.map((s) => Number(s.count)),
                backgroundColor: d.invoicesByStatus.map((s) => colors[s.status] || '#8b9bb0'),
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#8b9bb0', boxWidth: 12, padding: 14 },
              },
            },
            cutout: '68%',
          },
        }),
      );
    }
  }
}

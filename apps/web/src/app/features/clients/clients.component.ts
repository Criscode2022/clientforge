import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Client } from '../../core/models/models';
import { labelize, money, statusClass } from '../../core/utils/format';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">CRM</p>
        <h1 class="font-display text-3xl font-semibold">Clients</h1>
        <p class="mt-1 text-sm text-muted">Relationships, pipeline status, and revenue</p>
      </div>
      <button type="button" class="btn-primary" (click)="openCreate()">Add client</button>
    </div>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row">
      <input class="input sm:max-w-xs" placeholder="Search name, company, email…" [(ngModel)]="q" (ngModelChange)="reload()" />
      <select class="input sm:max-w-[160px]" [(ngModel)]="status" (ngModelChange)="reload()">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="lead">Lead</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    @if (error()) {
      <div class="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{{ error() }}</div>
    }

    <div class="table-wrap card">
      <table class="data">
        <thead>
          <tr>
            <th>Client</th>
            <th>Status</th>
            <th>Projects</th>
            <th>Revenue</th>
            <th>Contact</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (c of clients(); track c.id) {
            <tr>
              <td>
                <div class="font-medium">{{ c.name }}</div>
                <div class="text-xs text-muted">{{ c.company || '—' }}</div>
              </td>
              <td><span class="badge" [ngClass]="statusClass(c.status)">{{ labelize(c.status) }}</span></td>
              <td>{{ c.project_count ?? 0 }}</td>
              <td class="font-medium text-primary">{{ money(c.revenue) }}</td>
              <td>
                <div class="text-sm">{{ c.email || '—' }}</div>
                <div class="text-xs text-muted">{{ c.phone || '' }}</div>
              </td>
              <td class="text-right">
                <button type="button" class="btn-ghost px-2 text-sm" (click)="openEdit(c)">Edit</button>
                <button type="button" class="btn-ghost px-2 text-sm text-danger" (click)="remove(c)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="py-10 text-center text-muted">No clients yet. Add your first relationship.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" (click)="showForm.set(false)">
        <div class="card w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="font-display text-xl font-semibold">{{ editingId ? 'Edit client' : 'New client' }}</h2>
          <form class="mt-4 space-y-3" (ngSubmit)="save()">
            <div>
              <label class="label">Name</label>
              <input class="input" [(ngModel)]="form.name" name="name" required />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Email</label>
                <input class="input" type="email" [(ngModel)]="form.email" name="email" />
              </div>
              <div>
                <label class="label">Phone</label>
                <input class="input" [(ngModel)]="form.phone" name="phone" />
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Company</label>
                <input class="input" [(ngModel)]="form.company" name="company" />
              </div>
              <div>
                <label class="label">Status</label>
                <select class="input" [(ngModel)]="form.status" name="status">
                  <option value="active">Active</option>
                  <option value="lead">Lead</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label class="label">Notes</label>
              <textarea class="input min-h-[88px]" [(ngModel)]="form.notes" name="notes"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" (click)="showForm.set(false)">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  clients = signal<Client[]>([]);
  showForm = signal(false);
  saving = signal(false);
  error = signal('');
  q = '';
  status = '';
  editingId: string | null = null;
  form = { name: '', email: '', phone: '', company: '', status: 'active', notes: '' };

  readonly money = money;
  readonly statusClass = statusClass;
  readonly labelize = labelize;

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.listClients(this.q || undefined, this.status || undefined).subscribe({
      next: (rows) => this.clients.set(rows),
      error: (err) => this.error.set(err?.error?.message || 'Failed to load clients'),
    });
  }

  openCreate() {
    this.editingId = null;
    this.form = { name: '', email: '', phone: '', company: '', status: 'active', notes: '' };
    this.showForm.set(true);
  }

  openEdit(c: Client) {
    this.editingId = c.id;
    this.form = {
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      status: c.status,
      notes: c.notes || '',
    };
    this.showForm.set(true);
  }

  save() {
    this.saving.set(true);
    const body = {
      name: this.form.name,
      email: this.form.email || undefined,
      phone: this.form.phone || undefined,
      company: this.form.company || undefined,
      status: this.form.status,
      notes: this.form.notes || undefined,
    };
    const req = this.editingId
      ? this.api.updateClient(this.editingId, body)
      : this.api.createClient(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Save failed');
      },
    });
  }

  remove(c: Client) {
    if (!confirm(`Delete ${c.name}? This removes related projects/invoices via cascade.`)) return;
    this.api.deleteClient(c.id).subscribe({
      next: () => this.reload(),
      error: (err) => this.error.set(err?.error?.message || 'Delete failed'),
    });
  }
}

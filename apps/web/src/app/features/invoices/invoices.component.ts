import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Client, Invoice, Project } from '../../core/models/models';
import { labelize, moneyExact, shortDate, statusClass } from '../../core/utils/format';

type ItemForm = { description: string; quantity: number; unitPrice: number };

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">Billing</p>
        <h1 class="font-display text-3xl font-semibold">Invoices</h1>
        <p class="mt-1 text-sm text-muted">Draft, send, collect — keep cashflow moving</p>
      </div>
      <button type="button" class="btn-primary" (click)="openCreate()">Create invoice</button>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      @for (s of statuses; track s.value) {
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
          [ngClass]="status === s.value ? 'bg-primary text-bg' : 'bg-elevated text-muted hover:text-fg'"
          (click)="status = s.value; reload()"
        >
          {{ s.label }}
        </button>
      }
    </div>

    <div class="table-wrap card">
      <table class="data">
        <thead>
          <tr>
            <th>Number</th>
            <th>Client</th>
            <th>Status</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (inv of invoices(); track inv.id) {
            <tr>
              <td class="font-medium">{{ inv.number }}</td>
              <td>
                <div>{{ inv.client_name }}</div>
                <div class="text-xs text-muted">{{ inv.project_name || '—' }}</div>
              </td>
              <td><span class="badge" [ngClass]="statusClass(inv.status)">{{ labelize(inv.status) }}</span></td>
              <td>{{ shortDate(inv.issue_date) }}</td>
              <td>{{ shortDate(inv.due_date) }}</td>
              <td class="font-semibold">{{ moneyExact(inv.total) }}</td>
              <td class="space-x-1 text-right">
                @if (inv.status !== 'paid') {
                  <button type="button" class="btn-ghost px-2 text-sm text-success" (click)="markPaid(inv)">Mark paid</button>
                }
                <button type="button" class="btn-ghost px-2 text-sm" (click)="openEdit(inv)">Edit</button>
                <button type="button" class="btn-ghost px-2 text-sm text-danger" (click)="remove(inv)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="py-10 text-center text-muted">No invoices for this filter.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" (click)="showForm.set(false)">
        <div class="card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" (click)="$event.stopPropagation()">
          <h2 class="font-display text-xl font-semibold">{{ editingId ? 'Edit invoice' : 'New invoice' }}</h2>
          <form class="mt-4 space-y-3" (ngSubmit)="save()">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Client</label>
                <select class="input" [(ngModel)]="form.clientId" name="clientId" required>
                  @for (c of clients(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">Project (optional)</label>
                <select class="input" [(ngModel)]="form.projectId" name="projectId">
                  <option value="">None</option>
                  @for (p of projects(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div>
                <label class="label">Status</label>
                <select class="input" [(ngModel)]="form.status" name="status">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label class="label">Issue date</label>
                <input class="input" type="date" [(ngModel)]="form.issueDate" name="issueDate" required />
              </div>
              <div>
                <label class="label">Due date</label>
                <input class="input" type="date" [(ngModel)]="form.dueDate" name="dueDate" required />
              </div>
            </div>
            <div>
              <label class="label">Tax rate %</label>
              <input class="input sm:max-w-[140px]" type="number" step="0.1" [(ngModel)]="form.taxRate" name="taxRate" />
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="label mb-0">Line items</label>
                <button type="button" class="btn-ghost text-sm" (click)="addItem()">+ Add line</button>
              </div>
              <div class="space-y-2">
                @for (item of form.items; track $index; let i = $index) {
                  <div class="grid gap-2 rounded-xl border border-border bg-bg/30 p-3 sm:grid-cols-12">
                    <input class="input sm:col-span-6" placeholder="Description" [(ngModel)]="item.description" [name]="'desc'+i" required />
                    <input class="input sm:col-span-2" type="number" placeholder="Qty" [(ngModel)]="item.quantity" [name]="'qty'+i" />
                    <input class="input sm:col-span-3" type="number" placeholder="Rate" [(ngModel)]="item.unitPrice" [name]="'price'+i" />
                    <button type="button" class="btn-ghost sm:col-span-1" (click)="removeItem(i)" [disabled]="form.items.length === 1">×</button>
                  </div>
                }
              </div>
              <div class="mt-3 text-right text-sm text-muted">
                Subtotal preview:
                <span class="font-semibold text-fg">{{ moneyExact(previewSubtotal()) }}</span>
                · Total:
                <span class="font-semibold text-primary">{{ moneyExact(previewTotal()) }}</span>
              </div>
            </div>

            <div>
              <label class="label">Notes</label>
              <textarea class="input min-h-[72px]" [(ngModel)]="form.notes" name="notes"></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" (click)="showForm.set(false)">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save invoice' }}</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class InvoicesComponent implements OnInit {
  private readonly api = inject(ApiService);
  invoices = signal<Invoice[]>([]);
  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  showForm = signal(false);
  saving = signal(false);
  status = '';
  editingId: string | null = null;

  statuses = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  form = {
    clientId: '',
    projectId: '',
    status: 'draft',
    issueDate: '',
    dueDate: '',
    taxRate: 0,
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }] as ItemForm[],
  };

  readonly moneyExact = moneyExact;
  readonly shortDate = shortDate;
  readonly statusClass = statusClass;
  readonly labelize = labelize;

  ngOnInit() {
    this.api.listClients().subscribe((c) => this.clients.set(c));
    this.api.listProjects().subscribe((p) => this.projects.set(p));
    this.reload();
  }

  reload() {
    this.api.listInvoices(this.status || undefined).subscribe((rows) => this.invoices.set(rows));
  }

  today() {
    return new Date().toISOString().slice(0, 10);
  }

  openCreate() {
    this.editingId = null;
    const t = this.today();
    this.form = {
      clientId: this.clients()[0]?.id || '',
      projectId: '',
      status: 'draft',
      issueDate: t,
      dueDate: t,
      taxRate: 0,
      notes: '',
      items: [{ description: 'Professional services', quantity: 1, unitPrice: 1000 }],
    };
    this.showForm.set(true);
  }

  openEdit(inv: Invoice) {
    this.api.getInvoice(inv.id).subscribe((full) => {
      this.editingId = full.id;
      this.form = {
        clientId: full.client_id,
        projectId: full.project_id || '',
        status: full.status,
        issueDate: String(full.issue_date).slice(0, 10),
        dueDate: String(full.due_date).slice(0, 10),
        taxRate: Number(full.tax_rate),
        notes: full.notes || '',
        items: (full.items || []).map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };
      if (!this.form.items.length) {
        this.form.items = [{ description: '', quantity: 1, unitPrice: 0 }];
      }
      this.showForm.set(true);
    });
  }

  addItem() {
    this.form.items.push({ description: '', quantity: 1, unitPrice: 0 });
  }

  removeItem(i: number) {
    this.form.items.splice(i, 1);
  }

  previewSubtotal() {
    return this.form.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  }

  previewTotal() {
    const sub = this.previewSubtotal();
    return sub + sub * (Number(this.form.taxRate) / 100);
  }

  save() {
    this.saving.set(true);
    const body = {
      clientId: this.form.clientId,
      projectId: this.form.projectId || undefined,
      status: this.form.status,
      issueDate: this.form.issueDate,
      dueDate: this.form.dueDate,
      taxRate: Number(this.form.taxRate),
      notes: this.form.notes || undefined,
      items: this.form.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
    };
    const req = this.editingId
      ? this.api.updateInvoice(this.editingId, body)
      : this.api.createInvoice(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  markPaid(inv: Invoice) {
    this.api.updateInvoice(inv.id, { status: 'paid' }).subscribe(() => this.reload());
  }

  remove(inv: Invoice) {
    if (!confirm(`Delete ${inv.number}?`)) return;
    this.api.deleteInvoice(inv.id).subscribe(() => this.reload());
  }
}

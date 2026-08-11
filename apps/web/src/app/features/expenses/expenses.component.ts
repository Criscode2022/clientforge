import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Expense, Project } from '../../core/models/models';
import { moneyExact, shortDate } from '../../core/utils/format';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">Costs</p>
        <h1 class="font-display text-3xl font-semibold">Expenses</h1>
        <p class="mt-1 text-sm text-muted">Track billable and operating costs</p>
      </div>
      <button type="button" class="btn-primary" (click)="openCreate()">Log expense</button>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <div class="card p-4">
        <div class="text-xs uppercase tracking-wide text-muted">Total</div>
        <div class="font-display text-2xl font-semibold">{{ moneyExact(total()) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs uppercase tracking-wide text-muted">Billable</div>
        <div class="font-display text-2xl font-semibold text-primary">{{ moneyExact(billable()) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs uppercase tracking-wide text-muted">Entries</div>
        <div class="font-display text-2xl font-semibold">{{ expenses().length }}</div>
      </div>
    </div>

    <div class="table-wrap card">
      <table class="data">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Project</th>
            <th>Billable</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (e of expenses(); track e.id) {
            <tr>
              <td>{{ shortDate(e.expense_date) }}</td>
              <td class="font-medium">{{ e.description }}</td>
              <td><span class="badge bg-elevated text-muted">{{ e.category }}</span></td>
              <td class="text-muted">{{ e.project_name || '—' }}</td>
              <td>
                <span class="badge" [ngClass]="e.billable ? 'bg-success/15 text-success' : 'bg-muted/20 text-muted'">
                  {{ e.billable ? 'Yes' : 'No' }}
                </span>
              </td>
              <td class="font-semibold">{{ moneyExact(e.amount) }}</td>
              <td class="text-right">
                <button type="button" class="btn-ghost px-2 text-sm text-danger" (click)="remove(e)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="py-10 text-center text-muted">No expenses logged.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" (click)="showForm.set(false)">
        <div class="card w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="font-display text-xl font-semibold">Log expense</h2>
          <form class="mt-4 space-y-3" (ngSubmit)="save()">
            <div>
              <label class="label">Description</label>
              <input class="input" [(ngModel)]="form.description" name="description" required />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Category</label>
                <select class="input" [(ngModel)]="form.category" name="category">
                  <option value="software">Software</option>
                  <option value="contractors">Contractors</option>
                  <option value="travel">Travel</option>
                  <option value="office">Office</option>
                  <option value="marketing">Marketing</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label class="label">Amount</label>
                <input class="input" type="number" step="0.01" [(ngModel)]="form.amount" name="amount" required />
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Date</label>
                <input class="input" type="date" [(ngModel)]="form.expenseDate" name="expenseDate" required />
              </div>
              <div>
                <label class="label">Project</label>
                <select class="input" [(ngModel)]="form.projectId" name="projectId">
                  <option value="">None</option>
                  @for (p of projects(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="form.billable" name="billable" class="h-4 w-4 rounded border-border" />
              Billable to client
            </label>
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
export class ExpensesComponent implements OnInit {
  private readonly api = inject(ApiService);
  expenses = signal<Expense[]>([]);
  projects = signal<Project[]>([]);
  showForm = signal(false);
  saving = signal(false);
  form = {
    description: '',
    category: 'general',
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
    projectId: '',
    billable: false,
  };

  readonly moneyExact = moneyExact;
  readonly shortDate = shortDate;

  ngOnInit() {
    this.api.listProjects().subscribe((p) => this.projects.set(p));
    this.reload();
  }

  reload() {
    this.api.listExpenses().subscribe((rows) => this.expenses.set(rows));
  }

  total() {
    return this.expenses().reduce((s, e) => s + Number(e.amount), 0);
  }

  billable() {
    return this.expenses()
      .filter((e) => e.billable)
      .reduce((s, e) => s + Number(e.amount), 0);
  }

  openCreate() {
    this.form = {
      description: '',
      category: 'general',
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
      projectId: '',
      billable: false,
    };
    this.showForm.set(true);
  }

  save() {
    this.saving.set(true);
    this.api
      .createExpense({
        description: this.form.description,
        category: this.form.category,
        amount: Number(this.form.amount),
        expenseDate: this.form.expenseDate,
        projectId: this.form.projectId || undefined,
        billable: this.form.billable,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  remove(e: Expense) {
    if (!confirm('Delete this expense?')) return;
    this.api.deleteExpense(e.id).subscribe(() => this.reload());
  }
}

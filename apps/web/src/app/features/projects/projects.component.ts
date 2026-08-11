import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Client, Project } from '../../core/models/models';
import { labelize, money, shortDate, statusClass } from '../../core/utils/format';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-primary">Delivery</p>
        <h1 class="font-display text-3xl font-semibold">Projects</h1>
        <p class="mt-1 text-sm text-muted">Pipeline, budgets, and due dates</p>
      </div>
      <button type="button" class="btn-primary" (click)="openCreate()">New project</button>
    </div>

    <div class="mb-4">
      <select class="input sm:max-w-[200px]" [(ngModel)]="status" (ngModelChange)="reload()">
        <option value="">All statuses</option>
        <option value="planned">Planned</option>
        <option value="active">Active</option>
        <option value="on_hold">On hold</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (p of projects(); track p.id) {
        <article class="card flex flex-col p-5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h2 class="font-semibold leading-snug">{{ p.name }}</h2>
              <p class="mt-1 text-xs text-muted">{{ p.client_name }} · {{ p.client_company || 'Client' }}</p>
            </div>
            <span class="badge shrink-0" [ngClass]="statusClass(p.status)">{{ labelize(p.status) }}</span>
          </div>
          <p class="mt-3 line-clamp-2 flex-1 text-sm text-muted">{{ p.description || 'No description' }}</p>
          <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-xl bg-bg/40 px-3 py-2">
              <div class="text-xs text-muted">Budget</div>
              <div class="font-semibold text-primary">{{ money(p.budget) }}</div>
            </div>
            <div class="rounded-xl bg-bg/40 px-3 py-2">
              <div class="text-xs text-muted">Due</div>
              <div class="font-semibold">{{ shortDate(p.due_date) }}</div>
            </div>
          </div>
          <div class="mt-4 flex gap-2">
            <button type="button" class="btn-secondary flex-1" (click)="openEdit(p)">Edit</button>
            <button type="button" class="btn-ghost text-danger" (click)="remove(p)">Delete</button>
          </div>
        </article>
      } @empty {
        <div class="card p-8 text-muted md:col-span-2 xl:col-span-3">No projects yet.</div>
      }
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" (click)="showForm.set(false)">
        <div class="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" (click)="$event.stopPropagation()">
          <h2 class="font-display text-xl font-semibold">{{ editingId ? 'Edit project' : 'New project' }}</h2>
          <form class="mt-4 space-y-3" (ngSubmit)="save()">
            <div>
              <label class="label">Client</label>
              <select class="input" [(ngModel)]="form.clientId" name="clientId" required>
                <option value="" disabled>Select client</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.name }} — {{ c.company || 'Independent' }}</option>
                }
              </select>
            </div>
            <div>
              <label class="label">Name</label>
              <input class="input" [(ngModel)]="form.name" name="name" required />
            </div>
            <div>
              <label class="label">Description</label>
              <textarea class="input min-h-[80px]" [(ngModel)]="form.description" name="description"></textarea>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Status</label>
                <select class="input" [(ngModel)]="form.status" name="status">
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label class="label">Budget</label>
                <input class="input" type="number" [(ngModel)]="form.budget" name="budget" />
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="label">Hourly rate</label>
                <input class="input" type="number" [(ngModel)]="form.hourlyRate" name="hourlyRate" />
              </div>
              <div>
                <label class="label">Due date</label>
                <input class="input" type="date" [(ngModel)]="form.dueDate" name="dueDate" />
              </div>
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
export class ProjectsComponent implements OnInit {
  private readonly api = inject(ApiService);
  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  showForm = signal(false);
  saving = signal(false);
  status = '';
  editingId: string | null = null;
  form = {
    clientId: '',
    name: '',
    description: '',
    status: 'planned',
    budget: 0,
    hourlyRate: 0,
    dueDate: '',
  };

  readonly money = money;
  readonly shortDate = shortDate;
  readonly statusClass = statusClass;
  readonly labelize = labelize;

  ngOnInit() {
    this.api.listClients().subscribe((c) => this.clients.set(c));
    this.reload();
  }

  reload() {
    this.api.listProjects(this.status || undefined).subscribe((rows) => this.projects.set(rows));
  }

  openCreate() {
    this.editingId = null;
    this.form = {
      clientId: this.clients()[0]?.id || '',
      name: '',
      description: '',
      status: 'planned',
      budget: 0,
      hourlyRate: 0,
      dueDate: '',
    };
    this.showForm.set(true);
  }

  openEdit(p: Project) {
    this.editingId = p.id;
    this.form = {
      clientId: p.client_id,
      name: p.name,
      description: p.description || '',
      status: p.status,
      budget: Number(p.budget),
      hourlyRate: Number(p.hourly_rate),
      dueDate: p.due_date ? String(p.due_date).slice(0, 10) : '',
    };
    this.showForm.set(true);
  }

  save() {
    this.saving.set(true);
    const body = {
      clientId: this.form.clientId,
      name: this.form.name,
      description: this.form.description || undefined,
      status: this.form.status,
      budget: Number(this.form.budget),
      hourlyRate: Number(this.form.hourlyRate),
      dueDate: this.form.dueDate || undefined,
    };
    const req = this.editingId
      ? this.api.updateProject(this.editingId, body)
      : this.api.createProject(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(p: Project) {
    if (!confirm(`Delete project “${p.name}”?`)) return;
    this.api.deleteProject(p.id).subscribe(() => this.reload());
  }
}

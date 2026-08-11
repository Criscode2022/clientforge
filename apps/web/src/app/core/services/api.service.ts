import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Client,
  DashboardSummary,
  Expense,
  Invoice,
  Project,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Dashboard
  dashboard() {
    return this.http.get<DashboardSummary>('/api/dashboard');
  }

  // Clients
  listClients(q?: string, status?: string) {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (status) params = params.set('status', status);
    return this.http.get<Client[]>('/api/clients', { params });
  }

  getClient(id: string) {
    return this.http.get<Client>(`/api/clients/${id}`);
  }

  createClient(body: Partial<Client> & { name: string }) {
    return this.http.post<Client>('/api/clients', body);
  }

  updateClient(id: string, body: Partial<Client>) {
    return this.http.patch<Client>(`/api/clients/${id}`, body);
  }

  deleteClient(id: string) {
    return this.http.delete(`/api/clients/${id}`);
  }

  // Projects
  listProjects(status?: string, clientId?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (clientId) params = params.set('clientId', clientId);
    return this.http.get<Project[]>('/api/projects', { params });
  }

  createProject(body: Record<string, unknown>) {
    return this.http.post<Project>('/api/projects', body);
  }

  updateProject(id: string, body: Record<string, unknown>) {
    return this.http.patch<Project>(`/api/projects/${id}`, body);
  }

  deleteProject(id: string) {
    return this.http.delete(`/api/projects/${id}`);
  }

  // Invoices
  listInvoices(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Invoice[]>('/api/invoices', { params });
  }

  getInvoice(id: string) {
    return this.http.get<Invoice>(`/api/invoices/${id}`);
  }

  createInvoice(body: Record<string, unknown>) {
    return this.http.post<Invoice>('/api/invoices', body);
  }

  updateInvoice(id: string, body: Record<string, unknown>) {
    return this.http.patch<Invoice>(`/api/invoices/${id}`, body);
  }

  deleteInvoice(id: string) {
    return this.http.delete(`/api/invoices/${id}`);
  }

  // Expenses
  listExpenses(category?: string) {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Expense[]>('/api/expenses', { params });
  }

  createExpense(body: Record<string, unknown>) {
    return this.http.post<Expense>('/api/expenses', body);
  }

  updateExpense(id: string, body: Record<string, unknown>) {
    return this.http.patch<Expense>(`/api/expenses/${id}`, body);
  }

  deleteExpense(id: string) {
    return this.http.delete(`/api/expenses/${id}`);
  }
}

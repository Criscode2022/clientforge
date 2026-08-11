export interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  status: 'active' | 'lead' | 'archived' | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_count?: number;
  revenue?: number;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled' | string;
  budget: number;
  hourly_rate: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_company?: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  project_id: string | null;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | string;
  issue_date: string;
  due_date: string;
  currency: string;
  notes: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  project_name?: string;
  items?: InvoiceItem[];
}

export interface Expense {
  id: string;
  user_id: string;
  project_id: string | null;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  billable: boolean;
  created_at: string;
  project_name?: string;
}

export interface DashboardSummary {
  kpis: {
    clients: number;
    activeProjects: number;
    outstanding: number;
    paidYtd: number;
    overdue: number;
    expensesMtd: number;
  };
  revenueByMonth: { month: string; total: number }[];
  invoicesByStatus: { status: string; count: number; total: number }[];
  topClients: { id: string; name: string; company: string | null; revenue: number }[];
  recentInvoices: Invoice[];
  pipeline: { status: string; count: number; budget: number }[];
  expenseBreakdown: { category: string; total: number }[];
  dbSource: 'neon' | 'pglite';
}

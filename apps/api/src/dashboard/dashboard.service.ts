import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async summary(userId: string) {
    const [kpis] = await this.db.query<{
      clients: number;
      active_projects: number;
      outstanding: number;
      paid_ytd: number;
      overdue: number;
      expenses_mtd: number;
    }>(
      `SELECT
        (SELECT COUNT(*)::int FROM clients WHERE user_id = $1 AND status != 'archived') AS clients,
        (SELECT COUNT(*)::int FROM projects WHERE user_id = $1 AND status = 'active') AS active_projects,
        (SELECT COALESCE(SUM(total),0)::float FROM invoices
          WHERE user_id = $1 AND status IN ('sent','overdue')) AS outstanding,
        (SELECT COALESCE(SUM(total),0)::float FROM invoices
          WHERE user_id = $1 AND status = 'paid'
            AND EXTRACT(YEAR FROM issue_date::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)) AS paid_ytd,
        (SELECT COALESCE(SUM(total),0)::float FROM invoices
          WHERE user_id = $1 AND status = 'overdue') AS overdue,
        (SELECT COALESCE(SUM(amount),0)::float FROM expenses
          WHERE user_id = $1
            AND EXTRACT(YEAR FROM expense_date::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM expense_date::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)) AS expenses_mtd
      `,
      [userId],
    );

    const revenueByMonth = await this.db.query<{ month: string; total: number }>(
      `SELECT TO_CHAR(issue_date::timestamp, 'YYYY-MM') AS month,
              COALESCE(SUM(total),0)::float AS total
       FROM invoices
       WHERE user_id = $1 AND status = 'paid'
         AND issue_date::timestamp >= (CURRENT_DATE - INTERVAL '11 months')
       GROUP BY 1
       ORDER BY 1`,
      [userId],
    );

    const invoicesByStatus = await this.db.query<{ status: string; count: number; total: number }>(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total
       FROM invoices WHERE user_id = $1
       GROUP BY status ORDER BY status`,
      [userId],
    );

    const topClients = await this.db.query<{
      id: string;
      name: string;
      company: string | null;
      revenue: number;
    }>(
      `SELECT c.id, c.name, c.company,
              COALESCE(SUM(i.total),0)::float AS revenue
       FROM clients c
       LEFT JOIN invoices i ON i.client_id = c.id AND i.status = 'paid'
       WHERE c.user_id = $1
       GROUP BY c.id, c.name, c.company
       ORDER BY revenue DESC
       LIMIT 5`,
      [userId],
    );

    const recentInvoices = await this.db.query(
      `SELECT i.id, i.number, i.status, i.total, i.due_date, i.issue_date,
              c.name AS client_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT 6`,
      [userId],
    );

    const pipeline = await this.db.query<{ status: string; count: number; budget: number }>(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(budget),0)::float AS budget
       FROM projects WHERE user_id = $1
       GROUP BY status ORDER BY status`,
      [userId],
    );

    const expenseBreakdown = await this.db.query<{ category: string; total: number }>(
      `SELECT category, COALESCE(SUM(amount),0)::float AS total
       FROM expenses WHERE user_id = $1
       GROUP BY category ORDER BY total DESC`,
      [userId],
    );

    return {
      kpis: {
        clients: Number(kpis?.clients ?? 0),
        activeProjects: Number(kpis?.active_projects ?? 0),
        outstanding: Number(kpis?.outstanding ?? 0),
        paidYtd: Number(kpis?.paid_ytd ?? 0),
        overdue: Number(kpis?.overdue ?? 0),
        expensesMtd: Number(kpis?.expenses_mtd ?? 0),
      },
      revenueByMonth,
      invoicesByStatus,
      topClients,
      recentInvoices,
      pipeline,
      expenseBreakdown,
      dbSource: this.db.source,
    };
  }
}

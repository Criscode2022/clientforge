import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool, type QueryResultRow } from 'pg';

type SqlClient = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: T[]; rowCount: number | null }>;
  end?: () => Promise<void>;
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private client!: SqlClient;
  private mode: 'neon' | 'pglite' = 'pglite';

  get source() {
    return this.mode;
  }

  async onModuleInit() {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl:
          databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech')
            ? { rejectUnauthorized: false }
            : undefined,
        max: 10,
      });
      this.client = pool;
      this.mode = 'neon';
      this.logger.log('Connected to Neon Postgres (DATABASE_URL)');
    } else {
      const { PGlite } = await import('@electric-sql/pglite');
      const pglite = new PGlite();
      this.client = {
        query: async <T extends QueryResultRow>(text: string, params: unknown[] = []) => {
          const result = await pglite.query<T>(text, params as never[]);
          return { rows: result.rows as T[], rowCount: result.rows.length };
        },
        end: async () => {
          await pglite.close();
        },
      };
      this.mode = 'pglite';
      this.logger.log('DATABASE_URL unset — using embedded PGLite (Neon-compatible)');
    }

    await this.migrate();
    await this.seedIfEmpty();
  }

  async onModuleDestroy() {
    if (this.client?.end) {
      await this.client.end();
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.client.query<T>(text, params);
    return result.rows.map((row) => this.normalize(row));
  }

  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  private normalize<T extends QueryResultRow>(row: T): T {
    const out: Record<string, unknown> = { ...row };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === 'bigint') {
        out[key] = Number(value);
      } else if (value instanceof Date) {
        out[key] = value.toISOString();
      } else if (
        typeof value === 'string' &&
        /^-?\d+(\.\d+)?$/.test(value) &&
        key.match(/(amount|total|subtotal|budget|rate|price|quantity|tax|revenue|count)/i)
      ) {
        const n = Number(value);
        if (!Number.isNaN(n)) out[key] = n;
      }
    }
    return out as T;
  }

  private async migrate() {
    const schemaPath = join(__dirname, 'schema.sql');
    let sql = readFileSync(schemaPath, 'utf8');
    // Strip full-line SQL comments without dropping statements that follow them
    sql = sql
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('--')) return '';
        return line;
      })
      .join('\n');

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await this.client.query(statement);
    }
    this.logger.log(`Schema migrated (${statements.length} statements)`);
  }

  private async seedIfEmpty() {
    const existing = await this.queryOne<{ count: string | number }>(
      'SELECT COUNT(*)::int AS count FROM users',
    );
    const count = Number(existing?.count ?? 0);
    if (count > 0) return;

    const bcrypt = await import('bcrypt');
    const { v4: uuid } = await import('uuid');

    const demoUserId = uuid();
    const passwordHash = await bcrypt.hash('demo1234', 10);
    await this.client.query(
      `INSERT INTO users (id, email, password_hash, name, company)
       VALUES ($1, $2, $3, $4, $5)`,
      [demoUserId, 'demo@clientforge.app', passwordHash, 'Alex Rivera', 'Rivera Studio'],
    );

    const clients = [
      {
        id: uuid(),
        name: 'Maya Chen',
        email: 'maya@northwind.io',
        company: 'Northwind Labs',
        phone: '+1 415-555-0142',
        status: 'active',
        notes: 'Series A startup — prefers bi-weekly check-ins.',
      },
      {
        id: uuid(),
        name: 'Jordan Blake',
        email: 'jordan@harborco.com',
        company: 'Harbor & Co',
        phone: '+1 212-555-0198',
        status: 'active',
        notes: 'Agency retainer for brand design systems.',
      },
      {
        id: uuid(),
        name: 'Sam Okonkwo',
        email: 'sam@leafhealth.app',
        company: 'Leaf Health',
        phone: '+44 20 7946 0958',
        status: 'lead',
        notes: 'Warm lead from Product Hunt — needs MVP by Q4.',
      },
      {
        id: uuid(),
        name: 'Priya Nair',
        email: 'priya@orbitpay.dev',
        company: 'OrbitPay',
        phone: '+1 650-555-0110',
        status: 'active',
        notes: 'Fintech compliance-heavy. Strict SLAs.',
      },
    ];

    for (const c of clients) {
      await this.client.query(
        `INSERT INTO clients (id, user_id, name, email, company, phone, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [c.id, demoUserId, c.name, c.email, c.company, c.phone, c.status, c.notes],
      );
    }

    const projects = [
      {
        id: uuid(),
        client_id: clients[0].id,
        name: 'Customer Portal Redesign',
        description: 'Rebuild authenticated portal with design system and analytics.',
        status: 'active',
        budget: 28000,
        hourly_rate: 140,
        start_date: '2026-05-01',
        due_date: '2026-09-15',
      },
      {
        id: uuid(),
        client_id: clients[1].id,
        name: 'Brand System Retainer',
        description: 'Ongoing design system maintenance and component library.',
        status: 'active',
        budget: 12000,
        hourly_rate: 125,
        start_date: '2026-01-15',
        due_date: '2026-12-31',
      },
      {
        id: uuid(),
        client_id: clients[3].id,
        name: 'KYC Onboarding Flow',
        description: 'End-to-end KYC wizard with document OCR and risk scoring.',
        status: 'planned',
        budget: 45000,
        hourly_rate: 160,
        start_date: '2026-08-20',
        due_date: '2026-11-30',
      },
      {
        id: uuid(),
        client_id: clients[0].id,
        name: 'Mobile App Shell',
        description: 'React Native shell + push notifications.',
        status: 'completed',
        budget: 18000,
        hourly_rate: 140,
        start_date: '2026-01-10',
        due_date: '2026-04-30',
      },
      {
        id: uuid(),
        client_id: clients[2].id,
        name: 'Leaf Health MVP',
        description: 'Patient intake + clinician dashboard MVP.',
        status: 'on_hold',
        budget: 32000,
        hourly_rate: 145,
        start_date: '2026-07-01',
        due_date: '2026-10-15',
      },
    ];

    for (const p of projects) {
      await this.client.query(
        `INSERT INTO projects
          (id, user_id, client_id, name, description, status, budget, hourly_rate, start_date, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          p.id,
          demoUserId,
          p.client_id,
          p.name,
          p.description,
          p.status,
          p.budget,
          p.hourly_rate,
          p.start_date,
          p.due_date,
        ],
      );
    }

    const invoicesSeed = [
      {
        id: uuid(),
        client_id: clients[0].id,
        project_id: projects[0].id,
        number: 'INV-2026-001',
        status: 'paid',
        issue_date: '2026-05-31',
        due_date: '2026-06-14',
        tax_rate: 8.5,
        items: [
          { description: 'UX research & wireframes', quantity: 40, unit_price: 140 },
          { description: 'Design system foundations', quantity: 24, unit_price: 140 },
        ],
      },
      {
        id: uuid(),
        client_id: clients[0].id,
        project_id: projects[0].id,
        number: 'INV-2026-004',
        status: 'sent',
        issue_date: '2026-07-31',
        due_date: '2026-08-14',
        tax_rate: 8.5,
        items: [
          { description: 'Portal engineering sprint', quantity: 60, unit_price: 140 },
          { description: 'QA & accessibility audit', quantity: 12, unit_price: 140 },
        ],
      },
      {
        id: uuid(),
        client_id: clients[1].id,
        project_id: projects[1].id,
        number: 'INV-2026-002',
        status: 'paid',
        issue_date: '2026-06-30',
        due_date: '2026-07-15',
        tax_rate: 0,
        items: [{ description: 'June retainer — brand system', quantity: 1, unit_price: 4000 }],
      },
      {
        id: uuid(),
        client_id: clients[1].id,
        project_id: projects[1].id,
        number: 'INV-2026-005',
        status: 'overdue',
        issue_date: '2026-07-15',
        due_date: '2026-07-30',
        tax_rate: 0,
        items: [{ description: 'July retainer — brand system', quantity: 1, unit_price: 4000 }],
      },
      {
        id: uuid(),
        client_id: clients[3].id,
        project_id: projects[2].id,
        number: 'INV-2026-003',
        status: 'draft',
        issue_date: '2026-08-01',
        due_date: '2026-08-15',
        tax_rate: 0,
        items: [
          { description: 'Discovery workshop', quantity: 16, unit_price: 160 },
          { description: 'Architecture blueprint', quantity: 20, unit_price: 160 },
        ],
      },
      {
        id: uuid(),
        client_id: clients[0].id,
        project_id: projects[3].id,
        number: 'INV-2026-000',
        status: 'paid',
        issue_date: '2026-04-30',
        due_date: '2026-05-14',
        tax_rate: 8.5,
        items: [{ description: 'Mobile app shell delivery', quantity: 1, unit_price: 18000 }],
      },
    ];

    for (const inv of invoicesSeed) {
      let subtotal = 0;
      const itemRows: {
        id: string;
        description: string;
        quantity: number;
        unit_price: number;
        amount: number;
        sort: number;
      }[] = [];
      inv.items.forEach((item, idx) => {
        const amount = item.quantity * item.unit_price;
        subtotal += amount;
        itemRows.push({
          id: uuid(),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount,
          sort: idx,
        });
      });
      const taxAmount = Math.round(subtotal * (inv.tax_rate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;
      const paidAt = inv.status === 'paid' ? `${inv.due_date}T12:00:00.000Z` : null;

      await this.client.query(
        `INSERT INTO invoices
          (id, user_id, client_id, project_id, number, status, issue_date, due_date,
           currency, tax_rate, subtotal, tax_amount, total, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'USD',$9,$10,$11,$12,$13)`,
        [
          inv.id,
          demoUserId,
          inv.client_id,
          inv.project_id,
          inv.number,
          inv.status,
          inv.issue_date,
          inv.due_date,
          inv.tax_rate,
          subtotal,
          taxAmount,
          total,
          paidAt,
        ],
      );

      for (const row of itemRows) {
        await this.client.query(
          `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [row.id, inv.id, row.description, row.quantity, row.unit_price, row.amount, row.sort],
        );
      }
    }

    const expenses = [
      {
        project_id: projects[0].id,
        category: 'software',
        description: 'Figma organization seats',
        amount: 180,
        expense_date: '2026-06-01',
        billable: true,
      },
      {
        project_id: projects[0].id,
        category: 'software',
        description: 'Vercel Pro',
        amount: 20,
        expense_date: '2026-07-01',
        billable: true,
      },
      {
        project_id: projects[2].id,
        category: 'travel',
        description: 'Client workshop flights',
        amount: 640,
        expense_date: '2026-07-20',
        billable: true,
      },
      {
        project_id: null,
        category: 'office',
        description: 'Coworking membership',
        amount: 350,
        expense_date: '2026-07-01',
        billable: false,
      },
      {
        project_id: projects[1].id,
        category: 'contractors',
        description: 'Illustrator contractor',
        amount: 1200,
        expense_date: '2026-06-15',
        billable: true,
      },
      {
        project_id: null,
        category: 'marketing',
        description: 'Portfolio site domain + hosting',
        amount: 48,
        expense_date: '2026-05-10',
        billable: false,
      },
      {
        project_id: projects[3].id,
        category: 'software',
        description: 'Expo EAS build credits',
        amount: 99,
        expense_date: '2026-03-12',
        billable: true,
      },
    ];

    for (const e of expenses) {
      await this.client.query(
        `INSERT INTO expenses (id, user_id, project_id, category, description, amount, expense_date, billable)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuid(),
          demoUserId,
          e.project_id,
          e.category,
          e.description,
          e.amount,
          e.expense_date,
          e.billable,
        ],
      );
    }

    this.logger.log('Seeded demo workspace (demo@clientforge.app / demo1234)');
  }
}

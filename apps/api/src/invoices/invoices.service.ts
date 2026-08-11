import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

type InvoiceRow = {
  id: string;
  status: string;
  paid_at: string | null;
  tax_rate: number;
  [key: string]: unknown;
};

@Injectable()
export class InvoicesService {
  constructor(private readonly db: DatabaseService) {}

  list(userId: string, status?: string) {
    const params: unknown[] = [userId];
    let sql = `
      SELECT i.*,
        c.name AS client_name,
        c.company AS client_company,
        p.name AS project_name
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.user_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }
    sql += ' ORDER BY i.issue_date DESC, i.created_at DESC';
    return this.db.query(sql, params);
  }

  async get(userId: string, id: string) {
    const invoice = await this.db.queryOne<InvoiceRow>(
      `SELECT i.*,
        c.name AS client_name,
        c.company AS client_company,
        c.email AS client_email,
        p.name AS project_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN projects p ON p.id = i.project_id
       WHERE i.id = $1 AND i.user_id = $2`,
      [id, userId],
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    const items = await this.db.query(
      `SELECT id, description, quantity, unit_price AS "unitPrice", amount, sort_order AS "sortOrder"
       FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order`,
      [id],
    );
    return { ...invoice, items };
  }

  private async nextNumber(userId: string) {
    const row = await this.db.queryOne<{ max: string | null }>(
      `SELECT MAX(number) AS max FROM invoices WHERE user_id = $1 AND number LIKE 'INV-%'`,
      [userId],
    );
    const year = new Date().getFullYear();
    if (!row?.max) return `INV-${year}-001`;
    const match = String(row.max).match(/INV-\d{4}-(\d+)/);
    const n = match ? Number(match[1]) + 1 : 1;
    return `INV-${year}-${String(n).padStart(3, '0')}`;
  }

  private totals(items: { quantity: number; unitPrice: number }[], taxRate: number) {
    const subtotal =
      Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return { subtotal, taxAmount, total };
  }

  async create(userId: string, dto: CreateInvoiceDto) {
    const client = await this.db.queryOne(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [dto.clientId, userId],
    );
    if (!client) throw new NotFoundException('Client not found');

    const id = uuid();
    const number = dto.number || (await this.nextNumber(userId));
    const taxRate = dto.taxRate ?? 0;
    const { subtotal, taxAmount, total } = this.totals(
      dto.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      taxRate,
    );
    const status = dto.status ?? 'draft';
    const paidAt = status === 'paid' ? new Date().toISOString() : null;

    await this.db.query(
      `INSERT INTO invoices
        (id, user_id, client_id, project_id, number, status, issue_date, due_date,
         currency, notes, tax_rate, subtotal, tax_amount, total, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        userId,
        dto.clientId,
        dto.projectId ?? null,
        number,
        status,
        dto.issueDate,
        dto.dueDate,
        dto.currency ?? 'USD',
        dto.notes ?? null,
        taxRate,
        subtotal,
        taxAmount,
        total,
        paidAt,
      ],
    );

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
      await this.db.query(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uuid(), id, item.description, item.quantity, item.unitPrice, amount, i],
      );
    }

    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.get(userId, id);

    const status = dto.status ?? existing.status;
    let paidAt = existing.paid_at;
    if (status === 'paid' && !paidAt) paidAt = new Date().toISOString();
    if (status !== 'paid') paidAt = null;

    await this.db.query(
      `UPDATE invoices SET
        client_id = COALESCE($3, client_id),
        project_id = COALESCE($4, project_id),
        status = COALESCE($5, status),
        issue_date = COALESCE($6, issue_date),
        due_date = COALESCE($7, due_date),
        notes = COALESCE($8, notes),
        tax_rate = COALESCE($9, tax_rate),
        paid_at = $10,
        updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [
        id,
        userId,
        dto.clientId ?? null,
        dto.projectId === undefined ? null : dto.projectId,
        dto.status ?? null,
        dto.issueDate ?? null,
        dto.dueDate ?? null,
        dto.notes ?? null,
        dto.taxRate ?? null,
        paidAt,
      ],
    );

    if (dto.projectId === null) {
      await this.db.query(
        'UPDATE invoices SET project_id = NULL WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
    }

    if (dto.items) {
      const taxRate = dto.taxRate ?? Number(existing.tax_rate);
      const { subtotal, taxAmount, total } = this.totals(
        dto.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
        taxRate,
      );
      await this.db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
        await this.db.query(
          `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [uuid(), id, item.description, item.quantity, item.unitPrice, amount, i],
        );
      }
      await this.db.query(
        `UPDATE invoices SET subtotal = $3, tax_amount = $4, total = $5, tax_rate = $6 WHERE id = $1 AND user_id = $2`,
        [id, userId, subtotal, taxAmount, total, taxRate],
      );
    }

    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);
    return { ok: true };
  }
}

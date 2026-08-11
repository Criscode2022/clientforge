import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly db: DatabaseService) {}

  list(userId: string, q?: string, status?: string) {
    const params: unknown[] = [userId];
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS project_count,
        (SELECT COALESCE(SUM(i.total),0)::float FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid') AS revenue
      FROM clients c
      WHERE c.user_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (c.name ILIKE $${params.length} OR c.company ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }
    sql += ' ORDER BY c.updated_at DESC';
    return this.db.query(sql, params);
  }

  async get(userId: string, id: string) {
    const client = await this.db.queryOne(
      `SELECT c.*,
        (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS project_count,
        (SELECT COALESCE(SUM(i.total),0)::float FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid') AS revenue
       FROM clients c WHERE c.id = $1 AND c.user_id = $2`,
      [id, userId],
    );
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(userId: string, dto: CreateClientDto) {
    const id = uuid();
    await this.db.query(
      `INSERT INTO clients (id, user_id, name, email, company, phone, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        userId,
        dto.name,
        dto.email ?? null,
        dto.company ?? null,
        dto.phone ?? null,
        dto.status ?? 'active',
        dto.notes ?? null,
      ],
    );
    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    await this.get(userId, id);
    await this.db.query(
      `UPDATE clients SET
        name = COALESCE($3, name),
        email = COALESCE($4, email),
        company = COALESCE($5, company),
        phone = COALESCE($6, phone),
        status = COALESCE($7, status),
        notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [
        id,
        userId,
        dto.name ?? null,
        dto.email ?? null,
        dto.company ?? null,
        dto.phone ?? null,
        dto.status ?? null,
        dto.notes ?? null,
      ],
    );
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [id, userId]);
    return { ok: true };
  }
}

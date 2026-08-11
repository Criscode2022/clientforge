import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  list(userId: string, status?: string, clientId?: string) {
    const params: unknown[] = [userId];
    let sql = `
      SELECT p.*,
        c.name AS client_name,
        c.company AS client_company
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.user_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }
    if (clientId) {
      params.push(clientId);
      sql += ` AND p.client_id = $${params.length}`;
    }
    sql += ' ORDER BY p.updated_at DESC';
    return this.db.query(sql, params);
  }

  async get(userId: string, id: string) {
    const project = await this.db.queryOne(
      `SELECT p.*, c.name AS client_name, c.company AS client_company
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.user_id = $2`,
      [id, userId],
    );
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const client = await this.db.queryOne(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [dto.clientId, userId],
    );
    if (!client) throw new NotFoundException('Client not found');

    const id = uuid();
    await this.db.query(
      `INSERT INTO projects
        (id, user_id, client_id, name, description, status, budget, hourly_rate, start_date, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        userId,
        dto.clientId,
        dto.name,
        dto.description ?? null,
        dto.status ?? 'planned',
        dto.budget ?? 0,
        dto.hourlyRate ?? 0,
        dto.startDate ?? null,
        dto.dueDate ?? null,
      ],
    );
    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.get(userId, id);
    if (dto.clientId) {
      const client = await this.db.queryOne(
        'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
        [dto.clientId, userId],
      );
      if (!client) throw new NotFoundException('Client not found');
    }
    await this.db.query(
      `UPDATE projects SET
        client_id = COALESCE($3, client_id),
        name = COALESCE($4, name),
        description = COALESCE($5, description),
        status = COALESCE($6, status),
        budget = COALESCE($7, budget),
        hourly_rate = COALESCE($8, hourly_rate),
        start_date = COALESCE($9, start_date),
        due_date = COALESCE($10, due_date),
        updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [
        id,
        userId,
        dto.clientId ?? null,
        dto.name ?? null,
        dto.description ?? null,
        dto.status ?? null,
        dto.budget ?? null,
        dto.hourlyRate ?? null,
        dto.startDate ?? null,
        dto.dueDate ?? null,
      ],
    );
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
    return { ok: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly db: DatabaseService) {}

  list(userId: string, category?: string) {
    const params: unknown[] = [userId];
    let sql = `
      SELECT e.*, p.name AS project_name
      FROM expenses e
      LEFT JOIN projects p ON p.id = e.project_id
      WHERE e.user_id = $1`;
    if (category) {
      params.push(category);
      sql += ` AND e.category = $${params.length}`;
    }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    return this.db.query(sql, params);
  }

  async get(userId: string, id: string) {
    const expense = await this.db.queryOne(
      `SELECT e.*, p.name AS project_name
       FROM expenses e
       LEFT JOIN projects p ON p.id = e.project_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [id, userId],
    );
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    if (dto.projectId) {
      const project = await this.db.queryOne(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [dto.projectId, userId],
      );
      if (!project) throw new NotFoundException('Project not found');
    }
    const id = uuid();
    await this.db.query(
      `INSERT INTO expenses (id, user_id, project_id, category, description, amount, expense_date, billable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        userId,
        dto.projectId ?? null,
        dto.category,
        dto.description,
        dto.amount,
        dto.expenseDate,
        dto.billable ?? false,
      ],
    );
    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.get(userId, id);
    await this.db.query(
      `UPDATE expenses SET
        project_id = COALESCE($3, project_id),
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        amount = COALESCE($6, amount),
        expense_date = COALESCE($7, expense_date),
        billable = COALESCE($8, billable)
       WHERE id = $1 AND user_id = $2`,
      [
        id,
        userId,
        dto.projectId === undefined ? null : dto.projectId,
        dto.category ?? null,
        dto.description ?? null,
        dto.amount ?? null,
        dto.expenseDate ?? null,
        dto.billable ?? null,
      ],
    );
    if (dto.projectId === null) {
      await this.db.query(
        'UPDATE expenses SET project_id = NULL WHERE id = $1 AND user_id = $2',
        [id, userId],
      );
    }
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    return { ok: true };
  }
}

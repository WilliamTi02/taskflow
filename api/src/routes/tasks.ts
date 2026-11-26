import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

type Status = 'todo' | 'doing' | 'done';
type Priority = 'low' | 'medium' | 'high';

type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  created_at: string;
};

const statusValues = ['todo', 'doing', 'done'] as const;
const priorityValues = ['low', 'medium', 'high'] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(120),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(statusValues).default('todo'),
  priority: z.enum(priorityValues).default('medium'),
  dueDate: z.string().regex(datePattern, 'Use AAAA-MM-DD').optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  dueDate: z.string().regex(datePattern).optional().nullable(),
});

const sortColumns: Record<string, string> = {
  created_at: 'created_at',
  title: 'title',
  due_date: 'due_date',
  priority: "CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END",
};

tasksRouter.get('/', (req: AuthedRequest, res) => {
  const status = String(req.query.status ?? '');
  const priority = String(req.query.priority ?? '');
  const q = String(req.query.q ?? '');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const order = String(req.query.order ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sort = sortColumns[String(req.query.sort ?? 'created_at')] ?? 'created_at';

  const conditions = ['user_id = ?'];
  const params: unknown[] = [req.userId];

  if (statusValues.includes(status as Status)) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (priorityValues.includes(priority as Priority)) {
    conditions.push('priority = ?');
    params.push(priority);
  }
  if (q) {
    conditions.push('title LIKE ?');
    params.push(`%${q}%`);
  }

  const where = conditions.join(' AND ');
  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM tasks WHERE ${where}`)
    .get(...params) as { total: number };

  const tasks = db.prepare(`
    SELECT id, title, description, status, priority, due_date, created_at
    FROM tasks
    WHERE ${where}
    ORDER BY ${sort} ${order}
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);

  res.json({ data: tasks, page, limit, total: totalRow.total });
});

tasksRouter.post('/', (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    return;
  }

  const { title, description = null, status, priority, dueDate = null } = parsed.data;
  const result = db.prepare(`
    INSERT INTO tasks (user_id, title, description, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.userId, title, description, status, priority, dueDate);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    title,
    description,
    status,
    priority,
    dueDate,
  });
});

tasksRouter.patch('/:id', (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos' });
    return;
  }

  const id = Number(req.params.id);
  const current = db.prepare(`
    SELECT id, title, description, status, priority, due_date FROM tasks
    WHERE id = ? AND user_id = ?
  `).get(id, req.userId) as Omit<TaskRow, 'created_at'> | undefined;

  if (!current) {
    res.status(404).json({ error: 'Tarefa não encontrada' });
    return;
  }

  const data = parsed.data;
  const title = data.title ?? current.title;
  const description = data.description !== undefined ? data.description : current.description;
  const status = data.status ?? current.status;
  const priority = data.priority ?? current.priority;
  const dueDate = data.dueDate !== undefined ? data.dueDate : current.due_date;

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?
    WHERE id = ? AND user_id = ?
  `).run(title, description, status, priority, dueDate, id, req.userId);

  res.json({ id, title, description, status, priority, dueDate });
});

tasksRouter.delete('/:id', (req: AuthedRequest, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.userId);

  if (!result.changes) {
    res.status(404).json({ error: 'Tarefa não encontrada' });
    return;
  }

  res.status(204).send();
});

import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { api } from './api';

type Status = 'todo' | 'doing' | 'done';
type Priority = 'low' | 'medium' | 'high';

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  created_at: string;
};

type TaskList = {
  data: Task[];
  page: number;
  limit: number;
  total: number;
};

const COLUMNS: Array<{ status: Status; label: string }> = [
  { status: 'todo', label: 'A fazer' },
  { status: 'doing', label: 'Em andamento' },
  { status: 'done', label: 'Concluído' },
];

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'baixa',
  medium: 'média',
  high: 'alta',
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token') ?? '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const limit = 10;

  useEffect(() => {
    if (!token) return;
    const query = new URLSearchParams({
      q: search,
      page: String(page),
      limit: String(limit),
      sort,
      order: 'desc',
    });
    api<TaskList>(`/api/tasks?${query.toString()}`)
      .then((result) => {
        setTasks(result.data);
        setTotal(result.total);
      })
      .catch((e: Error) => setError(e.message));
  }, [token, search, page, sort]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const path = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { name, email, password } : { email, password };
      const data = await api<{ token: string }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      localStorage.setItem('taskflow_token', data.token);
      setToken(data.token);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function logout() {
    localStorage.removeItem('taskflow_token');
    setToken('');
    setTasks([]);
  }

  async function refresh() {
    const query = new URLSearchParams({
      q: search,
      page: String(page),
      limit: String(limit),
      sort,
      order: 'desc',
    });
    const result = await api<TaskList>(`/api/tasks?${query.toString()}`);
    setTasks(result.data);
    setTotal(result.total);
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setError('');
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate || null,
        }),
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setPage(1);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function changeStatus(id: number, status: Status) {
    try {
      await api(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeTask(id: number) {
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, status: Status) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData('text/plain') || draggedId);
    if (id) void changeStatus(id, status);
    setDraggedId(null);
  }

  if (!token) {
    return (
      <main className="auth-page">
        <form className="card auth-card" onSubmit={handleAuth}>
          <h1>TaskFlow</h1>
          <p>Organize suas tarefas em um quadro kanban.</p>

          {isRegister && (
            <label>
              Nome
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          )}
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit">{isRegister ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" className="link" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Já tenho conta' : 'Criar conta'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="board-page">
      <header className="topbar">
        <div>
          <h1>TaskFlow</h1>
          <span>{total} tarefa(s) no total</span>
        </div>
        <div className="topbar-actions">
          <input
            placeholder="Buscar tarefa..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created_at">Mais recentes</option>
            <option value="priority">Prioridade</option>
            <option value="title">Título</option>
          </select>
          <button type="button" className="link" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <form className="card new-task" onSubmit={createTask}>
        <input
          placeholder="Título da tarefa"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="low">Prioridade baixa</option>
          <option value="medium">Prioridade média</option>
          <option value="high">Prioridade alta</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button type="submit">Adicionar</button>
      </form>

      <section className="columns">
        {COLUMNS.map((column) => (
          <div
            className="column"
            key={column.status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, column.status)}
          >
            <h2>{column.label}</h2>
            {tasks
              .filter((task) => task.status === column.status)
              .map((task) => (
                <article
                  className="card task"
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', String(task.id));
                    setDraggedId(task.id);
                  }}
                >
                  <strong>{task.title}</strong>
                  {task.description && <p>{task.description}</p>}
                  <div className="meta">
                    <span className={`badge ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                    {task.due_date && <span>até {task.due_date}</span>}
                  </div>
                  <div className="task-actions">
                    <select
                      value={task.status}
                      onChange={(e) => void changeStatus(task.id, e.target.value as Status)}
                    >
                      {COLUMNS.map((option) => (
                        <option key={option.status} value={option.status}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="danger" onClick={() => void removeTask(task.id)}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
          </div>
        ))}
      </section>

      <div className="pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>Página {page} de {Math.max(1, Math.ceil(total / limit))}</span>
        <button
          type="button"
          disabled={page * limit >= total}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </main>
  );
}

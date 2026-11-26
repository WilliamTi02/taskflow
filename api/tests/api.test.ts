import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'secret-de-teste';

const { app } = await import('../src/app.js');
const request = (await import('supertest')).default;

async function criarUsuario(prefixo: string) {
  const email = `${prefixo}${Date.now()}${Math.random().toString(36).slice(2, 6)}@teste.com`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dev Teste', email, password: 'senha123' })
    .expect(201);
  return { email, token: response.body.token as string };
}

test('health check responde', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.ok, true);
});

test('registro, login e CRUD de tarefas com autenticação', async () => {
  const { email, token } = await criarUsuario('crud');

  const logged = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'senha123' })
    .expect(200);
  assert.equal(logged.body.user.email, email);

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Estudar TypeScript', priority: 'high', status: 'todo' })
    .expect(201);
  const id = created.body.id;
  assert.equal(created.body.priority, 'high');

  const listed = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(listed.body.total, 1);
  assert.equal(listed.body.data.length, 1);

  await request(app)
    .patch(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'done' })
    .expect(200);

  const done = await request(app)
    .get('/api/tasks?status=done')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(done.body.data[0].status, 'done');

  await request(app)
    .delete(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);
});

test('login com senha errada é rejeitado', async () => {
  const { email } = await criarUsuario('loginerrado');
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'senha-errada' })
    .expect(401);
  assert.equal(response.body.error, 'E-mail ou senha incorretos');
});

test('usuário não acessa tarefas de outro usuário', async () => {
  const owner = await criarUsuario('dono');
  const other = await criarUsuario('outro');

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ title: 'Tarefa privada' })
    .expect(201);
  const id = created.body.id;

  await request(app)
    .patch(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${other.token}`)
    .send({ status: 'done' })
    .expect(404);

  await request(app)
    .delete(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${other.token}`)
    .expect(404);
});

test('filtro, busca, paginação e ordenação por prioridade', async () => {
  const { token } = await criarUsuario('filtro');

  for (const [title, priority] of [
    ['Baixa prioridade', 'low'],
    ['Alta prioridade', 'high'],
    ['Média prioridade', 'medium'],
  ] as const) {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, priority, status: 'todo' })
      .expect(201);
  }

  const page1 = await request(app)
    .get('/api/tasks?status=todo&sort=priority&order=desc&page=1&limit=2')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(page1.body.total, 3);
  assert.equal(page1.body.data.length, 2);
  assert.equal(page1.body.data[0].priority, 'high');

  const page2 = await request(app)
    .get('/api/tasks?status=todo&sort=priority&order=desc&page=2&limit=2')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(page2.body.data.length, 1);

  const searched = await request(app)
    .get('/api/tasks?q=Alta')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(searched.body.total, 1);
  assert.equal(searched.body.data[0].title, 'Alta prioridade');
});

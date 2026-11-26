# TaskFlow — Kanban Full Stack

Projeto de portfólio: quadro de tarefas com login, CRUD, filtros e API REST.

**Stack:** React + TypeScript (Vite) · Node.js + Express + TypeScript · SQLite (`node:sqlite`) · JWT · Zod · testes com `node:test`.

## O que já funciona

- Cadastro e login com senha criptografada (bcrypt) e token JWT.
- API REST: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `GET/POST/PATCH/DELETE /api/tasks`.
- Filtro por status e prioridade, busca por título (`?status=done&priority=high&q=react`).
- Paginação (10 por página) e ordenação por data, prioridade ou título.
- Prioridade (baixa/média/alta) e data de vencimento.
- Arrastar e soltar tarefas entre colunas no quadro kanban.
- Cada usuário vê apenas as próprias tarefas (isolamento por `user_id`).
- 5 testes automatizados da API.

## Como rodar

```bash
# API
cd api
npm install
cp .env.example .env      # no Windows: copy .env.example .env
npm run dev               # http://localhost:4000

# Front (em outro terminal)
cd web
npm install
npm run dev               # http://localhost:5173
```

Testes da API:

```bash
cd api
npm test
```

> Use Node 22.5+ (o `node:sqlite` é nativo, sem instalar pacotes nativos). Node 24 recomendado.

## Deploy (quando estiver pronto)

- Front: Vercel/Netlify — variável `VITE_API_URL` apontando para a API.
- API: Render/Railway/Fly.io — enviar `JWT_SECRET` e manter `DB_PATH` em disco persistente ou trocar por Postgres.
- No README do repositório, cole o link da demo no topo.

## Status e bullets do currículo

As tarefas principais já foram implementadas. Veja `TODO.md` para o que foi feito, o que ficou opcional e os bullets prontos para o currículo com números reais.

Para treinar a entrevista, leia `..\GUIA_ENTREVISTA.md` e responda em voz alta as perguntas deste projeto.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "eae.sqlite");
const DEFAULT_PROGRAM_TEMPLATE_PATH = path.join(ROOT_DIR, "default-program-data.js");
const ROLES = new Set(["Admin", "Dirigente"]);
const DEFAULT_USERS = [
  { name: "Admin EAE", email: "admin@eae.local", password: "123456", role: "Admin" },
  { name: "Dirigente EAE", email: "dirigente@eae.local", password: "123456", role: "Dirigente" },
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
initializeDatabase();

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, ?)
`);

const countUsersStmt = db.prepare(`
  SELECT COUNT(*) AS total
  FROM users
`);

const insertSession = db.prepare(`
  INSERT INTO sessions (token, user_id)
  VALUES (?, ?)
`);

const deleteSessionStmt = db.prepare(`
  DELETE FROM sessions
  WHERE token = ?
`);

const getUserById = db.prepare(`
  SELECT id, name, email, role, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE id = ?
`);

const getUserByEmail = db.prepare(`
  SELECT id, name, email, password_hash, role, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE email = ?
`);

const updateSeedUserStmt = db.prepare(`
  UPDATE users
  SET name = ?, password_hash = ?, role = ?
  WHERE email = ?
`);

const getUserByToken = db.prepare(`
  SELECT users.id, users.name, users.email, users.role,
         users.dirigente_nome, users.secretarios_json, users.telefone, users.whatsapp, users.contato_email
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.token = ?
`);

const listUsersStmt = db.prepare(`
  SELECT id, name, email, role, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  ORDER BY name COLLATE NOCASE
`);

const updateUserProfileStmt = db.prepare(`
  UPDATE users
  SET dirigente_nome = ?, secretarios_json = ?, telefone = ?, whatsapp = ?, contato_email = ?
  WHERE id = ?
`);

const updateUserRoleStmt = db.prepare(`
  UPDATE users
  SET role = ?
  WHERE id = ?
`);

const listTurmasStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  WHERE turmas.archived_at IS NULL
  ORDER BY turmas.nome COLLATE NOCASE
`);

const listArchivedTurmasStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  WHERE turmas.archived_at IS NOT NULL
  ORDER BY turmas.updated_at DESC, turmas.nome COLLATE NOCASE
`);

const listTurmasByOwnerStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  WHERE turmas.user_id = ? AND turmas.archived_at IS NULL
  ORDER BY turmas.nome COLLATE NOCASE
`);

const listArchivedTurmasByOwnerStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  WHERE turmas.user_id = ? AND turmas.archived_at IS NOT NULL
  ORDER BY turmas.updated_at DESC, turmas.nome COLLATE NOCASE
`);

const getTurmaByIdStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  WHERE turmas.id = ?
`);

const createTurmaStmt = db.prepare(`
  INSERT INTO turmas (
    user_id, nome, curso, modalidade, tipo, status, turno, professor, inicio, observacoes, horarios,
    alunos_json, dirigente_nome, secretarios_json, telefone, whatsapp, email, archived_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const updateTurmaStmt = db.prepare(`
  UPDATE turmas
  SET user_id = ?, nome = ?, curso = ?, modalidade = ?, tipo = ?, status = ?, turno = ?, professor = ?, inicio = ?,
      observacoes = ?, horarios = ?, alunos_json = ?, dirigente_nome = ?, secretarios_json = ?,
      telefone = ?, whatsapp = ?, email = ?, archived_at = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const archiveTurmaStmt = db.prepare(`
  UPDATE turmas
  SET archived_at = CURRENT_TIMESTAMP, status = 'arquivado', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const restoreTurmaStmt = db.prepare(`
  UPDATE turmas
  SET archived_at = NULL, status = 'ativo', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const deleteTurmaStmt = db.prepare(`
  DELETE FROM turmas
  WHERE id = ?
`);

const deleteProgramStmt = db.prepare(`
  DELETE FROM programs
  WHERE turma_id = ?
`);

const getProgramStmt = db.prepare(`
  SELECT id, turma_id, title, period, review, headers_json, rows_json, updated_at
  FROM programs
  WHERE turma_id = ?
`);

const upsertProgramStmt = db.prepare(`
  INSERT INTO programs (turma_id, title, period, review, headers_json, rows_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(turma_id) DO UPDATE SET
    title = excluded.title,
    period = excluded.period,
    review = excluded.review,
    headers_json = excluded.headers_json,
    rows_json = excluded.rows_json,
    updated_at = CURRENT_TIMESTAMP
`);

const cloneProgramStmt = db.prepare(`
  INSERT INTO programs (turma_id, title, period, review, headers_json, rows_json, updated_at)
  SELECT ?, title, period, review, headers_json, rows_json, CURRENT_TIMESTAMP
  FROM programs
  WHERE turma_id = ?
`);

ensureDefaultUsers();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(response, statusCode, { error: error.message || "Erro interno no servidor." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor disponível em http://${HOST}:${PORT}`);
});

async function handleApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readJsonBody(request);
    const name = requireField(body.name, "Informe o nome do usuário.");
    const email = normalizeEmail(body.email);
    const password = requireField(body.password, "Informe a senha.");

    if (password.length < 6) {
      sendJson(response, 400, { error: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    if (getUserByEmail.get(email)) {
      sendJson(response, 409, { error: "Já existe uma conta com este e-mail." });
      return;
    }

    const totalUsers = countUsersStmt.get().total;
    const requestedRole = normalizeRole(body.role, totalUsers === 0 ? "Admin" : "Dirigente");
    const passwordHash = hashPassword(password);
    const result = insertUser.run(name, email, passwordHash, requestedRole);
    const token = crypto.randomUUID();
    insertSession.run(token, result.lastInsertRowid);

    sendJson(response, 201, {
      token,
      user: mapUser(getUserById.get(result.lastInsertRowid)),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const password = requireField(body.password, "Informe a senha.");
    const user = getUserByEmail.get(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      sendJson(response, 401, { error: "E-mail ou senha inválidos." });
      return;
    }

    const token = crypto.randomUUID();
    insertSession.run(token, user.id);

    sendJson(response, 200, {
      token,
      user: mapUser(user),
    });
    return;
  }

  const session = authenticate(request);
  if (!session) {
    sendJson(response, 401, { error: "Sessão inválida ou ausente." });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const deleted = deleteSessionStmt.run(session.token);
    sendJson(response, 200, { success: deleted.changes > 0 });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    sendJson(response, 200, { user: mapUser(session) });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/profile") {
    const body = await readJsonBody(request);
    const profile = sanitizeUserProfile(body);
    updateUserProfileStmt.run(
      profile.dirigenteNome,
      JSON.stringify(profile.secretarios),
      profile.telefone,
      profile.whatsapp,
      profile.email,
      session.id
    );
    sendJson(response, 200, { user: mapUser(getUserById.get(session.id)) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users") {
    requireAdmin(session);
    sendJson(response, 200, { users: listUsersStmt.all().map(mapUser) });
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    requireAdmin(session);
    const userId = Number(userMatch[1]);
    const targetUser = getUserById.get(userId);

    if (!targetUser) {
      sendJson(response, 404, { error: "Usuário não encontrado." });
      return;
    }

    if (request.method === "PUT") {
      const body = await readJsonBody(request);
      const nextRole = normalizeRole(body.role, targetUser.role || "Dirigente");
      const adminUsers = listUsersStmt.all().filter((user) => normalizeRole(user.role, "Dirigente") === "Admin");
      const isRemovingLastAdmin =
        normalizeRole(targetUser.role, "Dirigente") === "Admin" &&
        nextRole !== "Admin" &&
        adminUsers.length <= 1;

      if (isRemovingLastAdmin) {
        sendJson(response, 409, { error: "É preciso manter ao menos um usuário Admin." });
        return;
      }

      updateUserRoleStmt.run(nextRole, userId);
      sendJson(response, 200, { user: mapUser(getUserById.get(userId)) });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/turmas") {
    const scope = url.searchParams.get("scope") === "archived" ? "archived" : "active";
    const turmas = listTurmasForSession(session, scope).map(mapTurma);
    sendJson(response, 200, { turmas });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/turmas") {
    const body = await readJsonBody(request);
    const payload = sanitizeTurma(body, session);
    const result = createTurmaStmt.run(
      payload.ownerUserId,
      payload.nome,
      payload.curso,
      payload.modalidade,
      payload.tipo,
      payload.status,
      payload.turno,
      payload.professor,
      payload.inicio,
      payload.observacoes,
      payload.horarios,
      JSON.stringify(payload.alunos),
      payload.dirigenteNome,
      JSON.stringify(payload.secretarios),
      payload.telefone,
      payload.whatsapp,
      payload.email,
      payload.archivedAt
    );

    if (payload.copyProgramFromTurmaId) {
      const sourceTurma = getTurmaOrFail(payload.copyProgramFromTurmaId);
      ensureTurmaAccess(session, sourceTurma);
      const sourceProgram = getProgramStmt.get(payload.copyProgramFromTurmaId);
      if (sourceProgram) {
        cloneProgramStmt.run(Number(result.lastInsertRowid), payload.copyProgramFromTurmaId);
      }
    }

    const turma = getTurmaOrFail(Number(result.lastInsertRowid));
    ensureTurmaAccess(session, turma);
    sendJson(response, 201, { turma: mapTurma(turma) });
    return;
  }

  const turmaMatch = url.pathname.match(/^\/api\/turmas\/(\d+)$/);
  if (turmaMatch) {
    const turmaId = Number(turmaMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);

    if (request.method === "GET") {
      const programRow = getProgramStmt.get(turmaId);
      sendJson(response, 200, {
        turma: mapTurma(turma),
        program: programRow ? mapProgram(programRow) : null,
      });
      return;
    }

    if (request.method === "PUT") {
      if (turma.archived_at) {
        sendJson(response, 409, { error: "Restaure a turma antes de editá-la." });
        return;
      }

      const body = await readJsonBody(request);
      const payload = sanitizeTurma(body, session, turma);
      updateTurmaStmt.run(
        payload.ownerUserId,
        payload.nome,
        payload.curso,
        payload.modalidade,
        payload.tipo,
        payload.status,
        payload.turno,
        payload.professor,
        payload.inicio,
        payload.observacoes,
        payload.horarios,
        JSON.stringify(payload.alunos),
        payload.dirigenteNome,
        JSON.stringify(payload.secretarios),
        payload.telefone,
        payload.whatsapp,
        payload.email,
        payload.archivedAt,
        turmaId
      );

      sendJson(response, 200, { turma: mapTurma(getTurmaOrFail(turmaId)) });
      return;
    }

    if (request.method === "DELETE") {
      if (!isAdmin(session)) {
        sendJson(response, 403, { error: "Somente Admin pode excluir definitivamente uma turma." });
        return;
      }

      deleteTurmaStmt.run(turmaId);
      sendJson(response, 200, { success: true });
      return;
    }
  }

  const archiveMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/archive$/);
  if (archiveMatch && request.method === "POST") {
    const turmaId = Number(archiveMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);

    const body = await readJsonBody(request);
    if (body.archived === false) {
      restoreTurmaStmt.run(turmaId);
    } else {
      archiveTurmaStmt.run(turmaId);
    }

    sendJson(response, 200, { turma: mapTurma(getTurmaOrFail(turmaId)) });
    return;
  }

  const programMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/program$/);
  if (programMatch && request.method === "PUT") {
    const turmaId = Number(programMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);

    if (turma.archived_at) {
      sendJson(response, 409, { error: "Restaure a turma antes de salvar o programa." });
      return;
    }

    const body = await readJsonBody(request);
    const program = sanitizeProgram(body);
    upsertProgramStmt.run(
      turmaId,
      program.meta.title,
      program.meta.startDate,
      program.meta.endDate,
      JSON.stringify(program.headers),
      JSON.stringify(program.rows)
    );

    writeDefaultProgramTemplate(program);

    sendJson(response, 200, { program: mapProgram(getProgramStmt.get(turmaId)) });
    return;
  }

  if (programMatch && request.method === "DELETE") {
    const turmaId = Number(programMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);

    if (turma.archived_at) {
      sendJson(response, 409, { error: "Restaure a turma antes de apagar o programa salvo." });
      return;
    }

    deleteProgramStmt.run(turmaId);
    sendJson(response, 200, { success: true });
    return;
  }

  sendJson(response, 404, { error: "Rota não encontrada." });
}

function initializeDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Dirigente',
      dirigente_nome TEXT,
      secretarios_json TEXT,
      telefone TEXT,
      whatsapp TEXT,
      contato_email TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      curso TEXT NOT NULL,
      modalidade TEXT NOT NULL DEFAULT 'presencial',
      tipo TEXT NOT NULL DEFAULT 'CB',
      status TEXT NOT NULL DEFAULT 'ativo',
      turno TEXT,
      professor TEXT,
      inicio TEXT,
      observacoes TEXT,
      horarios TEXT,
      alunos_json TEXT,
      dirigente_nome TEXT,
      secretarios_json TEXT,
      telefone TEXT,
      whatsapp TEXT,
      email TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL UNIQUE,
      title TEXT,
      period TEXT,
      review TEXT,
      headers_json TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE
    );
  `);

  ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'Dirigente'");
  ensureColumn("users", "dirigente_nome", "TEXT");
  ensureColumn("users", "secretarios_json", "TEXT");
  ensureColumn("users", "telefone", "TEXT");
  ensureColumn("users", "whatsapp", "TEXT");
  ensureColumn("users", "contato_email", "TEXT");
  ensureColumn("turmas", "archived_at", "TEXT");
  ensureColumn("turmas", "tipo", "TEXT NOT NULL DEFAULT 'CB'");
  ensureColumn("turmas", "modalidade", "TEXT NOT NULL DEFAULT 'presencial'");
  ensureColumn("turmas", "status", "TEXT NOT NULL DEFAULT 'ativo'");
  ensureColumn("turmas", "dirigente_nome", "TEXT");
  ensureColumn("turmas", "secretarios_json", "TEXT");
  ensureColumn("turmas", "telefone", "TEXT");
  ensureColumn("turmas", "whatsapp", "TEXT");
  ensureColumn("turmas", "email", "TEXT");
  ensureColumn("turmas", "horarios", "TEXT");
  ensureColumn("turmas", "alunos_json", "TEXT");
  db.exec(`
    UPDATE turmas
    SET status = CASE
      WHEN archived_at IS NOT NULL THEN 'arquivado'
      WHEN status IS NULL OR status = '' THEN 'ativo'
      ELSE status
    END
  `);
  db.exec(`
    UPDATE turmas
    SET tipo = 'CB'
    WHERE tipo IS NULL OR tipo = ''
  `);
  db.exec(`
    UPDATE turmas
    SET modalidade = 'presencial'
    WHERE modalidade IS NULL OR modalidade = ''
  `);
  db.exec(`
    UPDATE users
    SET role = 'Dirigente'
    WHERE role IS NULL OR role = '';
  `);
  db.exec(`
    UPDATE users
    SET
      dirigente_nome = COALESCE(
        NULLIF(dirigente_nome, ''),
        (
          SELECT NULLIF(turmas.dirigente_nome, '')
          FROM turmas
          WHERE turmas.user_id = users.id
            AND turmas.dirigente_nome IS NOT NULL
            AND turmas.dirigente_nome <> ''
          ORDER BY turmas.updated_at DESC
          LIMIT 1
        )
      ),
      secretarios_json = COALESCE(
        NULLIF(secretarios_json, ''),
        (
          SELECT NULLIF(turmas.secretarios_json, '')
          FROM turmas
          WHERE turmas.user_id = users.id
            AND turmas.secretarios_json IS NOT NULL
            AND turmas.secretarios_json <> ''
          ORDER BY turmas.updated_at DESC
          LIMIT 1
        )
      ),
      telefone = COALESCE(
        NULLIF(telefone, ''),
        (
          SELECT NULLIF(turmas.telefone, '')
          FROM turmas
          WHERE turmas.user_id = users.id
            AND turmas.telefone IS NOT NULL
            AND turmas.telefone <> ''
          ORDER BY turmas.updated_at DESC
          LIMIT 1
        )
      ),
      whatsapp = COALESCE(
        NULLIF(whatsapp, ''),
        (
          SELECT NULLIF(turmas.whatsapp, '')
          FROM turmas
          WHERE turmas.user_id = users.id
            AND turmas.whatsapp IS NOT NULL
            AND turmas.whatsapp <> ''
          ORDER BY turmas.updated_at DESC
          LIMIT 1
        )
      ),
      contato_email = COALESCE(
        NULLIF(contato_email, ''),
        (
          SELECT NULLIF(turmas.email, '')
          FROM turmas
          WHERE turmas.user_id = users.id
            AND turmas.email IS NOT NULL
            AND turmas.email <> ''
          ORDER BY turmas.updated_at DESC
          LIMIT 1
        )
      );
  `);
}

function ensureDefaultUsers() {
  DEFAULT_USERS.forEach((user) => {
    const existingUser = getUserByEmail.get(user.email);
    const passwordHash = hashPassword(user.password);

    if (existingUser) {
      updateSeedUserStmt.run(user.name, passwordHash, user.role, user.email);
      return;
    }

    insertUser.run(user.name, user.email, passwordHash, user.role);
  });
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function listTurmasForSession(session, scope) {
  if (isAdmin(session)) {
    return scope === "archived" ? listArchivedTurmasStmt.all() : listTurmasStmt.all();
  }

  return scope === "archived"
    ? listArchivedTurmasByOwnerStmt.all(session.id)
    : listTurmasByOwnerStmt.all(session.id);
}

function getTurmaOrFail(turmaId) {
  const turma = getTurmaByIdStmt.get(turmaId);
  if (!turma) {
    const error = new Error("Turma não encontrada.");
    error.statusCode = 404;
    throw error;
  }
  return turma;
}

function ensureTurmaAccess(session, turma) {
  if (isAdmin(session)) return;
  if (turma.user_id !== session.id) {
    const error = new Error("Você não tem permissão para acessar esta turma.");
    error.statusCode = 403;
    throw error;
  }
}

function requireAdmin(session) {
  if (!isAdmin(session)) {
    const error = new Error("Apenas usuários Admin podem executar esta ação.");
    error.statusCode = 403;
    throw error;
  }
}

function isAdmin(session) {
  return session.role === "Admin";
}

function serveStatic(pathname, response) {
  const routePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT_DIR, routePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(response, 403, "Acesso negado.");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Arquivo não encontrado.");
    return;
  }

  const extensions = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  const extension = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": extensions[extension] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(response);
}

function authenticate(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) return null;
  const user = getUserByToken.get(token);
  if (!user) return null;
  return { ...user, token };
}

function sanitizeTurma(body, session, existingTurma = null) {
  const ownerUserId = resolveOwnerUserId(body.ownerUserId, session, existingTurma);
  const copyProgramFromTurmaId = existingTurma ? null : normalizeOptionalId(body.copyProgramFromTurmaId);
  const status = normalizeTurmaStatus(body.status, existingTurma);
  return {
    ownerUserId,
    copyProgramFromTurmaId,
    nome: requireField(body.nome, "Informe o nome da turma."),
    curso: optionalText(body.curso) || existingTurma?.curso || optionalText(body.tipo) || "Sem segmento",
    modalidade: normalizeTurmaModalidade(body.modalidade, existingTurma),
    tipo: normalizeTurmaType(body.tipo, existingTurma),
    status,
    turno: existingTurma?.turno || optionalText(body.turno),
    professor: existingTurma?.professor || optionalText(body.professor),
    inicio: optionalText(body.inicio),
    observacoes: existingTurma?.observacoes || optionalText(body.observacoes),
    horarios: optionalText(body.horarioInicio) || optionalText(body.horarios),
    alunos: normalizeStudents(body.alunos),
    archivedAt: status === "arquivado"
      ? existingTurma?.archived_at || currentTimestamp()
      : null,
    dirigenteNome: optionalText(body.dirigenteNome),
    secretarios: normalizeSecretarios(body.secretarios),
    telefone: optionalText(body.telefone),
    whatsapp: optionalText(body.whatsapp),
    email: optionalText(body.email),
  };
}

function normalizeSecretarios(value) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map(normalizeSecretario)
    .filter((item) => item.nome || item.whatsapp || item.email);
}

function normalizeStudents(value) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item) => ({
      nome: optionalText(item?.nome),
      email: optionalText(item?.email),
      whatsapp: optionalText(item?.whatsapp),
    }))
    .filter((item) => item.nome);
}

function normalizeTurmaType(value, existingTurma) {
  const type = optionalText(value) || existingTurma?.tipo || "CB";
  if (["CB", "EAE", "LE"].includes(type)) {
    return type;
  }

  const error = new Error("Informe um tipo de turma válido.");
  error.statusCode = 400;
  throw error;
}

function normalizeTurmaModalidade(value, existingTurma) {
  const modalidade = optionalText(value).toLowerCase() || existingTurma?.modalidade || "presencial";
  if (["presencial", "online", "ead"].includes(modalidade)) {
    return modalidade;
  }

  const error = new Error("Informe uma modalidade válida.");
  error.statusCode = 400;
  throw error;
}

function normalizeTurmaStatus(value, existingTurma) {
  const status = optionalText(value) || existingTurma?.status || "ativo";
  if (["ativo", "rascunho", "arquivado"].includes(status)) {
    return status;
  }

  const error = new Error("Informe um status de turma válido.");
  error.statusCode = 400;
  throw error;
}

function sanitizeUserProfile(body) {
  return {
    dirigenteNome: optionalText(body.dirigenteNome),
    secretarios: normalizeSecretarios(body.secretarios),
    telefone: optionalText(body.telefone),
    whatsapp: optionalText(body.whatsapp),
    email: optionalText(body.email),
  };
}

function resolveOwnerUserId(rawOwnerUserId, session, existingTurma) {
  if (!isAdmin(session)) {
    return existingTurma ? existingTurma.user_id : session.id;
  }

  const candidate = Number(rawOwnerUserId || existingTurma?.user_id || session.id);
  const owner = getUserById.get(candidate);
  if (!owner) {
    const error = new Error("Usuário responsável não encontrado.");
    error.statusCode = 400;
    throw error;
  }
  return owner.id;
}

function sanitizeProgram(body) {
  const headers = Array.isArray(body.headers) ? body.headers.map((item) => String(item || "").trim()) : [];
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!headers.length) {
    const error = new Error("O programa precisa ter pelo menos uma coluna.");
    error.statusCode = 400;
    throw error;
  }

  return {
    meta: {
      title: optionalText(body.meta?.title) || "Programa da turma",
      startDate: optionalText(body.meta?.startDate),
      endDate: optionalText(body.meta?.endDate),
    },
    headers,
    rows: rows.map((row) => normalizeRow(row, headers.length)),
  };
}

function writeDefaultProgramTemplate(program) {
  const serialized = `window.DEFAULT_PROGRAM_TEMPLATE = ${JSON.stringify({
    meta: program.meta,
    headers: program.headers,
    rows: program.rows,
  })};\n`;

  fs.writeFileSync(DEFAULT_PROGRAM_TEMPLATE_PATH, serialized, "utf8");
}

function normalizeRow(row, length) {
  const values = Array.isArray(row) ? row : [];
  const normalized = values.map((item) => String(item ?? ""));
  while (normalized.length < length) {
    normalized.push("");
  }
  return normalized.slice(0, length);
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role, "Dirigente"),
    dirigenteNome: row.dirigente_nome || "",
    secretarios: parseSecretarios(row.secretarios_json),
    telefone: row.telefone || "",
    whatsapp: row.whatsapp || "",
    contatoEmail: row.contato_email || "",
  };
}

function mapTurma(row) {
  return {
    id: row.id,
    ownerUserId: row.user_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    nome: row.nome,
    curso: row.curso,
    modalidade: row.modalidade || "presencial",
    tipo: row.tipo || "CB",
    status: row.status || (row.archived_at ? "arquivado" : "ativo"),
    turno: row.turno || "",
    professor: row.professor || "",
    inicio: row.inicio || "",
    observacoes: row.observacoes || "",
    horarios: row.horarios || "",
    horarioInicio: row.horarios || "",
    alunos: row.alunos_json ? JSON.parse(row.alunos_json) : [],
    dirigenteNome: row.dirigente_nome || "",
    secretarios: parseSecretarios(row.secretarios_json),
    telefone: row.telefone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    archivedAt: row.archived_at || null,
    updatedAt: row.updated_at,
  };
}

function normalizeSecretario(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      nome: optionalText(value),
      whatsapp: "",
      email: "",
    };
  }

  return {
    nome: optionalText(value.nome || value.name),
    whatsapp: optionalText(value.whatsapp || value.mensageiro),
    email: optionalText(value.email),
  };
}

function parseSecretarios(serializedValue) {
  if (!serializedValue) {
    return [];
  }

  try {
    return normalizeSecretarios(JSON.parse(serializedValue));
  } catch {
    return [];
  }
}

function mapProgram(row) {
  return {
    id: row.id,
    meta: {
      title: row.title || "Programa da turma",
      startDate: row.period || "",
      endDate: row.review || "",
    },
    headers: JSON.parse(row.headers_json),
    rows: JSON.parse(row.rows_json),
    updatedAt: row.updated_at,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || "").split(":");
  if (!salt || !digest) return false;

  const candidate = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(digest, "hex");
  return known.length === candidate.length && crypto.timingSafeEqual(known, candidate);
}

function requireField(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function optionalText(value) {
  return String(value || "").trim();
}

function currentTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function normalizeEmail(value) {
  const email = requireField(value, "Informe o e-mail.");
  return email.toLowerCase();
}

function normalizeRole(value, fallback) {
  const candidate = String(value || "").trim();
  return ROLES.has(candidate) ? candidate : fallback;
}

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error("Identificador informado é inválido.");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    const parseError = new Error("JSON inválido na requisição.");
    parseError.statusCode = 400;
    throw parseError;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(text);
}

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const { DatabaseSync } = require("node:sqlite");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "eae.sqlite");
const SHARE_LINK_SECRET = process.env.SHARE_LINK_SECRET || "eae-share-dev-secret-change-me";
const ROLES = new Set(["Admin", "Dirigente", "Secretário", "Usuário", "Pendente"]);
const REQUESTED_ROLES = new Set(["Dirigente", "Secretário"]);
const ACCESS_STATUSES = new Set(["pending", "active", "rejected"]);
const DEFAULT_USERS = [
  { name: "Admin EAE", email: "admin@eae.local", password: "123456", role: "Admin", requestedRole: "Admin" },
  { name: "Dirigente EAE", email: "dirigente@eae.local", password: "123456", role: "Dirigente", requestedRole: "Dirigente" },
];
const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || "false").toLowerCase() === "true";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.MAIL_FROM || "no-reply@eae.local";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_PASS || "";
const SECRETARY_INVITE_EXPIRATION_HOURS = 48;
const SECRETARY_INVITE_RETENTION_DAYS = 30;
const SECRETARY_INVITE_MAINTENANCE_INTERVAL_MINUTES = 15;
const TURMA_ARCHIVE_RETENTION_DAYS = 30;
const smtpTransporter = EMAIL_ENABLED && SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
initializeDatabase();

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, requested_role, access_status)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertProfileRequestStmt = db.prepare(`
  INSERT INTO profile_requests (user_id, requested_role, status)
  VALUES (?, ?, 'pending')
`);

const countUsersStmt = db.prepare(`
  SELECT COUNT(*) AS total
  FROM users
`);

const insertSession = db.prepare(`
  INSERT INTO sessions (token, user_id)
  VALUES (?, ?)
`);

const insertPasswordResetTokenStmt = db.prepare(`
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (?, ?, ?)
`);

const getPasswordResetTokenByHashStmt = db.prepare(`
  SELECT id, user_id, token_hash, expires_at, used_at
  FROM password_reset_tokens
  WHERE token_hash = ?
`);

const usePasswordResetTokenStmt = db.prepare(`
  UPDATE password_reset_tokens
  SET used_at = CURRENT_TIMESTAMP
  WHERE id = ? AND used_at IS NULL
`);

const purgeExpiredPasswordResetTokensStmt = db.prepare(`
  DELETE FROM password_reset_tokens
  WHERE used_at IS NOT NULL
     OR expires_at < CURRENT_TIMESTAMP
`);

const deleteSessionStmt = db.prepare(`
  DELETE FROM sessions
  WHERE token = ?
`);

const getUserById = db.prepare(`
  SELECT id, name, email, role, requested_role, access_status, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE id = ?
`);

const getUserByEmail = db.prepare(`
  SELECT id, name, email, password_hash, role, requested_role, access_status, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE email = ?
`);

const updateSeedUserStmt = db.prepare(`
  UPDATE users
  SET name = ?, password_hash = ?, role = ?, requested_role = ?, access_status = 'active'
  WHERE email = ?
`);

const getUserByToken = db.prepare(`
  SELECT users.id, users.name, users.email, users.role, users.requested_role, users.access_status,
         users.dirigente_nome, users.secretarios_json, users.telefone, users.whatsapp, users.contato_email
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.token = ?
`);

const listUsersStmt = db.prepare(`
  SELECT id, name, email, role, requested_role, access_status, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  ORDER BY name COLLATE NOCASE
`);

const listPendingUsersStmt = db.prepare(`
  SELECT id, name, email, role, requested_role, access_status, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE access_status = 'pending'
  ORDER BY created_at, name COLLATE NOCASE
`);

const listPendingSecretaryUsersStmt = db.prepare(`
  SELECT id, name, email, role, requested_role, access_status, dirigente_nome, secretarios_json, telefone, whatsapp, contato_email
  FROM users
  WHERE access_status = 'pending'
    AND requested_role = 'Secretário'
    AND NOT EXISTS (
      SELECT 1
      FROM turma_members
      WHERE turma_members.user_id = users.id
        AND turma_members.status = 'active'
    )
  ORDER BY created_at, name COLLATE NOCASE
`);

const listAccessEventsStmt = db.prepare(`
  SELECT
    profile_requests.id,
    profile_requests.user_id,
    profile_requests.requested_role,
    profile_requests.status,
    profile_requests.created_at,
    profile_requests.decided_at,
    requester.name AS user_name,
    requester.email AS user_email,
    approver.name AS decided_by_name,
    approver.email AS decided_by_email
  FROM profile_requests
  JOIN users AS requester ON requester.id = profile_requests.user_id
  LEFT JOIN users AS approver ON approver.id = profile_requests.decided_by_user_id
  ORDER BY profile_requests.created_at DESC
`);

const listInviteEventsStmt = db.prepare(`
  SELECT
    turma_invites.id,
    turma_invites.turma_id,
    turma_invites.invited_user_id,
    turma_invites.invited_by_user_id,
    turma_invites.status,
    turma_invites.created_at,
    turma_invites.accepted_at,
    turmas.nome AS turma_nome,
    invited.name AS invited_user_name,
    invited.email AS invited_user_email,
    inviter.name AS invited_by_name,
    inviter.email AS invited_by_email
  FROM turma_invites
  JOIN turmas ON turmas.id = turma_invites.turma_id
  JOIN users AS invited ON invited.id = turma_invites.invited_user_id
  JOIN users AS inviter ON inviter.id = turma_invites.invited_by_user_id
  ORDER BY turma_invites.created_at DESC
`);

const listMyPendingInvitesStmt = db.prepare(`
  SELECT
    turma_invites.id,
    turma_invites.turma_id,
    turma_invites.invited_user_id,
    turma_invites.invited_by_user_id,
    turma_invites.status,
    turma_invites.created_at,
    turma_invites.accepted_at,
    turmas.nome AS turma_nome,
    invited.name AS invited_user_name,
    invited.email AS invited_user_email,
    inviter.name AS invited_by_name,
    inviter.email AS invited_by_email
  FROM turma_invites
  JOIN turmas ON turmas.id = turma_invites.turma_id
  JOIN users AS invited ON invited.id = turma_invites.invited_user_id
  JOIN users AS inviter ON inviter.id = turma_invites.invited_by_user_id
  WHERE turma_invites.invited_user_id = ? AND turma_invites.status = 'pending'
  ORDER BY turma_invites.created_at DESC
`);

const listDirigentesWithActiveTurmasStmt = db.prepare(`
  SELECT
    users.id AS dirigente_id,
    users.name AS dirigente_name,
    users.email AS dirigente_email,
    turmas.id AS turma_id,
    turmas.nome AS turma_nome,
    turmas.tipo AS turma_tipo,
    turmas.modalidade AS turma_modalidade,
    turmas.inicio AS turma_inicio
  FROM users
  JOIN turmas ON turmas.user_id = users.id
  WHERE users.role = 'Dirigente'
    AND users.access_status = 'active'
    AND turmas.archived_at IS NULL
  ORDER BY users.name COLLATE NOCASE, turmas.nome COLLATE NOCASE
`);

const insertTurmaLinkRequestStmt = db.prepare(`
  INSERT INTO turma_link_requests (requester_user_id, dirigente_user_id, turma_id, status)
  VALUES (?, ?, ?, 'pending')
`);

const getPendingTurmaLinkRequestByRequesterAndTurmaStmt = db.prepare(`
  SELECT id
  FROM turma_link_requests
  WHERE requester_user_id = ? AND turma_id = ? AND status = 'pending'
`);

const getTurmaLinkRequestByIdStmt = db.prepare(`
  SELECT id, requester_user_id, dirigente_user_id, turma_id, status
  FROM turma_link_requests
  WHERE id = ?
`);

const updateTurmaLinkRequestStatusStmt = db.prepare(`
  UPDATE turma_link_requests
  SET status = ?, decided_by_user_id = ?, decided_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const listMyTurmaLinkRequestsStmt = db.prepare(`
  SELECT
    turma_link_requests.id,
    turma_link_requests.status,
    turma_link_requests.created_at,
    turma_link_requests.decided_at,
    turma_link_requests.turma_id,
    turmas.nome AS turma_nome,
    turmas.tipo AS turma_tipo,
    dirigentes.name AS dirigente_name,
    dirigentes.email AS dirigente_email,
    decider.name AS decided_by_name
  FROM turma_link_requests
  JOIN turmas ON turmas.id = turma_link_requests.turma_id
  JOIN users AS dirigentes ON dirigentes.id = turma_link_requests.dirigente_user_id
  LEFT JOIN users AS decider ON decider.id = turma_link_requests.decided_by_user_id
  WHERE turma_link_requests.requester_user_id = ?
  ORDER BY turma_link_requests.created_at DESC
`);

const listReceivedTurmaLinkRequestsStmt = db.prepare(`
  SELECT
    turma_link_requests.id,
    turma_link_requests.status,
    turma_link_requests.created_at,
    turma_link_requests.decided_at,
    turma_link_requests.turma_id,
    turmas.nome AS turma_nome,
    turmas.tipo AS turma_tipo,
    requester.id AS requester_user_id,
    requester.name AS requester_name,
    requester.email AS requester_email,
    requester.requested_role AS requester_requested_role
  FROM turma_link_requests
  JOIN turmas ON turmas.id = turma_link_requests.turma_id
  JOIN users AS requester ON requester.id = turma_link_requests.requester_user_id
  WHERE turma_link_requests.status = 'pending'
    AND turmas.archived_at IS NULL
    AND turma_link_requests.dirigente_user_id = ?
  ORDER BY turma_link_requests.created_at DESC
`);

const listReceivedTurmaLinkRequestsForAdminStmt = db.prepare(`
  SELECT
    turma_link_requests.id,
    turma_link_requests.status,
    turma_link_requests.created_at,
    turma_link_requests.decided_at,
    turma_link_requests.turma_id,
    turmas.nome AS turma_nome,
    turmas.tipo AS turma_tipo,
    requester.id AS requester_user_id,
    requester.name AS requester_name,
    requester.email AS requester_email,
    requester.requested_role AS requester_requested_role
  FROM turma_link_requests
  JOIN turmas ON turmas.id = turma_link_requests.turma_id
  JOIN users AS requester ON requester.id = turma_link_requests.requester_user_id
  WHERE turma_link_requests.status = 'pending'
    AND turmas.archived_at IS NULL
  ORDER BY turma_link_requests.created_at DESC
`);

const updateUserProfileStmt = db.prepare(`
  UPDATE users
  SET dirigente_nome = ?, secretarios_json = ?, telefone = ?, whatsapp = ?, contato_email = ?
  WHERE id = ?
`);

const updateUserRoleStmt = db.prepare(`
  UPDATE users
  SET role = ?, requested_role = ?, access_status = ?
  WHERE id = ?
`);

const updateUserPasswordStmt = db.prepare(`
  UPDATE users
  SET password_hash = ?
  WHERE id = ?
`);

const updateLatestProfileRequestStmt = db.prepare(`
  UPDATE profile_requests
  SET status = ?, decided_by_user_id = ?, decided_at = CURRENT_TIMESTAMP
  WHERE id = (
    SELECT id
    FROM profile_requests
    WHERE user_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  )
`);

const insertProfileRequestDecisionStmt = db.prepare(`
  INSERT INTO profile_requests (user_id, requested_role, status, decided_by_user_id, decided_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
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

const listTurmasByAccessStmt = db.prepare(`
  SELECT DISTINCT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.student_signup_link_enabled, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  LEFT JOIN turma_members ON turma_members.turma_id = turmas.id
    AND turma_members.user_id = ?
    AND turma_members.status = 'active'
  WHERE (turmas.user_id = ? OR turma_members.user_id IS NOT NULL)
    AND turmas.archived_at IS NULL
  ORDER BY turmas.nome COLLATE NOCASE
`);

const listArchivedTurmasByAccessStmt = db.prepare(`
  SELECT DISTINCT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.student_signup_link_enabled, turmas.updated_at, turmas.archived_at,
         users.name AS owner_name, users.email AS owner_email
  FROM turmas
  JOIN users ON users.id = turmas.user_id
  LEFT JOIN turma_members ON turma_members.turma_id = turmas.id
    AND turma_members.user_id = ?
    AND turma_members.status = 'active'
  WHERE (turmas.user_id = ? OR turma_members.user_id IS NOT NULL)
    AND turmas.archived_at IS NOT NULL
  ORDER BY turmas.updated_at DESC, turmas.nome COLLATE NOCASE
`);

const getTurmaByIdStmt = db.prepare(`
  SELECT turmas.id, turmas.user_id, turmas.nome, turmas.curso, turmas.modalidade, turmas.tipo, turmas.status,
         turmas.turno, turmas.professor, turmas.inicio, turmas.observacoes, turmas.horarios,
         turmas.alunos_json, turmas.dirigente_nome, turmas.secretarios_json,
         turmas.telefone, turmas.whatsapp, turmas.email, turmas.student_signup_link_enabled, turmas.updated_at, turmas.archived_at,
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

const updateTurmaStudentsStmt = db.prepare(`
  UPDATE turmas
  SET alunos_json = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const updateTurmaStudentSignupLinkEnabledStmt = db.prepare(`
  UPDATE turmas
  SET student_signup_link_enabled = ?, updated_at = CURRENT_TIMESTAMP
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

const purgeArchivedTurmasStmt = db.prepare(`
  DELETE FROM turmas
  WHERE archived_at IS NOT NULL
    AND archived_at < datetime('now', ?)
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

const getTurmaMemberStmt = db.prepare(`
  SELECT id, turma_id, user_id, role, status
  FROM turma_members
  WHERE turma_id = ? AND user_id = ? AND status = 'active'
`);

const upsertTurmaMemberStmt = db.prepare(`
  INSERT INTO turma_members (turma_id, user_id, role, status, invited_by_user_id, updated_at)
  VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(turma_id, user_id) DO UPDATE SET
    role = excluded.role,
    status = 'active',
    invited_by_user_id = excluded.invited_by_user_id,
    updated_at = CURRENT_TIMESTAMP
`);

const insertTurmaInviteStmt = db.prepare(`
  INSERT INTO turma_invites (turma_id, invited_user_id, invited_by_user_id, status)
  VALUES (?, ?, ?, 'pending')
`);

const getTurmaInviteStmt = db.prepare(`
  SELECT id, turma_id, invited_user_id, invited_by_user_id, status
  FROM turma_invites
  WHERE id = ?
`);

const getPendingTurmaInviteByUserAndTurmaStmt = db.prepare(`
  SELECT id
  FROM turma_invites
  WHERE turma_id = ? AND invited_user_id = ? AND status = 'pending'
`);

const acceptTurmaInviteStmt = db.prepare(`
  UPDATE turma_invites
  SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const getPendingSecretaryInviteLinkByTurmaAndEmailStmt = db.prepare(`
  SELECT id, token
  FROM turma_secretary_invite_links
  WHERE turma_id = ? AND lower(invited_email) = lower(?) AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
`);

const getPendingSecretaryInviteLinkDetailsByTurmaAndEmailStmt = db.prepare(`
  SELECT id, invited_email, invited_name, token, expires_at
  FROM turma_secretary_invite_links
  WHERE turma_id = ? AND lower(invited_email) = lower(?) AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
`);

const getLatestSecretaryInviteStatusByTurmaAndEmailStmt = db.prepare(`
  SELECT status
  FROM turma_secretary_invite_links
  WHERE turma_id = ? AND lower(invited_email) = lower(?)
  ORDER BY created_at DESC
  LIMIT 1
`);

const listPendingSecretaryInviteLinksByTurmaStmt = db.prepare(`
  SELECT id, invited_email
  FROM turma_secretary_invite_links
  WHERE turma_id = ? AND status = 'pending'
`);

const insertSecretaryInviteLinkStmt = db.prepare(`
  INSERT INTO turma_secretary_invite_links (
    turma_id, invited_email, invited_name, invited_by_user_id, token, status, expires_at
  )
  VALUES (?, ?, ?, ?, ?, 'pending', ?)
`);

const getSecretaryInviteLinkByTokenStmt = db.prepare(`
  SELECT id, turma_id, invited_email, invited_name, invited_by_user_id, token, status, expires_at
  FROM turma_secretary_invite_links
  WHERE token = ?
`);

const acceptSecretaryInviteLinkStmt = db.prepare(`
  UPDATE turma_secretary_invite_links
  SET status = 'accepted', accepted_by_user_id = ?, accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const expireSecretaryInviteLinkStmt = db.prepare(`
  UPDATE turma_secretary_invite_links
  SET status = 'expired', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const cancelSecretaryInviteLinkStmt = db.prepare(`
  UPDATE turma_secretary_invite_links
  SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const expirePendingSecretaryInviteLinksStmt = db.prepare(`
  UPDATE turma_secretary_invite_links
  SET status = 'expired', updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending'
    AND (
      (expires_at IS NOT NULL AND expires_at <> '' AND expires_at < CURRENT_TIMESTAMP)
      OR lower(invited_email) NOT LIKE '%_@_%._%'
    )
`);

const getActiveTurmaMemberByEmailStmt = db.prepare(`
  SELECT users.id
  FROM turma_members
  JOIN users ON users.id = turma_members.user_id
  WHERE turma_members.turma_id = ?
    AND turma_members.status = 'active'
    AND lower(users.email) = lower(?)
  LIMIT 1
`);

const purgeOldSecretaryInviteLinksStmt = db.prepare(`
  DELETE FROM turma_secretary_invite_links
  WHERE status IN ('accepted', 'expired', 'cancelled')
    AND COALESCE(updated_at, created_at) < datetime('now', ?)
`);

ensureDefaultUsers();
runSecretaryInviteMaintenance();
runTurmaArchiveMaintenance();
setInterval(
  () => {
    runSecretaryInviteMaintenance();
    runTurmaArchiveMaintenance();
  },
  SECRETARY_INVITE_MAINTENANCE_INTERVAL_MINUTES * 60 * 1000
);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.match(/^\/public\/alunos\/[^/]+\/?$/)) {
      serveStatic("/public-alunos.html", response);
      return;
    }

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
  const publicProgramMatch = url.pathname.match(/^\/api\/public\/programa\/([^/]+)$/);
  if (publicProgramMatch && request.method === "GET") {
    const turmaId = resolvePublicProgramTurmaId(publicProgramMatch[1]);
    if (!turmaId) {
      sendJson(response, 404, { error: "Link de compartilhamento inválido." });
      return;
    }

    const turma = getTurmaByIdStmt.get(turmaId);
    if (!turma || turma.archived_at) {
      sendJson(response, 404, { error: "Turma não encontrada para este link." });
      return;
    }

    const programRow = getProgramStmt.get(turmaId);
    if (!programRow) {
      sendJson(response, 404, { error: "Programa não encontrado para esta turma." });
      return;
    }

    sendJson(response, 200, {
      turma: mapTurma(turma),
      program: mapProgram(programRow),
    });
    return;
  }

  const publicTurmaMatch = url.pathname.match(/^\/api\/public\/turma\/([^/]+)\/?$/);
  if (publicTurmaMatch && request.method === "GET") {
    const turmaId = resolvePublicProgramTurmaId(publicTurmaMatch[1]);
    if (!turmaId) {
      sendJson(response, 404, { error: "Link de compartilhamento inválido." });
      return;
    }

    const turma = getTurmaByIdStmt.get(turmaId);
    if (!turma || turma.archived_at) {
      sendJson(response, 404, { error: "Turma não encontrada para este link." });
      return;
    }
    if (Number(turma.student_signup_link_enabled) === 0) {
      sendJson(response, 403, { error: "O link de cadastro desta turma está temporariamente desativado." });
      return;
    }

    sendJson(response, 200, { turma: mapTurma(turma) });
    return;
  }

  const publicStudentSignupMatch = url.pathname.match(/^\/api\/public\/programa\/([^/]+)\/alunos\/?$/);
  if (publicStudentSignupMatch && request.method === "POST") {
    const turmaId = resolvePublicProgramTurmaId(publicStudentSignupMatch[1]);
    if (!turmaId) {
      sendJson(response, 404, { error: "Link de compartilhamento inválido." });
      return;
    }

    const turma = getTurmaByIdStmt.get(turmaId);
    if (!turma || turma.archived_at) {
      sendJson(response, 404, { error: "Turma não encontrada para este link." });
      return;
    }
    if (Number(turma.student_signup_link_enabled) === 0) {
      sendJson(response, 403, { error: "O link de cadastro desta turma está temporariamente desativado." });
      return;
    }

    const body = await readJsonBody(request);
    const newStudent = {
      nome: requireField(body.nome, "Informe o nome do aluno."),
      email: normalizeEmail(body.email),
      whatsapp: optionalText(body.mensageiro ?? body.whatsapp),
    };

    const currentStudents = parseStudentsJson(turma.alunos_json);
    const existingIndex = currentStudents.findIndex(
      (student) => String(student?.email || "").trim().toLowerCase() === newStudent.email
    );
    if (existingIndex >= 0) {
      currentStudents[existingIndex] = {
        ...currentStudents[existingIndex],
        nome: newStudent.nome,
        email: newStudent.email,
        whatsapp: newStudent.whatsapp,
      };
    } else {
      currentStudents.push(newStudent);
    }

    updateTurmaStudentsStmt.run(JSON.stringify(currentStudents), turmaId);
    sendJson(response, 201, {
      success: true,
      aluno: newStudent,
      totalAlunos: currentStudents.length,
      message: "Cadastro do aluno realizado com sucesso.",
    });
    return;
  }

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
    const requestedRole = totalUsers === 0 ? "Admin" : "Usuário";
    const role = totalUsers === 0 ? "Admin" : "Usuário";
    const accessStatus = "active";
    const passwordHash = hashPassword(password);
    const result = insertUser.run(name, email, passwordHash, role, requestedRole, accessStatus);
    const token = crypto.randomUUID();
    insertSession.run(token, result.lastInsertRowid);
    const registeredUser = mapUser(getUserById.get(result.lastInsertRowid));
    const welcomeEmail = buildWelcomeEmail({
      userName: registeredUser.name,
      userEmail: registeredUser.email,
      userRole: registeredUser.role,
      appUrl: buildAppHomeUrl(request),
    });
    logEmailNotification(registeredUser.email, welcomeEmail.subject, welcomeEmail.body);

    sendJson(response, 201, {
      token,
      user: registeredUser,
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

  if (request.method === "POST" && url.pathname === "/api/auth/forgot-password") {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const user = getUserByEmail.get(email);

    if (user) {
      const rawToken = crypto.randomUUID();
      const tokenHash = hashOpaqueToken(rawToken);
      const expiresAt = buildFutureTimestampMinutes(30);
      insertPasswordResetTokenStmt.run(user.id, tokenHash, expiresAt);
      const resetEmail = buildPasswordResetEmail({
        userName: user.name,
        resetUrl: buildPasswordResetUrl(request, rawToken),
        expirationMinutes: 30,
      });
      logEmailNotification(user.email, resetEmail.subject, resetEmail.body);
    }

    sendJson(response, 200, {
      success: true,
      message: "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/reset-password") {
    const body = await readJsonBody(request);
    const token = requireField(body.token, "Token de recuperação inválido.");
    const password = requireField(body.password, "Informe a nova senha.");
    if (password.length < 6) {
      sendJson(response, 400, { error: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    const tokenHash = hashOpaqueToken(token);
    const tokenRow = getPasswordResetTokenByHashStmt.get(tokenHash);
    if (!tokenRow || tokenRow.used_at) {
      sendJson(response, 400, { error: "Token de recuperação inválido ou já utilizado." });
      return;
    }

    if (isTimestampExpired(tokenRow.expires_at)) {
      sendJson(response, 410, { error: "Token de recuperação expirado." });
      return;
    }

    const passwordHash = hashPassword(password);
    updateUserPasswordStmt.run(passwordHash, tokenRow.user_id);
    usePasswordResetTokenStmt.run(tokenRow.id);
    const updatedUser = getUserById.get(tokenRow.user_id);
    if (updatedUser?.email) {
      const passwordChangedEmail = buildPasswordChangedConfirmationEmail({
        userName: updatedUser.name,
        appUrl: buildAppHomeUrl(request),
      });
      logEmailNotification(updatedUser.email, passwordChangedEmail.subject, passwordChangedEmail.body);
    }
    sendJson(response, 200, { success: true });
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

  if (request.method === "POST" && url.pathname === "/api/auth/change-password") {
    const body = await readJsonBody(request);
    const currentPassword = requireField(body.currentPassword, "Informe a senha atual.");
    const nextPassword = requireField(body.newPassword, "Informe a nova senha.");
    if (nextPassword.length < 6) {
      sendJson(response, 400, { error: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }

    const user = getUserByEmail.get(normalizeEmail(session.email));
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      sendJson(response, 401, { error: "Senha atual inválida." });
      return;
    }

    updateUserPasswordStmt.run(hashPassword(nextPassword), session.id);
    const passwordChangedEmail = buildPasswordChangedConfirmationEmail({
      userName: user.name,
      appUrl: buildAppHomeUrl(request),
    });
    logEmailNotification(user.email, passwordChangedEmail.subject, passwordChangedEmail.body);
    sendJson(response, 200, { success: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    sendJson(response, 200, { user: mapUser(session) });
    return;
  }

  const acceptSecretaryInviteLinkMatch = url.pathname.match(/^\/api\/secretary-invite-links\/([^/]+)\/accept$/);
  if (acceptSecretaryInviteLinkMatch && request.method === "POST") {
    const token = String(acceptSecretaryInviteLinkMatch[1] || "").trim();
    const inviteLink = getSecretaryInviteLinkByTokenStmt.get(token);
    if (!inviteLink || inviteLink.status !== "pending") {
      sendJson(response, 404, { error: "Convite de secretário inválido ou expirado." });
      return;
    }

    if (isSecretaryInviteExpired(inviteLink)) {
      expireSecretaryInviteLinkStmt.run(inviteLink.id);
      sendJson(response, 410, { error: "Este convite expirou. Solicite um novo vínculo ao dirigente." });
      return;
    }

    const sessionEmail = normalizeEmail(session.email);
    const invitedEmail = normalizeEmail(inviteLink.invited_email);
    if (sessionEmail !== invitedEmail) {
      sendJson(response, 403, { error: "Este convite foi emitido para outro e-mail." });
      return;
    }

    const turma = getTurmaOrFail(inviteLink.turma_id);
    if (turma.archived_at) {
      sendJson(response, 409, { error: "Esta turma está arquivada e não aceita novos vínculos." });
      return;
    }

    upsertTurmaMemberStmt.run(inviteLink.turma_id, session.id, "Secretário", inviteLink.invited_by_user_id || session.id);
    promoteSessionUserToSecretaryIfNeeded(session);
    acceptSecretaryInviteLinkStmt.run(session.id, inviteLink.id);

    sendJson(response, 200, {
      success: true,
      turma: mapTurma(getTurmaOrFail(inviteLink.turma_id)),
      user: mapUser(getUserById.get(session.id)),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/my-invites") {
    sendJson(response, 200, { invites: listMyPendingInvitesStmt.all(session.id).map(mapInviteEvent) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dirigentes-active-turmas") {
    const grouped = groupDirigentesWithTurmas(listDirigentesWithActiveTurmasStmt.all());
    sendJson(response, 200, { dirigentes: grouped });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/my-link-requests") {
    sendJson(response, 200, { requests: listMyTurmaLinkRequestsStmt.all(session.id).map(mapTurmaLinkRequest) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/turma-link-requests") {
    const body = await readJsonBody(request);
    const sessionRole = normalizeRole(session.role, "Usuário");
    if (!isActiveAccount(session) || sessionRole === "Admin" || sessionRole === "Dirigente") {
      sendJson(response, 403, { error: "Apenas usuários ativos com perfil de secretário podem solicitar vínculo." });
      return;
    }

    const dirigenteUserId = normalizeOptionalId(body.dirigenteUserId);
    const turmaId = normalizeOptionalId(body.turmaId);
    const turma = getTurmaOrFail(turmaId);

    if (!dirigenteUserId || turma.user_id !== dirigenteUserId) {
      sendJson(response, 400, { error: "Selecione um dirigente e uma turma ativa correspondentes." });
      return;
    }

    const dirigente = getUserById.get(dirigenteUserId);
    if (!dirigente || normalizeRole(dirigente.role, "Pendente") !== "Dirigente" || !isActiveAccount(dirigente)) {
      sendJson(response, 400, { error: "Dirigente inválido para esta solicitação." });
      return;
    }

    if (turma.archived_at) {
      sendJson(response, 400, { error: "A turma selecionada não está ativa." });
      return;
    }

    if (getPendingTurmaLinkRequestByRequesterAndTurmaStmt.get(session.id, turmaId)) {
      sendJson(response, 409, { error: "Você já possui uma solicitação pendente para esta turma." });
      return;
    }

    if (getTurmaMemberStmt.get(turmaId, session.id)) {
      sendJson(response, 409, { error: "Você já participa desta turma." });
      return;
    }

    insertTurmaLinkRequestStmt.run(session.id, dirigenteUserId, turmaId);
    logEmailNotification(
      dirigente.email,
      "Solicitação de vínculo de secretário",
      `${session.name} (${session.email}) solicitou vínculo na turma ${turma.nome}.`
    );
    sendJson(response, 201, { success: true });
    return;
  }

  const acceptInviteMatch = url.pathname.match(/^\/api\/turma-invites\/(\d+)\/accept$/);
  if (acceptInviteMatch && request.method === "POST") {
    const invite = getTurmaInviteStmt.get(Number(acceptInviteMatch[1]));
    if (!invite || invite.invited_user_id !== session.id || invite.status !== "pending") {
      sendJson(response, 404, { error: "Convite pendente não encontrado." });
      return;
    }

    acceptTurmaInviteStmt.run(invite.id);
    upsertTurmaMemberStmt.run(invite.turma_id, session.id, "Secretário", invite.invited_by_user_id);
    promoteSessionUserToSecretaryIfNeeded(session);
    const inviteDecision = updateLatestProfileRequestStmt.run("active", invite.invited_by_user_id, session.id);
    if (!inviteDecision.changes) {
      insertProfileRequestDecisionStmt.run(session.id, "Secretário", "active", invite.invited_by_user_id);
    }
    sendJson(response, 200, { user: mapUser(getUserById.get(session.id)) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/turma-link-requests") {
    requireUserApprovalAccess(session);
    const requests = isAdmin(session)
      ? listReceivedTurmaLinkRequestsForAdminStmt.all()
      : listReceivedTurmaLinkRequestsStmt.all(session.id);
    sendJson(response, 200, { requests: requests.map(mapTurmaLinkRequestForDirigente) });
    return;
  }

  const resolveLinkRequestMatch = url.pathname.match(/^\/api\/turma-link-requests\/(\d+)\/(approve|reject)$/);
  if (resolveLinkRequestMatch && request.method === "POST") {
    requireUserApprovalAccess(session);
    const requestId = Number(resolveLinkRequestMatch[1]);
    const action = resolveLinkRequestMatch[2];
    const linkRequest = getTurmaLinkRequestByIdStmt.get(requestId);

    if (!linkRequest || linkRequest.status !== "pending") {
      sendJson(response, 404, { error: "Solicitação pendente não encontrada." });
      return;
    }

    const turma = getTurmaOrFail(linkRequest.turma_id);
    if (!isAdmin(session) && linkRequest.dirigente_user_id !== session.id) {
      sendJson(response, 403, { error: "Você não pode decidir esta solicitação." });
      return;
    }

    if (action === "approve") {
      upsertTurmaMemberStmt.run(turma.id, linkRequest.requester_user_id, "Secretário", session.id);
      updateUserRoleStmt.run("Secretário", "Secretário", "active", linkRequest.requester_user_id);
      const decision = updateLatestProfileRequestStmt.run("active", session.id, linkRequest.requester_user_id);
      if (!decision.changes) {
        insertProfileRequestDecisionStmt.run(linkRequest.requester_user_id, "Secretário", "active", session.id);
      }
      updateTurmaLinkRequestStatusStmt.run("approved", session.id, requestId);
      const requester = getUserById.get(linkRequest.requester_user_id);
      if (requester?.email) {
        logEmailNotification(
          requester.email,
          "Solicitação de vínculo aprovada",
          `Seu vínculo como secretário na turma ${turma.nome} foi aprovado por ${session.name}.`
        );
      }
    } else {
      updateTurmaLinkRequestStatusStmt.run("rejected", session.id, requestId);
    }

    sendJson(response, 200, { success: true });
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
    requireUserApprovalAccess(session);
    sendJson(response, 200, { users: listUsersForApproval(session).map(mapUser) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/secretary-candidates") {
    requireSecretaryInviteAccess(session);
    sendJson(response, 200, { users: listPendingSecretaryUsersStmt.all().map(mapUser) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/access-events") {
    requireUserApprovalAccess(session);
    const events = [
      ...listAccessEventsStmt.all().map(mapAccessEvent),
      ...listInviteEventsStmt.all().map(mapInviteEvent),
    ].sort(compareAccessEvents);
    sendJson(response, 200, { events });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/turma-invites") {
    requireSecretaryInviteAccess(session);
    const body = await readJsonBody(request);
    const targetUser = getUserById.get(normalizeOptionalId(body.userId));
    const turma = getTurmaOrFail(normalizeOptionalId(body.turmaId));
    ensureTurmaAccess(session, turma);

    if (!targetUser) {
      sendJson(response, 404, { error: "Secretário não encontrado." });
      return;
    }

    if (targetUser.id === session.id) {
      sendJson(response, 400, { error: "Não é possível convidar o próprio usuário." });
      return;
    }

    if (!isActiveAccount(targetUser)) {
      sendJson(response, 400, { error: "Selecione um usuário com cadastro ativo." });
      return;
    }

    if (getPendingTurmaInviteByUserAndTurmaStmt.get(turma.id, targetUser.id)) {
      sendJson(response, 409, { error: "Já existe um convite pendente para este secretário nesta turma." });
      return;
    }

    insertTurmaInviteStmt.run(turma.id, targetUser.id, session.id);
    logEmailNotification(
      targetUser.email,
      "Convite de turma",
      `Você recebeu um convite para participar da turma ${turma.nome} como Secretário.`
    );

    sendJson(response, 201, {
      user: mapUser(getUserById.get(targetUser.id)),
      turma: mapTurma(turma),
    });
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    requireUserApprovalAccess(session);
    const userId = Number(userMatch[1]);
    const targetUser = getUserById.get(userId);

    if (!targetUser) {
      sendJson(response, 404, { error: "Usuário não encontrado." });
      return;
    }

    if (request.method === "PUT") {
      const body = await readJsonBody(request);
      const nextAccess = resolveUserAccessUpdate(session, targetUser, body);
      updateUserRoleStmt.run(nextAccess.role, nextAccess.requestedRole, nextAccess.accessStatus, userId);
      if (targetUser.access_status === "pending" && nextAccess.accessStatus !== "pending") {
        const decisionResult = updateLatestProfileRequestStmt.run(nextAccess.accessStatus, session.id, userId);
        if (!decisionResult.changes) {
          insertProfileRequestDecisionStmt.run(
            userId,
            nextAccess.requestedRole,
            nextAccess.accessStatus,
            session.id
          );
        }
        logEmailNotification(
          targetUser.email,
          nextAccess.accessStatus === "active" ? "Cadastro aprovado" : "Cadastro rejeitado",
          nextAccess.accessStatus === "active"
            ? `Seu perfil de ${nextAccess.role} foi aprovado.`
            : "Sua solicitação de perfil foi rejeitada."
        );
      }
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
    promoteSessionUserToDirigenteIfNeeded(session);
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
    syncSecretaryInviteLinksForTurma(request, session, turma, payload.secretarios);
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

      syncSecretaryInviteLinksForTurma(request, session, getTurmaOrFail(turmaId), payload.secretarios);
      sendJson(response, 200, { turma: mapTurma(getTurmaOrFail(turmaId)) });
      return;
    }

    if (request.method === "DELETE") {
      const isOwner = Number(turma.user_id) === Number(session.id);
      if (!isAdmin(session) && !isOwner) {
        sendJson(response, 403, { error: "Somente Admin ou o dirigente responsável podem excluir a turma." });
        return;
      }

      deleteTurmaStmt.run(turmaId);
      sendJson(response, 200, { success: true });
      return;
    }
  }

  const resendSecretaryInviteMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/secretary-invites\/resend\/?$/);
  if (resendSecretaryInviteMatch && request.method === "POST") {
    const turmaId = Number(resendSecretaryInviteMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);
    if (turma.archived_at) {
      sendJson(response, 409, { error: "Esta turma está arquivada e não aceita convites." });
      return;
    }

    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const pendingInvite = getPendingSecretaryInviteLinkDetailsByTurmaAndEmailStmt.get(turmaId, email);
    if (!pendingInvite) {
      sendJson(response, 404, { error: "Convite pendente não encontrado para este e-mail." });
      return;
    }

    const inviteUrl = buildSecretaryInviteUrl(request, pendingInvite.token);
    const secretaryInviteEmail = buildSecretaryInviteEmail({
      secretaryName: optionalText(pendingInvite.invited_name),
      turmaName: turma.nome,
      turmaType: turma.tipo,
      inviterName: session.name,
      inviteUrl,
      expirationHours: SECRETARY_INVITE_EXPIRATION_HOURS,
      expiresAt: pendingInvite.expires_at || buildSecretaryInviteExpirationTimestamp(),
    });
    logEmailNotification(email, secretaryInviteEmail.subject, secretaryInviteEmail.body);
    sendJson(response, 200, { success: true });
    return;
  }

  const cancelSecretaryInviteMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/secretary-invites\/cancel\/?$/);
  if (cancelSecretaryInviteMatch && request.method === "POST") {
    const turmaId = Number(cancelSecretaryInviteMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);
    if (turma.archived_at) {
      sendJson(response, 409, { error: "Esta turma está arquivada e não aceita alteração de convites." });
      return;
    }

    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const pendingInvite = getPendingSecretaryInviteLinkByTurmaAndEmailStmt.get(turmaId, email);
    if (!pendingInvite) {
      sendJson(response, 404, { error: "Convite pendente não encontrado para este e-mail." });
      return;
    }

    cancelSecretaryInviteLinkStmt.run(pendingInvite.id);
    sendJson(response, 200, { success: true });
    return;
  }

  const shareLinkMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/share-link\/?$/);
  if (shareLinkMatch && request.method === "GET") {
    const turmaId = Number(shareLinkMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);
    const token = buildPublicProgramToken(turmaId);
    sendJson(response, 200, {
      token,
      url: buildPublicProgramUrl(request, token),
    });
    return;
  }

  const studentSignupLinkGetMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/student-signup-link\/?$/);
  if (studentSignupLinkGetMatch && request.method === "GET") {
    const turmaId = Number(studentSignupLinkGetMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);
    const token = buildPublicProgramToken(turmaId);
    sendJson(response, 200, {
      token,
      enabled: Number(turma.student_signup_link_enabled) !== 0,
      url: buildPublicStudentSignupUrl(request, token),
    });
    return;
  }

  const studentSignupLinkMatch = url.pathname.match(/^\/api\/turmas\/(\d+)\/student-signup-link\/?$/);
  if (studentSignupLinkMatch && request.method === "PUT") {
    const turmaId = Number(studentSignupLinkMatch[1]);
    const turma = getTurmaOrFail(turmaId);
    ensureTurmaAccess(session, turma);
    const isOwner = Number(turma.user_id) === Number(session.id);
    const member = getTurmaMemberStmt.get(turma.id, session.id);
    const memberRole = String(member?.role || "");
    const canManage = isOwner || ["Dirigente", "Secretário"].includes(memberRole);
    if (!canManage) {
      sendJson(response, 403, { error: "Apenas dirigentes e secretários da turma podem ativar/desativar este link." });
      return;
    }
    const body = await readJsonBody(request);
    const enabled = body.enabled === false ? 0 : 1;
    updateTurmaStudentSignupLinkEnabledStmt.run(enabled, turmaId);
    sendJson(response, 200, { turma: mapTurma(getTurmaOrFail(turmaId)) });
    return;
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
      role TEXT NOT NULL DEFAULT 'Usuário',
      requested_role TEXT NOT NULL DEFAULT 'Usuário',
      access_status TEXT NOT NULL DEFAULT 'active',
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

    CREATE TABLE IF NOT EXISTS profile_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      requested_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      decided_by_user_id INTEGER,
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (decided_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS turma_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'Secretário',
      status TEXT NOT NULL DEFAULT 'active',
      invited_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS turma_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL,
      invited_user_id INTEGER NOT NULL,
      invited_by_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS turma_link_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_user_id INTEGER NOT NULL,
      dirigente_user_id INTEGER NOT NULL,
      turma_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      decided_by_user_id INTEGER,
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (dirigente_user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE,
      FOREIGN KEY (decided_by_user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS turma_secretary_invite_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id INTEGER NOT NULL,
      invited_email TEXT NOT NULL,
      invited_name TEXT,
      invited_by_user_id INTEGER,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT,
      accepted_by_user_id INTEGER,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (accepted_by_user_id) REFERENCES users (id) ON DELETE SET NULL
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
      student_signup_link_enabled INTEGER NOT NULL DEFAULT 1,
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

  ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'Usuário'");
  ensureColumn("users", "requested_role", "TEXT NOT NULL DEFAULT 'Usuário'");
  ensureColumn("users", "access_status", "TEXT NOT NULL DEFAULT 'active'");
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
  ensureColumn("turmas", "student_signup_link_enabled", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("turmas", "horarios", "TEXT");
  ensureColumn("turmas", "alunos_json", "TEXT");
  ensureColumn("turma_secretary_invite_links", "expires_at", "TEXT");
  ensureColumn("turma_secretary_invite_links", "updated_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_turma_members_unique
    ON turma_members (turma_id, user_id);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_turma_link_requests_requester
    ON turma_link_requests (requester_user_id, status, turma_id);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON password_reset_tokens (user_id, created_at);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_turma_secretary_invite_links_lookup
    ON turma_secretary_invite_links (turma_id, invited_email, status, created_at);
  `);
  db.exec(`
    UPDATE turma_secretary_invite_links
    SET expires_at = datetime(created_at, '+48 hours')
    WHERE expires_at IS NULL OR expires_at = '';
  `);
  db.exec(`
    UPDATE turma_secretary_invite_links
    SET updated_at = COALESCE(updated_at, accepted_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR updated_at = '';
  `);
  db.exec(`
    DELETE FROM turma_secretary_invite_links
    WHERE status IN ('accepted', 'expired', 'cancelled')
      AND COALESCE(updated_at, created_at) < datetime('now', '-${SECRETARY_INVITE_RETENTION_DAYS} days')
  `);
  db.exec(`
    DELETE FROM password_reset_tokens
    WHERE used_at IS NOT NULL
       OR expires_at < CURRENT_TIMESTAMP
  `);
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
    SET role = 'Usuário'
    WHERE role IS NULL OR role = '';
  `);
  db.exec(`
    UPDATE users
    SET requested_role = CASE
      WHEN requested_role IS NULL OR requested_role = '' THEN role
      ELSE requested_role
    END
  `);
  db.exec(`
    UPDATE users
    SET role = 'Usuário', requested_role = 'Usuário', access_status = 'active'
    WHERE role = 'Pendente';
  `);
  db.exec(`
    UPDATE users
    SET access_status = 'active'
    WHERE access_status IS NULL OR access_status = '';
  `);
  db.exec(`
    UPDATE users
    SET role = 'Secretário',
        requested_role = 'Secretário',
        access_status = 'active'
    WHERE EXISTS (
      SELECT 1
      FROM turma_members
      WHERE turma_members.user_id = users.id
        AND turma_members.status = 'active'
    );
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
      updateSeedUserStmt.run(user.name, passwordHash, user.role, user.requestedRole, user.email);
      return;
    }

    insertUser.run(user.name, user.email, passwordHash, user.role, user.requestedRole, "active");
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
    ? listArchivedTurmasByAccessStmt.all(session.id, session.id)
    : listTurmasByAccessStmt.all(session.id, session.id);
}

function listUsersForApproval(session) {
  if (isAdmin(session)) {
    return listUsersStmt.all();
  }

  return listPendingUsersStmt.all();
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
  if (turma.user_id === session.id) return;
  if (getTurmaMemberStmt.get(turma.id, session.id)) return;

  {
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

function requireUserApprovalAccess(session) {
  if (isAdmin(session)) return;
  if (isApprovedDirigente(session)) return;

  const error = new Error("Apenas Admin ou Dirigentes aprovados podem gerenciar solicitações.");
  error.statusCode = 403;
  throw error;
}

function requireSecretaryInviteAccess(session) {
  if (!isActiveAccount(session)) {
    const error = new Error("Sua conta não está ativa para enviar convites.");
    error.statusCode = 403;
    throw error;
  }
  if (["Admin", "Dirigente", "Secretário"].includes(session.role)) {
    return;
  }

  const error = new Error("Apenas Admin, Dirigente ou Secretário podem convidar para turmas.");
  error.statusCode = 403;
  throw error;
}

function isAdmin(session) {
  return session.role === "Admin" && isActiveAccount(session);
}

function isApprovedDirigente(session) {
  return session.role === "Dirigente" && isActiveAccount(session);
}

function isActiveAccount(user) {
  return (user.access_status || "active") === "active";
}

function promoteSessionUserToDirigenteIfNeeded(session) {
  const currentRole = normalizeRole(session.role, "Usuário");
  if (currentRole === "Admin" || currentRole === "Dirigente") {
    return;
  }
  updateUserRoleStmt.run("Dirigente", "Dirigente", "active", session.id);
  session.role = "Dirigente";
  session.requested_role = "Dirigente";
  session.access_status = "active";
}

function promoteSessionUserToSecretaryIfNeeded(session) {
  const currentRole = normalizeRole(session.role, "Usuário");
  if (currentRole === "Admin" || currentRole === "Dirigente" || currentRole === "Secretário") {
    return;
  }
  updateUserRoleStmt.run("Secretário", "Secretário", "active", session.id);
  session.role = "Secretário";
  session.requested_role = "Secretário";
  session.access_status = "active";
}

function resolveUserAccessUpdate(session, targetUser, body) {
  const currentRole = normalizeRole(targetUser.role, "Pendente");
  const currentRequestedRole = normalizeRequestedRole(targetUser.requested_role, "Dirigente");
  const currentStatus = normalizeAccessStatus(targetUser.access_status, "pending");
  const action = optionalText(body.action);

  if (!isAdmin(session)) {
    if (action !== "approve" || currentStatus !== "pending" || currentRequestedRole !== "Dirigente") {
      const error = new Error("Dirigentes só podem aprovar solicitações pendentes de dirigente.");
      error.statusCode = 403;
      throw error;
    }

    return {
      role: "Dirigente",
      requestedRole: "Dirigente",
      accessStatus: "active",
    };
  }

  if (action === "approve") {
    if (currentRequestedRole === "Secretário") {
      const error = new Error("Secretários devem ser aprovados por convite de turma.");
      error.statusCode = 400;
      throw error;
    }

    return {
      role: currentRequestedRole,
      requestedRole: currentRequestedRole,
      accessStatus: "active",
    };
  }

  if (action === "reject") {
    return {
      role: "Pendente",
      requestedRole: currentRequestedRole,
      accessStatus: "rejected",
    };
  }

  const nextRole = normalizeRole(body.role, currentRole);
  const nextStatus = normalizeAccessStatus(body.accessStatus, currentStatus);
  const nextRequestedRole = REQUESTED_ROLES.has(nextRole) ? nextRole : currentRequestedRole;
  const adminUsers = listUsersStmt.all().filter((user) => normalizeRole(user.role, "Dirigente") === "Admin" && isActiveAccount(user));
  const isRemovingLastAdmin =
    currentRole === "Admin" &&
    (nextRole !== "Admin" || nextStatus !== "active") &&
    adminUsers.length <= 1;

  if (isRemovingLastAdmin) {
    const error = new Error("É preciso manter ao menos um usuário Admin ativo.");
    error.statusCode = 409;
    throw error;
  }

  return {
    role: nextStatus === "active" ? nextRole : "Pendente",
    requestedRole: nextRequestedRole,
    accessStatus: nextStatus,
  };
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
  const isHtml = extension === ".html";
  response.writeHead(200, {
    "Content-Type": extensions[extension] || "application/octet-stream",
    "Cache-Control": isHtml ? "no-store, max-age=0" : "public, max-age=300",
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
    .filter((item) => item.nome && item.email);
}

function syncSecretaryInviteLinksForTurma(request, session, turma, secretarios) {
  const candidates = normalizeSecretarios(secretarios)
    .filter((secretario) => secretario.email)
    .map((secretario) => ({
      email: normalizeEmail(secretario.email),
      name: optionalText(secretario.nome),
    }));

  const seen = new Set();
  const candidateEmails = new Set(candidates.map((candidate) => candidate.email));
  const currentPending = listPendingSecretaryInviteLinksByTurmaStmt.all(turma.id);
  currentPending.forEach((pending) => {
    const pendingEmail = normalizeEmail(pending.invited_email);
    if (!candidateEmails.has(pendingEmail)) {
      cancelSecretaryInviteLinkStmt.run(pending.id);
    }
  });

  candidates.forEach((candidate) => {
    if (seen.has(candidate.email)) return;
    seen.add(candidate.email);

    if (getActiveTurmaMemberByEmailStmt.get(turma.id, candidate.email)) {
      return;
    }

    const existingPending = getPendingSecretaryInviteLinkByTurmaAndEmailStmt.get(turma.id, candidate.email);
    const token = existingPending?.token || crypto.randomUUID();
    let shouldSendEmail = false;
    if (!existingPending) {
      const expiresAt = buildSecretaryInviteExpirationTimestamp();
      insertSecretaryInviteLinkStmt.run(
        turma.id,
        candidate.email,
        candidate.name || null,
        session.id,
        token,
        expiresAt
      );
      shouldSendEmail = true;
    }

    if (shouldSendEmail) {
      const inviteUrl = buildSecretaryInviteUrl(request, token);
      const secretaryInviteEmail = buildSecretaryInviteEmail({
        secretaryName: candidate.name,
        turmaName: turma.nome,
        turmaType: turma.tipo,
        inviterName: session.name,
        inviteUrl,
        expirationHours: SECRETARY_INVITE_EXPIRATION_HOURS,
        expiresAt: buildSecretaryInviteExpirationTimestamp(),
      });
      logEmailNotification(candidate.email, secretaryInviteEmail.subject, secretaryInviteEmail.body);
    }
  });
}

function runSecretaryInviteMaintenance() {
  try {
    expirePendingSecretaryInviteLinksStmt.run();
    purgeOldSecretaryInviteLinksStmt.run(`-${SECRETARY_INVITE_RETENTION_DAYS} days`);
  } catch (error) {
    console.log(`[manutencao convites] Falha ao processar limpeza automática: ${error.message}`);
  }
}

function runTurmaArchiveMaintenance() {
  try {
    purgeArchivedTurmasStmt.run(`-${TURMA_ARCHIVE_RETENTION_DAYS} days`);
  } catch (error) {
    console.log(`[manutencao turmas] Falha ao processar limpeza automática: ${error.message}`);
  }
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

function normalizeRow(row, length) {
  const values = Array.isArray(row) ? row : [];
  const normalized = values.map((item) => String(item ?? ""));
  while (normalized.length < length) {
    normalized.push("");
  }
  return normalized.slice(0, length);
}

function parseStudentsJson(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
        .map((item) => ({
          nome: optionalText(item?.nome),
          email: optionalText(item?.email).toLowerCase(),
          whatsapp: optionalText(item?.whatsapp),
        }))
        .filter((item) => item.nome && item.email)
      : [];
  } catch {
    return [];
  }
}

function mapUser(row) {
  const accessStatus = normalizeAccessStatus(row.access_status, "active");
  const role = accessStatus === "active"
    ? normalizeRole(row.role, "Usuário")
    : "Pendente";
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    requestedRole: normalizeRequestedRole(row.requested_role || row.role, "Usuário"),
    accessStatus,
    dirigenteNome: row.dirigente_nome || "",
    secretarios: parseSecretarios(row.secretarios_json),
    telefone: row.telefone || "",
    whatsapp: row.whatsapp || "",
    contatoEmail: row.contato_email || "",
  };
}

function mapAccessEvent(row) {
  return {
    id: row.id,
    type: "profile_request",
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    requestedRole: normalizeRequestedRole(row.requested_role, "Dirigente"),
    status: normalizeAccessStatus(row.status, "pending"),
    decidedByName: row.decided_by_name || "",
    decidedByEmail: row.decided_by_email || "",
    invitedByName: "",
    invitedByEmail: "",
    createdAt: row.created_at,
    decidedAt: row.decided_at || "",
  };
}

function mapInviteEvent(row) {
  return {
    id: row.id,
    type: "turma_invite",
    title: `${row.invited_user_name} foi convidado para ${row.turma_nome}`,
    turmaId: row.turma_id,
    turmaName: row.turma_nome,
    userId: row.invited_user_id,
    userName: row.invited_user_name,
    userEmail: row.invited_user_email,
    requestedRole: "Secretário",
    status: row.status || "accepted",
    decidedByName: row.invited_by_name,
    decidedByEmail: row.invited_by_email,
    invitedByName: row.invited_by_name,
    invitedByEmail: row.invited_by_email,
    createdAt: row.created_at,
    decidedAt: row.accepted_at || "",
  };
}

function mapTurmaLinkRequest(row) {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at || "",
    turmaId: row.turma_id,
    turmaName: row.turma_nome,
    turmaTipo: row.turma_tipo,
    dirigenteName: row.dirigente_name,
    dirigenteEmail: row.dirigente_email,
    decidedByName: row.decided_by_name || "",
  };
}

function mapTurmaLinkRequestForDirigente(row) {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at || "",
    turmaId: row.turma_id,
    turmaName: row.turma_nome,
    turmaTipo: row.turma_tipo,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterRequestedRole: row.requester_requested_role,
  };
}

function groupDirigentesWithTurmas(rows) {
  const byDirigente = new Map();
  rows.forEach((row) => {
    if (!byDirigente.has(row.dirigente_id)) {
      byDirigente.set(row.dirigente_id, {
        id: row.dirigente_id,
        name: row.dirigente_name,
        email: row.dirigente_email,
        turmas: [],
      });
    }
    byDirigente.get(row.dirigente_id).turmas.push({
      id: row.turma_id,
      nome: row.turma_nome,
      tipo: row.turma_tipo,
      modalidade: row.turma_modalidade,
      inicio: row.turma_inicio,
    });
  });

  return Array.from(byDirigente.values());
}

function compareAccessEvents(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function mapTurma(row) {
  const secretarios = withSecretaryInviteStatus(row.id, parseSecretarios(row.secretarios_json));
  const archivedAt = row.archived_at || null;
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
    secretarios,
    telefone: row.telefone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    studentSignupLinkEnabled: Number(row.student_signup_link_enabled) !== 0,
    archivedAt,
    archivedRetentionDays: TURMA_ARCHIVE_RETENTION_DAYS,
    archivedRemovalDeadline: archivedAt
      ? addDaysToTimestamp(archivedAt, TURMA_ARCHIVE_RETENTION_DAYS)
      : null,
    updatedAt: row.updated_at,
  };
}

function addDaysToTimestamp(timestamp, days) {
  if (!timestamp) {
    return null;
  }
  const isoLike = String(timestamp).replace(" ", "T");
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function withSecretaryInviteStatus(turmaId, secretarios) {
  return (Array.isArray(secretarios) ? secretarios : []).map((secretario) => {
    const email = optionalText(secretario.email);
    if (!email) {
      return { ...secretario, inviteStatus: "none" };
    }

    if (getActiveTurmaMemberByEmailStmt.get(turmaId, email)) {
      return { ...secretario, inviteStatus: "accepted" };
    }

    const invite = getLatestSecretaryInviteStatusByTurmaAndEmailStmt.get(turmaId, email);
    const status = String(invite?.status || "").trim().toLowerCase();
    if (status === "pending") {
      return { ...secretario, inviteStatus: "pending" };
    }
    if (status === "expired") {
      return { ...secretario, inviteStatus: "expired" };
    }
    if (status === "cancelled") {
      return { ...secretario, inviteStatus: "cancelled" };
    }

    return { ...secretario, inviteStatus: "none" };
  });
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

function normalizeRequestedRole(value, fallback) {
  const candidate = normalizeSecretaryRoleLabel(value);
  return REQUESTED_ROLES.has(candidate) ? candidate : fallback;
}

function normalizeAccessStatus(value, fallback) {
  const candidate = String(value || "").trim();
  return ACCESS_STATUSES.has(candidate) ? candidate : fallback;
}

function normalizeSecretaryRoleLabel(value) {
  const candidate = String(value || "").trim();
  if (candidate === "Secretario") {
    return "Secretário";
  }
  return candidate;
}

function logEmailNotification(to, subject, message) {
  const recipient = String(to || "").trim();
  if (!recipient) return;

  const textBody = String(message || "");
  if (!EMAIL_ENABLED || !smtpTransporter) {
    console.log(`[email pendente] Para: ${recipient} | Assunto: ${subject} | Mensagem: ${textBody}`);
    return;
  }

  smtpTransporter.sendMail({
    from: EMAIL_FROM,
    to: recipient,
    subject,
    text: textBody,
  }).catch((error) => {
    console.log(
      `[email pendente] Falha no envio SMTP (${error.message}). ` +
      `Para: ${recipient} | Assunto: ${subject} | Mensagem: ${textBody}`
    );
  });
}

function buildWelcomeEmail({ userName, userEmail, userRole, appUrl }) {
  return {
    subject: "Cadastro confirmado - Plataforma EAE",
    body:
      `Olá, ${userName || "usuário(a)"}.\n\n` +
      "Seu cadastro na Plataforma EAE foi concluído com sucesso.\n\n" +
      "Dados da conta:\n" +
      `- Nome: ${userName || "não informado"}\n` +
      `- E-mail: ${userEmail || "não informado"}\n` +
      `- Perfil inicial: ${userRole || "Usuário"}\n\n` +
      "Acesse a plataforma:\n" +
      `${appUrl}\n\n` +
      "Se precisar de suporte, responda este e-mail.\n\n" +
      "Atenciosamente,\n" +
      "Equipe EAE",
  };
}

function buildPasswordResetEmail({ userName, resetUrl, expirationMinutes = 30 }) {
  return {
    subject: "Redefinição de senha - Plataforma EAE",
    body:
      `Olá, ${userName || "usuário(a)"}.\n\n` +
      "Recebemos uma solicitação para redefinir a senha da sua conta na Plataforma EAE.\n\n" +
      "Para cadastrar uma nova senha, acesse o link abaixo:\n" +
      `${resetUrl}\n\n` +
      `Este link expira em ${expirationMinutes} minutos.\n\n` +
      "Se você não fez esta solicitação, ignore este e-mail.\n\n" +
      "Atenciosamente,\n" +
      "Equipe EAE",
  };
}

function buildPasswordChangedConfirmationEmail({ userName, appUrl }) {
  return {
    subject: "Senha alterada com sucesso - Plataforma EAE",
    body:
      `Olá, ${userName || "usuário(a)"}.\n\n` +
      "Confirmamos que a senha da sua conta na Plataforma EAE foi alterada com sucesso.\n\n" +
      "Você já pode acessar a plataforma com a nova senha:\n" +
      `${appUrl}\n\n` +
      "Se você não reconhece esta alteração, redefina sua senha imediatamente e entre em contato com o suporte.\n\n" +
      "Atenciosamente,\n" +
      "Equipe EAE",
  };
}

function buildSecretaryInviteEmail({
  secretaryName,
  turmaName,
  turmaType,
  inviterName,
  inviteUrl,
  expirationHours,
  expiresAt,
}) {
  return {
    subject: `Convite para vínculo como Secretário(a) - Turma ${turmaName || "não informada"}`,
    body:
      `Olá, ${secretaryName || "secretário(a)"}.\n\n` +
      `Você foi convidado(a) para atuar como Secretário(a) na turma ${turmaName || "não informada"} da Plataforma EAE.\n\n` +
      "Para confirmar seu vínculo, acesse:\n" +
      `${inviteUrl}\n\n` +
      "Detalhes:\n" +
      `- Turma: ${turmaName || "não informada"}\n` +
      `- Tipo: ${turmaType || "não informado"}\n` +
      `- Convidado por: ${inviterName || "não informado"}\n` +
      `- Validade do convite: ${expiresAt || "não informada"} (${expirationHours || 48} horas)\n\n` +
      "Se você já possui conta com este e-mail, faça login e abra o link acima para confirmar.\n" +
      "Se ainda não possui conta, faça o cadastro com este mesmo e-mail e depois confirme pelo link.\n\n" +
      "Atenciosamente,\n" +
      "Equipe EAE",
  };
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

function buildPublicProgramToken(turmaId) {
  const turmaValue = String(Number(turmaId) || "");
  const signature = crypto
    .createHmac("sha256", SHARE_LINK_SECRET)
    .update(turmaValue)
    .digest("base64url");
  return `${turmaValue}.${signature}`;
}

function resolvePublicProgramTurmaId(token) {
  const [turmaIdPart = "", signaturePart = ""] = String(token || "").split(".");
  if (!/^\d+$/.test(turmaIdPart) || !signaturePart) {
    return null;
  }

  const expectedToken = buildPublicProgramToken(Number(turmaIdPart));
  const [_, expectedSignature] = expectedToken.split(".");
  const receivedBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  return Number(turmaIdPart);
}

function buildPublicProgramUrl(request, token) {
  const { protocol, host } = resolveRequestOrigin(request);
  return `${protocol}://${host}/?shareToken=${encodeURIComponent(token)}`;
}

function buildPublicStudentSignupUrl(request, token) {
  const { protocol, host } = resolveRequestOrigin(request);
  return `${protocol}://${host}/public/alunos/${encodeURIComponent(token)}`;
}

function buildAppHomeUrl(request) {
  const { protocol, host } = resolveRequestOrigin(request);
  return `${protocol}://${host}/`;
}

function resolveRequestOrigin(request) {
  const host = request.headers.host || `127.0.0.1:${PORT}`;
  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
  return { host, protocol };
}

function buildSecretaryInviteUrl(request, token) {
  const { protocol, host } = resolveRequestOrigin(request);
  return `${protocol}://${host}/?secretaryInviteToken=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(request, token) {
  const { protocol, host } = resolveRequestOrigin(request);
  return `${protocol}://${host}/?resetPasswordToken=${encodeURIComponent(token)}`;
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function buildFutureTimestampMinutes(minutes) {
  const date = new Date(Date.now() + (minutes * 60 * 1000));
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function isTimestampExpired(value) {
  if (!value) return true;
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return true;
  return Date.now() > parsed.getTime();
}

function buildSecretaryInviteExpirationTimestamp() {
  const expiresAt = new Date(Date.now() + (SECRETARY_INVITE_EXPIRATION_HOURS * 60 * 60 * 1000));
  return expiresAt.toISOString().slice(0, 19).replace("T", " ");
}

function isSecretaryInviteExpired(inviteLink) {
  if (!inviteLink?.expires_at) {
    return false;
  }
  const expiresAt = new Date(String(inviteLink.expires_at).replace(" ", "T"));
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }
  return Date.now() > expiresAt.getTime();
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

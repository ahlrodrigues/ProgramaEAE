const state = {
  session: null,
  isPublicShareMode: false,
  users: [],
  accessEvents: [],
  pendingInvites: [],
  pendingInviteLocks: {},
  linkRequests: [],
  dirigenteTurmaCatalog: [],
  turmas: [],
  activeTurmasForCopy: [],
  currentTurmaId: null,
  currentScope: "active",
  currentApprovalsView: "cadastros",
  currentProgramTab: "programa-cb",
  isCreatingTurma: false,
  isTurmaDetailsOpen: false,
  isEditingTurma: false,
  importedStudents: [],
  program: createMinimalProgram(),
  isProgramEditing: false,
  currentProgramShareUrl: "",
  currentProgramShareToken: "",
  currentStudentSignupShareUrl: "",
  currentProgramShareTurmaId: null,
  isProgramShareLoading: false,
  currentProgramShareError: "",
  manualColumnWidths: {},
};

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const sessionChip = document.querySelector("#session-chip");
const userMenu = document.querySelector("#user-menu");
const userMenuPanel = document.querySelector("#user-menu-panel");
const openCadastroButton = document.querySelector("#open-cadastro-button");
const loginForm = document.querySelector("#login-form");
const forgotPasswordToggle = document.querySelector("#forgot-password-toggle");
const forgotPasswordForm = document.querySelector("#forgot-password-form");
const resetPasswordForm = document.querySelector("#reset-password-form");
const registerForm = document.querySelector("#register-form");
const contactsForm = document.querySelector("#contacts-form");
const changePasswordForm = document.querySelector("#change-password-form");
const contactsSummary = document.querySelector("#contacts-summary");
const adminUsersSection = document.querySelector("#admin-users-section");
const adminUsersList = document.querySelector("#admin-users-list");
const accessHistoryList = document.querySelector("#access-history-list");
const accessHistorySection = document.querySelector("#access-history-section");
const linkRequestsSection = document.querySelector("#link-requests-section");
const linkRequestsList = document.querySelector("#link-requests-list");
const approvalsSubtabs = document.querySelector("#approvals-subtabs");
const approvalViewButtons = Array.from(document.querySelectorAll("[data-approvals-view]"));
const approvalsPanelTitle = document.querySelector("#approvals-panel-title");
const approvalsPanelDescription = document.querySelector("#approvals-panel-description");
const adminUsersEyebrow = document.querySelector("#admin-users-eyebrow");
const adminUsersTitle = document.querySelector("#admin-users-title");
const adminUsersDescription = document.querySelector("#admin-users-description");
const turmaSecretariesList = document.querySelector("#turma-secretaries-list");
const addTurmaSecretaryButton = document.querySelector("#add-turma-secretary-button");
const turmaForm = document.querySelector("#turma-form");
const turmaSummary = document.querySelector("#turma-summary");
const turmaList = document.querySelector("#turma-list");
const authNotice = document.querySelector("#auth-notice");
const pendingInvites = document.querySelector("#pending-invites");
const linkRequestPanel = document.querySelector("#link-request-panel");
const linkRequestForm = document.querySelector("#link-request-form");
const linkRequestDirigente = document.querySelector("#link-request-dirigente");
const linkRequestTurma = document.querySelector("#link-request-turma");
const linkRequestSummary = document.querySelector("#link-request-summary");
const myLinkRequestsList = document.querySelector("#my-link-requests-list");
const logoutButton = document.querySelector("#logout-button");
const newTurmaButton = document.querySelector("#new-turma-button");
const scopeButtons = Array.from(document.querySelectorAll("[data-scope-button]"));
const turmaActions = document.querySelector("#turma-actions");
const ownerSelect = document.querySelector("#owner-user-id");
const copyProgramSelect = document.querySelector("#copy-program-from-turma-id");
const editTurmaButton = document.querySelector("#edit-turma-button");
const saveTurmaButton = document.querySelector("#save-turma-button");
const archiveButton = document.querySelector("#archive-turma-button");
const deleteButton = document.querySelector("#delete-turma-button");
const restoreButton = document.querySelector("#restore-turma-button");
const studentsPanel = document.querySelector("#students-panel");
const studentsFileInput = document.querySelector("#students-file-input");
const studentsTemplateButton = document.querySelector("#students-template-button");
const studentsTemplateDialog = document.querySelector("#students-template-dialog");
const downloadStudentsTemplateButton = document.querySelector("#download-students-template-button");
const confirmActionDialog = document.querySelector("#confirm-action-dialog");
const confirmActionTitle = document.querySelector("#confirm-action-title");
const confirmActionMessage = document.querySelector("#confirm-action-message");
const confirmActionCancelButton = document.querySelector("#confirm-action-cancel");
const confirmActionConfirmButton = document.querySelector("#confirm-action-confirm");
const studentsTableBody = document.querySelector("#students-table-body");
const studentsImportFeedback = document.querySelector("#students-import-feedback");
const turmaWeekdayInput = document.querySelector("#turma-weekday");
const toastRegion = document.querySelector("#toast-region");
const titleInput = document.querySelector("#program-title");
const classNumberInput = document.querySelector("#program-class-number");
const startDateInput = document.querySelector("#program-start-date");
const endDateInput = document.querySelector("#program-end-date");
const table = document.querySelector("#program-table");
const resetTemplateButton = document.querySelector("#reset-template");
const addRowButton = document.querySelector("#add-row");
const removeLastRowButton = document.querySelector("#remove-last-row");
const addColumnButton = document.querySelector("#add-column");
const removeLastColumnButton = document.querySelector("#remove-last-column");
const editProgramButton = document.querySelector("#edit-program");
const saveProgramButton = document.querySelector("#save-program");
const deleteProgramButton = document.querySelector("#delete-program");
const exportMenu = document.querySelector("#export-menu");
const exportPdfButton = document.querySelector("#export-pdf");
const shareProgramCard = document.querySelector("#share-program-card");
const shareProgramUrlInput = document.querySelector("#share-program-url");
const copyShareProgramLinkButton = document.querySelector("#copy-share-program-link");
const openShareProgramLink = document.querySelector("#open-share-program-link");
const shareStudentSignupUrlInput = document.querySelector("#share-student-signup-url");
const copyShareStudentSignupLinkButton = document.querySelector("#copy-share-student-signup-link");
const openShareStudentSignupLink = document.querySelector("#open-share-student-signup-link");
const toggleShareStudentSignupLinkButton = document.querySelector("#toggle-share-student-signup-link");
const shareStudentSignupStatus = document.querySelector("#share-student-signup-status");
const shareProgramStatus = document.querySelector("#share-program-status");
const publicStudentSignupCard = document.querySelector("#public-student-signup-card");
const publicStudentSignupForm = document.querySelector("#public-student-signup-form");
const publicStudentSignupFeedback = document.querySelector("#public-student-signup-feedback");
const publicStudentSignupTurmaInfo = document.querySelector("#public-student-signup-turma-info");

const TOKEN_KEY = "eae.api.token";
const SHARE_TOKEN_QUERY_KEY = "shareToken";
const STUDENT_SIGNUP_QUERY_KEY = "studentSignup";
const SECRETARY_INVITE_TOKEN_QUERY_KEY = "secretaryInviteToken";
const RESET_PASSWORD_TOKEN_QUERY_KEY = "resetPasswordToken";
let pendingColumnWidthFrame = null;
const pendingColumnIndexes = new Set();
const MAX_TRAILING_EMPTY_ROWS = 20;
const TRAILING_EMPTY_ROWS_TRIM_THRESHOLD = 50;
const MAX_TRAILING_EMPTY_COLUMNS = 2;
const TRAILING_EMPTY_COLUMNS_TRIM_THRESHOLD = 3;
const MIN_MANUAL_COLUMN_WIDTH_PX = 40;
const STUDENTS_TEMPLATE_CSV = "nome,email,whatsapp\nAluno Exemplo,aluno@example.org,(11) 99999-0000\n";
const AUTOSAVE_DELAY_MS = 900;
const autosaveState = {
  turmaTimer: null,
  turmaInFlight: false,
  turmaDirty: false,
  contactsTimer: null,
  contactsInFlight: false,
  contactsDirty: false,
  programTimer: null,
  programInFlight: false,
  programDirty: false,
};
let toastDismissTimer = null;

setupTabs();
setupForms();
setupProgramActions();
bootstrap();

async function bootstrap() {
  const shareToken = getPublicShareTokenFromUrl();
  if (shareToken) {
    await bootstrapPublicShareMode(shareToken);
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
  renderLoggedOutState();
  revealResetPasswordFormIfNeeded();
}

function getPublicShareTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = String(params.get(SHARE_TOKEN_QUERY_KEY) || "").trim();
  if (queryToken) {
    return queryToken;
  }

  const pathMatch = window.location.pathname.match(/^\/public\/alunos\/([^/]+)\/?$/);
  return String(pathMatch?.[1] || "").trim();
}

function isStudentSignupModeFromUrl() {
  if (window.location.pathname.match(/^\/public\/alunos\/[^/]+\/?$/)) {
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  const rawValue = String(params.get(STUDENT_SIGNUP_QUERY_KEY) || "").trim().toLowerCase();
  return rawValue === "1" || rawValue === "true" || rawValue === "yes";
}

function getResetPasswordTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get(RESET_PASSWORD_TOKEN_QUERY_KEY) || "").trim();
}

function clearResetPasswordTokenFromUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete(RESET_PASSWORD_TOKEN_QUERY_KEY);
  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

function revealResetPasswordFormIfNeeded() {
  const token = getResetPasswordTokenFromUrl();
  if (!token || !resetPasswordForm) return;
  resetPasswordForm.hidden = false;
  if (forgotPasswordForm) forgotPasswordForm.hidden = true;
}

function getSecretaryInviteTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get(SECRETARY_INVITE_TOKEN_QUERY_KEY) || "").trim();
}

function clearSecretaryInviteTokenFromUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete(SECRETARY_INVITE_TOKEN_QUERY_KEY);
  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

async function tryAcceptSecretaryInviteFromUrl() {
  const token = getSecretaryInviteTokenFromUrl();
  if (!token || !state.session) {
    return null;
  }

  const response = await apiRequest(`/api/secretary-invite-links/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
  state.session = response.user || state.session;
  clearSecretaryInviteTokenFromUrl();
  renderSession();
  return response;
}

async function bootstrapPublicShareMode(token) {
  state.isPublicShareMode = true;
  const isStudentSignupMode = isStudentSignupModeFromUrl();
  document.body.classList.add("is-public-share-mode");
  document.body.classList.toggle("is-public-student-signup-mode", isStudentSignupMode);
  state.currentProgramShareUrl = "";
  state.currentProgramShareTurmaId = null;
  state.isProgramShareLoading = false;
  state.currentProgramShareError = "";

  try {
    const publicApiPath = isStudentSignupMode
      ? `/api/public/turma/${encodeURIComponent(token)}`
      : `/api/public/programa/${encodeURIComponent(token)}`;
    const response = await window.fetch(publicApiPath);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Não foi possível carregar o programa compartilhado.");
    }

    const turma = data.turma || null;
    const program = data.program || null;
    if (!turma || (!isStudentSignupMode && !program)) {
      throw new Error("Link compartilhado inválido.");
    }

    state.session = {
      id: 0,
      name: "Visualização pública",
      role: "Visitante",
      accessStatus: "active",
      requestedRole: "Visitante",
    };
    state.turmas = [turma];
    state.currentTurmaId = turma.id;
    state.currentProgramTab = getProgramTabForTurmaType(turma.tipo) || "programa-cb";
    state.program = program
      ? removePublicContatoColumn(resolveProgramForActiveTab(program))
      : createMinimalProgram();
    state.isProgramEditing = false;
    state.isCreatingTurma = false;
    state.isTurmaDetailsOpen = false;
    state.isEditingTurma = false;
    state.importedStudents = Array.isArray(turma.alunos) ? turma.alunos : [];
    state.activeTurmasForCopy = [];

    renderSession();
    renderTurmaList();
    renderTurmaForm();
    renderContactsForm();
    renderProgram();
    renderTurmaActions();
    renderContactsSummary();
    renderPublicStudentSignupCard();
    turmaSummary.hidden = false;
    renderTurmaSummary(turma);
    activateTab(state.currentProgramTab);
    if (isStudentSignupMode) {
      publicStudentSignupForm?.elements?.nome?.focus();
    }
  } catch (error) {
    // Em links públicos nunca voltamos para tela de login.
    state.session = {
      id: 0,
      name: "Visualização pública",
      role: "Visitante",
      accessStatus: "active",
      requestedRole: "Visitante",
    };
    state.turmas = [];
    state.currentTurmaId = null;
    state.program = createMinimalProgram();
    state.isProgramEditing = false;
    state.isCreatingTurma = false;
    state.isTurmaDetailsOpen = false;
    state.isEditingTurma = false;
    state.importedStudents = [];

    renderSession();
    renderTurmaList();
    renderTurmaForm();
    renderContactsForm();
    renderProgram();
    renderTurmaActions();
    renderContactsSummary();
    renderPublicStudentSignupCard();
    turmaSummary.hidden = false;
    turmaSummary.textContent = error.message || "Não foi possível abrir o link compartilhado.";
    activateTab("programa-cb");
  }
}

function createEmptyProgram() {
  const fallback = {
    id: null,
    meta: {
      title: "Programa padronizado da turma",
      startDate: "",
      endDate: "",
    },
    headers: ["A", "B", "C", "D", "E"],
    rows: [["", "", "", "", ""]],
  };
  const template = window.DEFAULT_PROGRAM_TEMPLATE
    ? structuredClone(window.DEFAULT_PROGRAM_TEMPLATE)
    : fallback;
  const normalizedTemplateRows = Array.isArray(template.rows) ? template.rows : fallback.rows;
  const shouldPromoteTemplateHeader = state.currentProgramTab === "programa-cb";
  const { headers, rows } = shouldPromoteTemplateHeader
    ? extractProgramTableStructure(normalizedTemplateRows, template.headers || fallback.headers)
    : {
        headers: template.headers || fallback.headers,
        rows: normalizedTemplateRows,
      };

  return normalizeProgramStructure({
    id: null,
    meta: {
      title: template.meta?.title || fallback.meta.title,
      startDate: getProgramStartDateForCurrentTab(template.meta?.startDate || fallback.meta.startDate),
      endDate: template.meta?.endDate || fallback.meta.endDate,
    },
    headers,
    rows,
  });
}

function createMinimalProgram() {
  return {
    id: null,
    meta: {
      title: "Programa da turma",
      startDate: "",
      endDate: "",
    },
    headers: ["A", "B", "C", "D", "E"],
    rows: [["", "", "", "", ""]],
  };
}

function setupTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      if (tab.disabled) return;
      if (state.isPublicShareMode && tab.dataset.tabPanelTarget !== "programa" && tab.dataset.tabTarget !== state.currentProgramTab) {
        return;
      }
      const targetPanel = tab.dataset.tabPanelTarget || tab.dataset.tabTarget;
      if (targetPanel === "programa" && tab.dataset.tabTarget) {
        state.currentProgramTab = tab.dataset.tabTarget;
      }
      tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.tabPanel === targetPanel);
      });

      if (targetPanel === "cadastro") {
        if (state.session) {
          try {
            await refreshSessionProfile();
          } catch (error) {
            contactsSummary.textContent = error.message;
          }
        }

        if (state.session) {
          renderContactsForm();
          renderContactsSummary();
          renderAdminUserManagement();
        } else if (state.turmas.length) {
          selectTurma(state.turmas[0].id).catch((error) => {
            contactsSummary.textContent = error.message;
          });
        } else {
          renderContactsForm();
          renderContactsSummary();
          renderAdminUserManagement();
        }
        return;
      }

      if (targetPanel === "turmas") {
        state.isCreatingTurma = false;
        state.isTurmaDetailsOpen = false;
        renderTurmaList();
        renderTurmaForm();
        renderTurmaActions();
        turmaSummary.hidden = true;
        turmaSummary.textContent = "Clique em uma turma para visualizar ou editar os dados.";
        return;
      }

      if (targetPanel !== "programa") {
        return;
      }

      if (!state.currentTurmaId) {
        turmaSummary.hidden = false;
        turmaSummary.textContent = "Selecione uma turma para acessar o programa correspondente.";
        activateTab("turmas");
        return;
      }

      selectTurma(state.currentTurmaId).catch((error) => {
        turmaSummary.textContent = error.message;
      });
    });
  });
}

async function refreshSessionProfile() {
  if (!state.session) {
    return;
  }

  const response = await apiRequest("/api/session");
  state.session = response.user;
  renderSession();
}

function setupForms() {
  sessionChip?.addEventListener("click", () => {
    if (!state.session || !userMenuPanel) return;
    const isOpen = !userMenuPanel.hidden;
    userMenuPanel.hidden = isOpen;
    sessionChip.setAttribute("aria-expanded", String(!isOpen));
  });

  openCadastroButton?.addEventListener("click", () => {
    if (userMenuPanel) userMenuPanel.hidden = true;
    sessionChip?.setAttribute("aria-expanded", "false");
    activateTab("cadastro");
  });

  document.addEventListener("click", (event) => {
    if (!userMenu || !userMenuPanel || userMenuPanel.hidden) return;
    if (userMenu.contains(event.target)) return;
    userMenuPanel.hidden = true;
    sessionChip?.setAttribute("aria-expanded", "false");
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Mesmo se a sessão já estiver inválida, seguimos limpando o cliente.
    }

    window.localStorage.removeItem(TOKEN_KEY);
    if (userMenuPanel) userMenuPanel.hidden = true;
    sessionChip?.setAttribute("aria-expanded", "false");
    renderLoggedOutState("Sessão encerrada.");
    activateTab("login");
  });

  forgotPasswordToggle?.addEventListener("click", () => {
    if (!forgotPasswordForm) return;
    forgotPasswordForm.hidden = !forgotPasswordForm.hidden;
  });

  forgotPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(forgotPasswordForm).entries());
      await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: payload,
      });
      authNotice.textContent = "Se o e-mail estiver cadastrado, você receberá as instruções.";
      showToast("success", "Recuperação de senha", "Se o e-mail estiver cadastrado, enviaremos o link.");
      forgotPasswordForm.reset();
      forgotPasswordForm.hidden = true;
    } catch (error) {
      authNotice.textContent = error.message;
      showToast("error", "Erro na recuperação", error.message);
    }
  });

  resetPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = getResetPasswordTokenFromUrl();
    if (!token) {
      authNotice.textContent = "Token de recuperação inválido.";
      return;
    }

    try {
      const formData = Object.fromEntries(new FormData(resetPasswordForm).entries());
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: {
          token,
          password: formData.password,
        },
      });
      clearResetPasswordTokenFromUrl();
      resetPasswordForm.reset();
      resetPasswordForm.hidden = true;
      authNotice.textContent = "Senha redefinida com sucesso. Faça login com a nova senha.";
      showToast("success", "Senha redefinida", "Sua nova senha já pode ser usada no login.");
      activateTab("login");
    } catch (error) {
      authNotice.textContent = error.message;
      showToast("error", "Erro ao redefinir senha", error.message);
    }
  });

  newTurmaButton.addEventListener("click", () => {
    cancelAutosaveQueue("turma");
    cancelAutosaveQueue("program");
    state.currentTurmaId = null;
    state.isCreatingTurma = true;
    state.isTurmaDetailsOpen = true;
    state.isEditingTurma = true;
    state.importedStudents = [];
    studentsImportFeedback.textContent = "";
    state.program = createEmptyProgram();
    renderTurmaList();
    renderTurmaForm();
    renderContactsForm();
    renderCopyProgramField();
    renderProgram();
    renderTurmaActions();
    renderContactsSummary();
    turmaSummary.hidden = false;
    turmaSummary.textContent = "Preencha os dados para cadastrar uma nova turma.";
  });

  editTurmaButton?.addEventListener("click", () => {
    const turma = findCurrentTurma();
    if (!turma || turma.archivedAt) {
      return;
    }

    state.isEditingTurma = true;
    renderTurmaForm(turma);
    renderTurmaActions(turma);
    turmaSummary.hidden = false;
    turmaSummary.textContent = `Editando o cadastro da turma ${turma.nome}.`;
  });

  addTurmaSecretaryButton?.addEventListener("click", () => {
    const existingDraft = turmaSecretariesList.querySelector('.secretary-row[data-secretary-state="draft"]');
    if (!existingDraft) {
      appendSecretaryDraftField(turmaSecretariesList, {});
    } else {
      existingDraft.querySelector('input[name="secretarioNome"]')?.focus();
    }
    scheduleTurmaAutosave();
  });

  studentsTemplateButton?.addEventListener("click", openStudentsTemplateDialog);
  downloadStudentsTemplateButton?.addEventListener("click", downloadStudentsTemplateFile);

  studentsFileInput?.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    try {
      const importResult = await readStudentsFromSpreadsheet(file);
      state.importedStudents = importResult.students;
      renderStudentsPanel();
      const total = state.importedStudents.length;
      const warningsSuffix = importResult.warnings.length
        ? ` ${importResult.warnings.length} aviso(s): ${importResult.warnings.join(" | ")}`
        : "";
      studentsImportFeedback.textContent =
        total > 0
          ? `${total} aluno(s) importado(s) de ${file.name}.${warningsSuffix}`
          : `Nenhum aluno encontrado em ${file.name}.`;
      showToast(
        "success",
        "Importação concluída",
        importResult.warnings.length
          ? `${total} aluno(s) carregado(s) com ${importResult.warnings.length} aviso(s).`
          : `${total} aluno(s) carregado(s) com sucesso.`
      );
      scheduleTurmaAutosave();
    } catch (error) {
      studentsImportFeedback.textContent = error.message;
      renderStudentsPanel();
      showToast("error", "Erro na importação", error.message);
    } finally {
      event.target.value = "";
    }
  });

  turmaForm.elements.inicio?.addEventListener("input", () => {
    syncTurmaWeekdayField(turmaForm.elements.inicio.value);
  });

  turmaForm.elements.horarioInicio?.addEventListener("click", openNativeTimePicker);
  turmaForm.elements.horarioInicio?.addEventListener("focus", openNativeTimePicker);

  turmaForm.addEventListener("input", handleTurmaAutosaveInput);
  turmaForm.addEventListener("change", handleTurmaAutosaveInput);
  contactsForm.addEventListener("input", handleContactsAutosaveInput);
  contactsForm.addEventListener("change", handleContactsAutosaveInput);

  archiveButton.addEventListener("click", async () => {
    if (!state.currentTurmaId) return;
    if (!window.confirm("Arquivar esta turma? O programa continuará salvo e poderá ser restaurado.")) {
      return;
    }

    await archiveCurrentTurma(true);
  });

  restoreButton.addEventListener("click", async () => {
    if (!state.currentTurmaId) return;
    await archiveCurrentTurma(false);
  });

  deleteButton.addEventListener("click", async () => {
    if (!state.currentTurmaId) return;
    const confirmed = await showConfirmActionDialog({
      title: "Excluir turma",
      message: "Excluir permanentemente esta turma? Essa ação não poderá ser desfeita.",
      confirmLabel: "Excluir turma",
    });
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/turmas/${state.currentTurmaId}`, { method: "DELETE" });
      state.currentTurmaId = null;
      state.program = createEmptyProgram();
      turmaSummary.textContent = "Turma excluída com sucesso.";
      await loadTurmas();
      activateTab("turmas");
    } catch (error) {
      turmaSummary.textContent = error.message;
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authNotice.textContent = "Validando acesso...";

    try {
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: payload,
      });

      window.localStorage.setItem(TOKEN_KEY, response.token);
      state.session = response.user;
      loginForm.reset();
      renderSession();
      const inviteAcceptance = await tryAcceptSecretaryInviteFromUrl();
      await loadReferenceData();
      authNotice.textContent = inviteAcceptance
        ? `Vínculo confirmado na turma ${inviteAcceptance.turma?.nome || ""}.`
        : "Login realizado com sucesso.";
      showToast(
        "success",
        "Login realizado",
        inviteAcceptance
          ? "Seu vínculo como secretário foi confirmado com sucesso."
          : "Sua sessão foi iniciada com sucesso."
      );
      await loadTurmas();
      activateTab("turmas");
    } catch (error) {
      authNotice.textContent = error.message;
      showToast("error", "Erro de login", error.message);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authNotice.textContent = "Criando sua conta...";

    try {
      const payload = Object.fromEntries(new FormData(registerForm).entries());
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: payload,
      });

      window.localStorage.setItem(TOKEN_KEY, response.token);
      state.session = response.user;
      registerForm.reset();
      renderSession();
      const inviteAcceptance = await tryAcceptSecretaryInviteFromUrl();
      await loadReferenceData();
      authNotice.textContent = inviteAcceptance
        ? `Conta criada e vínculo confirmado na turma ${inviteAcceptance.turma?.nome || ""}.`
        : "Conta criada e sessão iniciada.";
      showToast(
        "success",
        "Conta criada",
        inviteAcceptance
          ? "Conta criada e vínculo de secretário confirmado com sucesso."
          : "Sua conta foi criada e a sessão já está ativa."
      );
      await loadTurmas();
      activateTab("turmas");
    } catch (error) {
      authNotice.textContent = error.message;
      showToast("error", "Erro ao criar conta", error.message);
    }
  });

  turmaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await persistTurmaForm({ autosave: false, navigateToProgram: false });
    } catch (error) {
      turmaSummary.textContent = error.message;
      showToast("error", "Erro ao salvar", error.message);
    }
  });

  contactsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await persistContactsProfile({ autosave: false });
    } catch (error) {
      contactsSummary.textContent = error.message;
      showToast("error", "Erro ao salvar contatos", error.message);
    }
  });

  changePasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session) {
      activateTab("login");
      return;
    }
    try {
      const payload = Object.fromEntries(new FormData(changePasswordForm).entries());
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: payload,
      });
      changePasswordForm.reset();
      contactsSummary.textContent = "Senha atualizada com sucesso.";
      showToast("success", "Senha atualizada", "Sua senha foi alterada com sucesso.");
    } catch (error) {
      contactsSummary.textContent = error.message;
      showToast("error", "Erro ao alterar senha", error.message);
    }
  });

  adminUsersList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-user-save], [data-user-invite]");
    if (!button) {
      return;
    }

    const userId = Number(button.dataset.userSave || button.dataset.userApprove || button.dataset.userReject || button.dataset.userInvite);
    const select = adminUsersList.querySelector(`[data-user-role="${userId}"]`);
    const turmaSelect = adminUsersList.querySelector(`[data-secretary-turma="${userId}"]`);
    const body = button.dataset.userInvite
      ? {
          userId,
          turmaId: turmaSelect?.value,
        }
      : { role: select?.value };

    try {
      const response = await apiRequest(button.dataset.userInvite ? "/api/turma-invites" : `/api/users/${userId}`, {
        method: button.dataset.userInvite ? "POST" : "PUT",
        body,
      });
      if (button.dataset.userInvite && turmaSelect?.value) {
        delete state.pendingInviteLocks[`${userId}:${turmaSelect.value}`];
      }
      state.users = state.users.map((user) => (user.id === userId && response.user ? response.user : user));
      if (state.session?.id === userId) {
        state.session = response.user;
        renderSession();
      }
      await loadReferenceData();
      renderAdminUserManagement();
      const actionFeedback = getApprovalActionFeedback(button, response);
      showToast("success", actionFeedback.title, actionFeedback.message);
    } catch (error) {
      if (button.dataset.userInvite && error?.message?.includes("Já existe um convite pendente")) {
        const selectedTurmaId = String(turmaSelect?.value || "");
        if (selectedTurmaId) {
          state.pendingInviteLocks[`${userId}:${selectedTurmaId}`] = true;
        }
        updateInviteRowState(userId);
      }
      const errorTitle = button.dataset.userInvite
        ? "Erro ao enviar convite"
        : "Erro ao atualizar usuário";
      showToast("error", errorTitle, error.message);
    }
  });

  adminUsersList?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-secretary-turma]");
    if (!select) return;
    updateInviteRowState(Number(select.dataset.secretaryTurma));
  });

  pendingInvites?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-invite-accept]");
    if (!button) return;

    try {
      const response = await apiRequest(`/api/turma-invites/${button.dataset.inviteAccept}/accept`, {
        method: "POST",
      });
      state.session = response.user;
      renderSession();
      await loadReferenceData();
      await loadTurmas();
      pendingInvites.hidden = true;
      pendingInvites.replaceChildren();
      authNotice.textContent = "Convite aceito. Acesso liberado.";
      showToast("success", "Convite aceito", "Você já pode acessar a turma.");
      activateTab("turmas");
    } catch (error) {
      showToast("error", "Erro ao aceitar convite", error.message);
    }
  });

  linkRequestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session) return;

    const payload = {
      dirigenteUserId: linkRequestDirigente?.value,
      turmaId: linkRequestTurma?.value,
    };

    try {
      await apiRequest("/api/turma-link-requests", {
        method: "POST",
        body: payload,
      });
      linkRequestSummary.textContent = "Solicitação enviada. Aguarde aprovação do dirigente.";
      showToast("success", "Solicitação enviada", "O dirigente recebeu sua solicitação de vínculo.");
      await loadPendingAccessStateData();
      renderPendingAccessTools();
    } catch (error) {
      linkRequestSummary.textContent = error.message;
      showToast("error", "Erro ao solicitar vínculo", error.message);
    }
  });

  linkRequestDirigente?.addEventListener("change", () => {
    renderLinkRequestTurmaOptions(linkRequestDirigente.value);
  });

  linkRequestsList?.addEventListener("click", async (event) => {
    const approveButton = event.target.closest("[data-link-request-approve]");
    const rejectButton = event.target.closest("[data-link-request-reject]");
    if (!approveButton && !rejectButton) return;
    await handleTurmaLinkRequestDecision(approveButton, rejectButton);
  });

  turmaList?.addEventListener("click", async (event) => {
    const approveButton = event.target.closest("[data-turma-link-approve]");
    const rejectButton = event.target.closest("[data-turma-link-reject]");
    if (!approveButton && !rejectButton) return;
    event.stopPropagation();
    await handleTurmaLinkRequestDecision(approveButton, rejectButton);
  });

  approvalsSubtabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-approvals-view]");
    if (!button) return;
    state.currentApprovalsView = button.dataset.approvalsView || "cadastros";
    renderApprovalsView();
  });
}

async function handleTurmaLinkRequestDecision(approveButton, rejectButton) {
  const requestId = approveButton?.dataset.linkRequestApprove
    || approveButton?.dataset.turmaLinkApprove
    || rejectButton?.dataset.linkRequestReject
    || rejectButton?.dataset.turmaLinkReject;
  const action = Boolean(approveButton) ? "approve" : "reject";
  try {
    await apiRequest(`/api/turma-link-requests/${requestId}/${action}`, { method: "POST" });
    showToast(
      "success",
      action === "approve" ? "Solicitação aprovada" : "Solicitação rejeitada",
      action === "approve" ? "O secretário já pode acessar a turma." : "Solicitação de vínculo rejeitada."
    );
    await loadReferenceData();
    renderLinkRequestsForDirigente();
    renderTurmaList();
  } catch (error) {
    showToast("error", "Erro ao decidir solicitação", error.message);
  }
}

function setupProgramActions() {
  resetTemplateButton?.addEventListener("click", () => {
    const nextProgram = createEmptyProgram();
    nextProgram.meta.title = titleInput.value || nextProgram.meta.title;
    nextProgram.meta.startDate = startDateInput.value || nextProgram.meta.startDate;
    nextProgram.meta.endDate = endDateInput.value || nextProgram.meta.endDate;
    state.program = nextProgram;
    renderProgram();
    scheduleProgramAutosave();
  });

  addRowButton?.addEventListener("click", () => {
    state.program.rows.push(new Array(state.program.headers.length).fill(""));
    renderProgram();
    scheduleProgramAutosave();
  });

  removeLastRowButton?.addEventListener("click", () => {
    if (!state.program.rows.length) return;
    state.program.rows.pop();
    renderProgram();
    scheduleProgramAutosave();
  });

  addColumnButton?.addEventListener("click", () => {
    state.program.headers.push(`Nova coluna ${state.program.headers.length + 1}`);
    state.program.rows = state.program.rows.map((row) => [...row, ""]);
    renderProgram();
    scheduleProgramAutosave();
  });

  removeLastColumnButton?.addEventListener("click", () => {
    if (state.program.headers.length <= 1) return;
    state.program.headers.pop();
    state.program.rows = state.program.rows.map((row) => row.slice(0, state.program.headers.length));
    renderProgram();
    scheduleProgramAutosave();
  });

  editProgramButton?.addEventListener("click", () => {
    const currentTurma = findCurrentTurma();
    if (currentTurma?.archivedAt) {
      return;
    }

    state.isProgramEditing = !state.isProgramEditing;
    renderProgram();
  });

  saveProgramButton?.addEventListener("click", saveProgram);
  deleteProgramButton?.addEventListener("click", deleteSavedProgram);
  exportPdfButton?.addEventListener("click", () => {
    exportProgramToPdf();
    exportMenu?.removeAttribute("open");
  });
  copyShareProgramLinkButton?.addEventListener("click", copyShareProgramLink);
  copyShareStudentSignupLinkButton?.addEventListener("click", copyShareStudentSignupLink);
  openShareStudentSignupLink?.addEventListener("click", openStudentSignupShareLink);
  toggleShareStudentSignupLinkButton?.addEventListener("click", toggleStudentSignupShareLink);
  shareStudentSignupUrlInput?.addEventListener("click", (event) => {
    event.preventDefault();
    shareStudentSignupUrlInput.blur();
  });
  shareStudentSignupUrlInput?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  [titleInput, startDateInput, endDateInput].forEach((input) => {
    input.addEventListener("input", () => {
      syncProgramMeta();
      scheduleProgramAutosave();
    });
  });
  startDateInput.addEventListener("input", handleProgramDateInput);
  startDateInput.addEventListener("blur", handleProgramDateBlur);
  endDateInput.addEventListener("input", handleProgramDateInput);
  endDateInput.addEventListener("blur", handleProgramDateBlur);
}

function buildStudentSignupShareUrl(programShareUrl, shareToken = "") {
  const normalizedProgramUrl = String(programShareUrl || "").trim();
  const normalizedToken = String(shareToken || "").trim();
  if (normalizedToken) {
    return `${window.location.origin}/public/alunos/${encodeURIComponent(normalizedToken)}`;
  }
  if (!normalizedProgramUrl) return "";
  try {
    const url = new URL(normalizedProgramUrl, window.location.origin);
    const urlToken = String(url.searchParams.get(SHARE_TOKEN_QUERY_KEY) || "").trim();
    if (!urlToken) {
      return "";
    }
    return `${window.location.origin}/public/alunos/${encodeURIComponent(urlToken)}`;
  } catch {
    return "";
  }
}

async function loadReferenceData() {
  state.users = [];
  state.accessEvents = [];
  state.linkRequests = [];
  state.activeTurmasForCopy = [];
  if (!hasAppAccess()) {
    await loadPendingAccessStateData();
    renderPendingAccessTools();
    renderAdminUserManagement();
    renderAccessHistory();
    renderLinkRequestsForDirigente();
    renderApprovalsView();
    renderCopyProgramField();
    return;
  }

  if (!canManageUserApprovals()) {
    if (canInviteSecretaries()) {
      const [usersResponse, copySourcesResponse] = await Promise.all([
        apiRequest("/api/secretary-candidates"),
        apiRequest("/api/turmas?scope=active"),
      ]);
      state.users = usersResponse.users;
      state.activeTurmasForCopy = copySourcesResponse.turmas;
      renderAdminUserManagement();
      renderAccessHistory();
      renderLinkRequestsForDirigente();
      renderApprovalsView();
      return;
    }
    renderAdminUserManagement();
    renderAccessHistory();
    renderApprovalsView();
    await loadCopySourceTurmas();
    return;
  }

  const [usersResponse, accessEventsResponse, copySourcesResponse, linkRequestsResponse] = await Promise.all([
    apiRequest("/api/users"),
    apiRequest("/api/access-events"),
    apiRequest("/api/turmas?scope=active"),
    apiRequest("/api/turma-link-requests"),
  ]);
  state.users = usersResponse.users;
  state.accessEvents = accessEventsResponse.events;
  state.activeTurmasForCopy = copySourcesResponse.turmas;
  state.linkRequests = linkRequestsResponse.requests || [];
  renderAdminUserManagement();
  renderAccessHistory();
  renderLinkRequestsForDirigente();
  renderApprovalsView();
}

async function loadCopySourceTurmas() {
  if (!state.session) {
    state.activeTurmasForCopy = [];
    renderCopyProgramField();
    return;
  }

  const response = await apiRequest("/api/turmas?scope=active");
  state.activeTurmasForCopy = response.turmas;
  renderCopyProgramField();
}

async function loadTurmas(preferredTurmaId = null) {
  const [activeResponse, archivedResponse] = await Promise.all([
    apiRequest("/api/turmas?scope=active"),
    apiRequest("/api/turmas?scope=archived"),
  ]);
  state.activeTurmasForCopy = activeResponse.turmas;
  state.turmas = [...activeResponse.turmas, ...archivedResponse.turmas];
  updateAccessControlledTabs();
  renderTurmaList();
  renderCopyProgramField();

  if (!state.turmas.length) {
    cancelAutosaveQueue("turma");
    cancelAutosaveQueue("program");
    state.currentTurmaId = null;
    state.isCreatingTurma = false;
    state.isTurmaDetailsOpen = false;
    state.isEditingTurma = false;
    state.importedStudents = [];
    state.program = createEmptyProgram();
    state.manualColumnWidths = {};
    renderTurmaForm();
    renderContactsForm();
    renderProgram();
    renderTurmaActions();
    renderContactsSummary();
    turmaSummary.hidden = false;
    turmaSummary.textContent = "Nenhuma turma cadastrada ainda.";
    return;
  }

  const hasPreferred = preferredTurmaId && state.turmas.some((turma) => turma.id === preferredTurmaId);
  const hasCurrent = state.currentTurmaId && state.turmas.some((turma) => turma.id === state.currentTurmaId);
  state.currentTurmaId = hasPreferred ? preferredTurmaId : (hasCurrent ? state.currentTurmaId : null);
  state.isCreatingTurma = false;
  state.isTurmaDetailsOpen = false;
  state.isEditingTurma = true;
  renderTurmaForm();
  renderContactsForm();
  renderTurmaActions();
  renderContactsSummary();
  turmaSummary.hidden = true;
  turmaSummary.textContent = "Clique em uma turma para visualizar ou editar os dados.";
}

async function selectTurma(turmaId) {
  cancelAutosaveQueue("turma");
  cancelAutosaveQueue("program");
  const response = await apiRequest(`/api/turmas/${turmaId}`);
  state.currentTurmaId = response.turma.id;
  state.currentProgramTab = getProgramTabForTurmaType(response.turma.tipo) || state.currentProgramTab;
  state.isCreatingTurma = false;
  state.isTurmaDetailsOpen = true;
  state.isEditingTurma = true;
  updateTurmaInState(response.turma);
  state.program = resolveProgramForActiveTab(response.program);
  state.manualColumnWidths = {};
  updateAccessControlledTabs();
  renderTurmaList();
  renderTurmaForm(response.turma);
  renderContactsForm(response.turma);
  renderProgram();
  await loadProgramShareLink(response.turma.id);
  turmaSummary.hidden = false;
  renderTurmaSummary(response.turma);
  renderTurmaActions(response.turma);
  renderContactsSummary(response.turma);
  state.importedStudents = Array.isArray(response.turma.alunos) ? response.turma.alunos : [];
  renderStudentsPanel(response.turma);
}

function renderTurmaList() {
  turmaList.innerHTML = "";

  if (!state.turmas.length) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "list-empty";
    emptyItem.textContent = "As turmas cadastradas aparecerão aqui.";
    turmaList.appendChild(emptyItem);
    return;
  }

  state.turmas.forEach((turma) => {
    const card = document.createElement("div");
    card.className = "turma-card";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "turma-item";
    button.classList.toggle("is-active", turma.id === state.currentTurmaId);
    button.classList.toggle("is-archived", Boolean(turma.archivedAt));
    button.classList.toggle("is-active-status", !turma.archivedAt);
    button.addEventListener("click", () => {
      selectTurma(turma.id).catch((error) => {
        turmaSummary.textContent = error.message;
      });
    });

    const title = document.createElement("strong");
    title.textContent = `${turma.nome} · ${turma.tipo || "Sem tipo"}`;
    button.appendChild(title);

    const meta = document.createElement("span");
    meta.textContent = buildTurmaCardSummary(turma);
    button.appendChild(meta);

    card.appendChild(button);

    const pendingRequests = (state.linkRequests || []).filter((request) => (
      Number(request.turmaId) === Number(turma.id) && request.status === "pending"
    ));
    if (canManageUserApprovals() && pendingRequests.length) {
      const requestsBlock = document.createElement("div");
      requestsBlock.className = "turma-link-requests";

      const title = document.createElement("strong");
      title.textContent = "Solicitações de vínculo pendentes desta turma";
      requestsBlock.appendChild(title);

      pendingRequests.forEach((request) => {
        const row = document.createElement("div");
        row.className = "turma-link-request-row";

        const info = document.createElement("span");
        info.textContent = `${request.requesterName} (${request.requesterEmail})`;

        const approveButton = document.createElement("button");
        approveButton.type = "button";
        approveButton.className = "ghost-action";
        approveButton.dataset.turmaLinkApprove = String(request.id);
        approveButton.textContent = "Aprovar";

        const rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "ghost-action";
        rejectButton.dataset.turmaLinkReject = String(request.id);
        rejectButton.textContent = "Rejeitar";

        row.appendChild(info);
        row.appendChild(approveButton);
        row.appendChild(rejectButton);
        requestsBlock.appendChild(row);
      });

      card.appendChild(requestsBlock);
    }

    turmaList.appendChild(card);
  });
}

function renderTurmaForm(turma = null) {
  turmaForm.hidden = !state.isTurmaDetailsOpen && !state.isCreatingTurma;
  turmaForm.reset();
  turmaSecretariesList.replaceChildren();
  renderCopyProgramField(turma);

  if (!turma) {
    turmaForm.elements.modalidade.value = "presencial";
    turmaForm.elements.tipo.value = "CB";
    turmaForm.elements.status.value = "ativo";
    turmaForm.elements.horarioInicio.value = "";
    syncTurmaWeekdayField("");
    appendSecretaryDraftField(turmaSecretariesList);
    studentsImportFeedback.textContent = "";
    renderTurmaFormButtons(null);
    renderStudentsPanel();
    setTurmaFormLocked(false);
    return;
  }

  turmaForm.elements.nome.value = turma.nome || "";
  turmaForm.elements.modalidade.value = turma.modalidade || "presencial";
  turmaForm.elements.tipo.value = turma.tipo || "CB";
  turmaForm.elements.status.value = turma.status || "ativo";
  turmaForm.elements.inicio.value = turma.inicio || "";
  turmaForm.elements.horarioInicio.value = turma.horarioInicio || turma.horarios || "";
  syncTurmaWeekdayField(turma.inicio || "");
  const secretarios = Array.isArray(turma.secretarios) && turma.secretarios.length
    ? turma.secretarios
    : [];
  secretarios.forEach((secretario) => appendSecretaryPendingRow(turmaSecretariesList, secretario));
  appendSecretaryDraftField(turmaSecretariesList);
  studentsImportFeedback.textContent = "";
  renderTurmaFormButtons(turma);
  renderStudentsPanel(turma);
  setTurmaFormLocked(Boolean(turma.archivedAt) || !state.isEditingTurma);
}

function renderContactsForm(turma = null) {
  contactsForm.reset();
  const profile = state.session || null;

  if (!profile) {
    setContactsFormLocked(true);
    return;
  }

  contactsForm.elements.dirigenteNome.value = profile.dirigenteNome || profile.name || "";
  contactsForm.elements.telefone.value = profile.telefone || "";
  contactsForm.elements.whatsapp.value = profile.whatsapp || "";
  contactsForm.elements.email.value = profile.contatoEmail || profile.email || "";
  setContactsFormLocked(false);
}

function renderOwnerField() {
  return;
}

function renderCopyProgramField(turma = null) {
  if (copyProgramSelect) {
    copyProgramSelect.value = "";
  }
}

function renderOwnerOptions(selectedId) {
  if (ownerSelect) {
    ownerSelect.value = String(selectedId || state.session?.id || "");
  }
}

function renderTurmaSummary(turma) {
  const parts = [
    `Turma ${turma.nome || "não informada"}`,
    formatTurmaTypeLabel(turma.tipo),
    formatTurmaModalidadeLabel(turma.modalidade),
    `Status: ${formatTurmaStatusLabel(turma.status)}`,
    `Início: ${turma.inicio || "não informado"}`,
  ];
  const diaSemana = formatWeekdayFromDate(turma.inicio);
  const horarioInicio = turma.horarioInicio || turma.horarios || "";
  if (diaSemana) {
    parts.push(`Dia da semana: ${diaSemana}`);
  }
  if (horarioInicio) {
    parts.push(`Horário de início: ${horarioInicio}`);
  }
  if (Array.isArray(turma.secretarios) && turma.secretarios.length) {
    parts.push(`Secretário(a)(s): ${turma.secretarios.map(formatSecretarySummary).join(", ")}`);
  }
  parts.push(`${Array.isArray(turma.alunos) ? turma.alunos.length : 0} aluno(s) importado(s)`);
  if (state.session?.role === "Admin" && turma.ownerName) {
    parts.push(`Responsável: ${turma.ownerName}`);
  }
  if (turma.archivedAt) {
    parts.push("Arquivada");
  }

  turmaSummary.textContent = `${parts.filter(Boolean).join(" - ")}.`;
}

function renderStudentsPanel() {
  const shouldShow = !turmaForm.hidden;
  studentsPanel.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  if (studentsFileInput) {
    studentsFileInput.disabled = !state.isCreatingTurma && !state.isEditingTurma;
  }

  const alunos = Array.isArray(state.importedStudents) ? state.importedStudents : [];
  studentsTableBody.innerHTML = "";

  if (!alunos.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "Nenhum aluno importado ainda.";
    row.appendChild(cell);
    studentsTableBody.appendChild(row);
    if (!studentsImportFeedback.textContent.trim()) {
      studentsImportFeedback.textContent = "Nenhum aluno importado ainda.";
    }
    return;
  }

  studentsImportFeedback.textContent = `${alunos.length} aluno(s) carregado(s) no cadastro.`;
  alunos.forEach((aluno) => {
    const row = document.createElement("tr");
    [aluno.nome, aluno.email, aluno.whatsapp].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.appendChild(cell);
    });
    studentsTableBody.appendChild(row);
  });
}

function renderContactsSummary(turma = null) {
  if (!state.session) {
    contactsSummary.textContent = "Faça login para cadastrar dirigente e contatos.";
    return;
  }

  const dirigenteNome = state.session.dirigenteNome || state.session.name || "";
  const contatoEmail = state.session.contatoEmail || state.session.email || "";
  contactsSummary.textContent =
    `Dirigente: ${dirigenteNome || "não informado"}. ` +
    `Telefone: ${state.session.telefone || "não informado"}. ` +
    `Mensageiro: ${state.session.whatsapp || "não informado"}. ` +
    `E-mail: ${contatoEmail || "não informado"}.`;
}

function renderAdminUserManagement() {
  if (!adminUsersSection || !adminUsersList) {
    return;
  }

  const canManage = canManageUserApprovals();
  const canInvite = canInviteSecretaries();
  const isAdmin = state.session?.role === "Admin" && hasAppAccess();
  const isSecretary = state.session?.role === "Secretário" && hasAppAccess();
  adminUsersSection.hidden = !canManage && !canInvite;
  adminUsersList.replaceChildren();
  renderApprovalsPanelCopy();
  if (accessHistorySection) {
    accessHistorySection.hidden = isSecretary;
  }

  if (!canManage && !canInvite) {
    return;
  }

  if (!state.users.length) {
    const emptyState = document.createElement("p");
    emptyState.textContent = isSecretary
      ? "Nenhum secretário pendente disponível para convite no momento."
      : "Nenhum usuário disponível no momento.";
    adminUsersList.appendChild(emptyState);
    return;
  }

  state.users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "admin-user-item";

    const meta = document.createElement("div");
    meta.className = "admin-user-meta";
    const title = document.createElement("strong");
    title.textContent = user.name;
    const details = document.createElement("span");
    details.textContent = `${user.email} - ${formatUserAccessLabel(user)}`;
    meta.appendChild(title);
    meta.appendChild(details);

    if (user.accessStatus === "pending") {
      item.appendChild(meta);

      if (user.requestedRole === "Secretário") {
        const turmaSelect = document.createElement("select");
        turmaSelect.className = "admin-user-role";
        turmaSelect.dataset.secretaryTurma = String(user.id);
        state.activeTurmasForCopy.forEach((turma) => {
          const option = document.createElement("option");
          option.value = String(turma.id);
          option.textContent = turma.nome;
          turmaSelect.appendChild(option);
        });
        turmaSelect.disabled = !state.activeTurmasForCopy.length;

        const inviteButton = document.createElement("button");
        inviteButton.type = "button";
        inviteButton.className = "ghost-action";
        inviteButton.dataset.userInvite = String(user.id);
        inviteButton.textContent = "Convidar";
        inviteButton.disabled = !state.activeTurmasForCopy.length;

        const inviteStatus = document.createElement("span");
        inviteStatus.className = "invite-status";
        inviteStatus.dataset.inviteStatus = String(user.id);

        item.appendChild(turmaSelect);
        item.appendChild(inviteButton);
        item.appendChild(inviteStatus);
        updateInviteRowState(user.id);
      } else {
        const approveButton = document.createElement("button");
        approveButton.type = "button";
        approveButton.className = "ghost-action";
        approveButton.dataset.userApprove = String(user.id);
        approveButton.textContent = "Aprovar dirigente";
        item.appendChild(approveButton);
      }

      if (isAdmin) {
        const rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "ghost-action";
        rejectButton.dataset.userReject = String(user.id);
        rejectButton.textContent = "Rejeitar";
        item.appendChild(rejectButton);
      }

      adminUsersList.appendChild(item);
      return;
    }

    if (!isAdmin) {
      item.appendChild(meta);
      adminUsersList.appendChild(item);
      return;
    }

    const roleSelect = document.createElement("select");
    roleSelect.className = "admin-user-role";
    roleSelect.dataset.userRole = String(user.id);
    [
      { value: "Admin", label: "Admin" },
      { value: "Dirigente", label: "Dirigente" },
    ].forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      option.selected = user.role === optionConfig.value;
      roleSelect.appendChild(option);
    });

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "ghost-action";
    saveButton.dataset.userSave = String(user.id);
    saveButton.textContent = "Salvar perfil";

    item.appendChild(meta);
    item.appendChild(roleSelect);
    item.appendChild(saveButton);
    adminUsersList.appendChild(item);
  });
}

function updateInviteRowState(userId) {
  const turmaSelect = adminUsersList?.querySelector(`[data-secretary-turma="${userId}"]`);
  const inviteButton = adminUsersList?.querySelector(`[data-user-invite="${userId}"]`);
  const inviteStatus = adminUsersList?.querySelector(`[data-invite-status="${userId}"]`);
  if (!turmaSelect || !inviteButton) {
    return;
  }

  const hasTurmas = state.activeTurmasForCopy.length > 0;
  const key = `${userId}:${turmaSelect.value || ""}`;
  const isLocked = Boolean(state.pendingInviteLocks[key]);
  inviteButton.disabled = !hasTurmas || isLocked;
  inviteButton.textContent = isLocked ? "Convite pendente" : "Convidar";
  if (!inviteStatus) {
    return;
  }
  inviteStatus.textContent = isLocked
    ? "Já existe convite pendente para esta turma."
    : "";
}

function renderAccessHistory() {
  if (!accessHistoryList) {
    return;
  }

  accessHistoryList.replaceChildren();

  if (!canManageUserApprovals()) {
    const emptyState = document.createElement("p");
    emptyState.textContent = "Aprovações e convites ficam disponíveis para dirigentes aprovados.";
    accessHistoryList.appendChild(emptyState);
    return;
  }

  const historyEvents = state.accessEvents.filter((event) => (
    !(event.type === "profile_request"
      && normalizeSecretaryRole(event.requestedRole) === "Secretário"
      && event.status === "pending")
  ));

  if (!historyEvents.length) {
    const emptyState = document.createElement("p");
    emptyState.textContent = "Nenhuma aprovação ou convite registrado ainda.";
    accessHistoryList.appendChild(emptyState);
    return;
  }

  historyEvents.forEach((event) => {
    const item = document.createElement("div");
    item.className = "admin-user-item access-history-item";

    const meta = document.createElement("div");
    meta.className = "admin-user-meta";

    const title = document.createElement("strong");
    title.textContent = event.type === "profile_request"
      ? `${event.userName} solicitou perfil de ${event.requestedRole}`
      : event.title;

    const details = document.createElement("span");
    if (event.type === "turma_invite") {
      details.textContent =
        `Status: ${formatAccessEventStatus(event.status)} - ` +
        `Turma: ${event.turmaName || "não informada"} - ` +
        `Convidado por: ${event.invitedByName || "não informado"}`;
    } else {
      const approver = event.decidedByName || "Aguardando aprovação";
      details.textContent =
        `Status: ${formatAccessEventStatus(event.status)} - ` +
        `Aprovado por: ${approver} - ` +
        "Convidado por: Sem convite vinculado";
    }

    const dates = document.createElement("span");
    dates.textContent = `Criado em: ${formatDateTime(event.createdAt)}${
      event.decidedAt ? ` - Decidido em: ${formatDateTime(event.decidedAt)}` : ""
    }`;

    meta.appendChild(title);
    meta.appendChild(details);
    meta.appendChild(dates);
    item.appendChild(meta);
    accessHistoryList.appendChild(item);
  });
}

function renderLinkRequestsForDirigente() {
  if (!linkRequestsSection || !linkRequestsList) {
    return;
  }

  const visible = canManageUserApprovals() && state.currentApprovalsView === "vinculos";
  linkRequestsSection.hidden = !visible;
  linkRequestsList.replaceChildren();
  if (!visible) {
    return;
  }

  if (!state.linkRequests.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nenhuma solicitação de vínculo pendente.";
    empty.className = "list-empty";
    linkRequestsList.appendChild(empty);
    return;
  }

  const requestsByTurma = state.linkRequests.reduce((acc, request) => {
    const key = String(request.turmaId || "sem-turma");
    if (!acc[key]) {
      acc[key] = {
        turmaName: request.turmaName || "Turma",
        turmaTipo: request.turmaTipo || "Sem tipo",
        items: [],
      };
    }
    acc[key].items.push(request);
    return acc;
  }, {});

  Object.values(requestsByTurma).forEach((group) => {
    const turmaBlock = document.createElement("section");
    turmaBlock.className = "saved-summary";

    const turmaTitle = document.createElement("h4");
    turmaTitle.textContent = `${group.turmaName} · ${group.turmaTipo}`;
    turmaBlock.appendChild(turmaTitle);

    group.items.forEach((request) => {
      const item = document.createElement("div");
      item.className = "admin-user-item";

      const meta = document.createElement("div");
      meta.className = "admin-user-meta";
      const title = document.createElement("strong");
      title.textContent = `${request.requesterName} solicitou vínculo`;
      const details = document.createElement("span");
      details.textContent = `${request.requesterEmail} - ${formatDateTime(request.createdAt)}`;
      meta.appendChild(title);
      meta.appendChild(details);

      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.className = "ghost-action";
      approveButton.dataset.linkRequestApprove = String(request.id);
      approveButton.textContent = "Aprovar vínculo";

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "ghost-action";
      rejectButton.dataset.linkRequestReject = String(request.id);
      rejectButton.textContent = "Rejeitar";

      item.appendChild(meta);
      item.appendChild(approveButton);
      item.appendChild(rejectButton);
      turmaBlock.appendChild(item);
    });

    linkRequestsList.appendChild(turmaBlock);
  });
}

function renderApprovalsView() {
  const isCadastros = state.currentApprovalsView === "cadastros";
  approvalViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.approvalsView === state.currentApprovalsView);
  });

  if (adminUsersSection) {
    const canManage = canManageUserApprovals();
    const canInvite = canInviteSecretaries();
    adminUsersSection.hidden = !(canManage || canInvite) || !isCadastros;
  }
  if (accessHistorySection) {
    const isSecretary = state.session?.role === "Secretário" && hasAppAccess();
    accessHistorySection.hidden = !isCadastros || isSecretary || !canManageUserApprovals();
  }
  renderLinkRequestsForDirigente();
}

function formatAccessEventStatus(status) {
  const labels = {
    pending: "Pendente",
    active: "Aprovado",
    approved: "Aprovado",
    accepted: "Aceito",
    rejected: "Rejeitado",
  };
  return labels[status] || status || "Sem status";
}

async function loadPendingInvites() {
  if (!state.session || !hasAppAccess()) {
    state.pendingInvites = [];
    return;
  }

  try {
    const response = await apiRequest("/api/my-invites");
    state.pendingInvites = response.invites || [];
  } catch (error) {
    state.pendingInvites = [];
  }
}

async function loadPendingAccessStateData() {
  await loadPendingInvites();
  if (!canRequestSecretaryLink()) {
    state.dirigenteTurmaCatalog = [];
    state.linkRequests = [];
    return;
  }

  const [catalogResponse, myRequestsResponse] = await Promise.all([
    apiRequest("/api/dirigentes-active-turmas"),
    apiRequest("/api/my-link-requests"),
  ]);
  state.dirigenteTurmaCatalog = catalogResponse.dirigentes || [];
  state.linkRequests = myRequestsResponse.requests || [];
}

function canRequestSecretaryLink() {
  if (!state.session) return false;
  if (!hasAppAccess()) return false;
  const role = normalizeSecretaryRole(state.session.role);
  return role !== "Admin" && role !== "Dirigente";
}

function normalizeSecretaryRole(value) {
  return String(value || "").trim() === "Secretario" ? "Secretário" : String(value || "").trim();
}

function renderPendingInvites() {
  if (!pendingInvites) {
    return;
  }

  pendingInvites.replaceChildren();
  pendingInvites.hidden = !state.pendingInvites.length;
  if (!state.pendingInvites.length) {
    return;
  }

  const heading = document.createElement("h4");
  heading.textContent = "Convites pendentes";
  pendingInvites.appendChild(heading);

  state.pendingInvites.forEach((invite) => {
    const item = document.createElement("div");
    item.className = "admin-user-item";

    const meta = document.createElement("div");
    meta.className = "admin-user-meta";
    const title = document.createElement("strong");
    title.textContent = invite.turmaName || "Turma";
    const details = document.createElement("span");
    details.textContent = `Convidado por: ${invite.invitedByName || "não informado"} - ${formatDateTime(invite.createdAt)}`;
    meta.appendChild(title);
    meta.appendChild(details);

    const acceptButton = document.createElement("button");
    acceptButton.type = "button";
    acceptButton.className = "primary-action";
    acceptButton.dataset.inviteAccept = String(invite.id);
    acceptButton.textContent = "Aceitar convite";

    item.appendChild(meta);
    item.appendChild(acceptButton);
    pendingInvites.appendChild(item);
  });
}

function renderPendingAccessTools() {
  renderPendingInvites();
  renderLinkRequestPanel();
}

function renderLinkRequestPanel() {
  if (!linkRequestPanel || !linkRequestDirigente || !linkRequestTurma || !myLinkRequestsList) {
    return;
  }

  const visible = canRequestSecretaryLink();
  linkRequestPanel.hidden = !visible;
  if (!visible) {
    return;
  }

  linkRequestSummary.textContent = state.linkRequests.some((item) => item.status === "pending")
    ? "Você já possui solicitação(ões) pendente(s). Aguarde a resposta do dirigente."
    : "Selecione o dirigente e a turma ativa para solicitar seu vínculo.";

  linkRequestDirigente.replaceChildren();
  renderMyLinkRequests();
  if (!state.dirigenteTurmaCatalog.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhum dirigente com turma ativa disponível";
    linkRequestDirigente.appendChild(option);
    linkRequestTurma.replaceChildren();
    return;
  }

  state.dirigenteTurmaCatalog.forEach((dirigente, index) => {
    const option = document.createElement("option");
    option.value = String(dirigente.id);
    option.textContent = `${dirigente.name} (${dirigente.email})`;
    option.selected = index === 0;
    linkRequestDirigente.appendChild(option);
  });

  renderLinkRequestTurmaOptions(linkRequestDirigente.value);
}

function renderLinkRequestTurmaOptions(dirigenteId) {
  if (!linkRequestTurma) return;
  linkRequestTurma.replaceChildren();
  const dirigente = state.dirigenteTurmaCatalog.find((item) => String(item.id) === String(dirigenteId));
  const turmas = dirigente?.turmas || [];
  if (!turmas.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhuma turma ativa para este dirigente";
    linkRequestTurma.appendChild(option);
    return;
  }

  turmas.forEach((turma, index) => {
    const option = document.createElement("option");
    option.value = String(turma.id);
    option.textContent = `${turma.nome} · ${turma.tipo || "Sem tipo"}${turma.inicio ? ` · ${turma.inicio}` : ""}`;
    option.selected = index === 0;
    linkRequestTurma.appendChild(option);
  });
}

function renderMyLinkRequests() {
  if (!myLinkRequestsList) return;
  myLinkRequestsList.replaceChildren();

  if (!state.linkRequests.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nenhuma solicitação enviada ainda.";
    myLinkRequestsList.appendChild(empty);
    return;
  }

  state.linkRequests.forEach((request) => {
    const item = document.createElement("div");
    item.className = "admin-user-item";
    const meta = document.createElement("div");
    meta.className = "admin-user-meta";
    const title = document.createElement("strong");
    title.textContent = `${request.turmaName || "Turma"} · ${request.turmaTipo || "Sem tipo"}`;
    const details = document.createElement("span");
    details.textContent = `Dirigente: ${request.dirigenteName} (${request.dirigenteEmail}) - Status: ${formatAccessEventStatus(request.status)}`;
    meta.appendChild(title);
    meta.appendChild(details);
    item.appendChild(meta);
    myLinkRequestsList.appendChild(item);
  });
}

function formatDateTime(value) {
  if (!value) {
    return "não informado";
  }

  return String(value).replace("T", " ").slice(0, 19);
}

function renderTurmaActions(turma = null) {
  const hasTurma = Boolean(turma);
  const isArchived = Boolean(turma?.archivedAt);
  const isAdmin = state.session?.role === "Admin";
  const isOwner = Number(turma?.ownerUserId) === Number(state.session?.id);
  const canDelete = isAdmin || isOwner;

  turmaActions.hidden = !hasTurma || !state.isTurmaDetailsOpen;
  archiveButton.hidden = !hasTurma || isArchived;
  restoreButton.hidden = !hasTurma || !isArchived;
  deleteButton.hidden = !hasTurma || !canDelete || isArchived;
}

function renderTurmaFormButtons(turma = null) {
  const hasTurma = Boolean(turma);
  const isArchived = Boolean(turma?.archivedAt);
  const isFormVisible = !turmaForm.hidden;

  if (editTurmaButton) {
    editTurmaButton.hidden = true;
    editTurmaButton.disabled = true;
  }

  if (saveTurmaButton) {
    saveTurmaButton.hidden = true;
    saveTurmaButton.disabled = true;
  }
}

function setTurmaFormLocked(locked) {
  Array.from(turmaForm.elements).forEach((element) => {
    if (element.tagName === "BUTTON") {
      if (element === editTurmaButton) {
        element.disabled = false;
      } else if (element === saveTurmaButton) {
        element.disabled = locked;
      } else {
        element.disabled = locked;
      }
      return;
    }

    if (element.name) {
      element.disabled = locked;
    }
  });

  turmaSecretariesList.querySelectorAll(".remove-secretary-button").forEach((button) => {
    button.disabled = locked;
  });

  if (addTurmaSecretaryButton) {
    addTurmaSecretaryButton.disabled = locked;
  }

  renderStudentsPanel();
}

function setContactsFormLocked(locked) {
  contactsForm.classList.toggle("is-readonly", locked);

  Array.from(contactsForm.elements).forEach((element) => {
    if (element.name) {
      element.disabled = locked;
    }
  });
}

function appendSecretaryDraftField(listElement, value = {}) {
  const secretary = normalizeSecretaryEntry(value);
  const wrapper = document.createElement("div");
  wrapper.className = "secretary-row secretary-row-draft";
  wrapper.dataset.secretaryState = "draft";

  const fields = document.createElement("div");
  fields.className = "secretary-row-fields";

  const nameField = document.createElement("label");
  nameField.className = "secretary-input-group";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "secretarioNome";
  nameInput.placeholder = "Nome completo";
  nameInput.value = secretary.nome;
  const nameLabel = document.createElement("span");
  nameLabel.textContent = "Nome";
  nameField.appendChild(nameLabel);
  nameField.appendChild(nameInput);

  const messengerField = document.createElement("label");
  messengerField.className = "secretary-input-group";
  const messengerInput = document.createElement("input");
  messengerInput.type = "text";
  messengerInput.name = "secretarioWhatsapp";
  messengerInput.placeholder = "(00) 00000-0000";
  messengerInput.value = secretary.whatsapp;
  const messengerLabel = document.createElement("span");
  messengerLabel.textContent = "Mensageiro";
  messengerField.appendChild(messengerLabel);
  messengerField.appendChild(messengerInput);

  const emailField = document.createElement("label");
  emailField.className = "secretary-input-group";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.name = "secretarioEmail";
  emailInput.placeholder = "secretaria@escola.org";
  emailInput.value = secretary.email;
  const emailLabel = document.createElement("span");
  emailLabel.textContent = "E-mail";
  emailField.appendChild(emailLabel);
  emailField.appendChild(emailInput);

  const inviteButton = document.createElement("button");
  inviteButton.type = "button";
  inviteButton.className = "primary-action invite-secretary-button";
  inviteButton.textContent = "Convidar";
  inviteButton.addEventListener("click", () => {
    tryFinalizeSecretaryDraftRow(wrapper, { requireComplete: true });
  });

  fields.appendChild(nameField);
  fields.appendChild(messengerField);
  fields.appendChild(emailField);
  fields.appendChild(inviteButton);
  wrapper.appendChild(fields);
  const firstPendingRow = listElement.querySelector('.secretary-row[data-secretary-state="pending"]');
  if (firstPendingRow) {
    listElement.insertBefore(wrapper, firstPendingRow);
  } else {
    listElement.appendChild(wrapper);
  }
}

function appendSecretaryPendingRow(listElement, value = {}) {
  const secretary = normalizeSecretaryEntry(value);
  const wrapper = document.createElement("div");
  wrapper.className = "secretary-row secretary-row-pending";
  wrapper.dataset.secretaryState = "pending";
  wrapper.dataset.nome = secretary.nome;
  wrapper.dataset.whatsapp = secretary.whatsapp;
  wrapper.dataset.email = secretary.email;
  wrapper.dataset.inviteStatus = String(value?.inviteStatus || "pending").toLowerCase();

  const fields = document.createElement("div");
  fields.className = "secretary-row-fields secretary-row-pending-fields";

  const meta = document.createElement("div");
  meta.className = "secretary-pending-meta";
  meta.textContent = `${secretary.nome || "Sem nome"} · ${secretary.whatsapp || "Sem mensageiro"} · ${secretary.email || "Sem e-mail"}`;

  const badge = document.createElement("span");
  badge.className = "secretary-pending-badge";
  const inviteStatus = wrapper.dataset.inviteStatus;
  badge.textContent = inviteStatus === "accepted" ? "Aceito" : "Aguardando aceite";
  badge.classList.toggle("is-accepted", inviteStatus === "accepted");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "ghost-action remove-secretary-button";
  removeButton.textContent = inviteStatus === "accepted" ? "Remover do cadastro" : "Remover convite";
  removeButton.addEventListener("click", async () => {
    const email = String(wrapper.dataset.email || "").trim();
    const isPendingInvite = inviteStatus !== "accepted";
    if (isPendingInvite && email && state.currentTurmaId) {
      removeButton.disabled = true;
      try {
        await apiRequest(`/api/turmas/${state.currentTurmaId}/secretary-invites/cancel`, {
          method: "POST",
          body: { email },
        });
      } catch (error) {
        showToast("error", "Erro ao cancelar convite", error.message);
        removeButton.disabled = false;
        return;
      }
    }

    wrapper.remove();
    scheduleTurmaAutosave();
    if (isPendingInvite) {
      showToast("success", "Convite cancelado", email ? `Convite cancelado para ${email}.` : "Convite cancelado.");
    }
  });

  const resendButton = document.createElement("button");
  resendButton.type = "button";
  resendButton.className = "ghost-action resend-secretary-button";
  resendButton.textContent = "Reenviar convite";
  resendButton.hidden = inviteStatus === "accepted";
  resendButton.addEventListener("click", async () => {
    const email = String(wrapper.dataset.email || "").trim();
    if (!email || !state.currentTurmaId) {
      return;
    }
    resendButton.disabled = true;
    try {
      await apiRequest(`/api/turmas/${state.currentTurmaId}/secretary-invites/resend`, {
        method: "POST",
        body: { email },
      });
      showToast("success", "Convite reenviado", `O convite foi reenviado para ${email}.`);
    } catch (error) {
      showToast("error", "Erro ao reenviar", error.message);
    } finally {
      resendButton.disabled = false;
    }
  });

  fields.appendChild(meta);
  fields.appendChild(badge);
  fields.appendChild(resendButton);
  fields.appendChild(removeButton);
  wrapper.appendChild(fields);
  listElement.appendChild(wrapper);
}

function isSecretaryDraftComplete(rowElement) {
  const name = String(rowElement.querySelector('input[name="secretarioNome"]')?.value || "").trim();
  const whatsapp = String(rowElement.querySelector('input[name="secretarioWhatsapp"]')?.value || "").trim();
  const email = String(rowElement.querySelector('input[name="secretarioEmail"]')?.value || "").trim();
  return Boolean(name && whatsapp && email && isValidEmail(email));
}

function tryFinalizeSecretaryDraftRow(rowElement, { requireComplete = false } = {}) {
  if (!rowElement || rowElement.dataset.secretaryState !== "draft") {
    return;
  }
  if (!isSecretaryDraftComplete(rowElement)) {
    if (requireComplete) {
      showToast("error", "Dados incompletos", "Preencha nome, mensageiro e e-mail válido para convidar.");
    }
    return;
  }

  const secretary = {
    nome: String(rowElement.querySelector('input[name="secretarioNome"]')?.value || "").trim(),
    whatsapp: String(rowElement.querySelector('input[name="secretarioWhatsapp"]')?.value || "").trim(),
    email: String(rowElement.querySelector('input[name="secretarioEmail"]')?.value || "").trim(),
  };
  const normalizedEmail = secretary.email.toLowerCase();
  const alreadyPending = Array.from(
    turmaSecretariesList.querySelectorAll('.secretary-row[data-secretary-state="pending"]')
  ).some((row) => String(row.dataset.email || "").trim().toLowerCase() === normalizedEmail);
  if (alreadyPending) {
    rowElement.remove();
    appendSecretaryDraftField(turmaSecretariesList);
    return;
  }
  appendSecretaryPendingRow(turmaSecretariesList, secretary);
  rowElement.remove();
  appendSecretaryDraftField(turmaSecretariesList);
  scheduleTurmaAutosave();
}

function collectSecretaryValues(listElement) {
  return Array.from(listElement.querySelectorAll('.secretary-row[data-secretary-state="pending"]'))
    .map((row) => ({
      nome: String(row.dataset.nome || "").trim(),
      whatsapp: String(row.dataset.whatsapp || "").trim(),
      email: String(row.dataset.email || "").trim(),
    }))
    .filter((secretario) => secretario.nome || secretario.whatsapp || secretario.email);
}

async function readStudentsFromSpreadsheet(file) {
  if (!window.XLSX) {
    throw new Error("A biblioteca de planilhas ainda não foi carregada.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("A planilha está vazia.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  return extractStudentsFromRows(rows);
}

function extractStudentsFromRows(rows) {
  const normalizedRows = Array.isArray(rows)
    ? rows
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || "").trim()) : []))
      .filter((row) => row.some(Boolean))
    : [];

  if (!normalizedRows.length) {
    throw new Error("A planilha está vazia.");
  }

  const headerIndex = normalizedRows.findIndex((row) => {
    const headers = row.map(normalizeSpreadsheetHeader);
    return headers.some((header) => isStudentHeaderMatch(header, "nome"));
  });

  let dataRows = normalizedRows;
  let columns = { nome: 0, email: 1, whatsapp: 2 };
  const warnings = [];

  if (headerIndex !== -1) {
    columns = mapStudentColumns(normalizedRows[headerIndex]);
    dataRows = normalizedRows.slice(headerIndex + 1);
  } else {
    warnings.push("Cabeçalho não encontrado; a importação assumiu as três primeiras colunas como nome, email e whatsapp.");
  }

  if (columns.nome === undefined) {
    throw new Error("A planilha precisa ter uma coluna de nome do aluno.");
  }

  const duplicateKeys = new Set();
  const students = [];

  dataRows.forEach((row, index) => {
    const sourceLine = index + (headerIndex !== -1 ? headerIndex + 2 : 1);
    const aluno = normalizeImportedStudent({
      nome: row[columns.nome],
      email: row[columns.email],
      whatsapp: row[columns.whatsapp],
    });

    if (!aluno.nome && !aluno.email && !aluno.whatsapp) {
      return;
    }

    if (!aluno.nome) {
      warnings.push(`Linha ${sourceLine} ignorada porque está sem nome.`);
      return;
    }

    if (!aluno.email) {
      warnings.push(`Linha ${sourceLine} ignorada porque está sem e-mail.`);
      return;
    }

    if (!isValidEmail(aluno.email)) {
      warnings.push(`Linha ${sourceLine} com e-mail inválido: ${aluno.email}.`);
      return;
    }

    const duplicateKey = `${aluno.nome.toLowerCase()}::${aluno.email.toLowerCase()}`;
    if (duplicateKeys.has(duplicateKey)) {
      warnings.push(`Linha ${sourceLine} parece duplicada para ${aluno.nome}.`);
    } else {
      duplicateKeys.add(duplicateKey);
    }

    students.push(aluno);
  });

  if (!students.length) {
    throw new Error("Nenhum aluno válido foi encontrado. Use nome e e-mail em cada linha.");
  }

  return {
    students,
    warnings: deduplicateWarnings(warnings),
  };
}

function mapStudentColumns(headerRow) {
  const columns = {};
  headerRow.forEach((headerCell, index) => {
    const header = normalizeSpreadsheetHeader(headerCell);
    if (columns.nome === undefined && isStudentHeaderMatch(header, "nome")) {
      columns.nome = index;
    }
    if (columns.email === undefined && isStudentHeaderMatch(header, "email")) {
      columns.email = index;
    }
    if (columns.whatsapp === undefined && isStudentHeaderMatch(header, "whatsapp")) {
      columns.whatsapp = index;
    }
  });

  return {
    nome: columns.nome ?? 0,
    email: columns.email ?? 1,
    whatsapp: columns.whatsapp ?? 2,
  };
}

function normalizeSpreadsheetHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isStudentHeaderMatch(header, field) {
  if (field === "nome") {
    return ["nome", "aluno", "nome aluno", "nome do aluno"].includes(header);
  }
  if (field === "email") {
    return ["email", "e mail", "email do aluno"].includes(header);
  }
  return ["whatsapp", "telefone", "celular", "fone", "telefone whatsapp"].includes(header);
}

function normalizeImportedStudent(student) {
  return {
    nome: String(student?.nome || "").trim(),
    email: String(student?.email || "").trim(),
    whatsapp: String(student?.whatsapp || "").trim(),
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function deduplicateWarnings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function openStudentsTemplateDialog() {
  if (!studentsTemplateDialog) {
    return;
  }

  if (typeof studentsTemplateDialog.showModal === "function") {
    studentsTemplateDialog.showModal();
    return;
  }

  studentsTemplateDialog.setAttribute("open", "");
}

function showConfirmActionDialog({ title, message, confirmLabel = "Confirmar" }) {
  if (!confirmActionDialog) {
    return Promise.resolve(window.confirm(message || "Deseja continuar?"));
  }

  confirmActionTitle.textContent = title || "Confirmar ação";
  confirmActionMessage.textContent = message || "Deseja continuar?";
  confirmActionConfirmButton.textContent = confirmLabel;

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      confirmActionCancelButton?.removeEventListener("click", onCancel);
      confirmActionConfirmButton?.removeEventListener("click", onConfirm);
      confirmActionDialog.removeEventListener("cancel", onCancel);
      confirmActionDialog.removeEventListener("close", onClose);
    };

    const finalize = (value) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(value);
    };

    const onCancel = () => {
      confirmActionDialog.close("cancel");
      finalize(false);
    };

    const onConfirm = () => {
      confirmActionDialog.close("confirm");
      finalize(true);
    };

    const onClose = () => {
      if (resolved) return;
      finalize(confirmActionDialog.returnValue === "confirm");
    };

    confirmActionCancelButton?.addEventListener("click", onCancel);
    confirmActionConfirmButton?.addEventListener("click", onConfirm);
    confirmActionDialog.addEventListener("cancel", onCancel);
    confirmActionDialog.addEventListener("close", onClose);
    confirmActionDialog.showModal();
  });
}

function downloadStudentsTemplateFile() {
  const blob = new Blob([STUDENTS_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-importacao-alunos.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatTurmaStatusLabel(status) {
  if (status === "rascunho") return "Rascunho";
  if (status === "arquivado") return "Arquivado";
  return "Ativo";
}

function showToast(kind, title, message) {
  if (!toastRegion) {
    return;
  }

  if (toastDismissTimer) {
    window.clearTimeout(toastDismissTimer);
    toastDismissTimer = null;
  }

  toastRegion.replaceChildren();

  const toast = document.createElement("div");
  toast.className = `toast ${kind === "error" ? "is-error" : "is-success"}`;

  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = message;

  toast.appendChild(heading);
  toast.appendChild(body);
  toastRegion.appendChild(toast);

  toastDismissTimer = window.setTimeout(() => {
    toast.remove();
    toastDismissTimer = null;
  }, 3600);
}

function syncTurmaWeekdayField(dateValue) {
  if (!turmaWeekdayInput) {
    return;
  }

  turmaWeekdayInput.value = formatWeekdayFromDate(dateValue);
}

function formatWeekdayFromDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(year, month - 1, day);
  const weekdays = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  return weekdays[date.getDay()] || "";
}

function openNativeTimePicker(event) {
  const input = event?.currentTarget;
  if (!input || typeof input.showPicker !== "function") {
    return;
  }

  try {
    input.showPicker();
  } catch {
    // Alguns navegadores bloqueiam showPicker fora de interações suportadas.
  }
}

function updateTurmaInState(updatedTurma) {
  const turmaIndex = state.turmas.findIndex((turma) => turma.id === updatedTurma.id);
  if (turmaIndex !== -1) {
    state.turmas[turmaIndex] = updatedTurma;
    return;
  }

  state.turmas.push(updatedTurma);
}

function getTurmaFormPayload() {
  const formPayload = Object.fromEntries(new FormData(turmaForm).entries());
  return buildTurmaPayload({
    ...formPayload,
    ownerUserId: formPayload.ownerUserId,
    copyProgramFromTurmaId: formPayload.copyProgramFromTurmaId,
    secretarios: collectSecretaryValues(turmaSecretariesList),
  });
}

function getContactsPayload() {
  return {
    dirigenteNome: contactsForm.elements.dirigenteNome.value,
    secretarios: state.session?.secretarios ?? [],
    telefone: contactsForm.elements.telefone.value,
    whatsapp: contactsForm.elements.whatsapp.value,
    email: contactsForm.elements.email.value,
  };
}

async function persistTurmaForm({ autosave = false, navigateToProgram = false } = {}) {
  if (!state.session) {
    activateTab("login");
    return null;
  }

  const payload = getTurmaFormPayload();
  const method = state.currentTurmaId ? "PUT" : "POST";
  const path = state.currentTurmaId
    ? `/api/turmas/${state.currentTurmaId}`
    : "/api/turmas";

  const response = await apiRequest(path, { method, body: payload });
  state.currentScope = response.turma.archivedAt ? "archived" : "active";
  state.currentTurmaId = response.turma.id;
  state.isCreatingTurma = false;
  state.currentProgramTab = getProgramTabForTurmaType(response.turma.tipo) || state.currentProgramTab;
  updateTurmaInState(response.turma);
  renderScopeButtons();
  updateAccessControlledTabs();
  renderTurmaList();
  renderTurmaSummary(response.turma);
  renderTurmaActions(response.turma);
  if (!autosave) {
    state.isEditingTurma = false;
    await loadTurmas(response.turma.id);
    turmaSummary.textContent = `Turma ${response.turma.nome} salva com sucesso.`;
    showToast("success", "Cadastro salvo", `Turma ${response.turma.nome} atualizada com sucesso.`);
    if (navigateToProgram) {
      activateTab("programa");
    }
    return response;
  }

  turmaSummary.textContent = `Alterações da turma ${response.turma.nome} salvas automaticamente.`;
  showToast("success", "Turma salva", `As alterações de ${response.turma.nome} foram salvas automaticamente.`);
  return response;
}

async function persistContactsProfile({ autosave = false } = {}) {
  if (!state.session) {
    activateTab("login");
    return null;
  }

  const response = await apiRequest("/api/profile", {
    method: "PUT",
    body: getContactsPayload(),
  });
  state.session = response.user;
  renderSession();
  renderContactsSummary();
  contactsSummary.textContent = autosave
    ? "Cadastro salvo automaticamente."
    : "Dirigente e contatos salvos com sucesso.";
  if (!autosave) {
    renderContactsForm();
    showToast("success", "Contatos salvos", "Dirigente e contatos atualizados com sucesso.");
  } else {
    showToast("success", "Cadastro salvo", "Os contatos foram salvos automaticamente.");
  }
  return response;
}

async function persistProgram({ autosave = false } = {}) {
  if (!state.session) {
    authNotice.textContent = "Faça login para salvar um programa.";
    activateTab("login");
    return null;
  }

  if (!state.currentTurmaId) {
    turmaSummary.textContent = "Cadastre uma turma antes de salvar o programa.";
    activateTab("turmas");
    return null;
  }

  syncProgramMeta();
  const response = await apiRequest(`/api/turmas/${state.currentTurmaId}/program`, {
    method: "PUT",
    body: state.program,
  });
  state.program = {
    ...state.program,
    id: response.program.id,
    updatedAt: response.program.updatedAt,
  };
  if (!autosave) {
    renderProgram();
    window.alert("Programa salvo com sucesso para esta turma.");
    return response;
  }

  if (saveProgramButton) {
    saveProgramButton.textContent = "Salvo automaticamente";
    window.setTimeout(() => {
      if (saveProgramButton.textContent === "Salvo automaticamente") {
        saveProgramButton.textContent = "Salvar";
      }
    }, 1200);
  }
  showToast("success", "Programa salvo", "As alterações do programa foram salvas automaticamente.");
  return response;
}

function handleTurmaAutosaveInput(event) {
  if (!state.session) {
    return;
  }
  if (!event.target?.name) {
    return;
  }
  if (!state.isEditingTurma) {
    return;
  }
  scheduleTurmaAutosave();
}

function handleContactsAutosaveInput(event) {
  if (!state.session) {
    return;
  }
  if (!event.target?.name) {
    return;
  }
  scheduleContactsAutosave();
}

function scheduleTurmaAutosave() {
  if (!state.session || !state.isEditingTurma) {
    return;
  }
  const turmaNome = String(turmaForm.elements.nome?.value || "").trim();
  const turmaInicio = String(turmaForm.elements.inicio?.value || "").trim();
  const turmaHorarioInicio = String(turmaForm.elements.horarioInicio?.value || "").trim();

  if (!turmaNome) {
    return;
  }

  // Na criação da turma, só inicia autosave quando os campos obrigatórios forem preenchidos.
  if (!state.currentTurmaId && (!turmaInicio || !turmaHorarioInicio)) {
    return;
  }
  autosaveState.turmaDirty = true;
  if (autosaveState.turmaTimer) {
    window.clearTimeout(autosaveState.turmaTimer);
  }
  autosaveState.turmaTimer = window.setTimeout(runTurmaAutosave, AUTOSAVE_DELAY_MS);
}

async function runTurmaAutosave() {
  autosaveState.turmaTimer = null;
  if (autosaveState.turmaInFlight || !autosaveState.turmaDirty) {
    return;
  }
  autosaveState.turmaDirty = false;
  autosaveState.turmaInFlight = true;
  turmaSummary.textContent = "Salvando alterações da turma...";
  try {
    await persistTurmaForm({ autosave: true });
  } catch (error) {
    turmaSummary.textContent = error.message;
    showToast("error", "Erro no salvamento automático", error.message);
  } finally {
    autosaveState.turmaInFlight = false;
    if (autosaveState.turmaDirty) {
      scheduleTurmaAutosave();
    }
  }
}

function scheduleContactsAutosave() {
  if (!state.session) {
    return;
  }
  autosaveState.contactsDirty = true;
  if (autosaveState.contactsTimer) {
    window.clearTimeout(autosaveState.contactsTimer);
  }
  autosaveState.contactsTimer = window.setTimeout(runContactsAutosave, AUTOSAVE_DELAY_MS);
}

async function runContactsAutosave() {
  autosaveState.contactsTimer = null;
  if (autosaveState.contactsInFlight || !autosaveState.contactsDirty) {
    return;
  }
  autosaveState.contactsDirty = false;
  autosaveState.contactsInFlight = true;
  contactsSummary.textContent = "Salvando contatos...";
  try {
    await persistContactsProfile({ autosave: true });
  } catch (error) {
    contactsSummary.textContent = error.message;
    showToast("error", "Erro no salvamento automático", error.message);
  } finally {
    autosaveState.contactsInFlight = false;
    if (autosaveState.contactsDirty) {
      scheduleContactsAutosave();
    }
  }
}

function scheduleProgramAutosave() {
  if (!state.session || !state.currentTurmaId || !state.isProgramEditing) {
    return;
  }
  autosaveState.programDirty = true;
  if (autosaveState.programTimer) {
    window.clearTimeout(autosaveState.programTimer);
  }
  if (saveProgramButton) {
    saveProgramButton.textContent = "Salvando...";
  }
  autosaveState.programTimer = window.setTimeout(runProgramAutosave, AUTOSAVE_DELAY_MS);
}

async function runProgramAutosave() {
  autosaveState.programTimer = null;
  if (autosaveState.programInFlight || !autosaveState.programDirty) {
    return;
  }
  autosaveState.programDirty = false;
  autosaveState.programInFlight = true;
  try {
    await persistProgram({ autosave: true });
  } catch (error) {
    if (saveProgramButton) {
      saveProgramButton.textContent = "Salvar";
    }
    showToast("error", "Erro no salvamento automático", error.message);
  } finally {
    autosaveState.programInFlight = false;
    if (autosaveState.programDirty) {
      scheduleProgramAutosave();
    }
  }
}

function cancelAutosaveQueue(kind) {
  const timerKey = `${kind}Timer`;
  const dirtyKey = `${kind}Dirty`;
  if (autosaveState[timerKey]) {
    window.clearTimeout(autosaveState[timerKey]);
    autosaveState[timerKey] = null;
  }
  autosaveState[dirtyKey] = false;
}

function buildTurmaPayload(partial = {}) {
  const currentTurma = findCurrentTurma();
  const existing = currentTurma || {};

  return {
    ownerUserId: partial.ownerUserId ?? existing.ownerUserId,
    copyProgramFromTurmaId: partial.copyProgramFromTurmaId ?? "",
    nome: partial.nome ?? existing.nome ?? "",
    modalidade: partial.modalidade ?? existing.modalidade ?? "presencial",
    tipo: partial.tipo ?? existing.tipo ?? "CB",
    status: partial.status ?? existing.status ?? "ativo",
    inicio: partial.inicio ?? existing.inicio ?? "",
    horarioInicio: partial.horarioInicio ?? existing.horarioInicio ?? existing.horarios ?? "",
    alunos: Array.isArray(partial.alunos) ? partial.alunos : state.importedStudents,
    dirigenteNome: partial.dirigenteNome ?? existing.dirigenteNome ?? "",
    secretarios: partial.secretarios ?? existing.secretarios ?? [],
    telefone: partial.telefone ?? existing.telefone ?? "",
    whatsapp: partial.whatsapp ?? existing.whatsapp ?? "",
    email: partial.email ?? existing.email ?? "",
  };
}

function renderLoggedOutState(message = "Entre ou crie uma conta para começar.") {
  document.body.classList.remove("is-public-share-mode");
  document.body.classList.remove("is-public-student-signup-mode");
  cancelAutosaveQueue("turma");
  cancelAutosaveQueue("contacts");
  cancelAutosaveQueue("program");
  state.session = null;
  state.users = [];
  state.accessEvents = [];
  state.pendingInvites = [];
  state.linkRequests = [];
  state.dirigenteTurmaCatalog = [];
  state.turmas = [];
  state.activeTurmasForCopy = [];
  state.currentTurmaId = null;
  state.currentScope = "active";
  state.isTurmaDetailsOpen = false;
  state.isEditingTurma = false;
  state.importedStudents = [];
  state.program = createMinimalProgram();
  state.manualColumnWidths = {};
  loginForm.reset();
  registerForm.reset();
  renderSession();
  authNotice.textContent = message;
  renderPendingAccessTools();
  renderScopeButtons();
  renderOwnerField();
  renderCopyProgramField();
  renderTurmaList();
  renderStudentsPanel();
  renderTurmaForm();
  renderContactsForm();
  renderProgram();
  renderTurmaActions();
  renderContactsSummary();
  turmaSummary.textContent = "Nenhuma turma cadastrada ainda.";
  activateTab("login");
}

function formatTurmaTypeLabel(value) {
  const labels = {
    CB: "CB",
    EAE: "EAE",
    LE: "LE",
  };

  return labels[value] || value || "Sem tipo";
}

function formatTurmaModalidadeLabel(value) {
  const labels = {
    presencial: "Presencial",
    online: "On-line",
    ead: "À distância",
  };

  return labels[String(value || "").toLowerCase()] || value || "Sem modalidade";
}

function buildTurmaCardSummary(turma) {
  const parts = [
    formatTurmaTypeLabel(turma.tipo),
    formatTurmaModalidadeLabel(turma.modalidade),
    `Status: ${formatTurmaStatusLabel(turma.status)}`,
  ];
  if (turma.inicio) {
    parts.push(`Início: ${turma.inicio}`);
  }
  const diaSemana = formatWeekdayFromDate(turma.inicio);
  if (diaSemana) {
    parts.push(diaSemana);
  }
  const horarioInicio = turma.horarioInicio || turma.horarios || "";
  if (horarioInicio) {
    parts.push(`Horário: ${horarioInicio}`);
  }
  if (Array.isArray(turma.secretarios) && turma.secretarios.length) {
    parts.push(`Secretário(a)(s): ${turma.secretarios.map(formatSecretarySummary).join(", ")}`);
  }
  if (Array.isArray(turma.alunos)) {
    parts.push(`${turma.alunos.length} aluno(s)`);
  }
  if (state.session?.role === "Admin" && turma.ownerName) {
    parts.push(`Responsável: ${turma.ownerName}`);
  }
  return parts.filter(Boolean).join(" - ");
}

function getProgramStartDateForCurrentTab(fallbackValue = "") {
  if (state.currentProgramTab !== "programa-cb") {
    return fallbackValue;
  }

  return getLinkedTurmaStartDateForProgram() || fallbackValue;
}

function getLinkedTurmaStartDateForProgram() {
  const turmaStartDate = findCurrentTurma()?.inicio || turmaForm?.elements?.inicio?.value || "";
  return formatIsoDateForProgramMeta(turmaStartDate);
}

function formatIsoDateForProgramMeta(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return normalizeDateCellValue(value);
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function normalizeSecretaryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      nome: String(value || "").trim(),
      whatsapp: "",
      email: "",
    };
  }

  return {
    nome: String(value.nome || value.name || "").trim(),
    whatsapp: String(value.whatsapp || value.mensageiro || "").trim(),
    email: String(value.email || "").trim(),
  };
}

function formatSecretarySummary(value) {
  const secretary = normalizeSecretaryEntry(value);
  const parts = [secretary.nome || "Sem nome"];
  if (secretary.whatsapp) {
    parts.push(`Mensageiro: ${secretary.whatsapp}`);
  }
  if (secretary.email) {
    parts.push(`E-mail: ${secretary.email}`);
  }
  return parts.join(" - ");
}

function renderSession() {
  sessionChip.textContent = state.session
    ? `${state.session.name}`
    : "Visitante";
  document.body.classList.toggle("is-authenticated", hasAppAccess());
  if (userMenuPanel) {
    userMenuPanel.hidden = true;
  }
  sessionChip.setAttribute("aria-expanded", "false");
  updateAccessControlledTabs();
  renderApprovalsPanelCopy();
  renderAdminUserManagement();
  renderApprovalsView();
  renderLinkRequestsForDirigente();
}

function getApprovalActionFeedback(button, response) {
  const userName = response?.user?.name || "Usuário";
  if (button.dataset.userInvite) {
    const turmaName = response?.turma?.nome || "a turma selecionada";
    return {
      title: "Convite enviado",
      message: `${userName} foi convidado para ${turmaName}.`,
    };
  }
  if (button.dataset.userApprove) {
    return {
      title: "Perfil aprovado",
      message: `${userName} foi aprovado com sucesso.`,
    };
  }
  if (button.dataset.userReject) {
    return {
      title: "Perfil rejeitado",
      message: `${userName} foi marcado como rejeitado.`,
    };
  }
  return {
    title: "Perfil atualizado",
    message: `Perfil de ${userName} salvo com sucesso.`,
  };
}

function renderApprovalsPanelCopy() {
  const isSecretary = state.session?.role === "Secretário" && hasAppAccess();
  const canManage = canManageUserApprovals();
  if (approvalsPanelTitle) {
    approvalsPanelTitle.textContent = isSecretary ? "Convites de secretários" : "Aprovações e convites";
  }
  if (approvalsPanelDescription) {
    approvalsPanelDescription.textContent = isSecretary
      ? "Convide secretários pendentes para as turmas em que você participa."
      : "Solicitações de perfil e convites de turma visíveis para dirigentes aprovados.";
  }
  if (adminUsersEyebrow) {
    adminUsersEyebrow.textContent = isSecretary ? "Convites" : "Solicitações";
  }
  if (adminUsersTitle) {
    adminUsersTitle.textContent = isSecretary ? "Secretários pendentes para convite" : "Perfis pendentes";
  }
  if (adminUsersDescription) {
    adminUsersDescription.textContent = isSecretary
      ? "Selecione uma turma e envie o convite para liberar acesso do secretário."
      : "Aprove solicitações de dirigente e acompanhe usuários cadastrados.";
  }
  if (accessHistorySection) {
    accessHistorySection.hidden = isSecretary || !canManage;
  }
  renderApprovalsView();
}

function hasAppAccess() {
  return state.session?.accessStatus === "active";
}

function canManageUserApprovals() {
  return hasAppAccess() && ["Admin", "Dirigente"].includes(state.session?.role);
}

function canInviteSecretaries() {
  return hasAppAccess() && ["Admin", "Dirigente", "Secretário"].includes(state.session?.role);
}

function formatUserAccessLabel(user) {
  if (!user) {
    return "Visitante";
  }
  if (user.accessStatus === "pending") {
    return `Pendente (${user.requestedRole || "perfil"})`;
  }
  if (user.accessStatus === "rejected") {
    return `Rejeitado (${user.requestedRole || "perfil"})`;
  }
  return user.role;
}

async function renderPendingAccessState() {
  cancelAutosaveQueue("turma");
  cancelAutosaveQueue("contacts");
  cancelAutosaveQueue("program");
  state.users = [];
  state.accessEvents = [];
  state.pendingInvites = [];
  state.linkRequests = [];
  state.dirigenteTurmaCatalog = [];
  state.turmas = [];
  state.activeTurmasForCopy = [];
  state.currentTurmaId = null;
  state.isCreatingTurma = false;
  state.isTurmaDetailsOpen = false;
  state.isEditingTurma = false;
  renderAdminUserManagement();
  renderTurmaList();
  renderTurmaForm();
  renderContactsForm();
  renderTurmaActions();
  renderContactsSummary();
  renderProgram();
  authNotice.textContent = state.session?.accessStatus === "rejected"
    ? "Sua solicitação de perfil foi rejeitada. Entre em contato com a coordenação."
    : `Sua solicitação de ${state.session?.requestedRole || "perfil"} está aguardando aprovação.`;
  await loadPendingAccessStateData();
  renderPendingAccessTools();
}

function updateAccessControlledTabs() {
  if (state.isPublicShareMode) {
    tabs.forEach((tab) => {
      const isCurrentProgramTab = tab.dataset.tabTarget === state.currentProgramTab;
      tab.hidden = !isCurrentProgramTab;
      tab.disabled = !isCurrentProgramTab;
      tab.classList.toggle("is-disabled", !isCurrentProgramTab);
    });
    logoutButton.hidden = true;
    return;
  }

  const selectedTurmaProgramType = getCurrentTurmaProgramType();

  tabs.forEach((tab) => {
    const target = tab.dataset.tabTarget;
    const isAuthTab = target === "login" || target === "cadastro";
    tab.hidden = hasAppAccess() && isAuthTab;
    const requiresLogin = tab.dataset.tabTarget !== "login" && tab.dataset.tabTarget !== "cadastro";
    const requiresApprovalAccess = false;
    const programType = getProgramTypeForTab(tab);
    const requiresMatchingTurma = Boolean(programType);
    const isDisabledForLogin = requiresLogin && !hasAppAccess();
    const isDisabledForApprovalAccess = requiresApprovalAccess && !(canManageUserApprovals() || canInviteSecretaries());
    const isDisabledForMissingTurma = requiresMatchingTurma && (
      !selectedTurmaProgramType || programType !== selectedTurmaProgramType
    );
    tab.disabled = isDisabledForLogin || isDisabledForApprovalAccess || isDisabledForMissingTurma;
    tab.classList.toggle("is-disabled", tab.disabled);
  });

  logoutButton.hidden = !state.session;

  const activeTab = tabs.find((tab) => tab.classList.contains("is-active"));
  if (activeTab?.disabled) {
    activateTab(hasAppAccess() ? "turmas" : (state.session ? "cadastro" : "login"));
  }
}

function renderScopeButtons() {
  scopeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scopeButton === state.currentScope);
  });
}

function renderProgram() {
  if (state.isPublicShareMode) {
    state.program = removePublicContatoColumn(state.program);
  }
  state.program = normalizeProgramStructure(state.program);
  state.program.meta.startDate = getProgramStartDateForCurrentTab(state.program.meta.startDate);
  syncProgramDateColumn();
  syncDerivedProgramEndDate();
  titleInput.value = state.program.meta.title || "";
  if (classNumberInput) {
    const currentTurma = findCurrentTurma();
    classNumberInput.value = currentTurma?.nome || "";
  }
  startDateInput.value = state.program.meta.startDate || "";
  endDateInput.value = state.program.meta.endDate || "";

  const currentTurma = findCurrentTurma();
  const isArchived = Boolean(currentTurma?.archivedAt);
  const isEditable = state.isProgramEditing && !isArchived;

  const colgroup = document.createElement("colgroup");
  const toolsCol = document.createElement("col");
  toolsCol.className = "row-tools-col";
  colgroup.appendChild(toolsCol);

  state.program.headers.forEach((_, columnIndex) => {
    const col = document.createElement("col");
    col.style.width = getColumnWidthStyle(columnIndex);
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const toolsHead = document.createElement("th");
  toolsHead.className = "row-tools-head";
  toolsHead.textContent = "Linha";
  headRow.appendChild(toolsHead);

  state.program.headers.forEach((header, columnIndex) => {
    const th = document.createElement("th");
    const wrapper = document.createElement("div");
    wrapper.className = "header-cell";
    const input = document.createElement("input");
    input.dataset.columnIndex = String(columnIndex);
    input.value = header;
    input.size = getHeaderInputSize(header);
    input.disabled = !isEditable;
    input.setAttribute("aria-label", `Título da coluna ${columnIndex + 1}`);
    input.addEventListener("input", handleHeaderInput);
    input.addEventListener("blur", handleHeaderBlur);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "table-action-button";
    removeButton.dataset.columnIndex = String(columnIndex);
    removeButton.textContent = "X";
    removeButton.setAttribute("aria-label", `Excluir coluna ${columnIndex + 1}`);
    removeButton.title = "Excluir coluna";
    removeButton.disabled = !isEditable || state.program.headers.length <= 1;
    removeButton.addEventListener("click", handleRemoveColumnClick);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "table-action-button table-add-button";
    addButton.dataset.columnIndex = String(columnIndex);
    addButton.textContent = "+";
    addButton.setAttribute("aria-label", `Adicionar coluna à direita da coluna ${columnIndex + 1}`);
    addButton.title = "Adicionar coluna à direita";
    addButton.disabled = !isEditable;
    addButton.addEventListener("click", handleAddColumnClick);

    wrapper.appendChild(input);
    wrapper.appendChild(addButton);
    wrapper.appendChild(removeButton);
    wrapper.appendChild(createColumnResizeHandle(columnIndex, !isEditable));
    th.appendChild(wrapper);
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  state.program.rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const rowTools = document.createElement("td");
    rowTools.className = "row-tools-cell";
    const rowToolsWrap = document.createElement("div");
    rowToolsWrap.className = "row-tools";
    const rowLabel = document.createElement("span");
    rowLabel.className = "row-index-label";
    rowLabel.textContent = String(rowIndex + 1);
    const rowDelete = document.createElement("button");
    rowDelete.type = "button";
    rowDelete.className = "table-action-button";
    rowDelete.dataset.rowIndex = String(rowIndex);
    rowDelete.textContent = "X";
    rowDelete.setAttribute("aria-label", `Excluir linha ${rowIndex + 1}`);
    rowDelete.title = "Excluir linha";
    rowDelete.disabled = !isEditable;
    rowDelete.addEventListener("click", handleRemoveRowClick);
    const rowAdd = document.createElement("button");
    rowAdd.type = "button";
    rowAdd.className = "table-action-button table-add-button";
    rowAdd.dataset.rowIndex = String(rowIndex);
    rowAdd.textContent = "+";
    rowAdd.setAttribute("aria-label", `Adicionar linha abaixo da linha ${rowIndex + 1}`);
    rowAdd.title = "Adicionar linha abaixo";
    rowAdd.disabled = !isEditable;
    rowAdd.addEventListener("click", handleAddRowClick);
    rowToolsWrap.appendChild(rowLabel);
    rowToolsWrap.appendChild(rowAdd);
    rowToolsWrap.appendChild(rowDelete);
    rowTools.appendChild(rowToolsWrap);
    tr.appendChild(rowTools);

    state.program.headers.forEach((_, columnIndex) => {
      const td = document.createElement("td");
      td.classList.toggle("aulas-column-cell", columnIndex === 0);
      const isDateColumn = isDateColumnHeader(state.program.headers[columnIndex]);
      const isTemaColumn = isTemaColumnHeader(state.program.headers[columnIndex]);
      td.classList.toggle("date-column-cell", isDateColumn);
      td.classList.toggle("tema-column-cell", isTemaColumn);

      if (columnIndex === 0) {
        const editable = document.createElement("div");
        editable.className = "table-text-cell aulas-text-cell";
        editable.dataset.rowIndex = String(rowIndex);
        editable.dataset.columnIndex = String(columnIndex);
        editable.textContent = row[columnIndex] || "";
        editable.title = getCellHoverLabel(row[columnIndex]);
        editable.contentEditable = String(isEditable);
        editable.setAttribute("role", "textbox");
        editable.setAttribute("aria-label", `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
        editable.addEventListener("input", handleRowInput);
        editable.addEventListener("blur", handleAulasFieldBlur);
        td.appendChild(editable);
      } else if (isDateColumn) {
        const editable = document.createElement("div");
        editable.className = "table-text-cell date-text-cell";
        editable.dataset.rowIndex = String(rowIndex);
        editable.dataset.columnIndex = String(columnIndex);
        editable.textContent = normalizeDateCellValue(row[columnIndex] || "");
        editable.title = getCellHoverLabel(row[columnIndex]);
        editable.contentEditable = "false";
        editable.setAttribute("role", "textbox");
        editable.setAttribute("aria-label", `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
        td.appendChild(editable);
      } else {
        const editable = document.createElement("div");
        editable.className = "table-text-cell";
        editable.classList.toggle("tema-text-cell", isTemaColumn);
        editable.dataset.rowIndex = String(rowIndex);
        editable.dataset.columnIndex = String(columnIndex);
        editable.textContent = row[columnIndex] || "";
        editable.title = getCellHoverLabel(row[columnIndex]);
        editable.contentEditable = String(isEditable);
        editable.setAttribute("role", "textbox");
        editable.setAttribute("aria-multiline", "true");
        editable.setAttribute("aria-label", `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
        editable.addEventListener("input", handleRowInput);
        td.appendChild(editable);
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  const nextChildren = [colgroup, thead, tbody];
  table.replaceChildren(...nextChildren);
  updateProgramEditorLockState(isArchived);
  renderProgramShareCard();
}

function syncProgramMeta() {
  state.program.meta.startDate = getProgramStartDateForCurrentTab(normalizeDateCellValue(startDateInput.value));
  syncProgramDateColumn();
  syncDerivedProgramEndDate();
  state.program.meta = {
    title: titleInput.value,
    startDate: state.program.meta.startDate,
    endDate: getDerivedProgramEndDate() || normalizeDateCellValue(endDateInput.value),
  };
}

async function saveProgram() {
  try {
    await persistProgram({ autosave: false });
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteSavedProgram() {
  if (!state.session) {
    authNotice.textContent = "Faça login para apagar um programa salvo.";
    activateTab("login");
    return;
  }

  if (!state.currentTurmaId) {
    turmaSummary.textContent = "Selecione uma turma antes de apagar o programa salvo.";
    activateTab("turmas");
    return;
  }

  if (!window.confirm("Apagar o programa salvo desta turma? Essa ação remove o conteúdo persistido no banco.")) {
    return;
  }

  try {
    await apiRequest(`/api/turmas/${state.currentTurmaId}/program`, {
      method: "DELETE",
    });
    state.program = createEmptyProgram();
    renderProgram();
    window.alert("Programa salvo apagado com sucesso.");
  } catch (error) {
    window.alert(error.message);
  }
}

function removeRow(rowIndex) {
  const tbody = table.tBodies[0];
  if (!tbody) {
    state.program.rows.splice(rowIndex, 1);
    renderProgram();
    scheduleProgramAutosave();
    return;
  }

  state.program.rows.splice(rowIndex, 1);
  const rowElement = tbody.rows[rowIndex];
  if (rowElement) {
    rowElement.remove();
  }

  refreshRowDomMetadata();
  updateProgramEditorLockState(Boolean(findCurrentTurma()?.archivedAt));
  scheduleProgramAutosave();
}

function insertRowAfter(rowIndex) {
  const newRow = new Array(state.program.headers.length).fill("");
  state.program.rows.splice(rowIndex + 1, 0, newRow);
  renderProgram();
  scheduleProgramAutosave();
}

function removeColumn(columnIndex) {
  if (state.program.headers.length <= 1) return;
  state.program.headers.splice(columnIndex, 1);
  state.program.rows = state.program.rows.map((row) =>
    row.filter((_, currentColumnIndex) => currentColumnIndex !== columnIndex)
  );
  state.manualColumnWidths = shiftManualColumnWidthsForRemoval(state.manualColumnWidths, columnIndex);

  const colgroup = table.querySelector("colgroup");
  const headRow = table.tHead?.rows[0];
  const bodyRows = Array.from(table.tBodies[0]?.rows || []);
  if (!colgroup || !headRow) {
    renderProgram();
    scheduleProgramAutosave();
    return;
  }

  colgroup.children[columnIndex + 1]?.remove();
  headRow.children[columnIndex + 1]?.remove();
  bodyRows.forEach((row) => {
    row.children[columnIndex + 1]?.remove();
  });

  refreshColumnDomMetadata();
  updateProgramEditorLockState(Boolean(findCurrentTurma()?.archivedAt));
  updateColumnWidths();
  scheduleProgramAutosave();
}

function insertColumnAfter(columnIndex) {
  const insertAt = columnIndex + 1;
  state.program.headers.splice(insertAt, 0, `Nova coluna ${state.program.headers.length + 1}`);
  state.program.rows = state.program.rows.map((row) => {
    const nextRow = [...row];
    nextRow.splice(insertAt, 0, "");
    return nextRow;
  });
  state.manualColumnWidths = shiftManualColumnWidthsForInsert(state.manualColumnWidths, insertAt);
  renderProgram();
  scheduleProgramAutosave();
}

async function archiveCurrentTurma(archive) {
  try {
    const response = await apiRequest(`/api/turmas/${state.currentTurmaId}/archive`, {
      method: "POST",
      body: { archived: archive },
    });

    state.currentScope = response.turma.archivedAt ? "archived" : "active";
    renderScopeButtons();
    await loadTurmas(response.turma.id);
    turmaSummary.textContent = response.turma.archivedAt
      ? "Turma arquivada com sucesso."
      : "Turma restaurada com sucesso.";
  } catch (error) {
    turmaSummary.textContent = error.message;
  }
}

function exportProgramToPdf() {
  syncProgramMeta();
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) {
    window.alert("Não foi possível abrir a janela de impressão.");
    return;
  }

  const temaColumnIndex = state.program.headers.findIndex((header) => isTemaColumnHeader(header));
  const rowsHtml = state.program.rows
    .map((row) => (
      `<tr>${row.map((cell, columnIndex) => {
        const className = columnIndex === temaColumnIndex ? " class=\"pdf-col-tema\"" : "";
        return `<td${className}>${escapeHtml(cell)}</td>`;
      }).join("")}</tr>`
    ))
    .join("");
  const headerHtml = state.program.headers
    .map((header, columnIndex) => {
      const className = columnIndex === temaColumnIndex ? " class=\"pdf-col-tema\"" : "";
      return `<th${className}>${escapeHtml(header)}</th>`;
    })
    .join("");
  const columnWidthPercentages = getProgramColumnWidthPercentagesForPdf();
  const colgroupHtml = `<colgroup>${columnWidthPercentages
    .map((width) => `<col style="width:${width.toFixed(4)}%">`)
    .join("")}</colgroup>`;
  const turma = findCurrentTurma();

  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(state.program.meta.title || "Programa")}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0 0 6px; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; table-layout: fixed; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: center; vertical-align: top; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
          th { background: #ecfeff; }
          .pdf-col-tema { text-align: left; }
          @media print {
            html, body { width: 100%; height: auto; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(state.program.meta.title || "Programa da turma")}</h1>
        <p>Turma: ${escapeHtml(turma?.nome || "Não selecionada")}</p>
        <p>Data inicial: ${escapeHtml(state.program.meta.startDate || "-")}</p>
        <p>Data final: ${escapeHtml(state.program.meta.endDate || "-")}</p>
        <table>
          ${colgroupHtml}
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function getProgramColumnWidthPercentagesForPdf() {
  const headerRow = table.tHead?.rows?.[0];
  const headerCells = headerRow ? Array.from(headerRow.cells).slice(1) : [];
  const widths = headerCells.map((cell, index) => {
    const rectWidth = Number(cell.getBoundingClientRect().width || 0);
    if (rectWidth > 0) {
      return rectWidth;
    }

    const fallbackWidth = getColumnWidthStyle(index);
    const parsed = Number.parseFloat(String(fallbackWidth || "").replace("px", ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });

  const validWidths = widths.filter((value) => value > 0);
  if (!validWidths.length || validWidths.length !== state.program.headers.length) {
    const equal = 100 / Math.max(1, state.program.headers.length);
    return state.program.headers.map(() => equal);
  }

  const total = validWidths.reduce((sum, value) => sum + value, 0);
  if (!total) {
    const equal = 100 / Math.max(1, state.program.headers.length);
    return state.program.headers.map(() => equal);
  }

  return validWidths.map((value) => (value / total) * 100);
}

function activateTab(tabName) {
  const nextTab = tabName === "programa"
    ? tabs.find((tab) => tab.dataset.tabTarget === state.currentProgramTab)
    : tabs.find((tab) => (
        tab.dataset.tabTarget === tabName
        || tab.dataset.tabPanelTarget === tabName
      ));
  if (nextTab) nextTab.click();
}

function findCurrentTurma() {
  return state.turmas.find((turma) => turma.id === state.currentTurmaId) || null;
}

function getProgramTypeForTab(tab) {
  const tabTarget = tab?.dataset?.tabTarget;
  if (tabTarget === "programa-cb") return "CB";
  if (tabTarget === "programa-eae") return "EAE";
  if (tabTarget === "programa-le") return "LE";
  return null;
}

function removePublicContatoColumn(program) {
  if (!program || !Array.isArray(program.headers) || !Array.isArray(program.rows)) {
    return program;
  }

  const contatoIndex = program.headers.findIndex(
    (header) => {
      const label = String(header || "").trim().toLowerCase();
      return label === "contato" || label.includes("contato") || label.includes("contat");
    }
  );
  if (contatoIndex === -1) {
    return program;
  }

  return {
    ...program,
    headers: program.headers.filter((_, index) => index !== contatoIndex),
    rows: program.rows.map((row) => {
      const safeRow = Array.isArray(row) ? row : [];
      return safeRow.filter((_, index) => index !== contatoIndex);
    }),
  };
}

function getProgramTabForTurmaType(type) {
  if (type === "CB") return "programa-cb";
  if (type === "EAE") return "programa-eae";
  if (type === "LE") return "programa-le";
  return null;
}

function getCurrentTurmaProgramType() {
  return findCurrentTurma()?.tipo || null;
}

function resolveProgramForActiveTab(savedProgram) {
  return savedProgram || createEmptyProgram();
}

function extractProgramTableStructure(rows, fallbackHeaders) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headerRowIndex = safeRows.findIndex((row) => {
    if (!Array.isArray(row)) {
      return false;
    }

    return row.some((cell) => String(cell ?? "").trim() !== "") && isAulasColumnHeader(row[0]);
  });

  if (headerRowIndex === -1) {
    return {
      headers: fallbackHeaders,
      rows: safeRows,
    };
  }

  return {
    headers: safeRows[headerRowIndex],
    rows: safeRows.slice(headerRowIndex + 1),
  };
}

function normalizeProgramStructure(program) {
  const sourceHeaders =
    Array.isArray(program?.headers) && program.headers.length
      ? program.headers.map((header) => normalizeHeaderValue(header))
      : ["A"];
  const sourceRows = Array.isArray(program?.rows) ? trimExcessTrailingEmptyRows(program.rows) : [];
  const { headers, rows } = trimExcessTrailingEmptyColumns(sourceHeaders, sourceRows);

  return {
    ...program,
    headers,
    rows: rows.map((row) => {
      const cells = Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [];
      while (cells.length < headers.length) {
        cells.push("");
      }
      const normalizedCells = cells.slice(0, headers.length);
      if (isAulasColumnHeader(headers[0])) {
        normalizedCells[0] = normalizeAulasCellValue(normalizedCells[0]);
      }
      return normalizedCells;
    }),
  };
}

function trimExcessTrailingEmptyRows(rows) {
  let trailingEmptyRows = 0;

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (isRowEmpty(rows[index])) {
      trailingEmptyRows += 1;
      continue;
    }

    break;
  }

  if (trailingEmptyRows <= TRAILING_EMPTY_ROWS_TRIM_THRESHOLD) {
    return rows;
  }

  return rows.slice(0, rows.length - trailingEmptyRows + MAX_TRAILING_EMPTY_ROWS);
}

function isRowEmpty(row) {
  if (!Array.isArray(row)) {
    return true;
  }

  return row.every((cell) => String(cell ?? "").trim() === "");
}

function trimExcessTrailingEmptyColumns(headers, rows) {
  let trailingEmptyColumns = 0;

  for (let columnIndex = headers.length - 1; columnIndex >= 0; columnIndex -= 1) {
    if (isColumnEmpty(columnIndex, headers, rows)) {
      trailingEmptyColumns += 1;
      continue;
    }

    break;
  }

  if (trailingEmptyColumns <= TRAILING_EMPTY_COLUMNS_TRIM_THRESHOLD) {
    return { headers, rows };
  }

  const nextLength = headers.length - trailingEmptyColumns + MAX_TRAILING_EMPTY_COLUMNS;
  return {
    headers: headers.slice(0, nextLength),
    rows: rows.map((row) => (Array.isArray(row) ? row.slice(0, nextLength) : [])),
  };
}

function isColumnEmpty(columnIndex, headers, rows) {
  const headerValue = String(headers[columnIndex] ?? "").trim();
  const isGenericSpreadsheetHeader = headerValue === getSpreadsheetColumnLabel(columnIndex);
  if (!isGenericSpreadsheetHeader) {
    return false;
  }

  return rows.every((row) => String((row || [])[columnIndex] ?? "").trim() === "");
}

function getSpreadsheetColumnLabel(columnIndex) {
  let label = "";
  let value = columnIndex;

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function getColumnWidthCh(columnIndex) {
  const header = state.program.headers[columnIndex] || "";
  let maxLength = getHeaderInputBoxWidthCh(header);

  state.program.rows.forEach((row) => {
    maxLength = Math.max(maxLength, getLongestLineLength(row[columnIndex] || ""));
  });

  return Math.min(Math.max(maxLength + 2, 7), 52);
}

function getHeaderInputSize(value) {
  return Math.min(Math.max(getLongestLineLength(value) + 2, 4), 52);
}

function getHeaderInputBoxWidthCh(value) {
  return getHeaderInputSize(value) + 5;
}

function getLongestLineLength(text) {
  return String(text)
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);
}

function handleHeaderInput(event) {
  const columnIndex = Number(event.target.dataset.columnIndex);
  if (!Number.isInteger(columnIndex)) {
    return;
  }

  const normalizedHeader = normalizeHeaderValue(event.target.value);
  if (event.target.value !== normalizedHeader) {
    event.target.value = normalizedHeader;
  }
  state.program.headers[columnIndex] = normalizedHeader;
  event.target.size = getHeaderInputSize(normalizedHeader);
  scheduleColumnWidthUpdate(columnIndex);
  scheduleProgramAutosave();
}

function handleHeaderBlur(event) {
  const columnIndex = Number(event.target.dataset.columnIndex);
  if (!Number.isInteger(columnIndex)) {
    return;
  }

  const normalizedHeader = normalizeHeaderValue(event.target.value);
  if (event.target.value !== normalizedHeader) {
    event.target.value = normalizedHeader;
  }

  state.program.headers[columnIndex] = normalizedHeader;
  syncProgramDateColumn();
  syncDerivedProgramEndDate();
  renderProgram();
  scheduleProgramAutosave();
}

function handleRemoveColumnClick(event) {
  const columnIndex = Number(event.currentTarget.dataset.columnIndex);
  if (!Number.isInteger(columnIndex)) {
    return;
  }

  removeColumn(columnIndex);
}

function handleRemoveRowClick(event) {
  const rowIndex = Number(event.currentTarget.dataset.rowIndex);
  if (!Number.isInteger(rowIndex)) {
    return;
  }

  removeRow(rowIndex);
}

function handleAddRowClick(event) {
  const rowIndex = Number(event.currentTarget.dataset.rowIndex);
  if (!Number.isInteger(rowIndex)) {
    return;
  }

  insertRowAfter(rowIndex);
}

function handleAddColumnClick(event) {
  const columnIndex = Number(event.currentTarget.dataset.columnIndex);
  if (!Number.isInteger(columnIndex)) {
    return;
  }

  insertColumnAfter(columnIndex);
}

function handleRowInput(event) {
  const rowIndex = Number(event.target.dataset.rowIndex);
  const columnIndex = Number(event.target.dataset.columnIndex);
  if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
    return;
  }

  let nextValue = getEditableFieldValue(event.target);
  if (columnIndex === 0) {
    state.program.rows[rowIndex][columnIndex] = nextValue;
    scheduleColumnWidthUpdate(columnIndex);
    scheduleProgramAutosave();
    return;
  }

  if (isDateColumnHeader(state.program.headers[columnIndex])) {
    state.program.rows[rowIndex][columnIndex] = nextValue;
    scheduleColumnWidthUpdate(columnIndex);
    scheduleProgramAutosave();
    return;
  }

  state.program.rows[rowIndex][columnIndex] = nextValue;
  scheduleColumnWidthUpdate(columnIndex);
  scheduleProgramAutosave();
}

function handleAulasFieldBlur(event) {
  const rowIndex = Number(event.target.dataset.rowIndex);
  const columnIndex = Number(event.target.dataset.columnIndex);
  if (!Number.isInteger(rowIndex) || columnIndex !== 0) {
    return;
  }

  const normalizedValue = normalizeAulasCellValue(getEditableFieldValue(event.target));
  setEditableFieldValue(event.target, normalizedValue);
  state.program.rows[rowIndex][columnIndex] = normalizedValue;
  scheduleColumnWidthUpdate(columnIndex);
  scheduleProgramAutosave();
}

function handleDateFieldBlur(event) {
  const rowIndex = Number(event.target.dataset.rowIndex);
  const columnIndex = Number(event.target.dataset.columnIndex);
  if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
    return;
  }

  const normalizedValue = normalizeDateCellValue(getEditableFieldValue(event.target));
  setEditableFieldValue(event.target, normalizedValue);
  state.program.rows[rowIndex][columnIndex] = normalizedValue;
  syncDerivedProgramEndDate();
  scheduleColumnWidthUpdate(columnIndex);
  scheduleProgramAutosave();
}

function handleProgramDateInput(event) {
  event.target.value = normalizeDateCellValue(event.target.value);
  syncProgramMeta();
  renderProgram();
  scheduleProgramAutosave();
}

function handleProgramDateBlur(event) {
  event.target.value = normalizeDateCellValue(event.target.value);
  syncProgramMeta();
  renderProgram();
  scheduleProgramAutosave();
}

function refreshRowDomMetadata() {
  const tbody = table.tBodies[0];
  if (!tbody) {
    return;
  }

  Array.from(tbody.rows).forEach((row, rowIndex) => {
    const label = row.querySelector(".row-index-label");
    if (label) {
      label.textContent = String(rowIndex + 1);
    }

    const rowDeleteButton = row.querySelector(".table-action-button:not(.table-add-button)");
    if (rowDeleteButton) {
      rowDeleteButton.dataset.rowIndex = String(rowIndex);
      rowDeleteButton.setAttribute("aria-label", `Excluir linha ${rowIndex + 1}`);
      rowDeleteButton.title = "Excluir linha";
    }

    const rowAddButton = row.querySelector(".table-add-button");
    if (rowAddButton) {
      rowAddButton.dataset.rowIndex = String(rowIndex);
      rowAddButton.setAttribute("aria-label", `Adicionar linha abaixo da linha ${rowIndex + 1}`);
      rowAddButton.title = "Adicionar linha abaixo";
    }

    Array.from(row.querySelectorAll("input, .table-text-cell")).forEach((field, columnIndex) => {
      field.dataset.rowIndex = String(rowIndex);
      field.dataset.columnIndex = String(columnIndex);
      field.setAttribute("aria-label", `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}`);
    });
  });
}

function refreshColumnDomMetadata() {
  const headRow = table.tHead?.rows[0];
  if (!headRow) {
    return;
  }

  Array.from(headRow.cells).slice(1).forEach((cell, columnIndex) => {
    const input = cell.querySelector("input");
    if (input) {
      input.dataset.columnIndex = String(columnIndex);
      input.setAttribute("aria-label", `Título da coluna ${columnIndex + 1}`);
    }

    const removeButton = cell.querySelector(".table-action-button:not(.table-add-button)");
    if (removeButton) {
      removeButton.dataset.columnIndex = String(columnIndex);
      removeButton.setAttribute("aria-label", `Excluir coluna ${columnIndex + 1}`);
      removeButton.title = "Excluir coluna";
    }

    const addButton = cell.querySelector(".table-add-button");
    if (addButton) {
      addButton.dataset.columnIndex = String(columnIndex);
      addButton.setAttribute("aria-label", `Adicionar coluna à direita da coluna ${columnIndex + 1}`);
      addButton.title = "Adicionar coluna à direita";
    }
  });

  refreshRowDomMetadata();
}

function updateProgramEditorLockState(isArchived) {
  const isEditable = state.isProgramEditing && !isArchived && !state.isPublicShareMode;
  const isProgramStartDateEditable = isEditable && state.currentProgramTab !== "programa-cb";

  table.classList.toggle("is-readonly", !isEditable);

  [titleInput, endDateInput].forEach((field) => {
    field.disabled = !isEditable;
  });
  startDateInput.disabled = !isProgramStartDateEditable;

  if (editProgramButton) {
    editProgramButton.disabled = isArchived || state.isPublicShareMode;
    editProgramButton.classList.toggle("is-active", state.isProgramEditing && !isArchived);
    editProgramButton.setAttribute("aria-pressed", String(state.isProgramEditing && !isArchived));
    editProgramButton.textContent = state.isProgramEditing && !isArchived ? "Visualizar" : "Editar";
    editProgramButton.hidden = state.isPublicShareMode;
  }

  if (resetTemplateButton) resetTemplateButton.disabled = !isEditable;
  if (addRowButton) addRowButton.disabled = !isEditable;
  if (removeLastRowButton) removeLastRowButton.disabled = !isEditable || !state.program.rows.length;
  if (addColumnButton) addColumnButton.disabled = !isEditable;
  if (removeLastColumnButton) removeLastColumnButton.disabled = !isEditable || state.program.headers.length <= 1;
  if (saveProgramButton) {
    saveProgramButton.hidden = state.currentProgramTab === "programa-cb";
    saveProgramButton.disabled = isArchived || state.isPublicShareMode;
  }
  if (deleteProgramButton) {
    deleteProgramButton.disabled = !isEditable;
    deleteProgramButton.hidden = state.isPublicShareMode;
  }
  if (exportMenu) {
    exportMenu.classList.toggle("is-disabled", isArchived);
    if (isArchived) {
      exportMenu.removeAttribute("open");
    }
  }
  if (exportPdfButton) exportPdfButton.disabled = isArchived;

  table.querySelectorAll("thead .table-action-button").forEach((button) => {
    button.disabled = button.classList.contains("table-add-button")
      ? !isEditable
      : !isEditable || state.program.headers.length <= 1;
  });

  table.querySelectorAll("tbody .table-action-button").forEach((button) => {
    button.disabled = !isEditable;
  });
}

async function loadProgramShareLink(turmaId) {
  state.currentProgramShareUrl = "";
  state.currentProgramShareToken = "";
  state.currentStudentSignupShareUrl = "";
  state.currentProgramShareError = "";
  state.currentProgramShareTurmaId = turmaId || null;
  state.isProgramShareLoading = Boolean(turmaId);
  renderProgramShareCard();
  if (!turmaId || !hasAppAccess()) {
    state.isProgramShareLoading = false;
    return;
  }

  try {
    const [programResponse, studentSignupResponse] = await Promise.all([
      apiRequest(`/api/turmas/${turmaId}/share-link`),
      apiRequest(`/api/turmas/${turmaId}/student-signup-link`),
    ]);
    state.currentProgramShareUrl = programResponse.url || "";
    state.currentProgramShareToken = String(programResponse.token || "").trim();
    state.currentStudentSignupShareUrl = studentSignupResponse.url || "";
    state.currentProgramShareError = "";
  } catch (error) {
    state.currentProgramShareUrl = "";
    state.currentProgramShareToken = "";
    state.currentStudentSignupShareUrl = "";
    state.currentProgramShareError = error.message;
  }
  state.isProgramShareLoading = false;
  renderProgramShareCard();
}

function renderProgramShareCard() {
  if (!shareProgramCard) {
    return;
  }
  if (state.isPublicShareMode) {
    shareProgramCard.hidden = true;
    return;
  }

  const hasTurma = Boolean(state.currentTurmaId);
  shareProgramCard.hidden = !hasTurma;
  if (!hasTurma) {
    return;
  }

  const shouldLoad = hasAppAccess()
    && !state.isProgramShareLoading
    && (!state.currentProgramShareUrl || state.currentProgramShareTurmaId !== state.currentTurmaId)
    && !state.currentProgramShareError;
  if (shouldLoad) {
    loadProgramShareLink(state.currentTurmaId);
  }

  const hasLink = Boolean(state.currentProgramShareUrl);
  const studentSignupLink = String(state.currentStudentSignupShareUrl || "").trim();
  const hasStudentSignupLink = Boolean(studentSignupLink);
  const currentTurma = findCurrentTurma();
  const isStudentSignupEnabled = currentTurma?.studentSignupLinkEnabled !== false;
  const canManageStudentSignupLink = Boolean(state.session)
    && (state.session.role === "Admin" || state.session.id === currentTurma?.ownerUserId);
  if (shareProgramUrlInput) {
    shareProgramUrlInput.value = state.currentProgramShareUrl || "";
  }
  if (openShareProgramLink) {
    openShareProgramLink.href = hasLink ? state.currentProgramShareUrl : "#";
    openShareProgramLink.setAttribute("aria-disabled", String(!hasLink));
  }
  if (copyShareProgramLinkButton) {
    copyShareProgramLinkButton.disabled = !hasLink;
  }
  if (shareProgramStatus) {
    shareProgramStatus.textContent = state.isProgramShareLoading
      ? "Gerando link de compartilhamento..."
      : hasLink
      ? "Link pronto para compartilhamento com visualização somente leitura."
      : (state.currentProgramShareError || "Não foi possível gerar o link de compartilhamento para esta turma.");
  }

  // Link de cadastro de alunos é exibido dentro do card "Alunos da turma".
  const shouldExposeStudentSignup = !state.isPublicShareMode && Boolean(state.currentTurmaId);
  const canOpenStudentSignup = shouldExposeStudentSignup && hasStudentSignupLink && isStudentSignupEnabled;
  if (shareStudentSignupUrlInput) {
    shareStudentSignupUrlInput.value = canOpenStudentSignup ? studentSignupLink : "";
    shareStudentSignupUrlInput.hidden = !canOpenStudentSignup;
  }
  if (openShareStudentSignupLink) {
    openShareStudentSignupLink.href = canOpenStudentSignup ? studentSignupLink : "javascript:void(0)";
    openShareStudentSignupLink.setAttribute("aria-disabled", String(!canOpenStudentSignup));
    openShareStudentSignupLink.hidden = !canOpenStudentSignup;
  }
  if (copyShareStudentSignupLinkButton) {
    copyShareStudentSignupLinkButton.disabled = !canOpenStudentSignup;
    copyShareStudentSignupLinkButton.hidden = !canOpenStudentSignup;
  }
  if (toggleShareStudentSignupLinkButton) {
    toggleShareStudentSignupLinkButton.hidden = !shouldExposeStudentSignup || !canManageStudentSignupLink;
    toggleShareStudentSignupLinkButton.textContent = isStudentSignupEnabled ? "Desativar link" : "Ativar link";
  }
  if (shareStudentSignupStatus) {
    shareStudentSignupStatus.hidden = !shouldExposeStudentSignup;
    shareStudentSignupStatus.textContent = isStudentSignupEnabled
      ? "Link de cadastro ativo para esta turma."
      : "Link de cadastro desativado pelo dirigente.";
  }
}

async function copyShareProgramLink() {
  const link = state.currentProgramShareUrl;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    if (shareProgramStatus) {
      shareProgramStatus.textContent = "Link copiado para a área de transferência.";
    }
    showToast("success", "Link copiado", "O link de visualização foi copiado.");
  } catch (error) {
    if (shareProgramStatus) {
      shareProgramStatus.textContent = "Não foi possível copiar automaticamente. Copie manualmente o campo acima.";
    }
    showToast("error", "Falha ao copiar", "Copie manualmente o link no campo de compartilhamento.");
  }
}

async function copyShareStudentSignupLink() {
  const link = String(state.currentStudentSignupShareUrl || "").trim();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    showToast("success", "Link copiado", "O link de cadastro de alunos foi copiado.");
  } catch (error) {
    showToast("error", "Falha ao copiar", "Copie manualmente o link do campo de cadastro de alunos.");
  }
}

function openStudentSignupShareLink(event) {
  event?.preventDefault();
  const link = String(state.currentStudentSignupShareUrl || "").trim();
  if (!link) {
    showToast("error", "Link indisponível", "Não foi possível gerar o link de cadastro desta turma.");
    return;
  }
  window.open(link, "_blank", "noopener");
}

async function toggleStudentSignupShareLink() {
  const turma = findCurrentTurma();
  const turmaId = turma?.id;
  if (!turmaId) return;
  const nextEnabled = !(turma?.studentSignupLinkEnabled !== false);
  const confirmed = await showConfirmActionDialog({
    title: nextEnabled ? "Ativar link público" : "Desativar link público",
    message: nextEnabled
      ? "Deseja ativar o link público de auto-cadastro dos alunos para esta turma?"
      : "Deseja desativar o link público de auto-cadastro dos alunos para esta turma?",
    confirmLabel: nextEnabled ? "Ativar link" : "Desativar link",
  });
  if (!confirmed) {
    return;
  }

  try {
    if (toggleShareStudentSignupLinkButton) {
      toggleShareStudentSignupLinkButton.disabled = true;
    }
    const response = await apiRequest(`/api/turmas/${turmaId}/student-signup-link`, {
      method: "PUT",
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    const updatedTurma = response?.turma;
    if (updatedTurma) {
      state.turmas = state.turmas.map((item) => item.id === updatedTurma.id ? updatedTurma : item);
      if (state.currentTurmaId === updatedTurma.id) {
        state.importedStudents = Array.isArray(updatedTurma.alunos) ? updatedTurma.alunos : [];
      }
    }
    renderProgramShareCard();
    renderTurmaSummary(findCurrentTurma() || updatedTurma || turma);
    showToast("success", "Link atualizado", nextEnabled
      ? "Link de cadastro ativado para esta turma."
      : "Link de cadastro desativado para esta turma.");
  } catch (error) {
    showToast("error", "Falha ao atualizar", error.message);
  } finally {
    if (toggleShareStudentSignupLinkButton) {
      toggleShareStudentSignupLinkButton.disabled = false;
    }
  }
}

function renderPublicStudentSignupCard() {
  if (!publicStudentSignupCard) {
    return;
  }

  const shouldShow = state.isPublicShareMode && isStudentSignupModeFromUrl();
  publicStudentSignupCard.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  const turma = findCurrentTurma();
  if (publicStudentSignupTurmaInfo) {
    if (!turma) {
      publicStudentSignupTurmaInfo.textContent = "Turma vinculada: não informada.";
    } else {
      const turmaInicio = turma.inicio || "não informado";
      const turmaHorario = turma.horarioInicio || turma.horarios || "não informado";
      publicStudentSignupTurmaInfo.textContent = [
        `Turma: ${turma.nome || "não informada"}`,
        `Tipo: ${formatTurmaTypeLabel(turma.tipo)}`,
        `Modalidade: ${formatTurmaModalidadeLabel(turma.modalidade)}`,
        `Início: ${turmaInicio}`,
        `Horário: ${turmaHorario}`,
      ].join(" · ");
    }
  }

  if (publicStudentSignupFeedback) {
    publicStudentSignupFeedback.textContent = "Preencha os dados para concluir o vínculo com a turma.";
  }
}

publicStudentSignupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const shareToken = getPublicShareTokenFromUrl();
  if (!shareToken) {
    return;
  }

  const submitButton = publicStudentSignupForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  if (publicStudentSignupFeedback) {
    publicStudentSignupFeedback.textContent = "Cadastrando aluno...";
  }

  try {
    const payload = Object.fromEntries(new FormData(publicStudentSignupForm).entries());
    const response = await window.fetch(`/api/public/programa/${encodeURIComponent(shareToken)}/alunos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Não foi possível concluir o cadastro do aluno.");
    }

    publicStudentSignupForm.reset();
    if (publicStudentSignupFeedback) {
      publicStudentSignupFeedback.textContent = `${data.aluno?.nome || "Aluno"} cadastrado(a) com sucesso.`;
    }
    showToast("success", "Cadastro realizado", "Aluno vinculado automaticamente à turma.");
  } catch (error) {
    if (publicStudentSignupFeedback) {
      publicStudentSignupFeedback.textContent = error.message;
    }
    showToast("error", "Erro no cadastro", error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});

function normalizeAulasCellValue(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) {
    return "";
  }

  const match = text.match(/^(\d+)(?:\s*([A-Z]))?$/);
  if (!match) {
    return text;
  }

  const number = match[1].length < 3 ? match[1].padStart(3, "0") : match[1];
  const suffix = match[2] ? ` ${match[2]}` : "";
  return `${number}${suffix}`;
}

function getCellHoverLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  if (/\bEPP\b/i.test(text)) {
    return "Espiritismo Primeiros Passos";
  }

  return "";
}

function normalizeHeaderValue(value) {
  return String(value ?? "").trim();
}

function isAulasColumnHeader(value) {
  const normalized = normalizeHeaderValue(value).toUpperCase();
  return normalized === "AULAS" || normalized === "N. AULAS";
}

function isDateColumnHeader(value) {
  return normalizeHeaderValue(value).toUpperCase().includes("DATA");
}

function isTemaColumnHeader(value) {
  return normalizeHeaderValue(value).toUpperCase() === "TEMA";
}

function normalizeDateCellValue(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  const parts = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }
  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }
  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }

  return parts.join("/");
}

function parseNormalizedDateValue(value) {
  const normalizedValue = normalizeDateCellValue(value);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedValue)) {
    return null;
  }

  const [day, month, year] = normalizedValue.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateValue(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function syncProgramDateColumn() {
  const dateColumnIndex = state.program.headers.findIndex((header) => isDateColumnHeader(header));
  if (dateColumnIndex === -1) {
    return;
  }

  const startDate = parseNormalizedDateValue(state.program.meta.startDate || startDateInput.value);
  state.program.rows.forEach((row, rowIndex) => {
    if (!startDate) {
      row[dateColumnIndex] = "";
      return;
    }

    row[dateColumnIndex] = formatDateValue(addDays(startDate, rowIndex * 7));
  });
}

function getDerivedProgramEndDate() {
  const dateColumnIndex = state.program.headers.findIndex((header) => isDateColumnHeader(header));
  if (dateColumnIndex === -1) {
    return "";
  }

  const lastRow = state.program.rows[state.program.rows.length - 1];
  return normalizeDateCellValue(lastRow?.[dateColumnIndex] || "");
}

function syncDerivedProgramEndDate() {
  const derivedEndDate = getDerivedProgramEndDate();
  state.program.meta.endDate = derivedEndDate;
  endDateInput.value = derivedEndDate;
}

function scheduleColumnWidthUpdate(columnIndex) {
  if (state.manualColumnWidths[columnIndex]) {
    return;
  }

  pendingColumnIndexes.add(columnIndex);

  if (pendingColumnWidthFrame !== null) {
    return;
  }

  pendingColumnWidthFrame = window.requestAnimationFrame(() => {
    pendingColumnWidthFrame = null;
    updateColumnWidths(Array.from(pendingColumnIndexes));
    pendingColumnIndexes.clear();
  });
}

function updateColumnWidths(columnIndexes = null) {
  const cols = table.querySelectorAll("col");
  const indexesToUpdate = columnIndexes ?? state.program.headers.map((_, columnIndex) => columnIndex);
  indexesToUpdate.forEach((columnIndex) => {
    const col = cols[columnIndex + 1];
    if (col) {
      col.style.width = getColumnWidthStyle(columnIndex);
    }
  });
}

function getColumnWidthStyle(columnIndex) {
  const manualWidth = state.manualColumnWidths[columnIndex];
  if (manualWidth) {
    return `${manualWidth}px`;
  }

  return `${getColumnWidthCh(columnIndex)}ch`;
}

function createColumnResizeHandle(columnIndex, isLocked) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "column-resize-handle";
  handle.dataset.columnIndex = String(columnIndex);
  handle.disabled = isLocked;
  handle.setAttribute("aria-label", `Redimensionar coluna ${columnIndex + 1}`);
  handle.title = "Arraste para redimensionar";
  handle.addEventListener("mousedown", handleColumnResizeStart);
  return handle;
}

function handleColumnResizeStart(event) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  const columnIndex = Number(event.currentTarget.dataset.columnIndex);
  if (!Number.isInteger(columnIndex)) {
    return;
  }

  const col = table.querySelectorAll("col")[columnIndex + 1];
  if (!col) {
    return;
  }

  const startX = event.clientX;
  const startWidth = col.getBoundingClientRect().width;

  const handlePointerMove = (moveEvent) => {
    const minWidth = getMinimumManualColumnWidthPx(columnIndex);
    const nextWidth = Math.max(
      minWidth,
      Math.round(startWidth + (moveEvent.clientX - startX))
    );
    state.manualColumnWidths[columnIndex] = nextWidth;
    col.style.width = `${nextWidth}px`;
  };

  const handlePointerUp = () => {
    window.removeEventListener("mousemove", handlePointerMove);
    window.removeEventListener("mouseup", handlePointerUp);
  };

  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("mouseup", handlePointerUp);
}

function getMinimumManualColumnWidthPx(columnIndex) {
  const headerInput = table.tHead?.rows[0]?.cells[columnIndex + 1]?.querySelector("input");
  const headerText = String(state.program.headers[columnIndex] ?? "");
  if (!headerInput) {
    return Math.max(MIN_MANUAL_COLUMN_WIDTH_PX, Math.ceil(headerText.length * 8));
  }

  const renderedInputWidth = Math.ceil(headerInput.getBoundingClientRect().width);
  const headerCell = headerInput.closest(".header-cell");
  const computedCellStyle = headerCell ? window.getComputedStyle(headerCell) : null;
  const cellPaddingLeft = computedCellStyle ? parseFloat(computedCellStyle.paddingLeft) || 0 : 0;
  const cellPaddingRight = computedCellStyle ? parseFloat(computedCellStyle.paddingRight) || 0 : 0;
  const resizeHandleAllowance = 10;
  const renderedInputMinimumWidth = renderedInputWidth + cellPaddingLeft + cellPaddingRight + resizeHandleAllowance;

  const computedStyle = window.getComputedStyle(headerInput);
  const font = computedStyle.font || [
    computedStyle.fontStyle,
    computedStyle.fontVariant,
    computedStyle.fontWeight,
    computedStyle.fontSize,
    computedStyle.lineHeight === "normal" ? "" : `/${computedStyle.lineHeight}`,
    computedStyle.fontFamily,
  ].filter(Boolean).join(" ");

  const canvas = getMinimumManualColumnWidthPx.canvas
    || (getMinimumManualColumnWidthPx.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) {
    return Math.max(MIN_MANUAL_COLUMN_WIDTH_PX, Math.ceil(headerText.length * 8));
  }

  context.font = font;
  const textWidth = Math.ceil(context.measureText(headerText || " ").width);
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
  const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
  const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
  const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
  const measuredTextMinimumWidth = Math.ceil(
    textWidth + paddingLeft + paddingRight + borderLeft + borderRight + resizeHandleAllowance
  );

  return Math.max(
    MIN_MANUAL_COLUMN_WIDTH_PX,
    renderedInputMinimumWidth,
    measuredTextMinimumWidth
  );
}

function shiftManualColumnWidthsForInsert(widths, insertAt) {
  const nextWidths = {};
  Object.entries(widths).forEach(([key, value]) => {
    const index = Number(key);
    nextWidths[index >= insertAt ? index + 1 : index] = value;
  });
  return nextWidths;
}

function shiftManualColumnWidthsForRemoval(widths, removedIndex) {
  const nextWidths = {};
  Object.entries(widths).forEach(([key, value]) => {
    const index = Number(key);
    if (index === removedIndex) {
      return;
    }
    nextWidths[index > removedIndex ? index - 1 : index] = value;
  });
  return nextWidths;
}

function getEditableFieldValue(field) {
  if ("value" in field) {
    return field.value;
  }

  return field.textContent || "";
}

function setEditableFieldValue(field, value) {
  if ("value" in field) {
    field.value = value;
    return;
  }

  field.textContent = value;
}

function buildExportBaseName() {
  const turma = findCurrentTurma();
  const title = state.program.meta.title || turma?.nome || "programa";
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "programa";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function apiRequest(path, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await window.fetch(path, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data;
}

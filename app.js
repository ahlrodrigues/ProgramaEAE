const state = {
  session: null,
  users: [],
  turmas: [],
  activeTurmasForCopy: [],
  currentTurmaId: null,
  currentScope: "active",
  currentProgramTab: "programa-cb",
  isCreatingTurma: false,
  isTurmaDetailsOpen: false,
  isEditingTurma: false,
  importedStudents: [],
  program: createMinimalProgram(),
  isProgramEditing: false,
  isContactsEditing: false,
  manualColumnWidths: {},
};

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const sessionChip = document.querySelector("#session-chip");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const contactsForm = document.querySelector("#contacts-form");
const contactsSummary = document.querySelector("#contacts-summary");
const adminUsersSection = document.querySelector("#admin-users-section");
const adminUsersList = document.querySelector("#admin-users-list");
const turmaSecretariesList = document.querySelector("#turma-secretaries-list");
const addTurmaSecretaryButton = document.querySelector("#add-turma-secretary-button");
const editContactsButton = document.querySelector("#edit-contacts-button");
const turmaForm = document.querySelector("#turma-form");
const turmaSummary = document.querySelector("#turma-summary");
const turmaList = document.querySelector("#turma-list");
const authNotice = document.querySelector("#auth-notice");
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
const studentsTableBody = document.querySelector("#students-table-body");
const studentsImportFeedback = document.querySelector("#students-import-feedback");
const turmaWeekdayInput = document.querySelector("#turma-weekday");
const toastRegion = document.querySelector("#toast-region");
const titleInput = document.querySelector("#program-title");
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
const exportExcelButton = document.querySelector("#export-excel");
const exportPdfButton = document.querySelector("#export-pdf");

const TOKEN_KEY = "eae.api.token";
let pendingColumnWidthFrame = null;
const pendingColumnIndexes = new Set();
const MAX_TRAILING_EMPTY_ROWS = 20;
const TRAILING_EMPTY_ROWS_TRIM_THRESHOLD = 50;
const MAX_TRAILING_EMPTY_COLUMNS = 2;
const TRAILING_EMPTY_COLUMNS_TRIM_THRESHOLD = 3;
const MIN_MANUAL_COLUMN_WIDTH_PX = 40;
const STUDENTS_TEMPLATE_CSV = "nome,email,whatsapp\nAluno Exemplo,aluno@example.org,(11) 99999-0000\n";
let toastDismissTimer = null;

setupTabs();
setupForms();
setupProgramActions();
bootstrap();

async function bootstrap() {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    renderLoggedOutState();
    return;
  }

  try {
    const session = await apiRequest("/api/session");
    state.session = session.user;
    renderSession();
    await loadReferenceData();
    await loadTurmas();
    activateTab("turmas");
  } catch (error) {
    window.localStorage.removeItem(TOKEN_KEY);
    renderLoggedOutState("Sua sessão expirou. Faça login novamente.");
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
      startDate: template.meta?.startDate || fallback.meta.startDate,
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

      if (state.currentProgramTab === "programa-cb") {
        state.program = createEmptyProgram();
        state.manualColumnWidths = {};
        renderProgram();
        return;
      }

      if (state.currentTurmaId) {
        selectTurma(state.currentTurmaId).catch((error) => {
          turmaSummary.textContent = error.message;
        });
        return;
      }

      state.program = createEmptyProgram();
      state.manualColumnWidths = {};
      renderProgram();
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
  logoutButton.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Mesmo se a sessão já estiver inválida, seguimos limpando o cliente.
    }

    window.localStorage.removeItem(TOKEN_KEY);
    renderLoggedOutState("Sessão encerrada.");
    activateTab("login");
  });

  newTurmaButton.addEventListener("click", () => {
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

  editTurmaButton.addEventListener("click", () => {
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
    appendSecretaryField(turmaSecretariesList, "");
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
    if (!window.confirm("Excluir permanentemente esta turma? Essa ação não poderá ser desfeita.")) {
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
      await loadReferenceData();
      authNotice.textContent = "Login realizado com sucesso.";
      showToast("success", "Login realizado", "Sua sessão foi iniciada com sucesso.");
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
      await loadReferenceData();
      authNotice.textContent = "Conta criada e sessão iniciada.";
      showToast("success", "Conta criada", "Sua conta foi criada e a sessão já está ativa.");
      await loadTurmas();
      activateTab("turmas");
    } catch (error) {
      authNotice.textContent = error.message;
      showToast("error", "Erro ao criar conta", error.message);
    }
  });

  turmaForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.session) {
      activateTab("login");
      return;
    }

    const formPayload = Object.fromEntries(new FormData(turmaForm).entries());
    const payload = buildTurmaPayload({
      ...formPayload,
      ownerUserId: formPayload.ownerUserId,
      copyProgramFromTurmaId: formPayload.copyProgramFromTurmaId,
      secretarios: collectSecretaryValues(turmaSecretariesList),
    });
    const method = state.currentTurmaId ? "PUT" : "POST";
    const path = state.currentTurmaId
      ? `/api/turmas/${state.currentTurmaId}`
      : "/api/turmas";

    try {
      const response = await apiRequest(path, { method, body: payload });
      state.currentScope = response.turma.archivedAt ? "archived" : "active";
      state.isEditingTurma = false;
      renderScopeButtons();
      await loadTurmas(response.turma.id);
      turmaSummary.textContent = `Turma ${response.turma.nome} salva com sucesso.`;
      showToast("success", "Cadastro salvo", `Turma ${response.turma.nome} atualizada com sucesso.`);
      activateTab("programa");
    } catch (error) {
      turmaSummary.textContent = error.message;
      showToast("error", "Erro ao salvar", error.message);
    }
  });

  contactsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.session) {
      activateTab("login");
      return;
    }

    const payload = {
      dirigenteNome: contactsForm.elements.dirigenteNome.value,
      secretarios: state.session?.secretarios ?? [],
      telefone: contactsForm.elements.telefone.value,
      whatsapp: contactsForm.elements.whatsapp.value,
      email: contactsForm.elements.email.value,
    };

    try {
      const response = await apiRequest("/api/profile", {
        method: "PUT",
        body: payload,
      });
      state.session = response.user;
      renderSession();
      renderContactsForm();
      renderContactsSummary();
      contactsSummary.textContent = "Dirigente e contatos salvos com sucesso.";
      showToast("success", "Contatos salvos", "Dirigente e contatos atualizados com sucesso.");
    } catch (error) {
      contactsSummary.textContent = error.message;
      showToast("error", "Erro ao salvar contatos", error.message);
    }
  });

  editContactsButton.addEventListener("click", () => {
    if (!state.session) {
      contactsSummary.textContent = "Faça login para editar o cadastro.";
      return;
    }

    state.isContactsEditing = !state.isContactsEditing;
    renderContactsForm();
    contactsSummary.textContent = state.isContactsEditing
      ? "Cadastro pronto para edicao."
      : "Cadastro em modo visualizacao.";
  });

  adminUsersList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-user-save]");
    if (!button) {
      return;
    }

    const userId = Number(button.dataset.userSave);
    const select = adminUsersList.querySelector(`[data-user-role="${userId}"]`);
    if (!select) {
      return;
    }

    try {
      const response = await apiRequest(`/api/users/${userId}`, {
        method: "PUT",
        body: { role: select.value },
      });
      state.users = state.users.map((user) => (user.id === userId ? response.user : user));
      if (state.session?.id === userId) {
        state.session = response.user;
        renderSession();
      }
      renderAdminUserManagement();
      showToast("success", "Usuário atualizado", `Perfil de ${response.user.name} salvo com sucesso.`);
    } catch (error) {
      showToast("error", "Erro ao atualizar usuário", error.message);
    }
  });
}

function setupProgramActions() {
  resetTemplateButton?.addEventListener("click", () => {
    const nextProgram = createEmptyProgram();
    nextProgram.meta.title = titleInput.value || nextProgram.meta.title;
    nextProgram.meta.startDate = startDateInput.value || nextProgram.meta.startDate;
    nextProgram.meta.endDate = endDateInput.value || nextProgram.meta.endDate;
    state.program = nextProgram;
    renderProgram();
  });

  addRowButton?.addEventListener("click", () => {
    state.program.rows.push(new Array(state.program.headers.length).fill(""));
    renderProgram();
  });

  removeLastRowButton?.addEventListener("click", () => {
    if (!state.program.rows.length) return;
    state.program.rows.pop();
    renderProgram();
  });

  addColumnButton?.addEventListener("click", () => {
    state.program.headers.push(`Nova coluna ${state.program.headers.length + 1}`);
    state.program.rows = state.program.rows.map((row) => [...row, ""]);
    renderProgram();
  });

  removeLastColumnButton?.addEventListener("click", () => {
    if (state.program.headers.length <= 1) return;
    state.program.headers.pop();
    state.program.rows = state.program.rows.map((row) => row.slice(0, state.program.headers.length));
    renderProgram();
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
  exportExcelButton?.addEventListener("click", () => {
    exportProgramToExcel();
    exportMenu?.removeAttribute("open");
  });
  exportPdfButton?.addEventListener("click", () => {
    exportProgramToPdf();
    exportMenu?.removeAttribute("open");
  });
  [titleInput, startDateInput, endDateInput].forEach((input) => {
    input.addEventListener("input", syncProgramMeta);
  });
  startDateInput.addEventListener("input", handleProgramDateInput);
  startDateInput.addEventListener("blur", handleProgramDateBlur);
  endDateInput.addEventListener("input", handleProgramDateInput);
  endDateInput.addEventListener("blur", handleProgramDateBlur);
}

async function loadReferenceData() {
  state.users = [];
  state.activeTurmasForCopy = [];
  if (!state.session || state.session.role !== "Admin") {
    renderAdminUserManagement();
    await loadCopySourceTurmas();
    return;
  }

  const [usersResponse, copySourcesResponse] = await Promise.all([
    apiRequest("/api/users"),
    apiRequest("/api/turmas?scope=active"),
  ]);
  state.users = usersResponse.users;
  state.activeTurmasForCopy = copySourcesResponse.turmas;
  renderAdminUserManagement();
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
  renderTurmaList();
  renderCopyProgramField();

  if (!state.turmas.length) {
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
  const nextId = hasPreferred ? preferredTurmaId : hasCurrent ? state.currentTurmaId : null;

  if (nextId) {
    await selectTurma(nextId);
    return;
  }

  state.currentTurmaId = null;
  state.isCreatingTurma = false;
  state.isTurmaDetailsOpen = false;
  state.isEditingTurma = false;
  renderTurmaForm();
  renderContactsForm();
  renderTurmaActions();
  renderContactsSummary();
  turmaSummary.hidden = true;
  turmaSummary.textContent = "Clique em uma turma para visualizar ou editar os dados.";
}

async function selectTurma(turmaId) {
  const response = await apiRequest(`/api/turmas/${turmaId}`);
  state.currentTurmaId = response.turma.id;
  state.isCreatingTurma = false;
  state.isTurmaDetailsOpen = true;
  state.isEditingTurma = false;
  updateTurmaInState(response.turma);
  state.program = resolveProgramForActiveTab(response.program);
  state.manualColumnWidths = {};
  renderTurmaList();
  renderTurmaForm(response.turma);
  renderContactsForm(response.turma);
  renderProgram();
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

    turmaList.appendChild(button);
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
    appendSecretaryField(turmaSecretariesList);
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
    : [{}];
  secretarios.forEach((secretario) => appendSecretaryField(turmaSecretariesList, secretario));
  studentsImportFeedback.textContent = "";
  renderTurmaFormButtons(turma);
  renderStudentsPanel(turma);
  setTurmaFormLocked(Boolean(turma.archivedAt) || !state.isEditingTurma);
}

function renderContactsForm(turma = null) {
  contactsForm.reset();
  const profile = state.session || null;

  if (!profile) {
    state.isContactsEditing = false;
    setContactsFormLocked(true);
    return;
  }

  contactsForm.elements.dirigenteNome.value = profile.dirigenteNome || "";
  contactsForm.elements.telefone.value = profile.telefone || "";
  contactsForm.elements.whatsapp.value = profile.whatsapp || "";
  contactsForm.elements.email.value = profile.contatoEmail || "";
  setContactsFormLocked(!state.isContactsEditing);
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

  contactsSummary.textContent =
    `Dirigente: ${state.session.dirigenteNome || "não informado"}. ` +
    `Telefone: ${state.session.telefone || "não informado"}. ` +
    `WhatsApp: ${state.session.whatsapp || "não informado"}. ` +
    `E-mail: ${state.session.contatoEmail || "não informado"}.`;
}

function renderAdminUserManagement() {
  if (!adminUsersSection || !adminUsersList) {
    return;
  }

  const isAdmin = state.session?.role === "Admin";
  adminUsersSection.hidden = !isAdmin;
  adminUsersList.replaceChildren();

  if (!isAdmin) {
    return;
  }

  if (!state.users.length) {
    const emptyState = document.createElement("p");
    emptyState.textContent = "Nenhum usuário disponível no momento.";
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
    details.textContent = `${user.email} - ${user.role}`;
    meta.appendChild(title);
    meta.appendChild(details);

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

function renderTurmaActions(turma = null) {
  const hasTurma = Boolean(turma);
  const isArchived = Boolean(turma?.archivedAt);
  const isAdmin = state.session?.role === "Admin";

  turmaActions.hidden = !hasTurma || !state.isTurmaDetailsOpen;
  archiveButton.hidden = !hasTurma || isArchived;
  restoreButton.hidden = !hasTurma || !isArchived;
  deleteButton.hidden = !hasTurma || !isAdmin;
}

function renderTurmaFormButtons(turma = null) {
  const hasTurma = Boolean(turma);
  const isArchived = Boolean(turma?.archivedAt);
  const isFormVisible = !turmaForm.hidden;

  if (editTurmaButton) {
    editTurmaButton.hidden = !isFormVisible || !hasTurma || isArchived || state.isCreatingTurma;
    editTurmaButton.disabled = state.isEditingTurma;
    editTurmaButton.classList.toggle("is-active", state.isEditingTurma);
    editTurmaButton.setAttribute("aria-pressed", String(state.isEditingTurma));
  }

  if (saveTurmaButton) {
    saveTurmaButton.hidden = !isFormVisible;
    saveTurmaButton.disabled = !state.isCreatingTurma && !state.isEditingTurma;
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
    if (element.tagName === "BUTTON") {
      if (element === editContactsButton) {
        element.disabled = !state.session;
      } else {
        element.disabled = locked;
      }
      return;
    }

    if (element.name) {
      element.disabled = locked;
    }
  });

  if (editContactsButton) {
    editContactsButton.classList.toggle("is-active", state.isContactsEditing && !locked);
    editContactsButton.setAttribute("aria-pressed", String(state.isContactsEditing && !locked));
  }
}

function appendSecretaryField(listElement, value = {}) {
  const secretary = normalizeSecretaryEntry(value);
  const wrapper = document.createElement("div");
  wrapper.className = "secretary-row";

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

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "ghost-action remove-secretary-button";
  removeButton.textContent = "Remover";
  removeButton.addEventListener("click", () => {
    wrapper.remove();
    if (!listElement.children.length) {
      appendSecretaryField(listElement);
    }
  });

  fields.appendChild(nameField);
  fields.appendChild(messengerField);
  fields.appendChild(emailField);
  fields.appendChild(removeButton);
  wrapper.appendChild(fields);
  listElement.appendChild(wrapper);
}

function collectSecretaryValues(listElement) {
  return Array.from(listElement.querySelectorAll(".secretary-row"))
    .map((row) => ({
      nome: String(row.querySelector('input[name="secretarioNome"]')?.value || "").trim(),
      whatsapp: String(row.querySelector('input[name="secretarioWhatsapp"]')?.value || "").trim(),
      email: String(row.querySelector('input[name="secretarioEmail"]')?.value || "").trim(),
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

    if (!aluno.nome && (aluno.email || aluno.whatsapp)) {
      warnings.push(`Linha ${sourceLine} ignorada porque tem contato, mas está sem nome.`);
      return;
    }

    if (!aluno.nome) {
      return;
    }

    if (aluno.email && !isValidEmail(aluno.email)) {
      warnings.push(`Linha ${sourceLine} com e-mail inválido: ${aluno.email}.`);
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
    throw new Error("Nenhum aluno válido foi encontrado. Use ao menos a coluna de nome.");
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
  }
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
  state.session = null;
  state.users = [];
  state.turmas = [];
  state.activeTurmasForCopy = [];
  state.currentTurmaId = null;
  state.currentScope = "active";
  state.isTurmaDetailsOpen = false;
  state.isEditingTurma = false;
  state.importedStudents = [];
  state.program = createMinimalProgram();
  state.isContactsEditing = false;
  state.manualColumnWidths = {};
  loginForm.reset();
  registerForm.reset();
  renderSession();
  authNotice.textContent = message;
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
    ? `${state.session.name} · ${state.session.role}`
    : "Visitante";
  document.body.classList.toggle("is-authenticated", Boolean(state.session));
  updateAccessControlledTabs();
  renderAdminUserManagement();
}

function updateAccessControlledTabs() {
  tabs.forEach((tab) => {
    const requiresLogin = tab.dataset.tabTarget !== "login";
    tab.disabled = requiresLogin && !state.session;
    tab.classList.toggle("is-disabled", tab.disabled);
  });

  logoutButton.hidden = !state.session;
}

function renderScopeButtons() {
  scopeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scopeButton === state.currentScope);
  });
}

function renderProgram() {
  state.program = normalizeProgramStructure(state.program);
  syncProgramDateColumn();
  syncDerivedProgramEndDate();
  titleInput.value = state.program.meta.title || "";
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
}

function syncProgramMeta() {
  state.program.meta.startDate = normalizeDateCellValue(startDateInput.value);
  syncProgramDateColumn();
  syncDerivedProgramEndDate();
  state.program.meta = {
    title: titleInput.value,
    startDate: state.program.meta.startDate,
    endDate: getDerivedProgramEndDate() || normalizeDateCellValue(endDateInput.value),
  };
}

async function saveProgram() {
  if (!state.session) {
    authNotice.textContent = "Faça login para salvar um programa.";
    activateTab("login");
    return;
  }

  if (!state.currentTurmaId) {
    turmaSummary.textContent = "Cadastre uma turma antes de salvar o programa.";
    activateTab("turmas");
    return;
  }

  try {
    syncProgramMeta();
    const response = await apiRequest(`/api/turmas/${state.currentTurmaId}/program`, {
      method: "PUT",
      body: state.program,
    });
    state.program = response.program;
    window.DEFAULT_PROGRAM_TEMPLATE = structuredClone({
      meta: state.program.meta,
      headers: state.program.headers,
      rows: state.program.rows,
    });
    renderProgram();
    window.alert("Programa salvo e atualizado como padrão do sistema.");
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
    return;
  }

  state.program.rows.splice(rowIndex, 1);
  const rowElement = tbody.rows[rowIndex];
  if (rowElement) {
    rowElement.remove();
  }

  refreshRowDomMetadata();
  updateProgramEditorLockState(Boolean(findCurrentTurma()?.archivedAt));
}

function insertRowAfter(rowIndex) {
  const newRow = new Array(state.program.headers.length).fill("");
  state.program.rows.splice(rowIndex + 1, 0, newRow);
  renderProgram();
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

function exportProgramToExcel() {
  if (!window.XLSX) {
    window.alert("A biblioteca de exportação ainda não foi carregada.");
    return;
  }

  syncProgramMeta();
  const workbook = XLSX.utils.book_new();
  const matrix = [state.program.headers, ...state.program.rows];
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Programa");
  XLSX.writeFile(workbook, `${buildExportBaseName()}.xlsx`);
}

function exportProgramToPdf() {
  syncProgramMeta();
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) {
    window.alert("Não foi possível abrir a janela de impressão.");
    return;
  }

  const rowsHtml = state.program.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  const headerHtml = state.program.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
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

function activateTab(tabName) {
  const nextTab = tabs.find((tab) => (
    tab.dataset.tabTarget === tabName
    || tab.dataset.tabPanelTarget === tabName
  ));
  if (nextTab) nextTab.click();
}

function findCurrentTurma() {
  return state.turmas.find((turma) => turma.id === state.currentTurmaId) || null;
}

function resolveProgramForActiveTab(savedProgram) {
  if (state.currentProgramTab === "programa-cb") {
    return createEmptyProgram();
  }

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
    return;
  }

  if (isDateColumnHeader(state.program.headers[columnIndex])) {
    state.program.rows[rowIndex][columnIndex] = nextValue;
    scheduleColumnWidthUpdate(columnIndex);
    return;
  }

  state.program.rows[rowIndex][columnIndex] = nextValue;
  scheduleColumnWidthUpdate(columnIndex);
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
}

function handleProgramDateInput(event) {
  event.target.value = normalizeDateCellValue(event.target.value);
  syncProgramMeta();
  renderProgram();
}

function handleProgramDateBlur(event) {
  event.target.value = normalizeDateCellValue(event.target.value);
  syncProgramMeta();
  renderProgram();
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
  const isEditable = state.isProgramEditing && !isArchived;

  table.classList.toggle("is-readonly", !isEditable);

  [titleInput, startDateInput, endDateInput].forEach((field) => {
    field.disabled = !isEditable;
  });

  if (editProgramButton) {
    editProgramButton.disabled = isArchived;
    editProgramButton.classList.toggle("is-active", state.isProgramEditing && !isArchived);
    editProgramButton.setAttribute("aria-pressed", String(state.isProgramEditing && !isArchived));
  }

  if (resetTemplateButton) resetTemplateButton.disabled = !isEditable;
  if (addRowButton) addRowButton.disabled = !isEditable;
  if (removeLastRowButton) removeLastRowButton.disabled = !isEditable || !state.program.rows.length;
  if (addColumnButton) addColumnButton.disabled = !isEditable;
  if (removeLastColumnButton) removeLastColumnButton.disabled = !isEditable || state.program.headers.length <= 1;
  if (saveProgramButton) saveProgramButton.disabled = isArchived;
  if (deleteProgramButton) deleteProgramButton.disabled = !isEditable;
  if (exportMenu) {
    exportMenu.classList.toggle("is-disabled", isArchived);
    if (isArchived) {
      exportMenu.removeAttribute("open");
    }
  }
  if (exportExcelButton) exportExcelButton.disabled = isArchived;
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

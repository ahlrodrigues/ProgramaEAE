# Programa de aulas EAE

Plataforma inicial para gestão de turmas escolares e seus programas de aulas.

## O que já está disponível

- Cadastro de usuário com criação de sessão e acesso imediato
- Login e logout com autenticação básica
- Perfis de acesso `Admin`, `Usuário`, `Dirigente` e `Secretário`
- Cadastro, edição, arquivamento, restauração e exclusão de turmas
- Listagem de turmas por usuário
- Criação de nova turma com cópia opcional de programa existente
- Cadastro de modalidade, secretário(a)(s), mensageiro e e-mail por turma
- Importação de alunos com validação básica e modelo CSV para download
- Gestão administrativa básica de usuários para perfil `Admin`
- Habilitação das abas de programa conforme o tipo da turma selecionada
- Data inicial do `Programa CB` vinculada à data de início da turma
- Salvamento automático em `Cadastro`, `Turmas` e `Programas` durante a edição
- Editor de programa com programa padrão já carregado da planilha oficial
- Inclusão e remoção de linhas e colunas
- Edição livre de cabeçalhos e células
- Remoção do programa salvo de uma turma
- Exportação do programa para Excel
- Exportação do programa para PDF via impressão do navegador
- Persistência local em SQLite
- Promoção automática de perfil para `Dirigente` ao criar a primeira turma
- Promoção automática de perfil para `Secretário` ao aceitar convite de turma
- Área de `Aprovações` separada em `Cadastros sem vínculo` e `Vínculos com turma`
- Solicitação de vínculo de secretário para turma específica e decisão no card da turma correspondente
- Convite de secretário por turma com controle de pendência e aceite de convite
- Registro de vínculo por turma com suporte a múltiplas turmas por secretário (`turma_members`)
- Permissões de convite para `Admin`, `Dirigente` e `Secretário` com acesso ativo
- Registro histórico de aprovações e convites na interface

## Decisões recentes (2026-05-20)

- Removida a necessidade de aprovação manual no cadastro.
- Usuário novo entra como `Usuário` com acesso ativo.
- Usuário vira `Dirigente` ao criar turma.
- Usuário vira `Secretário` ao aceitar convite para turma.
- Usuário pode ter múltiplas turmas ativas simultaneamente.

## Em andamento (não finalizado)

- Separação da área de `Aprovações` em dois fluxos:
  - `Cadastros sem vínculo`
  - `Vínculos com turma`
- Exibição e decisão de solicitações de vínculo diretamente no card da turma correspondente, na aba `Turmas`.
- Ajustes de UX e validação desse fluxo ainda pendentes (layout final, consistência visual e testes completos de ponta a ponta).

## Como executar

1. No diretório do projeto, rode:

```bash
npm start
```

2. Abra no navegador:

```text
http://127.0.0.1:3000
```

## Servidor em segundo plano

Para subir o servidor local em segundo plano:

```bash
npm run server:start
```

Para reiniciar:

```bash
npm run server:restart
```

Se houver processo antigo preso na porta `3000` ou `server.pid` inconsistente, use o reinício manual:

```bash
npm run server:restart:manual
```

Também estão disponíveis:

```bash
npm run server:stop
npm run server:status
```

## Estrutura

- `server.js`: servidor HTTP, API e banco SQLite
- `app.js`: fluxo da interface e integração com a API
- `index.html`: estrutura da aplicação
- `styles.css`: visual e responsividade
- `data/eae.sqlite`: banco criado automaticamente em tempo de execução

## API atual

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/session`
- `GET /api/users`
- `PUT /api/users/:id`
- `GET /api/turmas`
- `POST /api/turmas`
- `GET /api/turmas/:id`
- `PUT /api/turmas/:id`
- `DELETE /api/turmas/:id`
- `POST /api/turmas/:id/archive`
- `PUT /api/turmas/:id/program`
- `DELETE /api/turmas/:id/program`

## Próximos passos sugeridos

## Validação E2E (2026-05-20)

- Status do ambiente nesta sessão: execução E2E automatizada por HTTP local bloqueada por sandbox (`EPERM 127.0.0.1`).
- Critério adotado nesta revisão: confirmação por leitura de código + endpoints implementados; execução funcional final fica para rodada manual/local sem bloqueio de rede.

Checklist do fluxo de aprovações e vínculos:

- [x] Cadastro de novo usuário com perfil inicial `Usuário` e `access_status` ativo.
- [x] Promoção para `Dirigente` ao criar a primeira turma.
- [x] Exibição da aba `Aprovações` em dois fluxos (`Cadastros sem vínculo` e `Vínculos com turma`).
- [x] Solicitação de vínculo por secretário pendente para turma ativa de dirigente.
- [x] Aprovação/rejeição de solicitação de vínculo pelo dirigente da turma (ou admin).
- [x] Ativação do secretário após aprovação de vínculo e criação do vínculo em `turma_members`.
- [x] Exibição de histórico de aprovações/convites (`/api/access-events`).
- [ ] Execução manual ponta a ponta no navegador (incluindo mensagens visuais e navegação entre abas).
- [ ] Execução automatizada de regressão E2E (script/CI) em ambiente sem bloqueio de loopback local.

### Fase 1: cadastro, perfis e fluxo principal

- Validar o fluxo principal: usuário aprovado como dirigente entra na plataforma, cria uma turma, importa os alunos e recebe o programa padrão.
- Garantir que alterações no programa sejam salvas apenas para a turma selecionada.
- Melhorar a validação das planilhas de importação de alunos, com mensagens claras para e-mails inválidos, duplicidades e linhas incompletas.
- Integrar envio real de e-mail (SMTP/serviço externo), substituindo o log local de notificações pendentes.

### Fase 2: secretários e permissões por turma

- Validar o cenário “secretário cria turma” para garantir preenchimento/consistência do campo dirigente em todos os pontos da UI e exportações.
- Cobrir com testes de ponta a ponta os fluxos de convite, aceite e rejeição de vínculo.

### Fase 3: programas e histórico

- Criar versionamento de programas e histórico de alterações.
- Permitir importação do programa de outra turma do mesmo tipo, removendo informações específicas como data, facilitador e contato.
- Implementar autoarquivamento da turma 7 dias após a última aula registrada no programa.

### Fase 4: segurança e backup

- Definir a estratégia de criptografia dos dados antes da implementação, especialmente se a descriptografia deve acontecer apenas no navegador.
- Criar sistema de backup automático ligado a algum drive.
- Avisar o usuário em todo login quando o backup ainda não estiver configurado.
- Sugerir e exigir troca de senha uma vez por ano.

### Fase 5: comunicação e conteúdo

- Criar bot do Telegram para aviso de publicação de temas.
- Criar calendário da turma com eventos e avisos cadastrados pelo dirigente.
- Garantir que cada aluno receba apenas mensagens correspondentes à sua turma.
- Escrever manual de utilização em uma página separada, incluindo a sugestão de uso do Telegram para avisos automáticos.
- Criar página de perguntas frequentes para o perfil do dirigente.
- Criar página de fale conosco com formulário e integração com mensageiro.
- Criar rodapé dinâmico com links úteis, contato e informações da plataforma.

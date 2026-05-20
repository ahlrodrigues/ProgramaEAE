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
- Exportação do programa para PDF via impressão do navegador, respeitando largura de colunas
- Persistência local em SQLite
- Promoção automática de perfil para `Dirigente` ao criar a primeira turma
- Promoção automática de perfil para `Secretário` ao confirmar vínculo de turma
- Convite de secretário por turma via e-mail de confirmação com token
- Validade de convite de secretário em 48 horas, com limpeza automática de registros encerrados após 30 dias
- Registro de vínculo por turma com suporte a múltiplas turmas por secretário (`turma_members`)
- Permissões de convite para `Admin`, `Dirigente` e `Secretário` com acesso ativo
- Link público de visualização do programa (somente leitura, sem login)
- Recuperação de senha por e-mail com token e redefinição de senha
- Alteração de senha para usuário autenticado

## Decisões recentes (2026-05-20)

- Removida a necessidade de aprovação manual no cadastro.
- Usuário novo entra como `Usuário` com acesso ativo.
- Usuário vira `Dirigente` ao criar turma.
- Usuário vira `Secretário` ao confirmar vínculo por link de e-mail.
- Usuário pode ter múltiplas turmas ativas simultaneamente.

## Como executar

0. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

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
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `GET /api/session`
- `GET /api/turmas`
- `POST /api/turmas`
- `GET /api/turmas/:id`
- `PUT /api/turmas/:id`
- `DELETE /api/turmas/:id`
- `POST /api/turmas/:id/archive`
- `GET /api/turmas/:id/share-link`
- `PUT /api/turmas/:id/program`
- `DELETE /api/turmas/:id/program`
- `GET /api/public/programa/:token`
- `POST /api/secretary-invite-links/:token/accept`

## Próximos passos sugeridos

### Operação e confiabilidade

- Configurar SMTP em produção e validar entrega real de e-mails de vínculo e recuperação de senha.
- Adicionar monitoramento e alerta para falhas de envio (`logEmailNotification`) e expiração de convites.
- Criar backup automático do SQLite com política de retenção e restore documentado.

### Segurança

- Implementar rate limit para login, recuperação e redefinição de senha.
- Invalidar sessões ativas após redefinição de senha.
- Adicionar política de senha (complexidade mínima e troca periódica opcional por configuração).

### Fluxo de secretários

- Criar tela de “Convites enviados” por turma, com status (`pending`, `accepted`, `expired`) e opção de reenviar convite.
- Permitir cancelamento explícito de convite pendente pelo dirigente.
- Cobrir E2E de ponta a ponta dos cenários: novo cadastro via convite, login existente via convite e convite expirado.
- Verificar se basta preencher os dados do secretário para o e-mail ser enviado automaticamente ou se é necessário um botão de cadastro.
- Se for necessário confirmar o envio por ação explícita, criar botão para cadastro/envio do secretário.

### Programa e experiência pública

- Melhorar a visualização pública para mobile (quebra de colunas largas e paginação opcional).
- Adicionar opção de revogar/regenerar link público de compartilhamento por turma.
- Criar opção de exportação PDF da visão pública sem controles administrativos.

### UX no cadastro de turma

- Ao abrir o cadastro da turma, permitir edição imediata dos dados sem exigir clique no botão `Editar`.
- Remover o botão `Salvar cadastro` (o fluxo já utiliza salvamento automático).
- Verificar se o salvamento automático no cadastro de turma está funcionando em todos os campos relevantes.

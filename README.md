# Programa de aulas EAE

Plataforma inicial para gestão de turmas escolares e seus programas de aulas.

## O que já está disponível

- Cadastro de usuário com criação de sessão
- Login e logout com autenticação básica
- Perfis de acesso `Admin` e `Dirigente`
- Cadastro, edição, arquivamento, restauração e exclusão de turmas
- Listagem de turmas por usuário
- Criação de nova turma com cópia opcional de programa existente
- Cadastro de modalidade, secretário(a)(s), mensageiro e e-mail por turma
- Importação de alunos com validação básica e modelo CSV para download
- Gestão administrativa básica de usuários para perfil `Admin`
- Editor de programa com programa padrão já carregado da planilha oficial
- Inclusão e remoção de linhas e colunas
- Edição livre de cabeçalhos e células
- Remoção do programa salvo de uma turma
- Exportação do programa para Excel
- Exportação do programa para PDF via impressão do navegador
- Persistência local em SQLite

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

- Versionamento de programas
- Histórico de alterações
- Validação mais rica para planilhas importadas
- Bot do telegram:
    - aviso de publicação de temas
    - agenda da turma
- Garantir que o aluno esteja ligado a turma e cada turma receba mensagens correspondentes a sua turma.
- Escrever um manual de utilização em uma página separada
    - Sugerir utilização do Telegram para o sistema enviar avisos automáticos para a turma
    - Sugerir e forçar a troca de senha uma vez por ano
- criar fale conosco
- criar perguntas frequentes

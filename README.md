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

### Fase 1: cadastro, perfis e fluxo principal

- Alterar o cadastro para que todo novo usuário entre como `Pendente` e solicite o perfil desejado: `Dirigente` ou `Secretário`.
- Enviar solicitações de `Dirigente` para uma lista visível aos dirigentes já aprovados e aos admins; uma aprovação deve liberar o perfil de dirigente.
- Manter aprovações e convites em uma aba própria, visível para todos os dirigentes aprovados, registrando quem aprovou cada perfil e quem convidou cada participante.
- Manter o `Admin` com permissão para aprovar, rejeitar e alterar perfis quando necessário.
- Enviar e-mail ao usuário quando sua solicitação de perfil for aprovada ou rejeitada.
- Validar o fluxo principal: usuário aprovado como dirigente entra na plataforma, cria uma turma, importa os alunos e recebe o programa padrão.
- Garantir que alterações no programa sejam salvas apenas para a turma selecionada.
- Melhorar a validação das planilhas de importação de alunos, com mensagens claras para e-mails inválidos, duplicidades e linhas incompletas.

### Fase 2: secretários e permissões por turma

- Manter solicitações de `Secretário` na mesma lista de pendências, aguardando convite para participação em turma.
- Enviar convite por e-mail para secretários participarem de uma turma específica.
- Registrar quem enviou cada convite de turma.
- Permitir que secretários visualizem convites pendentes, aceitem o convite e só então acessem as turmas das quais fazem parte.
- Registrar o vínculo do secretário por turma, permitindo múltiplas turmas por secretário.
- Permitir que um secretário crie uma turma; nesse caso, seu nome deve ocupar o campo de dirigente.
- Permitir que dirigentes e secretários convidem novos secretários para suas turmas.
- Permitir que um secretário participe de várias turmas.
- Permitir que um dirigente possua várias turmas e também seja secretário em outras.

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

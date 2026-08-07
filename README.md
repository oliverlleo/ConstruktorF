# Construktor

Construtor visual de estruturas ERP/CRM com módulos, entidades, propriedades, workspaces compartilhados e Designer de Fluxos.

## Stack

- HTML5, CSS3 e JavaScript ES Modules
- Tailwind CSS via CDN
- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- Cloud Functions
- SweetAlert2, Sortable.js, Lucide e Font Awesome

## Estrutura

```text
├── index.html                 # modelador principal
├── pages/                     # páginas da aplicação
├── js/
│   ├── core/                  # Firebase, segurança, permissões e utilitários Firestore
│   ├── features/              # funcionalidades isoladas por domínio
│   ├── ui/                    # comportamento visual compartilhado
│   ├── user/                  # perfil e convites
│   ├── main.js                # orquestrador do modelador
│   ├── database.js            # camada de persistência
│   └── autenticacao.js        # autenticação compartilhada
├── functions/                 # Cloud Functions
├── tests/                     # testes unitários
├── scripts/                   # validações do repositório
├── docs/                      # arquitetura, segurança e implantação
├── firestore.rules
├── storage.rules
├── firebase.json
└── project-files.json         # manifesto usado pelo visualizador de código
```

A organização completa está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Funcionalidades

- criação e ordenação de módulos;
- criação de entidades e propriedades configuráveis;
- drag-and-drop;
- workspaces próprios e compartilhados;
- papéis `viewer`, `editor` e `admin`;
- convites e revogação de acesso;
- Designer de Fluxos com zoom, pan e persistência;
- visualização somente leitura de dados em `pages/user-view.html`;
- modo claro/escuro;
- autenticação por email/senha, Google e telefone;
- perfil com avatar no Firebase Storage.

## Segurança

O projeto agora versiona as regras de Firestore e Storage e as Cloud Functions responsáveis pela sincronização de permissões. O cliente não pode gravar diretamente em `accessControl` ou `sharedWorkspaces`.

Features novas devem inserir dados externos com `textContent`/`createElement`, nunca interpolando conteúdo do Firestore diretamente em `innerHTML`. Consulte [docs/SECURITY.md](docs/SECURITY.md).

> A configuração web do Firebase em `js/config.js` identifica o projeto; ela não substitui Security Rules e não deve conter segredos de servidor.

## Desenvolvimento

O frontend continua sem etapa obrigatória de build. Para servir localmente, use qualquer servidor HTTP estático; não abra as páginas via `file://`, pois ES Modules e `fetch()` dependem de HTTP.

### Verificações

Requer Node.js 20+:

```bash
npm test
npm run check
```

O GitHub Actions executa essas verificações em pushes para `main`, branches `agent/**` e pull requests.

## Firebase

As configurações de deploy ficam em `firebase.json`.

```bash
cd functions
npm install
cd ..
firebase emulators:start
```

Depois de validar no Emulator Suite:

```bash
firebase deploy --only firestore:rules,storage,functions
```

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para o checklist completo.

## Padrão para novas implementações

1. Coloque infraestrutura reutilizável em `js/core/`.
2. Coloque uma nova funcionalidade em `js/features/<feature>/`.
3. Reutilize `js/core/firebase-app.js`; não inicialize um segundo app Firebase.
4. Faça autorização no backend/rules, não apenas escondendo botões.
5. Adicione lógica pura testável em `tests/`.
6. Atualize `project-files.json` quando criar arquivos que devam aparecer no visualizador de código.
7. Rode `npm test` e `npm run check` antes de abrir PR.

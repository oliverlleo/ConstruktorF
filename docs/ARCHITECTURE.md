# Arquitetura do Construktor

## Objetivo

O Construktor é um construtor visual de estruturas ERP/CRM baseado em HTML, CSS e JavaScript no navegador, com Firebase Authentication, Cloud Firestore, Cloud Storage e Cloud Functions.

## Organização

```text
ConstruktorF/
├── index.html                     # aplicação principal / modelador
├── pages/                         # pontos de entrada HTML
│   ├── login.html
│   ├── flow-designer.html
│   ├── user-view.html
│   └── code-view.html
├── js/
│   ├── core/                      # infraestrutura compartilhada
│   │   ├── firebase-app.js
│   │   ├── firestore-utils.js
│   │   ├── permissions.js
│   │   └── security.js
│   ├── features/                  # funcionalidades isoladas
│   │   ├── auth/
│   │   ├── flow-designer/
│   │   ├── user-view/
│   │   └── workspace-permissions/
│   ├── ui/                        # comportamento visual compartilhado
│   │   └── dark-mode.js
│   ├── user/                      # perfil e convites existentes
│   ├── main.js                    # modelador legado em migração
│   ├── database.js                # camada de persistência compatível
│   └── autenticacao.js            # fachada de autenticação compartilhada
├── css/
├── imagem/
├── functions/                     # backend confiável
├── tests/                         # testes unitários
├── scripts/                       # validações do repositório
├── docs/                          # documentação técnica
├── firestore.rules
├── storage.rules
├── firebase.json
└── project-files.json             # manifesto usado pelo code-view
```

## Princípios adotados

### Core sem regra de tela
`js/core` contém apenas infraestrutura reutilizável. Recursos novos não devem duplicar inicialização do Firebase, normalização de permissões ou utilitários de segurança.

### Features isoladas
Telas e funcionalidades novas devem morar em `js/features/<feature>/`. O arquivo HTML importa apenas o ponto de entrada da feature.

### Compatibilidade durante a migração
Arquivos antigos como `js/login.js`, `js/flow-designer.js` e `js/dark-mode.js` permanecem como fachadas pequenas para não quebrar URLs e páginas existentes. A implementação real foi movida para diretórios organizados.

`js/main.js` ainda contém a implementação histórica do modelador de módulos/entidades e do construtor de propriedades. Ele foi mantido para preservar compatibilidade durante esta refatoração; **novas funcionalidades não devem ser adicionadas a esse arquivo**. Ao alterar uma área existente do modelador, a regra é extrair a responsabilidade tocada para `js/features/` em vez de ampliar o monólito.

O guard `js/features/workspace-permissions/workspace-access-guard.js` adiciona a camada de UX para workspaces `viewer`; a autorização real continua nas Security Rules.

### Segurança no servidor
Permissões não podem depender apenas da interface. `firestore.rules`, `storage.rules` e `functions/` são a fonte de verdade para autorização e sincronização de acesso.

## Modelo de dados principal

```text
users/{ownerId}
  workspaces/{workspaceId}
    modules/{moduleId}
    entities/{entityId}
      records/{recordId}
    flows/{moduleId}

invitations/{inviteId}
accessControl/{userId}
sharedWorkspaces/{workspaceId}
```

`accessControl` e `sharedWorkspaces` são mantidos pelas Cloud Functions. O cliente só pode lê-los conforme as regras.

## Como implementar uma nova funcionalidade

1. Crie `js/features/<nome>/`.
2. Reutilize `js/core/firebase-app.js` em vez de chamar `firebase.initializeApp` novamente.
3. Use `textContent` ou os helpers de `js/core/security.js` para dados vindos do usuário/Firestore.
4. Defina a autorização nas Security Rules antes de habilitar escrita no cliente.
5. Adicione o arquivo a `project-files.json` se ele deve aparecer no visualizador de código.
6. Adicione testes para lógica pura em `tests/`.
7. Rode `npm test` e `npm run check`.

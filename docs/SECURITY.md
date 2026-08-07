# Segurança

## Fonte de verdade

A interface pode ocultar botões conforme o papel do usuário, mas isso não é segurança. A autorização real está em `firestore.rules` e `storage.rules`. Processos que alteram controle de acesso são executados por Cloud Functions usando o Admin SDK.

## Papéis

- `viewer`: leitura.
- `editor`: leitura e edição de módulos, entidades, registros e fluxos.
- `admin`: mesmas operações de edição e papel administrativo do recurso compartilhado.
- proprietário: controle do documento do workspace e compartilhamento.

## Convites

1. O proprietário cria um documento em `invitations` com status `pending`.
2. O destinatário só pode aceitar/recusar convites destinados ao email/UID autenticado.
3. Ao aceitar, a Cloud Function grava a permissão em `accessControl/{uid}` e publica metadados mínimos em `sharedWorkspaces/{workspaceId}`.
4. Alteração de papel em convite aceito atualiza `accessControl`.
5. Revogação ou exclusão do convite remove a permissão.

O cliente não possui permissão direta de escrita em `accessControl` ou `sharedWorkspaces`.

## XSS

Dados do Firestore devem ser tratados como não confiáveis. Features novas constroem DOM com `textContent`/`createElement`. Enquanto `main.js` legado é migrado, `js/ui-enhancements.js` instala uma camada de sanitização para atribuições dinâmicas a `innerHTML`, removendo tags executáveis, atributos `on*`, `srcdoc` e URLs `javascript:`/`vbscript:`.

Essa camada é defesa adicional; novos códigos não devem depender dela para inserir HTML vindo de dados externos.

## Upload de avatar

`storage.rules` restringe o caminho `user-avatars/{uid}` ao próprio usuário, limita o tamanho a menos de 2 MB e aceita somente `contentType` de imagem.

## Chave web do Firebase

A configuração web do Firebase em `js/config.js` identifica o projeto e não deve ser tratada como segredo de servidor. A proteção depende das Security Rules, autenticação, limites/quota e, quando habilitado no projeto, App Check.

## Antes de produção

- Testar regras no Firebase Emulator Suite.
- Implantar Functions, Firestore Rules e Storage Rules na mesma versão.
- Habilitar App Check para os produtos suportados.
- Revisar domínios autorizados do Firebase Authentication.
- Ativar alertas de orçamento/quota.
- Revisar logs de Functions e tentativas negadas pelo Firestore.

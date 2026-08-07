# Implantação

## Pré-requisitos

- Node.js 20.
- Firebase CLI autenticada no projeto correto.
- Um projeto Firebase com Authentication, Firestore, Storage e Functions habilitados.

## Validar antes de implantar

```bash
npm test
npm run check
firebase emulators:start
```

No Emulator Suite, valide pelo menos:

- proprietário cria/edita/exclui módulos e entidades;
- `viewer` consegue ler e não consegue escrever;
- `editor` consegue editar dados do workspace compartilhado;
- usuário sem convite não consegue ler workspace de outro proprietário;
- destinatário consegue aceitar apenas convite destinado ao próprio email;
- remetente consegue alterar o papel de convite aceito e revogar acesso;
- upload de avatar de outro usuário é negado;
- arquivo que não seja imagem ou tenha 2 MB ou mais é negado no caminho de avatar.

## Instalar dependências das Functions

```bash
cd functions
npm install
cd ..
```

## Selecionar o projeto

Este repositório não versiona um `.firebaserc` amarrado a um ambiente específico. Use:

```bash
firebase use --add
```

Assim o mesmo código pode ser usado em desenvolvimento, homologação e produção sem trocar arquivos de fonte.

## Implantar backend e regras

```bash
firebase deploy --only firestore:rules,storage,functions
```

O frontend pode continuar hospedado pelo mecanismo atual (por exemplo GitHub Pages). As regras e Functions devem ser implantadas antes de liberar as funcionalidades de compartilhamento em produção.

## Rollback

Mantenha o deploy associado a um commit/PR. Se uma regra ou Function causar regressão, faça checkout do commit anterior e execute novamente o comando de deploy.

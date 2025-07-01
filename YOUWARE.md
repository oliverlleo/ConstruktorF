# Construktor - Documentação do Projeto

## Visão Geral
Construktor é uma plataforma visual para construção de sistemas ERP/CRM. O sistema permite aos usuários criar módulos, entidades e campos através de uma interface drag-and-drop intuitiva.

## Arquitetura do Sistema

### Estrutura de Arquivos
```
src/
├── css/
│   └── style.css          # Estilos principais + modo escuro
├── js/
│   ├── main.js           # Lógica principal da aplicação
│   ├── login.js          # Sistema de autenticação
│   ├── code-view.js      # Visualização de código-fonte
│   └── dark-mode.js      # Gerenciador de modo escuro
├── pages/
│   ├── login.html        # Página de login
│   ├── code-view.html    # Visualização do código
│   └── user-view.html    # Visualização do usuário
├── imagem/               # Recursos de imagem
└── index.html           # Página principal da aplicação
```

### Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework CSS**: Tailwind CSS v4 (via CDN)
- **Icons**: Font Awesome 6.5.1 + Lucide Icons
- **Bibliotecas**: 
  - Sortable.js (drag-and-drop)
  - SweetAlert2 (alertas)
  - Firebase (autenticação e banco de dados)

## Funcionalidades Principais

### Sistema de Módulos
- Criação de módulos organizacionais
- Drag-and-drop de entidades para módulos
- Reorganização por arrastar

### Builder de Entidades
- Editor visual de formulários
- Campos customizáveis (texto, número, data, seleção)
- Configuração avançada de propriedades
- Sub-entidades e relacionamentos

### Sistema de Temas
- **Modo Claro/Escuro**: Implementado com classes CSS e localStorage
- **Seletores**: 
  - Login: Canto superior direito (sol/lua)
  - Index: Menu dropdown do usuário
- **Persistência**: Preferência salva no localStorage
- **Responsivo**: Suporte automático à preferência do sistema

### Autenticação
- Login via email/senha
- Autenticação Google
- Verificação por telefone
- Recuperação de senha
- Sistema de convites entre usuários

## Comandos de Desenvolvimento

### Estrutura de Desenvolvimento
- Não há build process - desenvolvimento direto em HTML/CSS/JS
- Arquivos servidos diretamente do diretório `src/`
- Hot reload através do navegador

### Visualização
- **Desenvolvimento**: Abrir `index.html` diretamente no navegador
- **Código-fonte**: Acessar através do botão "Ver Código" na interface
- **Visualização pública**: Através do botão "Ver Página"

## Padrões de Código

### JavaScript
- Módulos ES6 para organização
- Classes para gerenciamento de estado
- Event listeners delegados para performance
- Promises/async-await para operações assíncronas

### CSS
- Utility-first com Tailwind CSS
- Custom CSS para componentes específicos
- Variáveis CSS para modo escuro
- Media queries para responsividade

### HTML
- Semantic HTML5
- Templates reutilizáveis
- Estrutura modular por componentes

## Configurações do Firebase

### Segurança
- Rules configuradas para usuários autenticados
- Workspace-based permissions
- Invite system com validação

### Estrutura de Dados
```
workspaces/
├── {workspaceId}/
│   ├── modules/
│   ├── entities/
│   └── metadata/
users/
├── {userId}/
│   ├── profile/
│   └── workspaces/
invites/
└── {inviteId}/
```

## Sistema de Responsividade

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px

### Adaptações Mobile
- Sidebar colapsível
- Touch-friendly drag-and-drop
- Menu hamburger
- Gestos swipe

## Modo Escuro

### Implementação
- Classe `dark` no elemento `<html>`
- CSS com seletores `.dark`
- Transições suaves (0.3s)
- Persistência com localStorage

### Componentes Afetados
- Todas as páginas (index, login, code-view)
- Elementos UI (cards, modals, dropdowns)
- Estados hover e focus
- Ícones e gradientes

### Seletores de Tema
- **Login**: Botão fixo superior direito
- **Aplicação**: Dentro do menu do usuário
- **Ícones**: Sol (claro) / Lua (escuro)

## Manutenção

### Atualizações de Dependências
- Tailwind CSS: Verificar compatibilidade com classes customizadas
- Firebase: Manter regras de segurança atualizadas
- Font Awesome: Verificar ícones deprecated

### Performance
- Lazy loading para modais pesados
- Debounce em operações de arrastar
- Virtual scrolling para listas grandes

### Segurança
- Sanitização de inputs do usuário
- Validação client-side e server-side
- Rate limiting em operações críticas

## Notas Importantes

### Não Modificar
- Estrutura HTML principal do index.html
- Lógica existente de drag-and-drop
- Sistema de autenticação Firebase
- Templates de componentes

### Sempre Manter
- Responsividade mobile
- Compatibilidade com modo escuro
- Performance em dispositivos lentos
- Acessibilidade básica (alt texts, labels)

### Extensibilidade
- Novos tipos de campo: Adicionar em `js/main.js` 
- Novos módulos: Seguir padrão existente
- Novos temas: Estender `dark-mode.js`
- Novas páginas: Incluir scripts de modo escuro
# Construktor - Sistema de Construção Visual de ERP/CRM

**VERSÃO CORRIGIDA E ATUALIZADA**  
Exportada em: 01/07/2025 às 00:46:08

## ✅ Correções Aplicadas Nesta Versão

### Sistema de Modo Escuro Implementado
- **🌙 Modo Escuro**: Sistema completo de alternância entre modo claro e escuro
- **☀️ Seletores de Tema**: Sol/lua na página de login e menu do usuário
- **💾 Persistência**: Preferência salva automaticamente no localStorage
- **🎨 Design Consistente**: Cores otimizadas para melhor experiência visual

### Melhorias na Interface
- **Cores Corrigidas**: Área de entidades nos módulos com cores adequadas ao modo escuro
- **Título Login**: Nome "Construktor" agora aparece corretamente em branco no modo escuro
- **⚡ Tecla Enter**: Formulários de login e registro respondem à tecla Enter
- **📱 Responsividade**: Interface otimizada para diferentes tamanhos de tela

### Limpeza de Código
- **🧹 Scripts Removidos**: Scripts youware-lib removidos de todos os arquivos HTML
- **📁 Arquivos Atualizados**: Todos os arquivos incluídos no sistema de download
- **🔧 Modo Escuro**: Sistema dark-mode.js incluído na estrutura

## Descrição
O Construktor é um sistema visual para construção de ERP/CRM, permitindo criar e gerenciar módulos, entidades e campos de formulários.

## Funcionalidades Principais
- ✨ Criação de módulos personalizados
- 🎯 Arrastar e soltar entidades nos módulos
- ⚙️ Configuração avançada de campos de formulário
- 👥 Sistema completo de convites e permissões
- 🔄 Áreas de trabalho compartilhadas
- 🛡️ Controle granular de acesso (Admin/Editor/Leitor)
- 🌙 Modo escuro com alternância sol/lua
- ⚡ Suporte à tecla Enter em formulários

## Estrutura de Arquivos
### Arquivos Principais
- `index.html` - Página principal da aplicação (CORRIGIDA)
- `js/main.js` - Arquivo JavaScript principal
- `js/user/invitations.js` - Sistema de convites (TOTALMENTE REESCRITO)
- `js/config.js` - Configurações da aplicação

### Sistema de Temas
- `js/dark-mode.js` - Gerenciador de modo escuro/claro (NOVO)

### Configuração e Documentação
- `firebase_rules.json` - Regras de segurança do Firebase
- `database-rules-guide.md` - Guia para configuração das regras
- `YOUWARE.md` - Documentação técnica completa

## 🔧 Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styles**: Tailwind CSS
- **Icons**: Lucide Icons (com sistema otimizado)
- **Backend**: Firebase (Auth, Realtime Database, Storage)
- **UI**: SweetAlert2, Sortable.js

## 📝 Notas Importantes
Esta versão inclui todas as correções e melhorias para:
1. Sistema completo de modo escuro com seletores sol/lua
2. Cores otimizadas para melhor experiência visual
3. Funcionalidade Enter em todos os formulários de autenticação
4. Código limpo sem dependências externas desnecessárias

Para mais informações técnicas, consulte `YOUWARE.md`.

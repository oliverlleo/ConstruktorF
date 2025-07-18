// Definição dos arquivos do sistema
const files = {
    'index.html': { path: '../index.html', type: 'html' },
    'css/style.css': { path: '../css/style.css', type: 'css' },
    'js/config.js': { path: '../js/config.js', type: 'js' },
    'js/autenticacao.js': { path: '../js/autenticacao.js', type: 'js' },
    'js/database.js': { path: '../js/database.js', type: 'js' },
    'js/ui.js': { path: '../js/ui.js', type: 'js' },
    'js/main.js': { path: '../js/main.js', type: 'js' },
    'js/workspaces.js': { path: '../js/workspaces.js', type: 'js' },
    'js/login.js': { path: '../js/login.js', type: 'js' },
    'js/dark-mode.js': { path: '../js/dark-mode.js', type: 'js' },
    'js/ui-enhancements.js': { path: '../js/ui-enhancements.js', type: 'js' },
    'js/code-view.js': { path: '../js/code-view.js', type: 'js' },
    'js/flow-designer.js': { path: '../js/flow-designer.js', type: 'js' },
    'js/user/userProfile.js': { path: '../js/user/userProfile.js', type: 'js' },
    'js/user/invitations.js': { path: '../js/user/invitations.js', type: 'js' },
    'pages/login.html': { path: '../pages/login.html', type: 'html' },
    'pages/code-view.html': { path: '../pages/code-view.html', type: 'html' },
    'pages/code-view2.html': { path: '../pages/code-view2.html', type: 'html' },
    'pages/code-vieww.html': { path: '../pages/code-vieww.html', type: 'html' },
    'pages/user-view.html': { path: '../pages/user-view.html', type: 'html' },
    'pages/flow-designer.html': { path: '../pages/flow-designer.html', type: 'html' },
    'imagem/logo.png': { path: '../imagem/logo.png', type: 'image' },
    'imagem/logoconstruktor.png': { path: '../imagem/logoconstruktor.png', type: 'image' },
    'README.md': { path: '../README.md', type: 'md' },
    'read.md': { path: '../read.md', type: 'md' },
    'YOUWARE.md': { path: '../YOUWARE.md', type: 'md' },
    'teste-dark-backup.html': { path: '../teste-dark-backup.html', type: 'html' },
    'todo.json': { path: '../todo.json', type: 'json' }
};

// Agrupar arquivos por tipo para a navegação por abas
const fileGroups = {
    'HTML': Object.keys(files).filter(file => file.endsWith('.html')),
    'JavaScript': Object.keys(files).filter(file => file.endsWith('.js')),
    'CSS': Object.keys(files).filter(file => file.endsWith('.css')),
    'Markdown': Object.keys(files).filter(file => file.endsWith('.md')),
    'Outros': Object.keys(files).filter(file => !file.endsWith('.html') && !file.endsWith('.js') && !file.endsWith('.css') && !file.endsWith('.md'))
};

// Mapeamento de extensões para linguagens highlight.js
const extensionToLanguage = {
    '.html': 'html',
    '.css': 'css',
    '.js': 'javascript',
    '.md': 'markdown',
    '.json': 'json'
};

// Funções utilitárias
function getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.')) || '';
}

function getLanguageForFile(filename) {
    const extension = getFileExtension(filename);
    return extensionToLanguage[extension] || 'plaintext';
}

function getFileIcon(filename) {
    const extension = getFileExtension(filename);
    switch (extension) {
        case '.html':
            return '<i class="fa-brands fa-html5 text-orange-500"></i>';
        case '.css':
            return '<i class="fa-brands fa-css3-alt text-blue-500"></i>';
        case '.js':
            return '<i class="fa-brands fa-js-square text-yellow-500"></i>';
        case '.md':
            return '<i class="fa-brands fa-markdown text-slate-700"></i>';
        case '.json':
            return '<i class="fa-solid fa-brackets-curly text-purple-500"></i>';
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
            return '<i class="fa-regular fa-image text-green-500"></i>';
        default:
            return '<i class="fa-regular fa-file text-slate-500"></i>';
    }
}

// Carregar arquivo 
async function loadFile(filePath) {
    try {
        // Atualizar o caminho do arquivo atual
        document.getElementById('current-file').textContent = filePath;
        
        // Obter o tipo de arquivo para highlight.js
        const language = getLanguageForFile(filePath);
        
        // Referência ao elemento de display
        const codeDisplay = document.getElementById('code-display');
        
        // Definir linguagem para highlight.js
        codeDisplay.className = `language-${language}`;
        
        if (files[filePath].type === 'image') {
            // Para imagens, mostrar preview
            codeDisplay.innerHTML = `<div class="flex items-center justify-center p-4">
                <img src="${files[filePath].path}" alt="${filePath}" class="max-w-full max-h-96">
                <p class="mt-4 text-center text-slate-500">Arquivo de imagem: ${filePath}</p>
            </div>`;
            
            // Não aplicar highlight.js
            return;
        }
        
        // Carregar o conteúdo do arquivo
        const response = await fetch(files[filePath].path);
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        let content = await response.text();
        
        // Escapar caracteres HTML para exibição segura
        content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Definir o conteúdo
        codeDisplay.textContent = content;
        
        // Aplicar highlight
        hljs.highlightElement(codeDisplay);
        
    } catch (error) {
        console.error('Erro ao carregar arquivo:', error);
        document.getElementById('code-display').textContent = `// Erro ao carregar o arquivo: ${filePath}\n// ${error.message}`;
    }
}

// Criar as abas de navegação
function createFileTabs() {
    const tabsContainer = document.getElementById('file-tabs');
    if (!tabsContainer) return;
    
    let tabsHTML = '';
    
    // Criar abas para cada grupo de arquivos
    Object.keys(fileGroups).forEach(group => {
        if (fileGroups[group].length > 0) {
            tabsHTML += `
                <div class="relative inline-block">
                    <button class="file-group-tab px-4 py-1.5 text-sm font-medium border-b-2 border-transparent hover:border-indigo-500 hover:text-indigo-600 transition-colors">
                        ${group}
                    </button>
                    <div class="file-group-dropdown absolute left-0 top-full mt-1 w-64 bg-white shadow-lg rounded-lg border border-gray-200 p-2 hidden z-20">
                        <div class="max-h-80 overflow-y-auto">
                            ${fileGroups[group].sort().map(file => `
                                <button class="file-item w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2" data-file="${file}">
                                    ${getFileIcon(file)}
                                    <span class="truncate">${file}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    tabsContainer.innerHTML = tabsHTML;
    
    // Adicionar event listeners
    document.querySelectorAll('.file-group-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Fechar todos os dropdowns abertos
            document.querySelectorAll('.file-group-dropdown').forEach(dropdown => {
                dropdown.classList.add('hidden');
            });
            
            // Abrir o dropdown atual
            this.nextElementSibling.classList.remove('hidden');
            
            // Destacar a aba ativa
            document.querySelectorAll('.file-group-tab').forEach(t => {
                t.classList.remove('border-indigo-500', 'text-indigo-600');
                t.classList.add('border-transparent');
            });
            this.classList.add('border-indigo-500', 'text-indigo-600');
        });
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.file-group-tab') && !event.target.closest('.file-group-dropdown')) {
            document.querySelectorAll('.file-group-dropdown').forEach(dropdown => {
                dropdown.classList.add('hidden');
            });
        }
    });
    
    // Adicionar listeners para os itens de arquivo
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', function() {
            const filePath = this.getAttribute('data-file');
            loadFile(filePath);
            
            // Fechar o dropdown
            this.closest('.file-group-dropdown').classList.add('hidden');
        });
    });
}

// Função para baixar todos os arquivos
async function downloadAllFiles() {
    try {
        const downloadBtn = document.getElementById('download-all-btn');
        const originalText = downloadBtn.innerHTML;
        
        // Alterar o texto do botão
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin h-4 w-4 sm:h-5 sm:w-5 mr-2"></i><span>Preparando...</span>';
        downloadBtn.disabled = true;
        
        // Criar o objeto JSZip
        const zip = new JSZip();
        
        // Adicionar todos os arquivos ao ZIP
        for (const [filePath, fileInfo] of Object.entries(files)) {
            try {
                // Carregar o conteúdo do arquivo
                const response = await fetch(fileInfo.path);
                
                if (!response.ok) {
                    console.warn(`Não foi possível carregar o arquivo: ${filePath}`);
                    continue;
                }
                
                // Adicionar ao ZIP (como blob para imagens, como texto para outros)
                if (fileInfo.type === 'image') {
                    const blob = await response.blob();
                    zip.file(filePath, blob);
                } else {
                    const text = await response.text();
                    zip.file(filePath, text);
                }
                
            } catch (error) {
                console.error(`Erro ao processar arquivo ${filePath}:`, error);
            }
        }
        
        // Gerar o ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Criar link de download
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(content);
        downloadLink.download = 'construktor-codigo-fonte.zip';
        downloadLink.click();
        
        // Limpar URL após download
        setTimeout(() => {
            URL.revokeObjectURL(downloadLink.href);
        }, 100);
        
        // Restaurar o texto do botão
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        
    } catch (error) {
        console.error('Erro ao criar o ZIP:', error);
        document.getElementById('download-all-btn').innerHTML = '<i class="fa-solid fa-download h-4 w-4 sm:h-5 sm:w-5 mr-2"></i><span>Baixar Sistema</span>';
        document.getElementById('download-all-btn').disabled = false;
        
        // Mostrar mensagem de erro
        alert('Ocorreu um erro ao gerar o arquivo ZIP. Consulte o console para detalhes.');
    }
}

// Função para copiar o conteúdo do arquivo atual
async function copyFileContent() {
    const currentFile = document.getElementById('current-file').textContent;
    
    if (!currentFile || !files[currentFile]) {
        return;
    }
    
    try {
        // Se for uma imagem, não podemos copiar
        if (files[currentFile].type === 'image') {
            alert('Não é possível copiar arquivos de imagem.');
            return;
        }
        
        // Carregar o conteúdo do arquivo
        const response = await fetch(files[currentFile].path);
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        const content = await response.text();
        
        // Copiar para a área de transferência
        await navigator.clipboard.writeText(content);
        
        // Mostrar confirmação
        const copyBtn = document.getElementById('copy-file-btn');
        const originalText = copyBtn.innerHTML;
        
        copyBtn.innerHTML = '<i class="fa-solid fa-check h-3.5 w-3.5"></i><span>Copiado!</span>';
        copyBtn.disabled = true;
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao copiar arquivo:', error);
        alert('Não foi possível copiar o arquivo. Consulte o console para detalhes.');
    }
}

// Função para baixar o arquivo atual
async function downloadCurrentFile() {
    const currentFile = document.getElementById('current-file').textContent;
    
    if (!currentFile || !files[currentFile]) {
        return;
    }
    
    try {
        // Carregar o conteúdo do arquivo
        const response = await fetch(files[currentFile].path);
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        // Para imagens, baixar como blob
        if (files[currentFile].type === 'image') {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            
        } else {
            // Para outros arquivos, baixar como texto
            const content = await response.text();
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        }
        
    } catch (error) {
        console.error('Erro ao baixar arquivo:', error);
        alert('Não foi possível baixar o arquivo. Consulte o console para detalhes.');
    }
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    // Criar as abas de navegação
    createFileTabs();
    
    // Carregar o arquivo index.html por padrão
    loadFile('index.html');
    
    // Event listeners para os botões
    document.getElementById('download-all-btn')?.addEventListener('click', downloadAllFiles);
    document.getElementById('copy-file-btn')?.addEventListener('click', copyFileContent);
    document.getElementById('download-file-btn')?.addEventListener('click', downloadCurrentFile);
    
    // Event listener para o botão de copiar todos (placeholder)
    document.getElementById('copy-all-btn')?.addEventListener('click', function() {
        alert('Função em implementação. Por favor, use o botão de download.');
    });
});
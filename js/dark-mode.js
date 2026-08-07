// Compatibilidade para páginas legadas que carregam js/dark-mode.js como script clássico.
import('./ui/dark-mode.js').catch((error) => {
  console.error('Falha ao carregar o gerenciador de tema:', error);
});

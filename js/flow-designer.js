// Compatibilidade com pages/flow-designer.html, que ainda carrega este arquivo
// como script clássico. A implementação real agora vive em js/features/.
import('./features/flow-designer/flow-designer.js').catch((error) => {
  console.error('Falha ao carregar o módulo do Designer de Fluxos:', error);
});

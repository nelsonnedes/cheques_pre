// Sistema de Ícones Moderno - Lucide Icons
// Configuração e utilitários para ícones responsivos

// Mapeamento de ícones Font Awesome para Lucide
export const iconMapping = {
    // Autenticação e Usuário
    'fas fa-sign-in-alt': 'log-in',
    'fas fa-user-plus': 'user-plus',
    'fas fa-user-circle': 'user-circle',
    'fas fa-key': 'key',
    'fas fa-eye': 'eye',
    'fas fa-eye-slash': 'eye-off',
    'fab fa-google': 'chrome', // Usar chrome como substituto para Google
    
    // Navegação e Dashboard
    'fas fa-tachometer-alt': 'gauge',
    'fas fa-file-invoice-dollar': 'file-text',
    'fas fa-building': 'building',
    'fas fa-chart-bar': 'bar-chart-3',
    'fas fa-chart-line': 'trending-up',
    'fas fa-chart-pie': 'pie-chart',
    'fas fa-chart-area': 'area-chart',
    'fas fa-calendar-alt': 'calendar',
    'fas fa-calendar': 'calendar',
    'fas fa-calendar-times': 'calendar-x',
    'fas fa-headset': 'headphones',
    
    // Ações
    'fas fa-plus': 'plus',
    'fas fa-edit': 'edit',
    'fas fa-save': 'save',
    'fas fa-trash': 'trash-2',
    'fas fa-download': 'download',
    'fas fa-upload': 'upload',
    'fas fa-cloud-upload-alt': 'cloud-upload',
    'fas fa-sync-alt': 'refresh-cw',
    'fas fa-filter': 'filter',
    'fas fa-search': 'search',
    'fas fa-times': 'x',
    'fas fa-check': 'check',
    'fas fa-check-circle': 'check-circle',
    'fas fa-undo': 'undo-2',
    
    // Notificações e Estados
    'fas fa-bell': 'bell',
    'fas fa-exclamation-circle': 'alert-circle',
    'fas fa-exclamation-triangle': 'alert-triangle',
    'fas fa-info-circle': 'info',
    'fas fa-question-circle': 'help-circle',
    'fas fa-spinner': 'loader-2',
    
    // Comunicação e Suporte
    'fas fa-comments': 'message-circle',
    'fas fa-paper-plane': 'send',
    'fas fa-ticket-alt': 'ticket',
    'fas fa-book': 'book',
    'fas fa-video': 'video',
    'fas fa-robot': 'bot',
    'fas fa-minus': 'minus',
    
    // Setas e Navegação
    'fas fa-chevron-down': 'chevron-down',
    'fas fa-chevron-up': 'chevron-up',
    'fas fa-chevron-left': 'chevron-left',
    'fas fa-chevron-right': 'chevron-right',
    'fas fa-arrow-up': 'arrow-up',
    'fas fa-arrow-down': 'arrow-down',
    
    // Financeiro
    'fas fa-money-bill-wave': 'banknote',
    'fas fa-file-excel': 'file-spreadsheet',
    'fas fa-file-pdf': 'file-text',
    
    // Configurações e Sistema
    'fas fa-cog': 'settings',
    'fas fa-cogs': 'settings-2',
    'fas fa-shield-alt': 'shield',
    'fas fa-rocket': 'rocket',
    'fas fa-table': 'table',
    'fas fa-tasks': 'check-square',
    'fas fa-users': 'users',
    'fas fa-tag': 'tag'
};

// Configuração de tamanhos responsivos
export const iconSizes = {
    'xs': 14,
    'sm': 16,
    'md': 20,
    'lg': 24,
    'xl': 28,
    '2xl': 32,
    '3xl': 48
};

// Função para criar um ícone Lucide
export function createIcon(iconName, options = {}) {
    const {
        size = 'md',
        className = '',
        color = 'currentColor',
        strokeWidth = 2,
        fill = 'none',
        ...otherProps
    } = options;
    
    const iconSize = typeof size === 'number' ? size : iconSizes[size] || iconSizes.md;
    
    // Criar elemento SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', iconSize);
    svg.setAttribute('height', iconSize);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', fill);
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', strokeWidth);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.className = `lucide lucide-${iconName} ${className}`.trim();
    
    // Adicionar atributos extras
    Object.entries(otherProps).forEach(([key, value]) => {
        svg.setAttribute(key, value);
    });
    
    // Definições dos ícones mais usados (paths SVG)
    const iconPaths = {
        // Autenticação
        'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
        'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
        'user-circle': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
        'key': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>',
        'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
        'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
        'chrome': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/>',
        
        // Dashboard e Navegação
        'gauge': '<path d="M12 2v4M6.8 6.8l2.8 2.8M2 12h4M6.8 17.2l2.8-2.8M12 22v-4M17.2 17.2l-2.8-2.8M22 12h-4M17.2 6.8l-2.8 2.8"/><circle cx="12" cy="12" r="2"/>',
        'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>',
        'building': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
        'bar-chart-3': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
        'trending-up': '<polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/>',
        'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10l8.84 3.16"/>',
        'area-chart': '<polygon points="3,11 22,2 13,21 11,13 3,11"/>',
        'calendar': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        'calendar-x': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="14" y1="14" x2="10" y2="18"/><line x1="10" y1="14" x2="14" y2="18"/>',
        'headphones': '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
        
        // Ações
        'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        'edit': '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
        'save': '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>',
        'trash-2': '<polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
        'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        'cloud-upload': '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="M16 16l-4-4-4 4"/>',
        'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
        'filter': '<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/>',
        'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
        'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        'check': '<polyline points="20,6 9,17 4,12"/>',
        'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>',
        'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
        
        // Notificações
        'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'loader-2': '<path d="M21 12a9 9 0 11-6.219-8.56"/>',
        
        // Comunicação
        'message-circle': '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
        'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/>',
        'ticket': '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
        'book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        'video': '<path d="M23 7l-7 5 7 5V7z"/><rect width="15" height="9" x="1" y="8" rx="2" ry="2"/>',
        'bot': '<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>',
        'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
        
        // Setas
        'chevron-down': '<polyline points="6,9 12,15 18,9"/>',
        'chevron-up': '<polyline points="18,15 12,9 6,15"/>',
        'chevron-left': '<polyline points="15,18 9,12 15,6"/>',
        'chevron-right': '<polyline points="9,6 15,12 9,18"/>',
        'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/>',
        'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/>',
        
        // Financeiro
        'banknote': '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
        'file-spreadsheet': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
        
        // Sistema
        'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        'settings-2': '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
        'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        'table': '<path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/>',
        'check-square': '<polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
        'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'tag': '<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>'
    };
    
    // Adicionar o path do ícone
    if (iconPaths[iconName]) {
        svg.innerHTML = iconPaths[iconName];
    }
    
    return svg;
}

// Função para substituir ícones Font Awesome por Lucide
export function replaceIcon(element, newIconName, options = {}) {
    const icon = createIcon(newIconName, options);
    element.parentNode.replaceChild(icon, element);
    return icon;
}

// Função para substituir todos os ícones Font Awesome na página
export function replaceAllIcons(container = document) {
    const fontAwesomeIcons = container.querySelectorAll('[class*="fas fa-"], [class*="fab fa-"], [class*="far fa-"]');
    
    fontAwesomeIcons.forEach(icon => {
        const classes = Array.from(icon.classList);
        const fontAwesomeClass = classes.find(cls => 
            cls.startsWith('fas fa-') || 
            cls.startsWith('fab fa-') || 
            cls.startsWith('far fa-')
        );
        
        if (fontAwesomeClass && iconMapping[fontAwesomeClass]) {
            const lucideIconName = iconMapping[fontAwesomeClass];
            const size = getIconSize(classes);
            const options = {
                size,
                className: classes.filter(cls => 
                    !cls.startsWith('fas') && 
                    !cls.startsWith('fab') && 
                    !cls.startsWith('far') && 
                    !cls.startsWith('fa-')
                ).join(' ')
            };
            
            replaceIcon(icon, lucideIconName, options);
        }
    });
}

// Função auxiliar para determinar o tamanho do ícone
function getIconSize(classes) {
    if (classes.includes('fa-lg')) return 'lg';
    if (classes.includes('fa-2x')) return 'xl';
    if (classes.includes('fa-3x')) return '3xl';
    if (classes.includes('fa-sm')) return 'sm';
    return 'md';
}

// Função utilitária para criar ícones dinâmicos
export function icon(name, options = {}) {
    const lucideName = iconMapping[name] || name;
    return createIcon(lucideName, options);
}

// Inicialização automática
export function initIcons() {
    // Substituir ícones existentes
    replaceAllIcons();
    
    // Observar mudanças no DOM para substituir novos ícones
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    replaceAllIcons(node);
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIcons);
} else {
    initIcons();
} 
// Script utilitário para atualizar ícones nos arquivos JavaScript existentes
// Este script ajuda a migrar de Font Awesome para Lucide Icons

import { iconMapping, createIcon } from './icons.js';

// Função para criar ícones dinâmicos nos JavaScripts
export function createIconHTML(iconName, options = {}) {
    const {
        size = 'md',
        className = '',
        ...otherProps
    } = options;
    
    const lucideName = iconMapping[iconName] || iconName;
    const icon = createIcon(lucideName, { size, className, ...otherProps });
    return icon.outerHTML;
}

// Função para substituir ícones em strings HTML
export function replaceIconsInHTML(htmlString) {
    // Mapear Font Awesome para Lucide
    const iconReplacements = {
        '<i class="fas fa-eye"></i>': createIconHTML('eye'),
        '<i class="fas fa-edit"></i>': createIconHTML('edit'),
        '<i class="fas fa-save"></i>': createIconHTML('save'),
        '<i class="fas fa-trash"></i>': createIconHTML('trash-2'),
        '<i class="fas fa-plus"></i>': createIconHTML('plus'),
        '<i class="fas fa-check-circle"></i>': createIconHTML('check-circle'),
        '<i class="fas fa-exclamation-circle"></i>': createIconHTML('alert-circle'),
        '<i class="fas fa-exclamation-triangle"></i>': createIconHTML('alert-triangle'),
        '<i class="fas fa-info-circle"></i>': createIconHTML('info'),
        '<i class="fas fa-spinner fa-spin"></i>': createIconHTML('loader-2', { className: 'lucide-spin' }),
        '<i class="fas fa-times"></i>': createIconHTML('x'),
        '<i class="fas fa-file-invoice-dollar fa-3x"></i>': createIconHTML('file-text', { size: '3xl' }),
        '<i class="fas fa-calendar"></i>': createIconHTML('calendar'),
        '<i class="fas fa-tag"></i>': createIconHTML('tag'),
        '<i class="fas fa-ticket-alt"></i>': createIconHTML('ticket'),
        '<i class="fas fa-comments"></i>': createIconHTML('message-circle'),
        '<i class="fas fa-chevron-down"></i>': createIconHTML('chevron-down'),
        '<i class="fas fa-cog"></i>': createIconHTML('settings')
    };
    
    let updatedHTML = htmlString;
    
    // Substituir cada ícone
    for (const [oldIcon, newIcon] of Object.entries(iconReplacements)) {
        updatedHTML = updatedHTML.replace(new RegExp(escapeRegExp(oldIcon), 'g'), newIcon);
    }
    
    return updatedHTML;
}

// Função para escapar caracteres especiais em regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Função para atualizar configurações de toast
export function updateToastConfig() {
    return {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
}

// Função para atualizar configurações de eventos da agenda
export function updateAgendaEventTypes() {
    return {
        'vencimento': { color: '#ef4444', icon: 'calendar-x', label: 'Vencimento' },
        'compensacao': { color: '#10b981', icon: 'check-circle', label: 'Compensação' },
        'reuniao': { color: '#3b82f6', icon: 'users', label: 'Reunião' },
        'lembrete': { color: '#f59e0b', icon: 'bell', label: 'Lembrete' },
        'tarefa': { color: '#8b5cf6', icon: 'check-square', label: 'Tarefa' }
    };
}

// Exportar para uso global
window.createIconHTML = createIconHTML;
window.replaceIconsInHTML = replaceIconsInHTML;
window.updateToastConfig = updateToastConfig;
window.updateAgendaEventTypes = updateAgendaEventTypes; 
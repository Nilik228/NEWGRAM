// Mobile UI optimizations
class MobileUI {
    constructor() {
        this.isMobile = this.checkMobile();
        this.init();
    }

    checkMobile() {
        return window.innerWidth <= 768;
    }

    init() {
        console.log('📱 Инициализация мобильного UI...');
        this.applyMobileStyles();
        this.fixViewportHeight();
        this.forceInputVisibility();
        this.addTouchOptimizations();
        
        // Периодическая проверка видимости
        setInterval(() => this.checkInputVisibility(), 2000);
    }

    applyMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ДЛЯ ПОЛЯ ВВОДА */
            .input-container {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 10000 !important;
                background: var(--bg-secondary) !important;
                border-top: 1px solid var(--border) !important;
                padding: 12px 16px !important;
                min-height: 70px !important;
            }
            
            #messageInput {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 10001 !important;
                background: var(--bg-tertiary) !important;
                border: 2px solid var(--border) !important;
                color: var(--text-primary) !important;
                min-height: 44px !important;
                font-size: 16px !important;
                width: 100% !important;
            }
            
            .btn-send {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 10001 !important;
            }
            
            /* Мобильные стили */
            @media (max-width: 768px) {
                /* Основной layout */
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                }
                
                .app {
                    height: 100vh !important;
                    height: -webkit-fill-available !important;
                    display: flex !important;
                    flex-direction: column !important;
                    position: relative !important;
                }
                
                /* Header */
                .header {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    z-index: 9000 !important;
                    background: var(--bg-secondary) !important;
                    backdrop-filter: blur(20px) !important;
                    padding: 12px 16px !important;
                    height: 60px !important;
                    display: flex !important;
                    align-items: center !important;
                    border-bottom: 1px solid var(--border) !important;
                }
                
                /* Основной контент */
                .main-content {
                    flex: 1 !important;
                    margin-top: 60px !important;
                    margin-bottom: 70px !important;
                    overflow: hidden !important;
                    position: relative !important;
                }
                
                /* Контейнер сообщений */
                .messages-container {
                    padding: 20px 12px 10px 12px !important;
                    margin: 0 !important;
                    height: calc(100vh - 130px) !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                /* Панель ввода - КРИТИЧЕСКИ ВАЖНО */
                .input-container {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    z-index: 10000 !important;
                    background: var(--bg-secondary) !important;
                    backdrop-filter: blur(20px) !important;
                    padding: 12px 16px !important;
                    min-height: 70px !important;
                    border-top: 1px solid var(--border) !important;
                    align-items: center !important;
                    gap: 8px !important;
                }
                
                /* Поле ввода - КРИТИЧЕСКИ ВАЖНО */
                .input-wrapper {
                    flex: 1 !important;
                    display: block !important;
                    visibility: visible !important;
                    min-height: 44px !important;
                }
                
                #messageInput {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 100% !important;
                    min-height: 44px !important;
                    padding: 12px 16px !important;
                    font-size: 16px !important;
                    background: var(--bg-tertiary) !important;
                    border: 2px solid var(--border) !important;
                    border-radius: 22px !important;
                    color: var(--text-primary) !important;
                    position: relative !important;
                    z-index: 10001 !important;
                }
                
                #messageInput:focus {
                    border-color: var(--accent) !important;
                    outline: none !important;
                }
                
                #messageInput:disabled {
                    background: var(--bg-primary) !important;
                    color: var(--text-muted) !important;
                    opacity: 0.7 !important;
                }
                
                /* Кнопка отправки */
                .btn-send {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-width: 50px !important;
                    min-height: 50px !important;
                    background: var(--accent) !important;
                    border: none !important;
                    border-radius: 50% !important;
                    color: white !important;
                    font-size: 18px !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 10001 !important;
                }
                
                .btn-send:disabled {
                    background: var(--text-muted) !important;
                    opacity: 0.5 !important;
                }
                
                /* Кнопка файлов */
                .file-upload {
                    display: block !important;
                    visibility: visible !important;
                }
                
                .btn-icon {
                    min-width: 44px !important;
                    min-height: 44px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                /* Сообщения */
                .message {
                    max-width: 85% !important;
                    margin: 8px 0 !important;
                    padding: 12px 16px !important;
                }
                
                .message.own {
                    margin-left: auto !important;
                    margin-right: 12px !important;
                }
                
                .message.other {
                    margin-right: auto !important;
                    margin-left: 12px !important;
                }
                
                /* Скрываем скроллбар */
                ::-webkit-scrollbar {
                    display: none !important;
                }
            }
            
            /* Безопасные зоны для iPhone */
            @supports(padding: max(0px)) {
                .input-container {
                    padding-bottom: max(12px, env(safe-area-inset-bottom)) !important;
                    padding-left: max(16px, env(safe-area-inset-left)) !important;
                    padding-right: max(16px, env(safe-area-inset-right)) !important;
                }
                
                .messages-container {
                    padding-top: max(20px, env(safe-area-inset-top)) !important;
                    padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 Мобильные стили применены');
    }

    fixViewportHeight() {
        const setHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            const app = document.querySelector('.app');
            if (app) {
                app.style.height = 'calc(var(--vh, 1vh) * 100)';
            }
        };
        
        setHeight();
        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);
    }

    forceInputVisibility() {
        console.log('🔧 Принудительное отображение поля ввода...');
        
        const elementsToFix = [
            { id: 'messageInput', type: 'input' },
            { selector: '.input-container', type: 'container' },
            { selector: '.btn-send', type: 'button' },
            { selector: '.file-upload', type: 'upload' }
        ];
        
        elementsToFix.forEach(item => {
            let element;
            if (item.id) {
                element = document.getElementById(item.id);
            } else {
                element = document.querySelector(item.selector);
            }
            
            if (element) {
                this.applyVisibilityFix(element);
                console.log(`✅ Исправлен: ${item.id || item.selector}`);
            } else {
                console.log(`❌ Не найден: ${item.id || item.selector}`);
            }
        });
        
        // Дополнительная проверка через 2 секунды
        setTimeout(() => this.checkInputVisibility(), 2000);
    }

    applyVisibilityFix(element) {
        element.style.display = element.tagName === 'INPUT' ? 'block' : 'flex';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        element.style.position = 'relative';
        element.style.zIndex = '10000';
        
        if (element.id === 'messageInput') {
            element.style.background = 'var(--bg-tertiary)';
            element.style.color = 'var(--text-primary)';
            element.style.border = '2px solid var(--border)';
        }
    }

    checkInputVisibility() {
        const messageInput = document.getElementById('messageInput');
        const inputContainer = document.querySelector('.input-container');
        
        if (messageInput && messageInput.offsetParent === null) {
            console.warn(⚠️ Поле ввода скрыто, применяем экстренный фикс...');
            this.applyEmergencyFix();
        }
        
        if (inputContainer && inputContainer.offsetParent === null) {
            console.warn('⚠️ Контейнер ввода скрыт, применяем экстренный фикс...');
            this.applyEmergencyFix();
        }
    }

    applyEmergencyFix() {
        // Самый агрессивный фикс
        const style = document.createElement('style');
        style.textContent = `
            .input-container {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 2147483647 !important;
                background: var(--bg-secondary) !important;
            }
            
            #messageInput {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 2147483647 !important;
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
            }
        `;
        document.head.appendChild(style);
    }

    addTouchOptimizations() {
        // Улучшение для тач-устройств
        document.addEventListener('touchstart', () => {}, { passive: true });
    }
}

// Инициализация при полной загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Запуск мобильного UI...');
        new MobileUI();
    });
} else {
    console.log('🚀 Запуск мобильного UI (DOM уже загружен)...');
    new MobileUI();
}
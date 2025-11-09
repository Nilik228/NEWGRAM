// NewGram Messenger
class NewGram {
    constructor() {
        this.socket = null;
        this.username = '';
        this.currentChatId = 'general';
        this.currentTheme = 'dark';
        this.selectedMessageId = null;
        this.replyToMessageId = null;
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.initializeEventListeners();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ Подключено к серверу');
        });

        this.socket.on('chats_list', (chats) => {
            console.log('📋 Получен список чатов:', chats);
            this.updateChatsList(chats);
        });

        this.socket.on('chat_history', (data) => {
            if (data.chatId === this.currentChatId) {
                this.displayChatHistory(data.messages);
            }
        });

        this.socket.on('new_message', (message) => {
            if (message.chatId === this.currentChatId) {
                this.addMessageToChat(message);
            }
        });

        this.socket.on('online_users', (users) => {
            this.updateOnlineUsers(users);
        });

        this.socket.on('user_joined', (data) => {
            if (data.chatId === this.currentChatId) {
                this.showSystemMessage(`${data.username} присоединился к чату`);
            }
        });

        this.socket.on('user_left', (data) => {
            if (data.chatId === this.currentChatId) {
                this.showSystemMessage(`${data.username} покинул чат`);
            }
        });

        this.socket.on('chat_created', (chat) => {
            console.log('💬 Создан новый чат:', chat);
            this.addChatToList(chat);
            this.showNotification(`Создан чат с ${chat.name.replace('💬 ', '')}`, 'success');
            
            // Автоматически переключаемся на новый чат
            this.switchChat(chat.id, chat.name);
        });

        this.socket.on('join_error', (error) => {
            this.showNotification(error, 'error');
        });

        this.socket.on('error_message', (error) => {
            this.showNotification(error, 'error');
        });
    }

    initializeEventListeners() {
        // Enter в модалке логина
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Enter в поле сообщения
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Загрузка файлов
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // Закрытие модальных окон по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Свайп для мобильных
        this.addSwipeGestures();
    }

    login() {
        const usernameInput = document.getElementById('usernameInput');
        const themeSelect = document.getElementById('themeSelect');
        
        this.username = usernameInput.value.trim();
        this.currentTheme = themeSelect.value;
        
        if (!this.username) {
            this.showNotification('Введите имя пользователя', 'error');
            return;
        }

        this.socket.emit('user_join', {
            username: this.username,
            theme: this.currentTheme
        });
        
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
        
        // Применяем тему
        document.body.className = `theme-${this.currentTheme}`;
        
        this.showNotification(`Добро пожаловать, ${this.username}!`, 'success');
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;

        const messageData = {
            message: message
        };

        if (this.replyToMessageId) {
            messageData.replyTo = this.replyToMessageId;
        }

        this.socket.emit('send_message', messageData);
        
        messageInput.value = '';
        this.clearReply();
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        for (let file of files) {
            try {
                await this.uploadFile(file);
            } catch (error) {
                this.showNotification(`Ошибка загрузки ${file.name}`, 'error');
            }
        }
        
        event.target.value = '';
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.socket.emit('send_message', {
                message: `📎 ${file.name}`,
                file: result.file
            });
        } else {
            throw new Error('Upload failed');
        }
    }

    switchChat(chatId, chatName) {
        if (this.currentChatId === chatId) {
            this.closeSidebar();
            return;
        }

        console.log(`🔄 Переключение на чат: ${chatId}`);
        this.currentChatId = chatId;
        this.socket.emit('switch_chat', chatId);
        
        document.getElementById('chatTitle').textContent = chatName;
        document.getElementById('messagesContainer').innerHTML = '';
        
        this.showSystemMessage(`Вы в чате "${chatName}"`);
        this.closeSidebar();
        this.clearReply();
    }

    createDirectChat() {
        const contactInput = document.getElementById('contactInput');
        const contactName = contactInput.value.trim();
        
        if (!contactName) {
            this.showNotification('Введите имя пользователя', 'error');
            return;
        }

        if (contactName === this.username) {
            this.showNotification('Нельзя создать чат с самим собой', 'error');
            return;
        }

        console.log('🔍 DEBUG create_direct_chat:', {
            from: this.username,
            to: contactName,
            onlineUsers: this.getOnlineUsers()
        });

        console.log(`💬 Создание личного чата с: ${contactName}`);
        this.socket.emit('create_direct_chat', contactName);
        this.closeModal('createDirectModal');
        contactInput.value = '';
    }

    createGroupChat() {
        // В будущей реализации
        this.showNotification('Создание групп скоро будет доступно', 'info');
        this.closeModal('createGroupModal');
    }

    addMessageToChat(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = this.createMessageElement(message);
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Анимация появления
        messageElement.style.animation = 'messageAppear 0.3s ease';
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwn = message.username === this.username;
        
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.setAttribute('data-message-id', message.id);
        
        let content = `
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
        `;
        
        if (message.replyTo) {
            content += `
                <div class="reply-indicator" onclick="app.scrollToMessage('${message.replyTo.id}')">
                    ↩️ Ответ <strong>${message.replyTo.username}</strong>: 
                    ${message.replyTo.message.substring(0, 30)}
                    ${message.replyTo.message.length > 30 ? '...' : ''}
                </div>
            `;
        }
        
        content += `<div class="message-text">${this.escapeHtml(message.message)}</div>`;
        
        if (message.file) {
            if (message.type === 'image') {
                content += `<img src="${message.file.url}" class="message-media" loading="lazy" alt="${message.file.originalname}">`;
            } else if (message.type === 'video') {
                content += `<video src="${message.file.url}" class="message-media" controls></video>`;
            } else if (message.type === 'audio') {
                content += `
                    <div class="audio-player">
                        <audio src="${message.file.url}" controls></audio>
                        <div class="audio-info">🎵 ${message.file.originalname}</div>
                    </div>
                `;
            } else {
                content += `<a href="${message.file.url}" class="file-link" download="${message.file.originalname}">📎 ${message.file.originalname}</a>`;
            }
        }
        
        messageDiv.innerHTML = content;
        
        // Контекстное меню для своих сообщений
        if (isOwn) {
            messageDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showMessageMenu(message.id, e);
            });
        }
        
        return messageDiv;
    }

    displayChatHistory(messages) {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => {
            this.addMessageToChat(message);
        });
        
        if (messages.length === 0) {
            this.showSystemMessage('Начните общение в этом чате! 💬');
        }
    }

    updateChatsList(chats) {
        const chatsList = document.getElementById('chatsList');
        const directChatsList = document.getElementById('directChatsList');
        
        chatsList.innerHTML = '';
        directChatsList.innerHTML = '';
        
        console.log('====== 📋 ОБНОВЛЕНИЕ ЧАТОВ ======');
        console.log('👤 Текущий пользователь:', this.username);
        console.log('📊 Получено чатов:', chats.length);
        console.log('📝 Список чатов:', chats.map(c => ({
            name: c.name,
            type: c.type,
            id: c.id
        })));
        
        let groupChatsCount = 0;
        let directChatsCount = 0;
        
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.innerHTML = `<span>${chat.name}</span>`;
            chatItem.onclick = () => this.switchChat(chat.id, chat.name);
            
            if (chat.type === 'direct') {
                directChatsList.appendChild(chatItem);
                directChatsCount++;
                console.log(`➕ Личный чат: ${chat.name}`);
            } else {
                chatsList.appendChild(chatItem);
                groupChatsCount++;
                console.log(`➕ Групповой чат: ${chat.name}`);
            }
        });
        
        console.log(`📊 Итоги: ${groupChatsCount} групповых, ${directChatsCount} личных`);
        console.log('================================');
        
        // Если нет личных чатов, покажем сообщение
        if (directChatsCount === 0) {
            directChatsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center; font-size: 14px;">Нет личных чатов</div>';
        }
        
        // Если нет групповых чатов (маловероятно, но на всякий случай)
        if (groupChatsCount === 0) {
            chatsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center; font-size: 14px;">Нет групповых чатов</div>';
        }
    }

    addChatToList(chat) {
        console.log('➕ Добавление чата в список:', chat);
        const directChatsList = document.getElementById('directChatsList');
        
        // Проверяем, нет ли уже такого чата
        const existingChat = Array.from(directChatsList.children).find(item => 
            item.textContent.includes(chat.name)
        );
        
        if (!existingChat) {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `<span>${chat.name}</span>`;
            chatItem.onclick = () => this.switchChat(chat.id, chat.name);
            directChatsList.appendChild(chatItem);
            console.log(`✅ Добавлен новый чат: ${chat.name}`);
        } else {
            console.log(`ℹ️ Чат уже существует: ${chat.name}`);
        }
    }

    updateOnlineUsers(users) {
        const onlineUsersList = document.getElementById('onlineUsersList');
        const onlineCount = document.getElementById('onlineCount');
        
        onlineUsersList.innerHTML = '';
        onlineCount.textContent = `${users.length} онлайн`;
        
        users.forEach(username => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                <span>${username}</span>
            `;
            onlineUsersList.appendChild(userItem);
        });
    }

    showSystemMessage(text) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    scrollToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.style.background = 'rgba(99, 102, 241, 0.2)';
            setTimeout(() => {
                messageElement.style.background = '';
            }, 2000);
        }
    }

    showMessageMenu(messageId, event) {
        this.selectedMessageId = messageId;
        
        const menu = document.getElementById('messageMenu');
        menu.style.display = 'block';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
    }

    closeMessageMenu() {
        document.getElementById('messageMenu').style.display = 'none';
        this.selectedMessageId = null;
    }

    replyToMessage() {
        if (!this.selectedMessageId) return;
        
        const messageElement = document.querySelector(`[data-message-id="${this.selectedMessageId}"]`);
        if (messageElement) {
            const username = messageElement.querySelector('.message-username').textContent;
            const messageText = messageElement.querySelector('.message-text').textContent;
            
            this.replyToMessageId = this.selectedMessageId;
            this.showReplyPreview(username, messageText);
        }
        
        this.closeMessageMenu();
    }

    showReplyPreview(username, message) {
        const replyPreview = document.getElementById('replyPreview');
        const replyText = replyPreview.querySelector('.reply-text');
        
        replyText.textContent = message;
        replyPreview.style.display = 'block';
    }

    clearReply() {
        this.replyToMessageId = null;
        document.getElementById('replyPreview').style.display = 'none';
    }

    deleteMessage() {
        if (this.selectedMessageId) {
            this.socket.emit('delete_message', { messageId: this.selectedMessageId });
            this.showNotification('Сообщение удалено', 'success');
        }
        this.closeMessageMenu();
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
    }

    showCreateDirectModal() {
        document.getElementById('createDirectModal').style.display = 'flex';
        document.getElementById('contactInput').focus();
    }

    showCreateGroupModal() {
        document.getElementById('createGroupModal').style.display = 'flex';
        document.getElementById('groupNameInput').focus();
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'blue', 'green'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        this.currentTheme = nextTheme;
        document.body.className = `theme-${nextTheme}`;
    }

    addSwipeGestures() {
        let startX = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX) return;
            
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            if (diff > 50) {
                this.toggleSidebar();
            }
        });
        
        document.addEventListener('touchend', () => {
            startX = 0;
        });
    }

    // Методы для отладки
    getOnlineUsers() {
        const onlineList = document.getElementById('onlineUsersList');
        const users = [];
        onlineList.querySelectorAll('.user-item span').forEach(span => {
            users.push(span.textContent);
        });
        return users;
    }

    debugRefreshChats() {
        console.log('🔄 Принудительное обновление чатов');
        this.socket.emit('get_chats_debug');
    }

    debugClearChats() {
        console.log('🧹 Очистка списка чатов...');
        const chatsList = document.getElementById('chatsList');
        const directChatsList = document.getElementById('directChatsList');
        chatsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center;">Нет групповых чатов</div>';
        directChatsList.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center;">Нет личных чатов</div>';
        this.showNotification('Списки чатов очищены', 'info');
    }

    debugShowInfo() {
        const groupChats = document.querySelectorAll('#chatsList .chat-item');
        const directChats = document.querySelectorAll('#directChatsList .chat-item');
        
        console.log('=== ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===');
        console.log('👤 Пользователь:', this.username);
        console.log('📊 Групповые чаты:', groupChats.length);
        groupChats.forEach(chat => console.log('   - ' + chat.textContent));
        console.log('📊 Личные чаты:', directChats.length);
        directChats.forEach(chat => console.log('   - ' + chat.textContent));
        
        this.showNotification(`Чаты: ${groupChats.length} групповых, ${directChats.length} личных`, 'info');
    }

    showNotification(message, type = 'info') {
        // Простая реализация уведомлений
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(`${type.toUpperCase()}: ${message}`);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
const app = new NewGram();

// Глобальные функции для HTML
window.login = () => app.login();
window.switchChat = (chatId, chatName) => app.switchChat(chatId, chatName);
window.createDirectChat = () => app.createDirectChat();
window.createGroupChat = () => app.createGroupChat();
window.showCreateDirectModal = () => app.showCreateDirectModal();
window.showCreateGroupModal = () => app.showCreateGroupModal();
window.closeModal = (modalId) => app.closeModal(modalId);
window.replyToMessage = () => app.replyToMessage();
window.deleteMessage = () => app.deleteMessage();
window.closeMessageMenu = () => app.closeMessageMenu();
window.debugRefreshChats = () => app.debugRefreshChats();
window.debugClearChats = () => app.debugClearChats();
window.debugShowInfo = () => app.debugShowInfo();
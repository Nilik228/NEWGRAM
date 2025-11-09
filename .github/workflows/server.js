const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Создаем папки
const folders = ['uploads/images', 'uploads/videos', 'uploads/music', 'uploads/files', 'data'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, 'uploads/images/');
        } else if (file.mimetype.startsWith('video/')) {
            cb(null, 'uploads/videos/');
        } else if (file.mimetype.startsWith('audio/')) {
            cb(null, 'uploads/music/');
        } else {
            cb(null, 'uploads/files/');
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для загрузки файлов
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    res.json({
        success: true,
        file: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: `/uploads/${req.file.destination.split('/')[1]}/${req.file.filename}`
        }
    });
});

// Функции для работы с сообщениями
function loadMessages(chatId) {
    const filePath = `data/messages-${chatId}.json`;
    try {
        if (fs.existsSync(filePath)) {
            const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
    } catch (error) {
        console.log('Ошибка загрузки сообщений:', error);
    }
    return [];
}

function saveMessage(message, chatId) {
    const filePath = `data/messages-${chatId}.json`;
    const messages = loadMessages(chatId);
    
    message.id = message.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    message.timestamp = message.timestamp || new Date().toISOString();
    
    messages.push(message);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    return message.id;
}

// Хранилища данных
const users = new Map(); // socket.id -> userData
const onlineUsers = new Map(); // username -> socket.id
const chats = new Map(); // chatId -> chatData

// Создаем чаты по умолчанию
const defaultChats = [
    { id: 'general', name: '📢 Общий чат', type: 'group', participants: [] },
    { id: 'music', name: '🎵 Музыка', type: 'group', participants: [] },
    { id: 'games', name: '🎮 Игры', type: 'group', participants: [] }
];

defaultChats.forEach(chat => {
    chats.set(chat.id, chat);
});

// Функция для получения чатов пользователя
function getUserChats(username) {
    console.log(`🔍 Получение чатов для пользователя: ${username}`);
    
    const userChats = Array.from(chats.values()).filter(chat => {
        if (chat.type === 'group') {
            console.log(`   ✅ Групповой чат для всех: ${chat.name}`);
            return true; // Групповые чаты видны всем
        }
        if (chat.type === 'direct') {
            const hasAccess = chat.participants && chat.participants.includes(username);
            console.log(`   ${hasAccess ? '✅' : '❌'} Личный чат "${chat.name}": ${hasAccess} (участники: ${chat.participants ? chat.participants.join(', ') : 'нет'})`);
            return hasAccess;
        }
        return false;
    });
    
    console.log(`📋 Итоговые чаты для ${username}:`, userChats.map(c => c.name));
    return userChats;
}

// Функция обновления чатов пользователя
function updateUserChats(username) {
    const userChats = getUserChats(username);
    const userSocketId = onlineUsers.get(username);
    if (userSocketId) {
        console.log(`🔄 Обновление чатов для ${username}`);
        io.to(userSocketId).emit('chats_list', userChats);
    }
}

function updateOnlineUsers() {
    const onlineList = Array.from(onlineUsers.keys());
    io.emit('online_users', onlineList);
}

function updateChatParticipants(chatId) {
    const participants = Array.from(users.values())
        .filter(user => user.currentChat === chatId)
        .map(user => user.username);
        
    io.to(chatId).emit('chat_participants', {
        chatId: chatId,
        participants: participants
    });
}

io.on('connection', (socket) => {
    console.log('🔗 Новое подключение:', socket.id);

    // Отправляем список чатов при подключении
    socket.emit('chats_list', Array.from(chats.values()));

    socket.on('user_join', (data) => {
        const { username, theme = 'dark' } = data;
        
        // Проверяем уникальность имени
        if (onlineUsers.has(username)) {
            socket.emit('join_error', 'Имя пользователя уже занято');
            return;
        }

        // Сохраняем пользователя
        const userData = {
            username: username,
            socketId: socket.id,
            currentChat: 'general',
            theme: theme
        };
        
        users.set(socket.id, userData);
        onlineUsers.set(username, socket.id);
        socket.username = username;

        // Присоединяем к общему чату
        socket.join('general');
        
        console.log(`✅ ${username} присоединился`);

        // Отправляем историю общего чата
        const messages = loadMessages('general');
        socket.emit('chat_history', {
            chatId: 'general',
            messages: messages
        });

        // ОТПРАВЛЯЕМ ТОЛЬКО ЧАТЫ ЭТОГО ПОЛЬЗОВАТЕЛЯ
        const userChats = getUserChats(username);
        socket.emit('chats_list', userChats);

        // Уведомляем других пользователей
        socket.to('general').emit('user_joined', {
            username: username,
            chatId: 'general'
        });

        // Обновляем списки
        updateOnlineUsers();
        updateChatParticipants('general');
    });

    socket.on('send_message', (data) => {
        const user = users.get(socket.id);
        if (!user) return;

        const message = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            username: user.username,
            message: data.message,
            timestamp: new Date().toISOString(),
            chatId: user.currentChat,
            type: 'text'
        };

        if (data.replyTo) {
            message.replyTo = data.replyTo;
        }

        if (data.file) {
            message.file = data.file;
            message.type = data.file.mimetype.startsWith('image/') ? 'image' : 
                          data.file.mimetype.startsWith('video/') ? 'video' :
                          data.file.mimetype.startsWith('audio/') ? 'audio' : 'file';
        }

        // Сохраняем сообщение
        saveMessage(message, user.currentChat);

        // Отправляем всем в чате
        io.to(user.currentChat).emit('new_message', message);
    });

    socket.on('create_direct_chat', (targetUsername) => {
        const user = users.get(socket.id);
        if (!user) return;

        console.log(`💬 Запрос на создание личного чата от ${user.username} с ${targetUsername}`);

        // Проверяем существует ли пользователь
        if (!onlineUsers.has(targetUsername)) {
            const onlineUsersList = Array.from(onlineUsers.keys());
            socket.emit('error_message', `Пользователь "${targetUsername}" не в сети. Онлайн: ${onlineUsersList.join(', ') || 'нет'}`);
            return;
        }

        if (targetUsername === user.username) {
            socket.emit('error_message', 'Нельзя создать чат с самим собой');
            return;
        }

        // Создаем ID для личного чата (ВАЖНО: сортируем имена)
        const sortedNames = [user.username, targetUsername].sort();
        const chatId = `direct_${sortedNames[0]}_${sortedNames[1]}`;
        
        console.log(`🔧 Создаем/проверяем чат: ${chatId}`);

        let chat = chats.get(chatId);
        if (!chat) {
            chat = {
                id: chatId,
                name: `💬 ${targetUsername}`,
                type: 'direct',
                participants: [user.username, targetUsername],
                createdAt: new Date().toISOString()
            };
            
            chats.set(chatId, chat);
            console.log(`✅ Создан новый личный чат: ${chatId}`);

            // Создаем приветственное сообщение
            saveMessage({
                id: 'system-' + Date.now(),
                username: 'system',
                message: `Личный чат создан между ${user.username} и ${targetUsername}`,
                timestamp: new Date().toISOString(),
                chatId: chatId,
                type: 'system'
            }, chatId);
        }

        // ОБНОВЛЯЕМ ЧАТЫ ТОЛЬКО ДЛЯ УЧАСТНИКОВ
        updateUserChats(user.username);
        updateUserChats(targetUsername);
        
        // Уведомляем создателя
        socket.emit('chat_created', chat);
        
        // Уведомляем второго участника
        const targetSocketId = onlineUsers.get(targetUsername);
        if (targetSocketId) {
            // Для второго участника имя чата должно быть другим
            const targetChat = {
                ...chat,
                name: `💬 ${user.username}`
            };
            io.to(targetSocketId).emit('chat_created', targetChat);
        }
    });

    socket.on('switch_chat', (chatId) => {
        const user = users.get(socket.id);
        if (!user || user.currentChat === chatId) return;

        console.log(`🔄 ${user.username} переключается в ${chatId}`);

        // Проверяем доступ пользователя к чату
        const chat = chats.get(chatId);
        if (!chat) {
            socket.emit('error_message', 'Чат не найден');
            return;
        }

        if (chat.type === 'direct' && !chat.participants.includes(user.username)) {
            socket.emit('error_message', 'Нет доступа к этому чату');
            return;
        }

        // Выходим из текущего чата
        socket.leave(user.currentChat);
        
        // Обновляем пользователя
        user.currentChat = chatId;
        users.set(socket.id, user);
        
        // Входим в новый чат
        socket.join(chatId);

        // Отправляем историю нового чата
        const messages = loadMessages(chatId);
        socket.emit('chat_history', {
            chatId: chatId,
            messages: messages
        });

        // Обновляем участников чата
        updateChatParticipants(chatId);
    });

    socket.on('get_chats_debug', () => {
        const user = users.get(socket.id);
        if (user) {
            const userChats = getUserChats(user.username);
            socket.emit('chats_list', userChats);
            console.log(`🔧 Отладочное обновление чатов для: ${user.username}`);
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const { username, currentChat } = user;

            // Удаляем пользователя
            users.delete(socket.id);
            onlineUsers.delete(username);

            // Уведомляем других
            socket.to(currentChat).emit('user_left', {
                username: username,
                chatId: currentChat
            });

            // Обновляем списки
            updateOnlineUsers();
            updateChatParticipants(currentChat);

            console.log(`❌ ${username} отключился`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});
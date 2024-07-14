const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 
const fetch = require('node-fetch').default;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let room_users = [];

// Conjunto para armazenar IDs de sala existentes
let existingRooms = new Set();

// Configurar para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Definir o tipo de conteúdo para arquivos JavaScript
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Função para importar vídeo da IPFS através do servidor
async function importIPFSVideo(ipfsHash) {
    const url = `https://ipfs.infura.io/ipfs/${ipfsHash}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch IPFS video');
        }
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error.message);
        throw error;
    }
}

// Rota para importar vídeo da IPFS através do servidor
app.get('/ipfs/:hash', async (req, res) => {
    const ipfsHash = req.params.hash;
    try {
        const blob = await importIPFSVideo(ipfsHash);
        res.writeHead(200, {
            'Content-Type': 'video/mp4'
        });
        const stream = blob.stream ? blob.stream() : new ReadableStream(); // Garantir que seja um stream
        stream.pipe(res); // Envie o stream do blob como resposta
    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error.message);
        if (!res.headersSent) {
            res.status(500).send('Erro ao importar vídeo da IPFS'); // Envie um status de erro se houver problema
        }
    }
});

// Armazenamento temporário de informações da sala
let rooms = new Map(); // Mapa para armazenar informações das salas

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join room', ({ roomId, userName }) => {
        console.log(`User joined room ${roomId}: ${userName}`);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userName = userName;

        if (!rooms.has(roomId)) {
            rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
        }

        const room = rooms.get(roomId);

        // Se ainda não houver um admin, designe o usuário atual como admin
        if (!room.admin) {
            room.admin = socket.id;
            socket.emit('you are admin');
        }

        room.users.push({ userId: socket.id, userName: userName });

        // Envie o vídeo atual da sala para o usuário que acabou de se juntar
        socket.emit('current video', room.videoHash);

        io.to(roomId).emit('user joined', room.users, room.admin); // Envie também o admin para todos na sala
    });

    socket.on('remove user', ({ roomId, userId }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.admin) {
            const userToRemove = room.users.find(user => user.userId === userId);
            if (userToRemove) {
                // Emitir mensagem para o chat informando que o usuário foi removido
                io.to(roomId).emit('chat message', {
                    userId: 'server',
                    userName: 'Server',
                    message: `${userToRemove.userName} was removed from this room (ID: ${roomId}).`
                });
    
                // Remover usuário da sala
                io.sockets.sockets.get(userId).leave(roomId);
                room.users = room.users.filter(user => user.userId !== userId);
                io.to(roomId).emit('user left', room.users, room.admin);
            }
        }
    });    
       
    socket.on('chat message', ({ userId, message }) => {
        console.log(`Message from ${userId}: ${message}`);
    
        // Verificar se o usuário ainda está na sala
        const room = rooms.get(socket.roomId);
        if (room && room.users.some(user => user.userId === userId)) {
            // Propagar a mensagem para todos na sala
            io.to(socket.roomId).emit('chat message', { userId: userId, userName: socket.userName, message: message });
        } else {
            console.log(`User ${userId} tried to send a message but is no longer in room ${socket.roomId}`);
            // Ou outra ação apropriada, como ignorar a mensagem ou enviar uma resposta de erro ao usuário
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            room.users = room.users.filter(user => user.userId !== socket.id);
            io.to(socket.roomId).emit('user left', room.users, room.admin);
    
            // Verificar se não há mais usuários na sala
            if (room.users.length === 0) {
                // Remover a sala da lista de salas (rooms)
                rooms.delete(socket.roomId);
                existingRooms.delete(socket.roomId);
                // room_users.find(socket.roomId).then(room_users.pop(),error => console.log(error))
                room.users.length = 0;
                room_users.splice(room_users.findIndex(user => user.room_id === socket.roomId), 1);
                // room.users = []
                // room.users.pop();
                console.log(`Sala ${socket.roomId} foi fechada.`);
            }
        }
    });
    
    // socket.on('create room', ({ roomId, userName }) => {
    //     // Verificar se a sala já existe na coleção rooms
    //     if (!existingRooms.has(roomId)) {
    //         // Se não existir, criar a sala com o usuário que está criando
    //         existingRooms.add(roomId);
    //         rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
    //         socket.emit('room created', { roomId: roomId, userName: userName });
    //         room_users.push({ name: userName, room_id: roomId });
    //     } else {
    //         // Verificar se a sala está vazia (sem usuários)
    //         const room = rooms.get(roomId);
    //         const roomUser = room_users.find(user => user.room_id === roomId);
    
    //         if (!roomUser) {
    //             // Se a sala está vazia, adicionar o usuário que está criando a sala
    //             existingRooms.add(roomId);
    //             room.users.push({ id: socket.id, name: userName });
    //             socket.emit('room created', { roomId: roomId, userName: userName });
    //             room_users.push({ name: userName, room_id: roomId });
    //         } else {
    //             // Se houver usuários na sala, emitir falha na criação da sala
    //             socket.emit('room creation failed', { message: 'A sala já existe e possui usuários. Por favor, escolha outro ID.' });
    //         }
    //     }
    // });

    socket.on('create room', ({ roomId, userName }) => {
        // Verificar se a sala já existe na coleção rooms
        if (!existingRooms.has(roomId)) {
            // Se não existir, criar a sala com o usuário que está criando
            existingRooms.add(roomId);
            rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
            socket.emit('room created', { roomId: roomId, userName: userName });
            room_users.push({ name: userName, room_id: roomId });
        } else {
            // Verificar se a sala está vazia (sem usuários)
            const room = rooms.get(roomId);
            const roomUser = room_users.find(user => user.room_id === roomId);

            console.log('else users: '+ room.users)
            console.log('else users: '+ room.users.length)
            console.log('else users: '+ room) // [Object Object]
            console.log('else users: '+ room.user) // [Object Object]
        
            if (!roomUser) {
                // Se a sala está vazia, adicionar o usuário que está criando a sala
                existingRooms.add(roomId);
                room.users.push({ id: socket.id, name: userName });
                socket.emit('room created', { roomId: roomId, userName: userName });
                room_users.push({ name: userName, room_id: roomId });
            } else {
                // debug
                console.log(room.users.length)
                console.log(room.users)
                // Se houver usuários na sala, emitir falha na criação da sala
                socket.emit('room creation failed', { message: 'A sala já existe e possui usuários. Por favor, escolha outro ID.' });
            }
        }
    });

    // Evento para criar uma nova sala
    // socket.on('create room', ({ roomId, userName }) => {
    //     if (existingRooms.has(roomId)) {
    //         socket.emit('room creation failed', { message: 'ID da sala já existe. Por favor, escolha outro ID.' });
    //     } else {
    //         existingRooms.add(roomId);
    //         rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
    //         socket.emit('room created', { roomId: roomId, userName: userName });
    //     }
    // });    

    socket.on('video sync', (data) => {
        console.log('Received video sync message:', data);
        const room = rooms.get(socket.roomId);
        if (room && room.users.some(user => user.userId === socket.id)) {
            io.to(socket.roomId).emit('video sync', data);
            console.log('Forwarded video sync message to all clients');
        } else {
            console.log(`User ${socket.id} tried to sync video but is no longer in room ${socket.roomId}`);
        }
    });

    socket.on('video imported', async ({ roomId, ipfsHash }) => {
        console.log(`Video imported in room ${roomId}: ${ipfsHash}`);
        try {
            const blob = await importIPFSVideo(ipfsHash);
            if (rooms.has(roomId)) {
                rooms.get(roomId).videoHash = ipfsHash;
            }
            io.to(roomId).emit('video imported', { ipfsHash });
        } catch (error) {
            console.error('Erro ao importar vídeo da IPFS:', error.message);
            io.to(roomId).emit('chat message', {
                userId: 'server',
                userName: 'Server',
                message: `Não foi possível importar o vídeo da IPFS: ${error.message}. Certifique-se de que o IPFS está ligado.`
            });
        }
    });


    // Evento para solicitar entrada na sala
    socket.on('request join room', ({ roomId, userName }) => {
        console.log(`User requested to join room ${roomId}: ${userName}`);
        const room = rooms.get(roomId);
        if (room) {
            socket.userName = userName;  // Armazene o nome do usuário temporariamente
            io.to(room.admin).emit('join request', { userId: socket.id, userName: userName });
        } else {
            socket.emit('join room failed', { message: 'Room does not exist.' });
        }
    });   

    // Evento para aprovar ou rejeitar a entrada na sala
    socket.on('respond join request', ({ roomId, userId, approve }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.admin) {
            const userSocket = io.sockets.sockets.get(userId);
            if (userSocket) {
                if (approve) {
                    userSocket.join(roomId);
                    userSocket.roomId = roomId;
    
                    // Atribua o nome do usuário do socket temporário armazenado
                    const userName = userSocket.userName || 'Usuário Desconhecido';
                    
                    // Adicione o usuário à lista de usuários da sala
                    room.users.push({ userId: userId, userName: userName });
                    userSocket.emit('join room approved', { roomId: roomId, userName: userName });
    
                    io.to(roomId).emit('user joined', room.users, room.admin);
                } else {
                    io.to(userId).emit('join room rejected', { message: 'Your request to join the room was rejected.' });
                }
            }
        }
    });      
    
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

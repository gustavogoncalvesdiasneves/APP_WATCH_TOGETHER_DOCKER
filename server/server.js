const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 
const fetch = require('node-fetch').default;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
        }
    });

    // Evento para criar uma nova sala
    socket.on('create room', ({ roomId, userName }) => {
        if (existingRooms.has(roomId)) {
            socket.emit('room creation failed', { message: 'ID da sala já existe. Por favor, escolha outro ID.' });
        } else {
            existingRooms.add(roomId);
            rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
            socket.emit('room created', { roomId: roomId, userName: userName });
        }
    });

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
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

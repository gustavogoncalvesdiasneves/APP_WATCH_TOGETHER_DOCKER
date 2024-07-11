import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Novo usuário conectado');

    socket.on('createRoom', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { users: {} };
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            console.log(`Nova sala criada: ${roomId}`);
        }
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            console.log(`Usuário entrou na sala: ${roomId}`);
        } else {
            socket.emit('roomNotFound');
        }
    });

    socket.on('syncVideo', (roomId, currentTime) => {
        socket.to(roomId).emit('videoSynced', currentTime);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
        for (const roomId in rooms) {
            if (rooms[roomId].users[socket.id]) {
                delete rooms[roomId].users[socket.id];
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor Socket.IO rodando na porta ${PORT}`);
});

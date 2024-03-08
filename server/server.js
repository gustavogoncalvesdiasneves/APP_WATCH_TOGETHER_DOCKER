// server.js

const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer();
const io = new socketIo.Server(server, {
    cors: {
        // origin: 'http://127.0.0.1:8080/RAVE/'
        origin: 'http://localhost:3000'
    }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
    console.log('Novo usuário conectado');

    // Evento para criar uma nova sala
    socket.on('createRoom', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { users: {} };
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            console.log(`Nova sala criada: ${roomId}`);
        }
    });

    // Evento para entrar em uma sala existente
    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
            console.log(`Usuário entrou na sala: ${roomId}`);
        } else {
            socket.emit('roomNotFound');
        }
    });

    // Evento para sincronizar a reprodução do vídeo
    socket.on('syncVideo', (roomId, currentTime) => {
        socket.to(roomId).emit('videoSynced', currentTime);
    });

    // Evento para desconectar
    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
        // Remova o usuário da sala quando ele se desconectar
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

module.exports = io;
// export { io };




/* #region  Backup */

// // const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');

// // const app = express();
// // const server = http.createServer(app);
// const server = http.createServer();
// // const io = socketIo(server);
// const io = new socketIo.Server(server, {
//     cors: {
//         origin: 'http://127.0.0.1:8080/RAVE/'
//         // origin: 'http://127.0.0.1:3000'
//     }
// })

// const PORT = process.env.PORT || 3001;

// // Estrutura para armazenar as salas e os usuários nelas
// const rooms = {};

// io.on('connection', (socket) => {
//     console.log('Novo usuário conectado');

//     // Evento para criar uma nova sala
//     socket.on('createRoom', (roomId) => {
//         if (!rooms[roomId]) {
//             rooms[roomId] = { users: {} };
//             socket.join(roomId);
//             socket.emit('roomCreated', roomId);
//             console.log(`Nova sala criada: ${roomId}`);
//         }
//     });

//     // Evento para entrar em uma sala existente
//     socket.on('joinRoom', (roomId) => {
//         if (rooms[roomId]) {
//             socket.join(roomId);
//             socket.emit('roomJoined', roomId);
//             console.log(`Usuário entrou na sala: ${roomId}`);
//         } else {
//             socket.emit('roomNotFound');
//         }
//     });

//     // Evento para sincronizar a reprodução do vídeo
//     socket.on('syncVideo', (roomId, currentTime) => {
//         socket.to(roomId).emit('videoSynced', currentTime);
//     });

//     // Evento para desconectar
//     socket.on('disconnect', () => {
//         console.log('Usuário desconectado');
//         // Remova o usuário da sala quando ele se desconectar
//         for (const roomId in rooms) {
//             if (rooms[roomId].users[socket.id]) {
//                 delete rooms[roomId].users[socket.id];
//                 break;
//             }
//         }
//     });
// });

// server.listen(PORT, () => {
//     console.log(`Servidor Socket.IO rodando na porta ${PORT}`);
// });

// module.exports = { io, server };
/* #endregion */
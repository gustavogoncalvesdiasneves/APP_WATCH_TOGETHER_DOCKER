const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configurando para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Definindo o tipo de conteúdo para arquivos JavaScript
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Lista de usuários conectados
let users = {};

io.on('connection', (socket) => {
    // Quando um usuário se conecta
    console.log(`Usuário conectado: ${socket.id}`);

    // Evento para receber mensagens de chat
    socket.on('chat message', (msg) => {
        console.log(`Mensagem recebida de ${socket.id}: ${msg}`);
        io.emit('chat message', { userId: socket.id, message: msg });
    });

    // Quando um usuário desconecta
    socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
        delete users[socket.id];
        io.emit('user disconnected', { userId: socket.id });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

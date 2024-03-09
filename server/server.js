const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// let authorizedClientId = '123456'; // ID autorizado para controlar o vídeo

// Configurando para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    index: false,  // Para evitar que o servidor tente servir automaticamente um arquivo index.html
}));


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

io.on('connection', (socket) => {
    // let clientId = ''; // Armazenar o ID do cliente atual

    // socket.on('set client id', (id) => {
    //     clientId = id; // Definir o ID do cliente atual
    //     console.log('Client ID set:', clientId);
    // });

    socket.on('video sync', (data) => {
        console.log('Received video sync message:', data);
        
        // Repassar a mensagem de sincronização para todos os clientes conectados
        io.emit('video sync', data);
        console.log('Forwarded video sync message to all clients');
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

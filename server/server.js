const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 
const fetch = require('node-fetch').default;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
        blob.stream.pipe(res); // Envie o stream do blob como resposta
    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error.message);
        res.status(500).send('Erro ao importar vídeo da IPFS'); // Envie um status de erro se houver problema
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
            rooms.set(roomId, []);
        }
        rooms.get(roomId).push({ userId: socket.id, userName: userName });
        io.to(roomId).emit('user joined', rooms.get(roomId));
    });

    socket.on('chat message', ({ userId, message }) => {
        console.log(`Message from ${userId}: ${message}`);
        io.to(socket.roomId).emit('chat message', { userId: userId, userName: socket.userName, message: message });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (socket.roomId && rooms.has(socket.roomId)) {
            rooms.set(socket.roomId, rooms.get(socket.roomId).filter(user => user.userId !== socket.id));
            io.to(socket.roomId).emit('user left', rooms.get(socket.roomId));
        }
    });

    // Event listeners for video synchronization (play, pause, seek)
    // Implement as needed based on previous setup
    socket.on('video sync', (data) => {
        console.log('Received video sync message:', data);
        
        // Repassar a mensagem de sincronização para todos os clientes conectados
        io.emit('video sync', data);
        console.log('Forwarded video sync message to all clients');
    });

    socket.on('video imported', (data) => {
        socket.to(socket.roomId).emit('video imported', data);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

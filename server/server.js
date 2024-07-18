const express = require('express');
const os = require('os');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path'); 
const fetch = require('node-fetch').default;
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Path to the uploads directory
const uploadDir = path.join(__dirname, 'uploads');

// Checks if the uploads directory exists, otherwise creates it
(async () => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error('Error creating uploads directory:', err);
    }
  })();

// Função para limpar a pasta de uploads
async function clearUploadsFolder() {
    try {
      const files = await fs.readdir(uploadDir);
      const unlinkPromises = files.map(file => fs.unlink(path.join(uploadDir, file)));
      await Promise.all(unlinkPromises);
    } catch (err) {
      console.error('Error clearing uploads folder:', err);
    }
  };

// Configure multer to handle file uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
      await clearUploadsFolder(); // Clear the uploads folder before saving the new file
      cb(null, uploadDir); // directory where the files will be stored
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // keep the original file name
    }
  });
  

const upload = multer({ storage: storage });

// Route to handle file upload
app.post('/upload', upload.single('videoFile'), async (req, res) => {
    if (req.file) {
      console.log('File received:', req.file);
      console.log('Saved file path:', req.file.path);
      const videoUrl = `/uploads/${req.file.filename}`; // Build the video URL
      io.emit('video imported', { localPath: videoUrl }); // Sends the video URL to all connected users
      res.json({ message: 'File received successfully.', videoUrl: videoUrl });
    } else {
      console.error('Error: File not received.');
      res.status(400).json({ message: 'Error: File not received.' });
    }
  });

// Serve static files from 'uploads' folder
app.use('/uploads', express.static(uploadDir));

// Function to get ip local
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                continue;
            }
            return iface.address;
        }
    }
    return '127.0.0.1';
}

const localIP = getLocalIPAddress();

let room_users = [];

// Set for storing existing room IDs
let existingRooms = new Set();

// Configure to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set the content type for JavaScript files
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
  


// Function to import video from IPFS through the server
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
        console.error('Error importing video from IPFS:', error.message);
        throw error;
    }
}

// Route to import video from IPFS through the server
app.get('/ipfs/:hash', async (req, res) => {
    const ipfsHash = req.params.hash;
    try {
        const blob = await importIPFSVideo(ipfsHash);
        res.writeHead(200, {
            'Content-Type': 'video/mp4'
        });
        const stream = blob.stream ? blob.stream() : new ReadableStream(); // Make sure it's a stream
        stream.pipe(res); // Send the blob stream as a response
    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error.message);
        if (!res.headersSent) {
            res.status(500).send('Erro ao importar vídeo da IPFS'); // Send an error status if there is a problem
        }
    }
});

// Temporary storage of room information
let rooms = new Map(); // Map to store room information

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

        // If there is not already an admin, designate the current user as admin
        if (!room.admin) {
            room.admin = socket.id;
            socket.emit('you are admin');
        }

        room.users.push({ userId: socket.id, userName: userName });

        // Send the current room video to the user who just joined
        socket.emit('current video', room.videoHash);

        io.to(roomId).emit('user joined', room.users, room.admin); // Also send the admin to everyone in the room
    });

    socket.on('remove user', ({ roomId, userId }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.admin) {
            const userToRemove = room.users.find(user => user.userId === userId);
            if (userToRemove) {
                io.to(roomId).emit('chat message', {
                    userId: 'server',
                    userName: 'Server',
                    message: `${userToRemove.userName} was removed from this room (ID: ${roomId}).`
                });
    
                // Remove user from room
                io.sockets.sockets.get(userId).leave(roomId);
                room.users = room.users.filter(user => user.userId !== userId);
                io.to(roomId).emit('user left', room.users, room.admin);
            }
        }
    });    
       
    socket.on('chat message', ({ userId, message }) => {
        console.log(`Message from ${userId}: ${message}`);
    
        // Check if the user is still in the room
        const room = rooms.get(socket.roomId);
        if (room && room.users.some(user => user.userId === userId)) {
            io.to(socket.roomId).emit('chat message', { userId: userId, userName: socket.userName, message: message });
        } else {
            console.log(`User ${userId} tried to send a message but is no longer in room ${socket.roomId}`);
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

    socket.on('create room', ({ roomId, userName }) => {
        // Check if the room already exists in the rooms collection
        if (!existingRooms.has(roomId)) {
            // If it does not exist, create the room with the user who is creating it
            existingRooms.add(roomId);
            rooms.set(roomId, { users: [], videoHash: null, admin: socket.id });
            socket.emit('room created', { roomId: roomId, userName: userName });
            room_users.push({ name: userName, room_id: roomId });
        } else {
            // Check if the room is empty (no users)
            const room = rooms.get(roomId);
            const roomUser = room_users.find(user => user.room_id === roomId);
            
            // debug
            // console.log('else users: '+ room.users)
            // console.log('else users: '+ room.users.length)
            // console.log('else users: '+ room) // [Object Object]
            // console.log('else users: '+ room.user) // [Object Object]
        
            if (!roomUser) {
                // If the room is empty, add the user who is creating the room
                existingRooms.add(roomId);
                room.users.push({ id: socket.id, name: userName });
                socket.emit('room created', { roomId: roomId, userName: userName });
                room_users.push({ name: userName, room_id: roomId });
            } else {
                // debug
                // console.log(room.users.length)
                // console.log(room.users)

                // If there are users in the room, issue room creation failure
                socket.emit('room creation failed', { message: 'The room already exists and has users. Please choose another ID.' });
            }
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

    socket.on('local video imported', ({ roomId, videoUrl }) => {
        console.log(`Local video imported in room ${roomId}: ${videoUrl}`);
        if (rooms.has(roomId)) {
            rooms.get(roomId).videoUrl = videoUrl;
        }
        io.to(roomId).emit('local video imported', { videoUrl });
    });

    socket.on('video imported', async ({ roomId, ipfsHash, localPath }) => {
        if (ipfsHash) {
            console.log(`Video imported in room ${roomId}: ${ipfsHash}`);
            try {
                const blob = await importIPFSVideo(ipfsHash);
                if (rooms.has(roomId)) {
                    rooms.get(roomId).videoHash = ipfsHash;
                }
                io.to(roomId).emit('video imported', { ipfsHash });
            } catch (error) {
                console.error('Error importing video from IPFS:', error.message);
                io.to(roomId).emit('chat message', {
                    userId: 'server',
                    userName: 'Server',
                    message: `Unable to import video from IPFS: ${error.message}. Make sure IPFS is turned on.`
                });
            }
        } else if (localPath) {
            console.log(`Video imported in room ${roomId}: ${localPath}`);
            if (rooms.has(roomId)) {
                rooms.get(roomId).videoHash = localPath;
            }
            io.to(roomId).emit('video imported', { localPath });
        }
    }); 

    // socket.on('video imported', async ({ roomId, ipfsHash, localPath }) => {
    //     if (ipfsHash) {
    //         console.log(`Video imported in room ${roomId}: ${ipfsHash}`);
    //         try {
    //             const blob = await importIPFSVideo(ipfsHash);
    //             if (rooms.has(roomId)) {
    //                 rooms.get(roomId).videoHash = ipfsHash;
    //             }
    //             io.to(roomId).emit('video imported', { ipfsHash });
    //         } catch (error) {
    //             console.error('Error importing video from IPFS:', error.message);
    //             io.to(roomId).emit('chat message', {
    //                 userId: 'server',
    //                 userName: 'Server',
    //                 message: `Unable to import video from IPFS: ${error.message}. Make sure IPFS is turned on.`
    //             });
    //         }
    //     } else if (localPath) {
    //         console.log(`Video imported in room ${roomId}: ${localPath}`);
    //         if (rooms.has(roomId)) {
    //             rooms.get(roomId).videoHash = localPath;
    //         }
    //         io.to(roomId).emit('video imported', { localPath });
    //     }
    // });

    // Event to request entry to the room
    socket.on('request join room', ({ roomId, userName }) => {
        console.log(`User requested to join room ${roomId}: ${userName}`);
        const room = rooms.get(roomId);
        if (room) {
            socket.userName = userName;  // Store username temporarily
            io.to(room.admin).emit('join request', { userId: socket.id, userName: userName });
        } else {
            socket.emit('join room failed', { message: 'Room does not exist.' });
        }
    });   

    // Event to approve or reject entry into the room
    socket.on('respond join request', ({ roomId, userId, approve }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.admin) {
            const userSocket = io.sockets.sockets.get(userId);
            if (userSocket) {
                if (approve) {
                    userSocket.join(roomId);
                    userSocket.roomId = roomId;
    
                    // Assign the stored temporary socket username
                    const userName = userSocket.userName || 'Unknown User';
                    
                    // Add the user to the room's user list
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
    console.log(`Server is running. Access it at http://${localIP}:3000 (warning! this ip is from docker)`);
    console.log(`Type in your Terminal Linux "ip addr" or "if config" on Windows in CMD "ip config"`);
    // console.log('listening on *:3000');
});

var socket = io();
var video = document.getElementById('video');
var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var roomId;
var userName;
var lastSentTime = 0;

function importVideo() {
    fileInput.click();
}

socket.on('video imported', ({ ipfsHash }) => {
    const url = `http://192.168.1.71:3000/ipfs/${ipfsHash}`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch IPFS video');
            }
            return response.blob();
        })
        .then(blob => {
            const video = document.getElementById('video');
            video.src = URL.createObjectURL(blob);
        })
        .catch(error => {
            console.error('Erro ao importar vídeo da IPFS:', error.message);
        });
});

socket.on('current video', (ipfsHash) => {
    if (ipfsHash) {
        const url = `http://192.168.1.71:3000/ipfs/${ipfsHash}`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch IPFS video');
                }
                return response.blob();
            })
            .then(blob => {
                const video = document.getElementById('video');
                video.src = URL.createObjectURL(blob);
            })
            .catch(error => {
                console.error('Erro ao importar vídeo da IPFS:', error.message);
            });
    }
});

async function importIPFSVideo() {
    const ipfsHash = prompt('Enter IPFS hash of the video:'); // Você pode ajustar para obter o hash de outra forma
    if (ipfsHash) {
        const url = `http://192.168.1.71:3000/ipfs/${ipfsHash}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch IPFS video');
            }
            const blob = await response.blob();
            const video = document.getElementById('video');
            video.src = URL.createObjectURL(blob);
            socket.emit('video imported', { roomId: roomId, ipfsHash }); // Emite evento para todos na sala
        } catch (error) {
            console.error('Erro ao importar vídeo da IPFS:', error.message);
        }
    }
}

function loadVideo(event) {
    var file = event.target.files[0];
    var url = URL.createObjectURL(file);
    video.src = url;
    video.load();

    // Enviar a URL do vídeo para todos na sala
    socket.emit('video imported', { url: url });

    // Garantir que o vídeo seja reproduzido no celular
    video.addEventListener('loadeddata', function() {
        video.play();
    }, { once: true });
}

if (video) {
    // Adicionar ouvintes de evento somente se o elemento de vídeo existir
    // Enviar mensagem quando o vídeo é reproduzido
    video.addEventListener('play', function() {
        console.log('Play event triggered');
        socket.emit('video sync', { action: 'play', currentTime: video.currentTime});
    });

    // Enviar mensagem quando o vídeo é pausado
    video.addEventListener('pause', function() {
        console.log('Pause event triggered');
        socket.emit('video sync', { action: 'pause', currentTime: video.currentTime});
    });

    // Enviar mensagem quando o vídeo é avançado ou retrocedido
    video.addEventListener('seeked', function() {
        console.log('Seek event triggered');
        var currentTime = video.currentTime;
        if (Math.abs(currentTime - lastSentTime) > 0.5) { // Only send if there's a significant change
            console.log('Sending seek message:', currentTime);
            socket.emit('video sync', { action: 'seek', currentTime: currentTime});
            lastSentTime = currentTime;
        }
    });
    // Receber mensagens de sincronização do servidor
    socket.on('video sync', function(data) {
        console.log('Received video sync message:', data);
        // if (data.clientId === clientIdInput.value) {
            switch(data.action) {
                case 'play':
                    // Sincronizar a reprodução e a posição de reprodução
                    console.log('Play action received');
                    video.currentTime = data.currentTime;
                    video.play();
                    break;
                case 'pause':
                    // Sincronizar a pausa e a posição de reprodução
                    console.log('Pause action received');
                    video.currentTime = data.currentTime;
                    video.pause();
                    break;
                case 'seek':
                    // Sincronizar a posição de reprodução com base na mensagem de busca recebida
                    console.log('Seek action received');
                    video.currentTime = data.currentTime;
                    break;
            }
        // }
    });

}

function createRoom() {
    var roomIdInput = document.getElementById('roomId');
    var creatorNameInput = document.getElementById('creatorName');
    roomId = roomIdInput.value;
    userName = creatorNameInput.value + " - Admin";
    document.getElementById('createRoom').style.display = 'none';
    document.getElementById('joinRoom').style.display = 'none';
    document.getElementById('videoContainer').style.display = 'block';
    document.getElementById('messages').style.display = 'block';
    document.getElementById('form').style.display = 'block';
    socket.emit('join room', { roomId: roomId, userName: userName });
}

function joinRoom() {
    var roomIdJoinInput = document.getElementById('roomIdJoin');
    var userNameJoinInput = document.getElementById('userNameJoin');
    roomId = roomIdJoinInput.value;
    userName = userNameJoinInput.value;
    document.getElementById('createRoom').style.display = 'none';
    document.getElementById('joinRoom').style.display = 'none';
    document.getElementById('videoContainer').style.display = 'block';
    document.getElementById('messages').style.display = 'block';
    document.getElementById('form').style.display = 'block';
    socket.emit('join room', { roomId: roomId, userName: userName });
}

window.onload = function() {
    const storedVideoUrl = localStorage.getItem('videoUrl');
    if (storedVideoUrl) {
        video.src = storedVideoUrl;
    }
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', { userId: socket.id, message: input.value });
        input.value = '';
    }
});

socket.on('chat message', function(data) {
    console.log('Received message:', data); // Adicionado para depuração
    var item = document.createElement('li');
    item.textContent = data.userName + ": " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// Event listeners for video synchronization (play, pause, seek)
// Implement as needed based on previous setup
// Evento para receber mensagens de outros eventos do vídeo (play, pause, seek)
socket.on('video sync', function(data) {
    console.log('Received video sync message:', data);
    var video = document.getElementById('video');
    switch(data.action) {
        case 'play':
            video.currentTime = data.currentTime;
            video.play();
            break;
        case 'pause':
            video.currentTime = data.currentTime;
            video.pause();
            break;
        case 'seek':
            video.currentTime = data.currentTime;
            break;
    }
});

// Evento para notificar quando um usuário entra na sala
socket.on('user joined', function(data) {
    var item = document.createElement('li');
    item.textContent = data.userName + " joined the room";
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// Evento para notificar quando um usuário sai da sala
socket.on('user left', function(data) {
    var item = document.createElement('li');
    item.textContent = data.userName + " left the room";
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

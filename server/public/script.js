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

async function importIPFSVideo() {
    try {
        const response = await fetch('/ipfs/QmNPHAaSs8hafQu2zP4APSRbUYAPNot1gUeAocaA3HH4BT');
        if (!response.ok) {
            throw new Error('Failed to fetch IPFS video');
        }
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        video.src = videoUrl;
    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error);
    }
}

// Importar vídeo da IPFS usando ipfs-http-client
async function importIPFSVideoV1() {
    try {
        // CID do vídeo na IPFS
        const ipfsCid = 'QmNPHAaSs8hafQu2zP4APSRbUYAPNot1gUeAocaA3HH4BT';

        // URL da gateway IPFS
        // const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsCid}`;
        // const ipfsGatewayUrl = `https://cloudflare-ipfs.com/ipfs/${ipfsCid}`;
        const ipfsGatewayUrl = `https://ipfs.infura.io/ipfs/${ipfsCid}`;

        // Obter dados do vídeo da IPFS
        const response = await fetch(ipfsGatewayUrl);
        const blob = await response.blob();

        // Criar URL local para o vídeo
        const videoUrl = URL.createObjectURL(blob);

        // Carregar vídeo na interface
        video.src = videoUrl;
        video.load();

        // Exemplo de sincronização com o servidor
        socket.emit('video sync', { action: 'play', currentTime: video.currentTime });

    } catch (error) {
        console.error('Erro ao importar vídeo da IPFS:', error);
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
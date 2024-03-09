var socket = io();
var video = document.getElementById('video');

// Enviar mensagem quando o vídeo é reproduzido
video.addEventListener('play', function() {
    socket.emit('video sync', { action: 'play', currentTime: video.currentTime });
});

// Enviar mensagem quando o vídeo é pausado
video.addEventListener('pause', function() {
    socket.emit('video sync', { action: 'pause', currentTime: video.currentTime });
});

// Enviar mensagem quando o vídeo é avançado ou retrocedido
video.addEventListener('seeked', function() {
    socket.emit('video sync', { action: 'seek', currentTime: video.currentTime });
});

// Receber mensagens de sincronização do servidor
socket.on('video sync', function(data) {
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

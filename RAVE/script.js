const socket = io();

const video = document.getElementById('video');

socket.on('play', () => {
    video.play();
});

socket.on('pause', () => {
    video.pause();
});

video.addEventListener('play', () => {
    socket.emit('play');
});

video.addEventListener('pause', () => {
    socket.emit('pause');
});

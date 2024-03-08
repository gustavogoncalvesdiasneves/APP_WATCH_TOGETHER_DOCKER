// socket.js

import { io } from "https://cdn.socket.io/4.7.4/socket.io.esm.min.js";

export const socket = io();

// // Evento para sincronizar a reprodução do vídeo
// document.getElementById('video-player').addEventListener('timeupdate', () => {
//     const currentTime = document.getElementById('video-player').currentTime;
//     socket.emit('syncVideo', roomId, currentTime);
// });

// // Evento para sincronizar a reprodução do vídeo com outros usuários
// socket.on('videoSynced', (currentTime) => {
//     document.getElementById('video-player').currentTime = currentTime;
// });

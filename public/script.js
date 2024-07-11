// // script.js

// import { io } from "../server/server.js";

// const socketIo = io();


// // Define a classe RoomController que encapsula as funções
// class RoomController {
//     createRoom() {
//         const roomId = document.getElementById('roomId').value;
//         socketIo.emit('createRoom', roomId);
//         console.log("cratedRoom: ")
//     }

//     joinRoom() {
//         const roomId = document.getElementById('joinRoomId').value;
//         socketIo.emit('joinRoom', roomId);
//         console.log("joinedRoom: ")
//     }
// }

// // Instancia um objeto da classe RoomController
// const roomController = new RoomController();

// // Adiciona os event listeners após o carregamento do documento
// document.addEventListener('DOMContentLoaded', function() {
//     // Adiciona o event listener createRoom ao botão createRoom
//     document.getElementById("createRoom").addEventListener('click', roomController.createRoom);

//     // Adiciona o event listener joinRoom ao botão joinRoom
//     document.getElementById("joinRoom").addEventListener('click', roomController.joinRoom);

//     // Evento para sincronizar a reprodução do vídeo
//     document.getElementById('video-player').addEventListener('timeupdate', () => {
//         const currentTime = document.getElementById('video-player').currentTime;
//         socketIo.emit('syncVideo', roomId, currentTime);
//     });

//     // Evento para sincronizar a reprodução do vídeo com outros usuários
//     socketIo.on('videoSynced', (currentTime) => {
//         document.getElementById('video-player').currentTime = currentTime;
//     });
// });

import { io } from "../server/server.mjs";

const socketIo = io();

class RoomController {
    createRoom() {
        const roomId = document.getElementById('roomId').value;
        socketIo.emit('createRoom', roomId);
        console.log("cratedRoom: ");
    }

    joinRoom() {
        const roomId = document.getElementById('joinRoomId').value;
        socketIo.emit('joinRoom', roomId);
        console.log("joinedRoom: ");
    }
}

const roomController = new RoomController();

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("createRoom").addEventListener('click', roomController.createRoom);
    document.getElementById("joinRoom").addEventListener('click', roomController.joinRoom);

    const videoPlayer = document.getElementById('video-player');
    videoPlayer.addEventListener('timeupdate', () => {
        const currentTime = videoPlayer.currentTime;
        socketIo.emit('syncVideo', roomId, currentTime);
    });

    socketIo.on('videoSynced', (currentTime) => {
        videoPlayer.currentTime = currentTime;
    });
});

var socket = io();
var video = document.getElementById('video');
var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var userListContainer = document.getElementById('userListContainer');
var userList = document.getElementById('userList');
var isAdmin = false;
var isRemoved = false;
var adminNotification = document.getElementById('adminNotification');

var roomId;
var userName;
var lastSentTime = 0;

function showPopUpDonate(){
    document.getElementById('pop_up_donate').style.display = 'block';
    document.getElementById('donationContainer').style.display = 'flex';
    document.getElementById('donationContainer').style.flexDirection = 'column';
}

function showDonationInfo(method) {
    const donationDetails = document.getElementById('donationDetails');
    switch (method) {
        case 'btc':
            donationDetails.textContent = 'Address BTC: bc1qyn3lgy9equ6lw6dkjzaay4nrat8ffjzvvsf9m2';
            break;
        case 'eth':
            donationDetails.textContent = 'Address ETH: 0xF2396dF3d9945826E7cfE9f796da26740A1E22FC';
            break;
        case 'bnb':
            donationDetails.textContent = 'Address BNB (BNB Smart Chain): 0xF2396dF3d9945826E7cfE9f796da26740A1E22FC';
            break;
        case 'usdt':
            donationDetails.textContent = 'Address USDT (BEP-20): 0xF2396dF3d9945826E7cfE9f796da26740A1E22FC';
            break;
        default:
            donationDetails.textContent = '';
            break;
    }
    document.getElementById('donationInfo').style.display = 'block';
}

function hideDonationInfo() {
    document.getElementById('donationInfo').style.display = 'none';
}

function closePopUpDonate(){
    document.getElementById('pop_up_donate').style.display = 'none';
    document.getElementById('donationContainer').style.display = 'none';
}

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
            console.error('Error importing video from IPFS:', error.message);
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
                console.error('Error importing video from IPFS:', error.message);
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
            console.error('Error importing video from IPFS:', error.message);
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

// Adicionar verificação antes de enviar comandos de vídeo
if (video) {
    video.addEventListener('play', function() {
        if (!isRemoved) {
            console.log('Play event triggered');
            socket.emit('video sync', { action: 'play', currentTime: video.currentTime });
        }
    });

    video.addEventListener('pause', function() {
        if (!isRemoved) {
            console.log('Pause event triggered');
            socket.emit('video sync', { action: 'pause', currentTime: video.currentTime });
        }
    });

    video.addEventListener('seeked', function() {
        if (!isRemoved) {
            console.log('Seek event triggered');
            var currentTime = video.currentTime;
            if (Math.abs(currentTime - lastSentTime) > 0.5) { // Only send if there's a significant change
                console.log('Sending seek message:', currentTime);
                socket.emit('video sync', { action: 'seek', currentTime: currentTime });
                lastSentTime = currentTime;
            }
        }
    });

    // Receber mensagens de sincronização do servidor
    socket.on('video sync', function(data) {
        if (!isRemoved) {
            console.log('Received video sync message:', data);
            switch(data.action) {
                case 'play':
                    console.log('Play action received');
                    video.currentTime = data.currentTime;
                    video.play();
                    break;
                case 'pause':
                    console.log('Pause action received');
                    video.currentTime = data.currentTime;
                    video.pause();
                    break;
                case 'seek':
                    console.log('Seek action received');
                    video.currentTime = data.currentTime;
                    break;
            }
        }
    });
}

function createRoom() {

    console.log(userList)
    
    socket.emit('create room', { roomId: roomId, userName: userName });

    socket.on('room created', function(data) {
        console.log('Room Created:', data.roomId);
        var roomIdInput = document.getElementById('roomId');
        var creatorNameInput = document.getElementById('creatorName');
        roomId = roomIdInput.value;
        userName = creatorNameInput.value + " - Admin";
        document.getElementById('roomIDDisplay').textContent = roomId;
        document.getElementById('createRoom').style.display = 'none';
        document.getElementById('joinRoom').style.display = 'none';
        document.getElementById('videoContainer').style.display = 'block';
        document.getElementById('messages').style.display = 'block';
        document.getElementById('form').style.display = 'block';
        document.getElementById('userListContainer').style.display = 'block';
        document.getElementById('donateIcon').style.display = 'block';
        // document.getElementById('pop_up_donate').style.display = 'block';
        // document.getElementById('messages').innerHTML += `<p>Room ${roomId} created successfully by ${userName}.</p>`;
        socket.emit('join room', { roomId: roomId, userName: userName });
    });

    socket.on('room creation failed', function(data) {
        alert(data.message);
    });
}

function joinRoom() {
    var roomIdJoinInput = document.getElementById('roomIdJoin');
    var userNameJoinInput = document.getElementById('userNameJoin');
    roomId = roomIdJoinInput.value;
    userName = userNameJoinInput.value;
    document.getElementById('roomIDDisplay').textContent = roomId;
    document.getElementById('createRoom').style.display = 'none';
    document.getElementById('joinRoom').style.display = 'none';
    document.getElementById('videoContainer').style.display = 'block';
    document.getElementById('messages').style.display = 'block';
    document.getElementById('form').style.display = 'block';
    document.getElementById('userListContainer').style.display = 'block';
    document.getElementById('donateIcon').style.display = 'block';
    // document.getElementById('pop_up_donate').style.display = 'block';
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
    console.log('Received message:', data); 
    var item = document.createElement('li');
    item.textContent = data.userName + ": " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// Event listeners for video synchronization (play, pause, seek)
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


socket.on('user joined', function(users, adminId) {
    if (Array.isArray(users)) {
        updateUserList(users, adminId);
    } else {
        console.error('Received invalid users data:', users);
    }
});

socket.on('user left', function(users, adminId) {
    // Update the list of users and admin in the interface
    if (Array.isArray(users)) {
        updateUserList(users, adminId);
    } else {
        console.error('Received invalid users data:', users);
    }

    // Check if the current user has been removed
    const userLeft = users.find(user => user.userId === socket.id);
    if (!userLeft) {
        isRemoved = true; // Mark the user as removed
        // Hide room-related elements
        document.getElementById('videoContainer').style.display = 'none';
        document.getElementById('messages').style.display = 'none';
        document.getElementById('form').style.display = 'none';
        document.getElementById('userListContainer').style.display = 'none';

        // Display elements to create or join a room
        document.getElementById('createRoom').style.display = 'block';
        document.getElementById('joinRoom').style.display = 'block';
    }
});

socket.on('you are admin', function() {
    isAdmin = true;
    adminNotification.style.display = 'block';
});

function updateUserList(users, adminId) {
    var userList = document.getElementById('userList');
    let lastUserName = ''
    userList.innerHTML = '';
    // userList.textContent = '';
    users.forEach(function(user) {
        
        if (user.userName == lastUserName)
        {
            console.log(`current name ${user.userName} is equal of last name ${lastUserName} `)
        } else {
            var item = document.createElement('li');
            item.textContent = user.userName;
            if (socket.id === adminId && user.userId !== socket.id) {
                var removeButton = document.createElement('button');
                removeButton.textContent = 'Remover';
                removeButton.onclick = function() {
                    removeUser(user.userId);
                };
                item.appendChild(removeButton);
            }
            userList.appendChild(item);
        }
        lastUserName = user.userName 
    });
}


function removeUser(userId) {
    socket.emit('remove user', { roomId: roomId, userId: userId });
}

function requestJoinRoom() {
    var roomIdJoinInput = document.getElementById('roomIdJoin');
    var userNameJoinInput = document.getElementById('userNameJoin');
    roomId = roomIdJoinInput.value;
    userName = userNameJoinInput.value;
    socket.emit('request join room', { roomId: roomId, userName: userName });
    // alert("Wait for admin aprove you...")
    document.getElementById('log_request_to_join').textContent = 'Wait for admin aprove you...'
}

socket.on('join room approved', function(data) {
    document.getElementById('log_request_to_join').textContent = ''
    roomId = data.roomId;
    userName = data.userName;
    console.log(`Approved username: ${userName}`); 
    document.getElementById('roomIDDisplay').textContent = roomId;
    document.getElementById('createRoom').style.display = 'none';
    document.getElementById('joinRoom').style.display = 'none';
    document.getElementById('videoContainer').style.display = 'block';
    document.getElementById('messages').style.display = 'block';
    document.getElementById('form').style.display = 'block';
    document.getElementById('userListContainer').style.display = 'block';
});


// Lidar com a rejeição da solicitação de entrada
socket.on('join room rejected', function(data) {
    alert(data.message);
});

// Lidar com a solicitação de entrada recebida (admin)
socket.on('join request', function(data) {
    var item = document.createElement('li');
    item.textContent = data.userName + " wants to join the room.";
    
    var approveButton = document.createElement('button');
    approveButton.textContent = 'Approve';
    approveButton.onclick = function() {
        socket.emit('respond join request', { roomId: roomId, userId: data.userId, approve: true });
    };

    var rejectButton = document.createElement('button');
    rejectButton.textContent = 'Reject';
    rejectButton.onclick = function() {
        socket.emit('respond join request', { roomId: roomId, userId: data.userId, approve: false });
    };

    item.appendChild(approveButton);
    item.appendChild(rejectButton);
    userList.appendChild(item);
});

function importLocalVideo() {
    document.getElementById('localVideoInput').click();
}

function loadLocalVideo(event) {
    var file = event.target.files[0];
    var url = URL.createObjectURL(file);
    video.src = url;
    video.load();

    // Enviar a URL do vídeo para todos na sala
    socket.emit('local video imported', { roomId: roomId, videoUrl: url });

    // Garantir que o vídeo seja reproduzido no celular
    video.addEventListener('loadeddata', function() {
        video.play();
    }, { once: true });
}

socket.on('local video imported', ({ videoUrl }) => {
    video.src = videoUrl;
    video.load();

    // Garantir que o vídeo seja reproduzido no celular
    video.addEventListener('loadeddata', function() {
        video.play();
    }, { once: true });
});


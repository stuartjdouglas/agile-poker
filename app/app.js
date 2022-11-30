var socket = io();

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var loginForm = document.getElementById('login-input');



// console.log('emitting');
// socket.emit('login', '');
form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

// loginForm.addEventListener('submit', function (e) {
//     e.preventDefault();
//     if (input.value) {
//         socket.emit('username', input.value);
//     }
// })

socket.on('chat message', function (msg) {
    var item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// socket.on('user connect', function (user) {
//     console.log('user', user);
// });

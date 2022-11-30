const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

let game = {
    showVotes: false,
    votes: {}
};

app.use(express.static('app'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app/index.html');
});

io.on('connection', (socket) => {

    console.log('user connected');
    socket.emit('voted', game);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('reveal votes', () => {
        console.log('reveal the votes');
        game.showVotes = true;
        game.results = {};

        for (vote in game.votes) {
            if (vote) {
                game.results[game.votes[vote]] = game.results[game.votes[vote]] ? game.results[game.votes[vote]] + 1 : 1
            }
        }

        console.table(game.results);
        socket.emit('reveal votes', game);
    })

    socket.on('new vote', () => {
        game.votes = {};
        game.showVotes = false;
        game.results = undefined;
        socket.emit('new vote', game);
    })
    socket.on('vote', (action) => {
        if (!game.showVotes) {


            game.votes[action.username] = action.vote;



            socket.emit('voted', game);
        }

    });

});


server.listen(port, () => {
    console.log(`listening on *:${port}`);
});
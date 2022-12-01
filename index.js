const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

class UserVote {
    id;

    username;

    vote;

    constructor(username, vote) {
        this.username = username;
        this.id = username;
        this.vote = vote;
    }
}

class Result {
    vote;

    numOfVotes;

    voters;

    constructor(vote, numOfVotes, voters) {
        this.vote = vote;
        this.numOfVotes = numOfVotes;
        this.voters = voters;
    }
}

class Vote {
    votes;

    concluded;

    results;

    constructor() {
        this.votes = [];
        this.concluded = false;
        this.results = [];
    }
}

let game = new Vote();


app.use(express.static('app'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app/index.html');
});



io.on('connection', (socket) => {
    function handleRevealResults() {
        console.log('Reavealing the votes');
        game.concluded = true;
    
        game.votes.forEach(vote => {
            const result = game.results.find(result => result.vote === vote.vote);
            console.log(vote);
            if (!result) {
                game.results.push(new Result(vote.vote, 1, [vote.id]));
            } else {
                result.numOfVotes = result.numOfVotes + 1;
                result.voters.push(vote.id);
            }
        });
    
        console.table(game.results);
        broadcastUpdate('reveal votes');
    }
    
    function handleNewVote() {
        console.log('New vote started');
        game.votes = [];
        game.results = [];
        game.concluded = false;
        broadcastUpdate('new vote');
    }
    
    function handleHi(username) {
        console.log(`User ${username} says hi`)
        console.log(game);
        const userVote = getUsersVote(username);
        if (userVote) {
            userVote.vote = null;
        } else {
            game.votes.push(new UserVote(username));
        }
        broadcastUpdate('voted');
    }
    
    function handleVote(action) {
            console.log(`User ${action.username} has voted ${action.vote}`);
            if (!game.concluded) {
                const user = getUsersVote(action.username);
                if (user) {
                    user.vote = action.vote;
                } else {
                    game.votes.push(new UserVote(action.username, action.vote));
                }
                broadcastUpdate('voted');
            }
    }
    
    function getUsersVote(userId) {
        if (!game.votes) {
            return;
        }
        return game?.votes?.find(vote => vote.id === userId);
    }
    
    function broadcastUpdate(subject) {
        socket.broadcast.emit(subject, game);
        socket.emit(subject, game);
    }
    console.log('A user has connected');
    broadcastUpdate('voted');

    socket.on('disconnect', () => {
        console.log('A user has disconnected');
    });

    socket.on('reveal votes', handleRevealResults)
    socket.on('new vote', handleNewVote);
    socket.on('vote', handleVote);
    socket.on('hi', handleHi);
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});

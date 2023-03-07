const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

/**
 * User vote class.
 */
class UserVote {

    /** User id */
    id;

    /** Username */
    username;

    /** The user vote */
    vote;

    /** Flag to mark user as moderator */
    isModerator;

    constructor(username, vote) {
        this.username = username;
        this.id = username;
        this.vote = vote;
        this.isModerator;
    }
}


/** Result class for a vote */
class Result {

    /** The vote */
    vote;

    /** The number of votes */
    numOfVotes;

    /** The list of voters */
    voters;

    constructor(vote, numOfVotes, voters) {
        this.vote = vote;
        this.numOfVotes = numOfVotes;
        this.voters = voters;
    }
}

/** Vote */
class Vote {

    /** Name of the vote */
    name;

    /** List of user votes */
    votes;

    /** Flag to mark vote as concluded */
    concluded;

    /** The results */
    results;

    /** The date time of creation */
    dateCreated;

    /** The date time of conclusion */
    dateConcluded;

    constructor(name) {
        this.name = name;
        this.dateCreated = new Date();
        this.votes = [];
        this.concluded = false;
        this.results = [];
    }
}

/** Game */
class Game {
    /** votes */
    votes;

    /** The connected players */
    connectedVoters;

    constructor() {
        this.votes = [];
        this.connectedVoters = [];
    }

    /** @returns the current vote in place */
    currentVote() {
        return this.votes[this.votes.length - 1];
    }
}

// Create game instance
const game = new Game()

// Host content
app.use(express.static('app'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app/index.html');
});


// Socket IO communication
io.on('connection', (socket) => {

    /**
     * Handles revealing the vote
     */
    function handleRevealResults() {
        console.log('Revealing the votes');
        const vote = game.currentVote();
        vote.concluded = true;

        vote.votes.forEach(userVote => {
            console.log(vote);
            const result = vote.results.find(result => result.vote === userVote.vote);

            if (userVote.vote !== null) {
                if (!result) {
                    vote.results.push(new Result(userVote.vote, 1, [userVote.id]));
                } else {
                    result.numOfVotes = result.numOfVotes + 1;
                    result.voters.push(userVote.id);
                }
            }
        });

        console.table(vote.results);
        broadcastUpdate('reveal votes');
    }

    /**
     * Handles creating a new vote
     * @param name the vote name 
     */
    function handleNewVote(name) {
        const vote = new Vote(name);
        console.log('New vote started', name);
        if (!game.votes) {
            game.votes = new Array(vote);
        } else {
            game.votes.push(vote);
        }
        broadcastUpdate('new vote');
    }

    /**
     * Handles clients communicating.
     *
     * @param username the username 
     */
    function handleHi(username) {
        console.log(`User ${username} says hi`);
        if (!game.connectedVoters.includes(username)) {
            game.connectedVoters.push(username);
        }
        const userVote = getUsersVote(username);
        if (userVote) {
            userVote.vote = null;
        } else {
            if (game.currentVote()) {
                game.currentVote().votes.push(new UserVote(username));
            }
        }
        broadcastUpdate('voted');
    }

    /**
     * Handles getting a vote from the client.
     *
     * @param action data from client
     */
    function handleVote(action) {
        const vote = game.currentVote();
        console.log(`User ${action.username} has voted ${action.vote}`);
        if (vote && !vote.concluded) {
            const user = getUsersVote(action.username);
            if (user) {
                user.vote = action.vote;
            } else {
                vote.votes.push(new UserVote(action.username, action.vote));
            }
            broadcastUpdate('voted');
        }
    }

    /**
     * Returns the users vote.
     * @param userId the user id
     * @returns the users vote
     */
    function getUsersVote(userId) {
        const vote = game.currentVote();
        if (!vote || vote && !vote.votes) {
            return;
        }
        return vote.votes.find(vote => vote.id === userId);
    }

    /** Broadcasts updates to all users */
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

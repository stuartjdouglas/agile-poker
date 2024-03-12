const port = process.env.PORT || 4000;

import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { Game, Result, User, UserVote, Vote } from './models/base.models';

// Create game instance
const game = new Game();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Array<User>();

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
        console.table(game.votes);
        const vote: Vote = game.currentVote();
        if (!vote) {
            return;
        }
        vote.concluded = true;
        vote.votes.forEach((userVote: UserVote) => {
            const result = vote.results.find(result => result.vote === userVote.vote);


            if (userVote.vote !== null) {
                if (!result) {
                    vote.results.push(new Result(userVote.vote, 1, [userVote.username], 0));
                } else {
                    result.numOfVotes = result.numOfVotes + 1;
                    // result.previousNumOfVotes = r
                    result.voters.push(userVote.username);
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
    function handleNewVote(newVote: any) {
        const newDateCreate = new Date();
        const vote = new Vote(newVote.name ? newVote.name : newDateCreate, newVote.cardSelection);
        console.log('New vote started', newVote.name, 'with card selection', newVote.cardSelection);
        game.connectedVoters = [];
        if (!game.votes) {
            game.votes = new Array(vote);
        } else {
            game.votes.push(vote);
        }
        broadcastUpdate('new vote');
        broadcastUpdate('voted');

    }

    function handleRevote(response: any) {
        console.log('Peforming revote for ', response.name)

        // Get the vote with the dateCreated

        const newVote = JSON.parse(JSON.stringify(game.currentVote()));
        if (!newVote.name) {
            newVote.name = newVote.dateCreated;
        }
        // newVote.revoteCount++;
        newVote.name += ' revote';
        newVote.results = [];
        newVote.concluded = false;
        for (let i = 0; i < newVote.votes.length; i++) {
            newVote.votes[i].previousVote = newVote.votes[i].vote;
            newVote.votes[i].vote = null;
        }
        game.votes.push(newVote);
        console.log('broadcasting revote', game);
        broadcastUpdate('voted');
    }

    /**
     * Returns the users vote.
     * @param userId the user id
     * @returns the users vote
     */
    function getUsersVote(userId: string): UserVote | undefined {
        const vote: Vote = game.currentVote();
        return vote?.votes?.find(vote => vote.id === userId);
    }

    /** Broadcasts updates to all users */
    function broadcastUpdate(subject: string) {
        const currentDate = new Date();
        game.connectedVoters = users.filter(user => (currentDate.getTime() - user.lastKnown.getTime()) < 10 * 60 * 1000);
        socket.broadcast.emit(subject, game);
        socket.emit(subject, game);
    }

    socket.on('reveal votes', handleRevealResults)
    socket.on('start new vote', handleNewVote);
    socket.on('revote', handleRevote);

    socket.on('userConnect', (user: User) => {
        console.log('User has connected', user.id)
        if (!users.find(knownuser => knownuser.id === user.id)) {
            console.log(`New user ${user.id} has connected`);
            const newUser = new User(user.id, user.username ? user.username : user.id, user.isModerator, user.connected, new Date(), null);
            newUser.connected = true;
            newUser.lastKnown = new Date();
            users.push(newUser);
        } else {
            const currentUser = users.find(knownuser => knownuser.id === user.id);
            console.log(`User ${currentUser?.username} has reconnected`);

            if (currentUser) {
                currentUser.connected = true;
                currentUser.isModerator = user.isModerator;
                currentUser.lastKnown = new Date();
            }
        }
        broadcastUpdate('voted');
    });

    socket.on('userDisconnection', (userId: string) => {
        const currentUser = users.find(knownuser => knownuser.id === userId);
        console.log(`User ${currentUser?.username} has disconnected`);
        if (currentUser) {
            currentUser.lastKnown = new Date();
            currentUser.connected = false;
        }
        broadcastUpdate('voted');

    });

    socket.on('userChangeName', (user: User) => {
        const currentUser = users.find(knownuser => knownuser.id === user.id);
        console.log(`User ${currentUser?.username} has changed name to ${user.username}`);
        if (currentUser) {
            currentUser.lastKnown = new Date();
            currentUser.username = user.username;
        }
        broadcastUpdate('voted');
    });

    socket.on('nudgeuser', (userid: string) => {
        socket.broadcast.emit('nudge', userid);
        socket.emit('nudge', userid);
    });

    socket.on('userVoted', (userVote: UserVote) => {

        // check if user exists
        const user = users.find(user => user.id == userVote.id);
        if (!user) {
            users.push(new User(userVote.id, userVote.username, false, true, new Date(), new Date()));
        } else {
            user.lastVoted = new Date();
        }


        console.log(`User ${userVote.username} has voted ${userVote.vote}`);
        const vote = game.currentVote();
        if (vote && !vote.concluded) {
            const user = getUsersVote(userVote.id);
            if (user) {
                user.vote = userVote.vote;
            } else {
                vote.votes.push(userVote);
            }
            broadcastUpdate('voted');
        }
    })
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});

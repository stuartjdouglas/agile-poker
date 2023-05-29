const port = process.env.PORT || 3000;

import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { Game, Result, User, UserVote, Vote } from './models/base.models';

// Create game instance
const game = new Game();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

        console.log('>>>>', vote.votes)

        vote.votes.forEach((userVote: UserVote) => {
            const result = vote.results.find(result => result.vote === userVote.vote);


            if (userVote.vote !== null) {
                console.log('>>>>>', userVote);
                if (!result) {
                    vote.results.push(new Result(userVote.vote, 1, [userVote.username], 0));
                } else {
                    result.numOfVotes = result.numOfVotes + 1;
                    // result.previousNumOfVotes = r
                    result.voters.push(userVote.username);
                }
            }
            // if (userVote.previousVote) {
            //     const previous = vote.results.find(result => {
            //         console.log(result, userVote)
            //         return result.vote === userVote.previousVote
            //     });
            //     if (!previous) {
            //         vote.results.push(new Result(userVote.previousVote, 0, [userVote.username], 1));

            //     } else {
            //         previous.previousNumOfVotes = previous.previousNumOfVotes + 1;
            //         // result.previousNumOfVotes = r
            //         previous.voters.push(userVote.username);
            //     }
            // }
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
        const vote = new Vote(newVote.name, newVote.cardSelection);
        console.log('New vote started', newVote.name, 'with card selection', newVote.cardSelection);
        game.connectedVoters = [];
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
     * @param response username and isModerator
     */
    function handleHi(response: User) {
        console.log(`User ${response.username} says hi${response.isModerator ? ', I am a mod' : ', i am not a mod'}`);
        const user = game.connectedVoters.find(user => user.username === response.username);
        if (!user) {
            game.connectedVoters.push(new User(response.username ? response.username : 'Unknown User', response.isModerator));
        } else {
            user.isModerator = response.isModerator;
        }

        broadcastUpdate('voted');
    }

    /**
     * Handles getting a vote from the client.
     *
     * @param action data from client
     */
    function handleVote(action: UserVote) {
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
        // newVote.votes.forEach((vote: any) => {
        //     vote.previousVote = vote;
        //     vote.vote = null;
        // });
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
        return vote?.votes?.find(vote => vote.username === userId);
    }

    /** Broadcasts updates to all users */
    function broadcastUpdate(subject: string) {
        socket.broadcast.emit(subject, game);
        socket.emit(subject, game);
    }


    console.log('A user has connected');
    setTimeout(() => broadcastUpdate('voted'), 300)
    socket.on('disconnect', () => {
        console.log('A user has disconnected');
    });

    socket.on('reveal votes', handleRevealResults)
    socket.on('start new vote', handleNewVote);
    socket.on('vote', handleVote);
    socket.on('revote', handleRevote);
    socket.on('hi', handleHi);
    socket.on('bye', (name) => {
        console.log('bye', name)
    });
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});

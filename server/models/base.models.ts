export class User {

    id: string;
    username: string;

    isModerator: boolean;

    public connected: boolean;
    public lastKnown: Date;
    public lastVoted: Date | null;

    constructor(id: string, username: string, isModerator: boolean, connected: boolean, lastKnown: Date, lastVoted: Date | null) {
        this.id = id;
        this.username = username;
        this.isModerator = isModerator;
        this.connected = connected;
        this.lastKnown = lastKnown;
        this.lastVoted = lastVoted;
    }
}

/**
 * User vote class.
 */
export class UserVote {

    /** Username */
    username: string;

    id: string;

    /** The user vote */
    vote: Vote;

    previousVote: any;

    constructor(id: string, username: string, vote: Vote) {
        this.id = id;
        this.username = username;
        this.vote = vote;
    }
}


/** Result class for a vote */
export class Result {

    /** The vote */
    vote: Vote;

    /** The number of votes */
    numOfVotes: number;

    previousNumOfVotes: number;

    /** The list of voters */
    voters: Array<string>;

    constructor(vote: Vote, numOfVotes: number, voters: Array<string>, previousNumOfVotes: number) {
        this.vote = vote;
        this.numOfVotes = numOfVotes;
        this.voters = voters;
        this.previousNumOfVotes = previousNumOfVotes;
    }
}

/** Vote */
export class Vote {

    /** Name of the vote */
    name;

    /** the card selection */
    cardSelection: string;

    /** List of user votes */
    votes: Array<UserVote>;

    /** Flag to mark vote as concluded */
    concluded;

    /** The results */
    results: Array<Result>;

    /** The date time of creation */
    dateCreated: Date;

    constructor(name: string, cardSelection: string) {
        this.name = name;
        this.cardSelection = cardSelection;
        this.dateCreated = new Date();
        this.votes = [];
        this.concluded = false;
        this.results = [];
    }
}

/** Game */
export class Game {
    /** votes List of Votes */
    votes: Array<Vote>;

    /** The connected players - List of User */
    connectedVoters: Array<User>;

    constructor() {
        this.votes = [];
        this.connectedVoters = [];
    }

    /** @returns the current vote in place */
    currentVote(): Vote {
        return this.votes[this.votes.length - 1];
    }
}
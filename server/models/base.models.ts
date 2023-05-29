export class User {
    username: string;

    isModerator: boolean;

    constructor(username: string, isModerator: boolean) {
        this.username = username;
        this.isModerator = isModerator;
    }
}

/**
 * User vote class.
 */
export class UserVote {

    /** Username */
    username: string;

    /** The user vote */
    vote: Vote;

    constructor(username: string, vote: Vote) {
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

    /** The list of voters */
    voters: Array<string>;

    constructor(vote: Vote, numOfVotes: number, voters: Array<string>) {
        this.vote = vote;
        this.numOfVotes = numOfVotes;
        this.voters = voters;
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
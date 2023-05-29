const { createApp } = Vue;
const socket = io();

createApp({
    data() {
        return {
            cards: [],
            hasName: false,
            name: null,
            isModerator: null,
            socketID: null,
            votes: null,
            vote: null,
            voter: null,
            connectedVoters: null,
            chartData: null,
            cardSelection: 'modified-fibonacci'
        }
    },
    methods: {
        issueVote: function (voteValue) {
            if (this.name) {
                socket.emit('vote', {
                    id: this.socketID,
                    username: this.name,
                    vote: voteValue
                });
            }
        },
        startNewVote: function (name, cardSelection) {
            if (!this.vote || this.vote.concluded) {
                console.log('Creating new vote', name, cardSelection);
                socket.emit('start new vote', { name: name, cardSelection: cardSelection });
            }
        },
        revote: function (name) {
            if (this.vote.concluded) {
                console.log('Revoting', this.vote.dateCreated);
                socket.emit('revote', { name: this.vote.dateCreated });
            }
        },
        revealVotes: function () {
            if (!this.vote.concluded) {
                socket.emit('reveal votes')
            }
        },
        setName: function () {
            if (this.name) {
                socket.emit('hi', {
                    username: localStorage.name,
                    isModerator: localStorage.isModerator
                });
                this.changeName = false;
                this.hasName = true;
            } else {
                console.log('please set your name')
            }
        },
        getCardClass: function (vote) {
            const user = this.vote?.votes?.find(vote => vote?.username === this.name);
            return { voted: user?.vote === vote };
        },
        clearName: function () {
            localStorage.removeItem('name');
            this.name = undefined;
        },
        hasSomeoneVoted: function () {
            return this.vote && this.vote.votes.find(vote => vote.vote !== undefined);
        },
        getHistory: function () {
            return this.votes?.sort((a, b) => {
                return new Date(b.dateCreated) - new Date(a.dateCreated);
            });
        },
        showGraph: function (voteTOSHOW) {
            console.log('showing graph');

            const ctx = document.getElementById('myChart');
            const labels = voteTOSHOW?.results?.filter(v => v !== null).map(v => v?.vote);
            const data = voteTOSHOW?.results?.map(v => v?.numOfVotes);
            new Chart(document.getElementById('myChart'), {
                type: 'pie',
                data: {
                    labels,
                    datasets: [{
                        label: '# of Votes',
                        data,
                        borderWidth: 1
                    }]
                },
                options: {
                    legend: { display: false },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },
        getUserVotes(voters) {
            voters = voters?.filter(v => v && !v.isModerator);
            const hasVoted = voters?.filter(voter => this.vote?.votes?.find(v => v?.username === voter?.username)?.vote)
            if (hasVoted?.length === voters?.length) {
                return '(All Voted)';
            }
            return `(${hasVoted?.length}/${voters?.length})`;
        },
        getVoters(voters, vote) {
            voters?.sort((a, b) => {
                if (!a.isModerator) {
                    return 1;
                } else {
                    return -1;
                }
            });
            if (this.vote?.concluded) {
                return voters.sort((a, b) => vote?.votes?.find(v => v?.username === a?.username)?.vote - vote?.votes?.find(v => v?.username === b?.username)?.vote);
            }
            return voters;
        },
        leaving() {
            socket.emit('bye', localStorage.name);
        },
        hasUserVoted(username) {
            if (username && this.vote) {
                return this.vote?.votes?.find(vote => vote.username === username)?.vote;
            }
            return false;
        },
        getUserVote(username) {
            if (username && this.vote) {
                return this.vote?.votes?.find(vote => vote?.username === username)?.vote;
            }
            return null;
        },
        getUserPreviousVote(username) {
            if (this.vote) {
                return this.vote?.votes?.find(vote => vote?.username === username)?.previousVote;
            }
            return null;
        },
        isVoteHigher(username) {
            return this.getUserVote(username) > this.getUserPreviousVote(username);
        }
    },
    mounted() {
        if (localStorage.name) {
            this.name = localStorage.name;
            this.hasName = true;
        }
        if (localStorage.isModerator) {
            this.isModerator = localStorage.isModerator;
        }
    },
    created() {
        window.addEventListener("beforeunload", this.leaving);
        const getCurrentVote = (votes) => votes[votes.length - 1];

        // When someone has voted
        socket.on('voted', (votes) => {
            this.vote = getCurrentVote(votes.votes);

            const cardSelection = {
                'modified-fibonacci': [0, 1, 2, 3, 5, 8, 13,
                    20, 40, '?'],
                'simple': [0, 1, 2, 3, 4, 5]

            }
            this.cards = cardSelection[this.vote.cardSelection];
            this.votes = votes.votes;
            this.connectedVoters = votes.connectedVoters;
            if (this.vote?.concluded) {
                this.showGraph(this.vote);
            }
        });

        // WHhen someone has requested to reveal the votes
        socket.on('reveal votes', (votes) => {
            this.vote = getCurrentVote(votes.votes);

            this.votes = votes.votes;
            this.connectedVoters = votes.connectedVoters;
            setTimeout(() => {
                this.showGraph(this.vote)
            }, 0)
        });

        // When a new vote has been created
        socket.on('new vote', (votes) => {

            // Set to new vote game
            this.vote = getCurrentVote(votes.votes);

            // Reset user votes
            this.votes = votes.votes;

            // Reset connected voters
            this.connectedVoters = votes.connectedVoters;

            // Let server know your playing
            if (localStorage.name) {
                socket.emit('hi', {
                    username: localStorage.name,
                    isModerator: localStorage.isModerator === 'true'
                });
            }
        });
        if (localStorage.name && localStorage.isModerator) {
            socket.emit('hi', {
                username: localStorage.name,
                isModerator: localStorage?.isModerator === 'true'
            });
        }
    },
    watch: {
        name(newName) {
            localStorage.name = newName;
        },
        game(gameUpdate) {
            localStorage.game = gameUpdate;
        },
        isModerator(value) {
            localStorage.isModerator = value;
            if (this.hasName) {

                socket.emit('hi', {
                    username: localStorage.name,
                    isModerator: localStorage.isModerator === 'true'
                });
            }
        }
    }
}).mount('#app')
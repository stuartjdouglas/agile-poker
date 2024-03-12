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
            cardSelection: 'modified-fibonacci',
            pending: {}
        }
    },
    methods: {
        issueVote: function (voteValue) {
            if (this.name) {
                const currentVote = this.vote?.votes.find(vote => vote.id === localStorage.id);
                socket.emit('userVoted', {
                    id: localStorage.id,
                    username: this.name,
                    vote: currentVote?.vote === voteValue ? null : voteValue
                });
            }
        },
        startNewVote: function (name, cardSelection) {
            if (!this.vote || this.vote.concluded) {
                socket.emit('start new vote', { name: name, cardSelection: cardSelection });
            }
        },
        revote: function (name) {
            if (this.vote.concluded) {
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
                socket.emit('userChangeName', {
                    id: localStorage.id,
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
            const user = this.vote?.votes?.find(vote => vote?.id === localStorage.id);
            return { voted: user?.vote === vote, notVoted: user?.vote !== vote };
        },
        clearName: function () {
            localStorage.removeItem('name');
            this.name = undefined;
        },
        hasSomeoneVoted: function () {
            return this.vote && this.vote.votes.find(vote => vote.vote !== undefined);
        },
        nudgeUser: function (userid) {
            socket.emit('nudgeuser', userid);
        },
        getHistory: function () {
            return this.votes?.sort((a, b) => {
                return new Date(b.dateCreated) - new Date(a.dateCreated);
            });
        },
        showGraph: function (voteTOSHOW) {
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
            const hasVoted = voters?.filter(voter => this.vote?.votes?.find(v => v?.id === voter?.id)?.vote)
            return hasVoted?.length ? hasVoted?.length : 0;
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
                return voters.sort((a, b) => vote?.votes?.find(v => v?.id === a?.id)?.vote - vote?.votes?.find(v => v?.id === b?.id)?.vote);
            }
            return voters;
        },
        leaving() {
            socket.emit('userDisconnection', localStorage.id);
            socket.emit('bye', localStorage.name);
        },
        hasUserVoted(userid) {
            if (this.vote?.votes && this.vote?.votes?.length > 0) {
                const userVote = this.vote?.votes.find(vote => vote.id === userid);
                if (userVote === undefined) {

                    return false;
                }
                if (userVote?.vote || userVote?.vote === 0) {
                    return true;
                }
            }
            return false;
        },
        getUserVote(userid) {
            if (this.vote.votes) {
                return this.vote?.votes?.find(vote => vote?.id === userid)?.vote;
            }
            return null;
        },
        getUserPreviousVote(username) {
            if (this.vote) {
                return this.vote?.votes?.find(vote => vote?.id === localStorage.id)?.previousVote;
            }
            return null;
        },
        isVoteHigher(username) {
            return this.getUserVote(username) > this.getUserPreviousVote(username);
        },
        isVoteLower(username) {
            return this.getUserVote(username) < this.getUserPreviousVote(username);
        },
        isVoteSame(username) {
            return this.getUserVote(username) === this.getUserPreviousVote(username);
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
            if (this.vote) {
                const cardSelection = {
                    'modified-fibonacci': [0, 1, 2, 3, 5, 8, 13,
                        20, 40, '?'],
                    'simple': [0, 1, 2, 3, 4, 5]

                }

                if (cardSelection[this.vote.cardSelection]) {
                    this.cards = cardSelection[this.vote.cardSelection];
                }
                this.votes = votes.votes;
                this.connectedVoters = votes.connectedVoters;
                if (this.vote?.concluded) {
                    this.showGraph(this.vote);
                }

                votes.connectedVoters.forEach(voter => {
                    const now = new Date();
                    if ((now.getTime() - new Date(voter?.lastVoted).getTime()) < 3 * 1000) {
                        this.pending[voter.id] = {
                            pending: true
                        };
                        if (this.pending[voter.id].timer) {
                            clearTimeout(this.pending[voter.id])
                        }

                        const timer = setTimeout(() => {
                            this.pending[voter.id] = false;
                        }, 2000);
                        this.pending[voter.id].timer = timer;
                    } else {
                        this.pending[voter.id] = {
                            pending: false

                        };
                    }
                })
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

        socket.on('nudge', (userid) => {
            if (userid === localStorage.id) {
                const soundEffectFromStackOverflow = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
                soundEffectFromStackOverflow.play();
            }
        })

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
                socket.emit('userConnect', {
                    username: localStorage.name,
                    id: localStorage.id,
                    isModerator: localStorage?.isModerator === 'true'
                });
            }
        });
        if (localStorage.name && localStorage.isModerator) {
            socket.emit('userConnect', {
                username: localStorage.name,
                id: localStorage.id,
                isModerator: localStorage?.isModerator === 'true'
            });
        }

        if (!localStorage.id) {
            localStorage.setItem('id', 'agile' + Math.random().toString(16).slice(2))
        }
        socket.emit('userConnect', {
            username: localStorage.name,
            id: localStorage.id,
            isModerator: localStorage?.isModerator === 'true'
        });
        window.addEventListener('focus', () => {
            socket.emit('userConnect', {
                username: localStorage.name,
                id: localStorage.id,
                isModerator: localStorage?.isModerator === 'true'
            });
        });
        window.addEventListener('blur', () => {
            socket.emit('userDisconnection', localStorage.id);

        });

        window.addEventListener('pageshow', () => {
            socket.emit('userConnect', {
                username: localStorage.name,
                id: localStorage.id,
                isModerator: localStorage?.isModerator === 'true'
            });
        });
        window.addEventListener('pagehide', () => {
            socket.emit('userDisconnection', localStorage.id);

        });
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

                socket.emit('userConnect', {
                    username: localStorage.name,
                    id: localStorage.id,
                    isModerator: localStorage?.isModerator === 'true'
                });
            }
        }
    }
}).mount('#app')
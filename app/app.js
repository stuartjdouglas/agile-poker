const { createApp } = Vue
    const socket = io();

    createApp({
        data() {
            return {
                votes: [0, 1, 2, 3, 5, 8, 13, 20, 40, '?'],
                name: null,
                game: {
                    concluded: false,
                    votes: []
                }
            }
        },
        methods: {
            issueVote: function (voteValue) {
                if (this.name) {
                    socket.emit('vote', {
                        username: this.name,
                        vote: voteValue
                    });
                }
            },
            newVote: function() {
                if (this.game.concluded) {
                    socket.emit('new vote')
                }
            },
            revealVotes: function() {
                if (!this.game.concluded) {
                    socket.emit('reveal votes')
                }
            },
            setName: function () {
                if (this.name && !this.game.concluded) {
                    socket.emit('hi', this.name);
                    this.changeName = false;
                } else {
                    console.log('please set your name')
                }
            },
            getCardClass: function (vote) {
                const user = this.game?.votes?.find(vote => vote?.username === this.name);
                return { voted: user?.vote === vote };
            },
            clearName: function () {
                localStorage.removeItem('name');
                this.name = undefined;
            }
        },
        mounted() {
            if (localStorage.name) {
                this.name = localStorage.name
            }
        },
        created() {
            socket.on('voted', (game) => {
                this.game = game;
                console.log('game', game);
            });

            socket.on('reveal votes', (game) => {
                console.log('reveal the votes');
                this.game = game;
            });

            socket.on('new vote', (game) => {
                console.log('new vote started');
                this.game = game;
                if (localStorage.name) {
                    socket.emit('hi', localStorage.name);
                }
            });
            
            if (localStorage.name) {
                socket.emit('hi', localStorage.name);
            }
        },
        watch: {
            name(newName) {
                localStorage.name = newName;
            },
            game(gameUpdate) {
                localStorage.game = gameUpdate;
            }
        }
    }).mount('#app')
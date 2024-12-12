class MusicPlayer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioElement = new Audio();
        this.track = this.audioContext.createMediaElementSource(this.audioElement);
        this.analyser = this.audioContext.createAnalyser();
        
        // Connect nodes
        this.track.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        // Setup analyser
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        // DOM Elements
        this.initializeElements();
        
        // Event Listeners
        this.setupEventListeners();
        
        // Playlist
        this.playlist = [];
        this.currentTrackIndex = 0;
        
        // Start visualization
        this.setupCanvas();
        this.visualize();
    }

    initializeElements() {
        this.playBtn = document.getElementById('play');
        this.pauseBtn = document.getElementById('pause');
        this.stopBtn = document.getElementById('stop');
        this.fileInput = document.getElementById('audioFile');
        this.volumeControl = document.getElementById('volume');
        this.progressBar = document.getElementById('progressBar');
        this.progress = document.getElementById('progress');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.durationSpan = document.getElementById('duration');
        this.trackNameElement = document.getElementById('trackName');
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
        this.repeatBtn = document.getElementById('repeat');
        this.shuffleBtn = document.getElementById('shuffle');
        this.themeBtn = document.getElementById('theme');
        this.vizStyleSelect = document.getElementById('vizStyle');
        
        this.isRepeat = false;
        this.isShuffle = false;
        this.isDarkTheme = true;
        this.currentVizStyle = 'bars';
    }

    setupEventListeners() {
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.fileInput.addEventListener('change', (e) => this.loadFile(e));
        this.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.themeBtn.addEventListener('click', () => this.toggleTheme());
        this.vizStyleSelect.addEventListener('change', (e) => {
            this.currentVizStyle = e.target.value;
        });
        
        // Add ended event listener for repeat/shuffle
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 300;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    loadFile(event) {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.audioElement.src = url;
            this.trackNameElement.textContent = file.name;
            this.playlist.push({ name: file.name, url: url });
            this.updatePlaylist();
        }
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.audioElement.play();
    }

    pause() {
        this.audioElement.pause();
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
    }

    setVolume(value) {
        this.audioElement.volume = value;
    }

    seek(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const pos = (event.clientX - rect.left) / rect.width;
        this.audioElement.currentTime = pos * this.audioElement.duration;
    }

    updateProgress() {
        const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        this.progress.style.width = `${progress}%`;
        this.currentTimeSpan.textContent = this.formatTime(this.audioElement.currentTime);
    }

    updateDuration() {
        this.durationSpan.textContent = this.formatTime(this.audioElement.duration);
    }

    updatePlaylist() {
        const playlistElement = document.getElementById('playlistItems');
        playlistElement.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.textContent = track.name;
            li.addEventListener('click', () => this.playTrack(index));
            playlistElement.appendChild(li);
        });
    }

    playTrack(index) {
        const track = this.playlist[index];
        this.currentTrackIndex = index;

        // Update track name display
        this.trackNameElement.textContent = track.name;

        // Handle audio playback
        if (track.type === 'youtube-audio') {
            this.audioElement.src = track.url;
            this.audioElement.load(); // Explicitly load the audio
            
            // Add error handling
            this.audioElement.onerror = (e) => {
                console.error('Audio playback error:', e);
                alert('Error playing this track. Skipping to next...');
                if (this.currentTrackIndex < this.playlist.length - 1) {
                    this.playTrack(this.currentTrackIndex + 1);
                }
            };

            // Add successful load handler
            this.audioElement.oncanplay = () => {
                this.play();
            };
        } else {
            // Handle local audio files
            this.audioElement.src = track.url;
            this.play();
        }
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active');
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active');
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.style.backgroundColor = this.isDarkTheme ? '#121212' : '#ffffff';
        document.body.style.color = this.isDarkTheme ? '#ffffff' : '#121212';
    }

    handleTrackEnd() {
        if (this.isRepeat) {
            this.audioElement.currentTime = 0;
            this.play();
        } else if (this.isShuffle && this.playlist.length > 1) {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * this.playlist.length);
            } while (nextIndex === this.currentTrackIndex);
            this.playTrack(nextIndex);
        } else if (this.currentTrackIndex < this.playlist.length - 1) {
            this.playTrack(this.currentTrackIndex + 1);
        }
    }

    visualize() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.canvasCtx.fillStyle = this.isDarkTheme ? '#282828' : '#f0f0f0';
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        switch(this.currentVizStyle) {
            case 'bars':
                this.drawBars();
                break;
            case 'waves':
                this.drawWaves();
                break;
            case 'circles':
                this.drawCircles();
                break;
        }

        requestAnimationFrame(() => this.visualize());
    }

    drawBars() {
        const barWidth = (this.canvas.width / this.analyser.frequencyBinCount) * 2.5;
        let x = 0;

        for(let i = 0; i < this.analyser.frequencyBinCount; i++) {
            const barHeight = this.dataArray[i] * 0.7;
            
            const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#1DB954');
            gradient.addColorStop(1, '#1aa34a');
            
            this.canvasCtx.fillStyle = gradient;
            this.canvasCtx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    drawWaves() {
        this.canvasCtx.beginPath();
        this.canvasCtx.strokeStyle = '#1DB954';
        this.canvasCtx.lineWidth = 2;

        const sliceWidth = this.canvas.width / this.analyser.frequencyBinCount;
        let x = 0;

        for(let i = 0; i < this.analyser.frequencyBinCount; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.canvas.height/2;

            if(i === 0) {
                this.canvasCtx.moveTo(x, y);
            } else {
                this.canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.canvasCtx.lineTo(this.canvas.width, this.canvas.height/2);
        this.canvasCtx.stroke();
    }

    drawCircles() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for(let i = 0; i < this.analyser.frequencyBinCount; i++) {
            const radius = this.dataArray[i] * 0.5;
            const angle = (i * 2 * Math.PI) / this.analyser.frequencyBinCount;
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius,
                3,
                0,
                2 * Math.PI
            );
            
            this.canvasCtx.fillStyle = `hsl(${i * 360 / this.analyser.frequencyBinCount}, 70%, 50%)`;
            this.canvasCtx.fill();
        }
    }

    async loadYoutubePlaylist() {
        const url = this.playlistInput.value;
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }

        try {
            this.loadPlaylistBtn.disabled = true;
            this.loadPlaylistBtn.textContent = 'Loading...';

            const response = await fetch(`http://localhost:3000/api/youtube?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.success) {
                this.playlist.push({
                    name: data.title,
                    url: data.audioUrl,
                    type: 'youtube-audio'
                });

                this.updatePlaylist();
                this.playTrack(this.playlist.length - 1);
            } else {
                throw new Error(data.error || 'Failed to load video');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error loading YouTube content. Please try again.');
        } finally {
            this.loadPlaylistBtn.disabled = false;
            this.loadPlaylistBtn.textContent = 'Load';
        }
    }
}

// Initialize player when the page loads
window.addEventListener('load', () => {
    const player = new MusicPlayer();
});

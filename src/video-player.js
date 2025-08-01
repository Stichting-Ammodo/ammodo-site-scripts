const controls = [
  "restart", // Restart playback
  "rewind", // Rewind by the seek time (default 10 seconds)
  "play", // Play/pause playback
  "fast-forward", // Fast forward by the seek time (default 10 seconds)
  "progress", // The progress bar and scrubber for playback and buffering
  "current-time", // The current time of playback
  "duration", // The full duration of the media
  "mute", // Toggle mute
  "volume", // Volume control
  "captions", // Toggle captions
  "settings", // Settings menu
  "fullscreen", // Toggle fullscreen
];

// Regex Patterns
const youtubeRegEx = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)/;
const vimeoRegEx = /(https?:\/\/)?(www\.)?(player\.)?vimeo\.com\/([a-z]*\/)*([0-9]{6,11})[?]?.*/;

const playerInstances = [];

// Helper function to extract video info from URL
function extractVideoInfo(videoLink) {
  if (!videoLink) return { videoId: null, videoType: null };
  
  const youtubeMatches = videoLink.match(youtubeRegEx);
  const vimeoMatches = videoLink.match(vimeoRegEx);
  
  if (youtubeMatches && youtubeMatches[5]) {
    return { videoId: youtubeMatches[5], videoType: 'youtube' };
  } else if (vimeoMatches && vimeoMatches[5]) {
    return { videoId: vimeoMatches[5], videoType: 'vimeo' };
  }
  
  return { videoId: null, videoType: null };
}

function initializeVideoPlayers() {
  const playerContainers = document.querySelectorAll(".custom_video-container");
   playerContainers.forEach((container, index) => {
    try {
      // Get required elements
      const videoLink = container.getAttribute('data-video-link');
      const playerElement = container.querySelector(".custom_video-player");
      const playBtn = container.querySelector(".custom_video-play-btn");
      const videoPosterSrc = container.querySelector(".custom_video-image-helper");
      
      // Validate required elements exist
      if (!playerElement) {
        console.error(`Missing video player element in container ${index}`, container);
        return;
      }
      
      if (!playBtn) {
        console.error(`Missing play button in container ${index}`, container);
        return;
      }
      
      if (!videoLink) {
        console.warn(`No video link provided for container ${index}`, container);
        playBtn.classList.add("is-hidden");
        return;
      }
      
      // Extract video information
      const { videoId, videoType } = extractVideoInfo(videoLink);
      
      // If no valid video found, hide play button and skip
      if (!videoId || !videoType) {
        console.warn(`Invalid video link format: ${videoLink}`);
        playBtn.classList.add("is-hidden");
        return;
      }

      // if no video poster remove the data-attribute, otherwise set it
      if (! videoPosterSrc) {
        playerElement.removeAttribute('data-poster')
      } else {
        src = videoPosterSrc.getAttribute('src');
        playerElement.setAttribute('data-poster', src);
      }
      
      // Set video attributes
      playerElement.setAttribute('data-plyr-provider', videoType);
      playerElement.setAttribute('data-plyr-embed-id', videoId);
      
      // Add ARIA labels for accessibility
      playBtn.setAttribute('aria-label', `Play ${videoType} video`);
      playerElement.setAttribute('aria-label', `${videoType} video player`);
      
      // Initialize Plyr player
      let player;
      try {
        player = new Plyr(playerElement, { controls });
      } catch (plyrError) {
        console.error('Failed to initialize Plyr player:', plyrError);
        playBtn.classList.add("is-hidden");
        return;
      }
      
      // Store player instance for potential cleanup
      playerInstances.push({
        player,
        container,
        playBtn,
        playerElement
      });
      
      // Event handler for play button
      const handlePlayClick = (event) => {
        event.preventDefault();
        player.play().catch(error => {
          console.error('Failed to start playback:', error);
          // Handle autoplay policy restrictions
          if (error.name === 'NotAllowedError') {
            console.warn('Autoplay was prevented by browser policy');
          }
        });
      };
      
      // Add event listeners
      playBtn.addEventListener("click", handlePlayClick);
      
      // Player state event handlers
      player.on("ready", (event) => {
        const instance = event.detail.plyr;
        instance.elements.container.classList.add('plyr--ready');
        playBtn.classList.add("is-ready");
      });

      player.on("play", () => {
        playBtn.classList.add("is-hidden");
        playBtn.setAttribute('aria-hidden', 'true');
      });
      
      player.on("pause", () => {
        playBtn.classList.remove("is-hidden");
        playBtn.setAttribute('aria-hidden', 'false');
      });
      
      player.on("ended", () => {
        playBtn.classList.remove("is-hidden");
        playBtn.setAttribute('aria-hidden', 'false');
      });
      
      // Handle player errors
      player.on("error", (event) => {
        console.error('Player error:', event.detail);
        playBtn.classList.remove("is-hidden");
      });
    } catch (error) {
      console.error(`Error initializing player for container ${index}:`, error);
    }
  });
  return playerInstances;
}

// Initialize players when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeVideoPlayers);
} else {
  // DOM is already loaded
  initializeVideoPlayers();
}

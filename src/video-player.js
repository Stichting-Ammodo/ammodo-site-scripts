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

// --- Caption DOM builders ---

function createLanguageButton(value, label, badge, checked) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'plyr__control';
  btn.setAttribute('role', 'menuitemradio');
  btn.setAttribute('aria-checked', checked ? 'true' : 'false');
  btn.setAttribute('data-plyr', 'language');
  btn.value = value;
  btn.innerHTML = badge
    ? `<span>${label}<span class="plyr__menu__value"><span class="plyr__badge">${badge}</span></span></span>`
    : `<span>${label}</span>`;
  return btn;
}

function buildCaptionsPanel(settingsId, tracklist) {
  const panel = document.createElement('div');
  panel.id = `${settingsId}-captions`;
  panel.hidden = true;

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'plyr__control plyr__control--back';
  backBtn.innerHTML =
    '<span aria-hidden="true">Captions</span><span class="plyr__sr-only">Go back to previous menu</span>';
  panel.appendChild(backBtn);

  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.appendChild(createLanguageButton('', 'Disabled', null, true));
  tracklist.forEach((track) => {
    menu.appendChild(
      createLanguageButton(track.languageCode, track.displayName, track.languageCode.toUpperCase(), false)
    );
  });
  panel.appendChild(menu);

  return { panel, menu, backBtn };
}

function buildCaptionsHomeButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'plyr__control plyr__control--forward';
  btn.setAttribute('role', 'menuitem');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('data-custom-captions', '');
  btn.innerHTML = '<span>Captions<span class="plyr__menu__value">Disabled</span></span>';
  return btn;
}

function findCCToggle(container) {
  let toggle = null;
  container.querySelectorAll('[data-plyr="captions"]').forEach((btn) => {
    if (!btn.closest('.plyr__menu__container')) toggle = btn;
  });
  return toggle;
}

// --- Setup Custom Captions ---

function setupCustomCaptions(player, tracklist) {
  if (!tracklist || !tracklist.length) return;

  const container = player.elements.container;
  const settingsMenu = container.querySelector('.plyr__menu__container');
  if (!settingsMenu) return;

  const homePanel = settingsMenu.querySelector('[id$="-home"]');
  if (!homePanel) return;

  const settingsId = homePanel.id.replace('-home', '');
  const homeMenu = homePanel.querySelector('[role="menu"]');

  // Clean up any existing captions UI (onApiChange can fire multiple times)
  document.getElementById(`${settingsId}-captions`)?.remove();
  homeMenu?.querySelector('[data-custom-captions]')?.remove();

  // Build and insert captions submenu panel
  const { panel: captionsPanel, menu: menuDiv, backBtn } = buildCaptionsPanel(settingsId, tracklist);
  homePanel.parentNode.appendChild(captionsPanel);

  // Build and insert home menu entry
  const captionsHomeBtn = buildCaptionsHomeButton();
  homeMenu?.appendChild(captionsHomeBtn);

  // Panel navigation
  captionsHomeBtn.addEventListener('click', () => {
    homePanel.hidden = true;
    captionsPanel.hidden = false;
  });
  backBtn.addEventListener('click', () => {
    captionsPanel.hidden = true;
    homePanel.hidden = false;
  });

  // State management
  let activeLanguage = '';
  let ccToggle = findCCToggle(container);

  function setCaption(languageCode) {
    activeLanguage = languageCode;
    const track = tracklist.find((t) => t.languageCode === languageCode);

    // Toggle YouTube captions — pass the full track object so YouTube
    // can match it (a partial { languageCode } isn't enough for non-primary tracks)
    if (track) {
      player.embed.setOption('captions', 'track', track);
      container.classList.add('plyr--captions-active');
    } else {
      player.embed.setOption('captions', 'track', {});
      container.classList.remove('plyr--captions-active');
    }

    // Update menu radio states
    menuDiv.querySelectorAll('[data-plyr="language"]').forEach((b) => {
      b.setAttribute('aria-checked', b.value === languageCode ? 'true' : 'false');
    });

    // Update home button label
    const valueSpan = captionsHomeBtn.querySelector('.plyr__menu__value');
    if (valueSpan) {
      valueSpan.textContent = track ? track.displayName : 'Disabled';
    }

    // Update CC toggle button state
    if (ccToggle) {
      ccToggle.setAttribute('aria-pressed', languageCode ? 'true' : 'false');
      ccToggle.classList.toggle('plyr__control--pressed', !!languageCode);
    }
  }

  // Language selection in captions panel
  menuDiv.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-plyr="language"]');
    if (!btn) return;
    setCaption(btn.value);
    captionsPanel.hidden = true;
    homePanel.hidden = false;
  });

  // Override CC toggle button to use YouTube captions
  if (ccToggle) {
    ccToggle.classList.remove('plyr__control--hidden');
    const freshToggle = ccToggle.cloneNode(true);
    ccToggle.parentNode.replaceChild(freshToggle, ccToggle);
    ccToggle = freshToggle;

    ccToggle.addEventListener('click', () => {
      if (activeLanguage) {
        setCaption('');
      } else if (tracklist.length) {
        setCaption(tracklist[0].languageCode);
      }
    });
  }

  // Mark captions as available so Plyr shows the CC button
  container.classList.add('plyr--captions-enabled');
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

        player.embed.addEventListener('onApiChange', () => {
          const tracklist = player.embed.getOption('captions', 'tracklist');
           if (tracklist && tracklist.length) {
            player.embed.setOption('captions', 'track', {});
            setupCustomCaptions(player, tracklist);
           }
        });

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

// Pad sound mapping configuration
const padSounds = {
  1: { file: 'assets/sounds/first_note.m4a', code: 'KeyZ' },
  2: { file: 'assets/sounds/second_note.m4a', code: 'KeyX' },
  3: { file: 'assets/sounds/third_note.m4a', code: 'KeyC' },
  4: { file: 'assets/sounds/fourth_note.m4a', code: 'KeyV' },
  5: { file: 'assets/sounds/fiveth_note.m4a', code: 'KeyA' },
  6: { file: 'assets/sounds/sixth_note.m4a', code: 'KeyS' },
  7: { file: 'assets/sounds/seventh_note.m4a', code: 'KeyD' },
  8: { file: 'assets/sounds/eighth_note.m4a', code: 'KeyF' },
  9: { file: 'assets/sounds/start_intro.m4a', code: 'KeyQ' },
  10: { file: 'assets/sounds/look_at_you.wav', code: 'KeyW' },
  11: { file: 'assets/sounds/ladies_and_gentlemen.wav', code: 'KeyE' },
};

// Web Audio API context initialization
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};
const playingSources = [];
let isAudioContextResumed = false;

// Audio loading state tracking
let audioLoadingState = {
  totalAudio: Object.keys(padSounds).length,
  loadedAudio: 0,
  isLoading: true
};

/**
 * Resume AudioContext for mobile autoplay policy compliance
 */
function resumeAudioContext() {
  if (isAudioContextResumed) return;
  
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      isAudioContextResumed = true;
      console.log('AudioContext resumed');
    });
  } else {
    isAudioContextResumed = true;
  }
}

/**
 * Load and decode audio file into Web Audio buffer
 * Includes comprehensive error handling and loading state tracking
 * @param {number} padNumber - Pad number (1-11)
 * @param {string} filePath - Path to audio file
 */
async function loadAudioBuffer(padNumber, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${filePath}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error(`Empty audio buffer for pad ${padNumber}`);
    }
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers[padNumber] = audioBuffer;
    audioLoadingState.loadedAudio++;
    
  } catch (error) {
    console.error(`Failed to load audio for pad ${padNumber}:`, error);
    // Gracefully handle missing audio files
  } finally {
    audioLoadingState.loadedAudio++;
  }
}

/**
 * Load all sound buffers during initialization
 */
async function loadAllAudio() {
  const promises = [];
  for (const [padNum, sound] of Object.entries(padSounds)) {
    promises.push(loadAudioBuffer(padNum, sound.file));
  }
  await Promise.all(promises);
}

/**
 * Add visual feedback to pad button
 * @param {number} padNumber - Pad number to activate
 */
function activatePadButton(padNumber) {
  const padElement = document.getElementById(`pad-${padNumber}`);
  if (!padElement) return;

  const button = padElement.querySelector('button');
  if (!button) return;

  button.classList.add('clicked');
  setTimeout(() => {
    button.classList.remove('clicked');
  }, 100);
}

/**
 * Play sound for specified pad using Web Audio API
 * Enables low-latency, multi-voice playback with proper resource management
 * @param {number} padNumber - Pad number to play
 */
function playPadSound(padNumber) {
  try {
    resumeAudioContext();
    activatePadButton(padNumber);
    
    if (!audioBuffers[padNumber]) {
      console.warn(`Audio buffer for pad ${padNumber} not available`);
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[padNumber];
    source.connect(audioContext.destination);
    source.start(0);

    playingSources.push(source);
    
    // Clean up source from array when playback completes
    source.onended = () => {
      const index = playingSources.indexOf(source);
      if (index > -1) {
        playingSources.splice(index, 1);
      }
    };
    
  } catch (error) {
    console.error(`Error playing pad ${padNumber}:`, error);
  }
}

/**
 * Stop all currently playing sounds
 * Safely clears all active playback sources
 */
function stopAllSounds() {
  try {
    activatePadButton(16);
    playingSources.forEach(source => {
      if (source && !source.context.closed) {
        source.stop();
      }
    });
    playingSources.length = 0;
  } catch (error) {
    console.error('Error stopping sounds:', error);
  }
}

/**
 * Initialize event listeners and load audio on DOM ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎛️ MPC20 initializing...');
  
  await loadAllAudio();
  
  audioLoadingState.isLoading = false;
  console.log(`✅ Audio loaded: ${audioLoadingState.loadedAudio}/${audioLoadingState.totalAudio} files`);

  // Attach click handlers to pads 1-11
  for (let i = 1; i <= 11; i++) {
    const padElement = document.getElementById(`pad-${i}`);
    if (padElement) {
      const button = padElement.querySelector('button');
      if (button) {
        button.addEventListener('click', () => playPadSound(i));
      }
    }
  }

  // Attach click handler to pad 16 (stop all)
  const pausePad = document.getElementById('pad-16');
  if (pausePad) {
    const button = pausePad.querySelector('button');
    if (button) {
      button.addEventListener('click', stopAllSounds);
    }
  }

  // Initialize info modal
  initializeInfoModal();
  
  console.log('🎵 MPC20 ready for playback');
});

/**
 * Handle keyboard input for pad triggering
 * Supports both English and Korean input methods using physical key codes
 */
document.addEventListener('keydown', (e) => {
  const code = e.code;
  
  for (const [padNum, sound] of Object.entries(padSounds)) {
    if (sound.code === code) {
      playPadSound(parseInt(padNum));
      break;
    }
  }

  if (code === 'Digit4') {
    stopAllSounds();
  }
});

/**
 * Provide visual feedback on mouse interaction
 */
document.addEventListener('mousedown', (e) => {
  const button = e.target.closest('.pad button');
  if (button) {
    const padElement = button.closest('.pad');
    const padId = padElement?.id;
    if (padId) {
      const padNum = parseInt(padId.replace('pad-', ''));
      if (padNum) {
        button.classList.add('clicked');
      }
    }
  }
});

document.addEventListener('mouseup', () => {
  document.querySelectorAll('.pad button').forEach(btn => {
    btn.classList.remove('clicked');
  });
});

/**
 * Info modal functionality
 */
function initializeInfoModal() {
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoBtn = document.getElementById('close-info-btn');

  function openInfoModal() {
    infoModal.classList.add('active');
  }

  function closeInfoModal() {
    infoModal.classList.remove('active');
  }

  if (infoBtn) {
    infoBtn.addEventListener('click', openInfoModal);
  }

  if (closeInfoBtn) {
    closeInfoBtn.addEventListener('click', closeInfoModal);
  }

  if (infoModal) {
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        closeInfoModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInfoModal();
    }
  });
}

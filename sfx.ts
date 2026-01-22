
// A simple sound effects manager

const sfxCache: { [key: string]: HTMLAudioElement } = {};

// NOTE: These are placeholder paths. Actual sound files would need to be hosted.
const sfxFiles = {
  fire: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/fire.mp3',
  snap: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/snap.mp3',
  match: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/match.mp3',
  chevron_lock: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/chevron_lock.mp3',
  gate_open: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/gate_open.mp3',
  game_over: 'https://cdn.jsdelivr.net/gh/dev-new-experience/workspace-template-react/sfx/game_over.mp3',
};

let isAudioUnlocked = false;

// This function must be called from a user-initiated event (e.g., a click)
// to unlock the audio context in modern browsers.
export const unlockAudio = () => {
  if (isAudioUnlocked) return;
  
  // A common trick to get around autoplay policies is to load all sounds
  // and attempt to play them muted on the first user interaction.
  Object.values(sfxFiles).forEach(file => {
      const audio = new Audio(file);
      audio.volume = 0;
      audio.play().catch(() => {});
      audio.pause();
  });

  isAudioUnlocked = true;
};


export const playSfx = (name: keyof typeof sfxFiles) => {
  if (!isAudioUnlocked) {
    // Silently fail if audio context is not yet unlocked.
    return;
  }

  if (!sfxCache[name]) {
    sfxCache[name] = new Audio(sfxFiles[name]);
  }
  
  // Play the sound
  sfxCache[name].currentTime = 0;
  sfxCache[name].play().catch(error => console.error(`Could not play sound: ${name}`, error));
};

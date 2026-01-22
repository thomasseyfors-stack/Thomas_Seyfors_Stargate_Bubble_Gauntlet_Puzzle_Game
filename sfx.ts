
// A simple sound effects manager

const sfxCache: { [key: string]: HTMLAudioElement } = {};

// Valid sound file URLs to replace the broken placeholders.
const sfxFiles = {
  fire: 'https://cdn.freesound.org/previews/220/220172_3982709-lq.mp3', // Sci-fi laser fire
  snap: 'https://cdn.freesound.org/previews/51/51899_48425-lq.mp3', // Soft pop/snap
  match: 'https://cdn.freesound.org/previews/391/391712_5121236-lq.mp3', // Positive chime
  chevron_lock: 'https://cdn.freesound.org/previews/215/215694_4016738-lq.mp3', // Mechanical lock
  gate_open: 'https://cdn.freesound.org/previews/415/415720_6142149-lq.mp3', // Whoosh/activation
  game_over: 'https://cdn.freesound.org/previews/403/403405_5121236-lq.mp3', // Sad fail sound
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

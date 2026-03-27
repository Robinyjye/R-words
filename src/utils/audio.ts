let audioCtx: AudioContext | null = null;
let keystrokeBuffer: AudioBuffer | null = null;
let successBuffer: AudioBuffer | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Preload sounds - Removed external fetching to avoid "Failed to fetch" errors
const loadSounds = async () => {
  // We rely on synthesized sounds as they are more reliable than external assets
  console.log('Using synthesized sounds for audio feedback');
};

// Start loading immediately
loadSounds();

export const playKeystrokeSound = (key?: string) => {
  try {
    const ctx = getAudioContext();
    
    if (keystrokeBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = keystrokeBuffer;
      
      // Add slight pitch randomization for a more mechanical feel
      // (Every key on a mechanical keyboard sounds slightly different)
      const playbackRate = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
      source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.1; // Adjusted volume
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      return;
    }

    // Fallback to a "clicky" synthesized sound if buffer not loaded
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square'; // Square wave gives a more "clicky" mechanical feel
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const playComboSound = (combo: number) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    const freq = 440 * Math.pow(1.05946, Math.min(combo, 12));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.2);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (successBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = successBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.2;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      return;
    }

    // Old simple sine wave sound
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.3);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const playChimeArpeggio = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // A bright, pleasant chime arpeggio (C major 7th feel)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + (i * 0.05);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create a slightly dissonant, low-pitched sound for error
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(155, now); // Slightly detuned for dissonance
    osc2.frequency.exponentialRampToValueAtTime(105, now + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const playSnareDrum = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // 1. The "Thump" (Drum head)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    // 2. The "Snare" (Noise)
    const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.Q.setValueAtTime(1, now);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
    noise.start(now);
    noise.stop(now + 0.15);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export const speakWord = (word: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

export const speakWordAndExample = (word: string, example?: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utterance1 = new SpeechSynthesisUtterance(word);
    utterance1.lang = 'en-US';
    utterance1.rate = 0.9;
    window.speechSynthesis.speak(utterance1);
    
    if (example) {
      const utterance2 = new SpeechSynthesisUtterance(example);
      utterance2.lang = 'en-US';
      utterance2.rate = 0.9;
      window.speechSynthesis.speak(utterance2);
    }
  }
};

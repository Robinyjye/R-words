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

// Preload sounds
const loadSounds = async () => {
  try {
    const ctx = getAudioContext();
    
    // Keystroke sound
    const ksResponse = await fetch('https://www.soundjay.com/communication/computer-keyboard-1.mp3');
    const ksArrayBuffer = await ksResponse.arrayBuffer();
    keystrokeBuffer = await ctx.decodeAudioData(ksArrayBuffer);
    
    // Success sound
    const scResponse = await fetch('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    const scArrayBuffer = await scResponse.arrayBuffer();
    successBuffer = await ctx.decodeAudioData(scArrayBuffer);
  } catch (e) {
    console.error('Failed to load sounds', e);
  }
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

    // Fallback
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
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

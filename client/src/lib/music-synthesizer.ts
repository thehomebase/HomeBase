export type TrackType = "elegant" | "modern" | "upbeat" | "cinematic" | "acoustic";

const VALID_TRACKS: TrackType[] = ["elegant", "modern", "upbeat", "cinematic", "acoustic"];

function isValidTrack(track: string): track is TrackType {
  return VALID_TRACKS.includes(track as TrackType);
}

const NOTES: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

function createReverb(ctx: AudioContext, duration = 2, decay = 2): ConvolverNode {
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  convolver.buffer = impulse;
  return convolver;
}

function playNote(ctx: AudioContext, dest: AudioNode, freq: number, startTime: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.05);
  env.gain.setValueAtTime(gain, startTime + duration * 0.6);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(env);
  env.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playPluck(ctx: AudioContext, dest: AudioNode, freq: number, startTime: number, duration: number, gain = 0.12) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  osc2.frequency.setValueAtTime(freq * 2, startTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(freq * 4, startTime);
  filter.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + duration);
  env.gain.setValueAtTime(gain, startTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(env);
  env.connect(dest);
  osc.start(startTime);
  osc2.start(startTime);
  osc.stop(startTime + duration);
  osc2.stop(startTime + duration);
}

function generateElegant(ctx: AudioContext, dest: AudioNode, duration: number) {
  const chords = [
    [NOTES.C4, NOTES.E4, NOTES.G4],
    [NOTES.A3, NOTES.C4, NOTES.E4],
    [NOTES.F3, NOTES.A3, NOTES.C4],
    [NOTES.G3, NOTES.B3, NOTES.D4],
  ];
  const beatDur = 0.6;
  let time = ctx.currentTime + 0.1;
  while (time < ctx.currentTime + duration) {
    for (const chord of chords) {
      if (time >= ctx.currentTime + duration) break;
      chord.forEach((note, i) => {
        playNote(ctx, dest, note, time + i * 0.15, beatDur * 1.8, "sine", 0.08);
      });
      playNote(ctx, dest, chord[0] / 2, time, beatDur * 3, "sine", 0.06);
      time += beatDur * 4;
    }
  }
}

function generateModern(ctx: AudioContext, dest: AudioNode, duration: number) {
  const padFreqs = [NOTES.C3, NOTES.E3, NOTES.G3];
  let time = ctx.currentTime + 0.1;
  const padDur = 4;
  while (time < ctx.currentTime + duration) {
    padFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.04, time + 1);
      env.gain.setValueAtTime(0.04, time + padDur - 1);
      env.gain.linearRampToValueAtTime(0, time + padDur);
      osc.connect(env);
      env.connect(dest);
      osc.start(time);
      osc.stop(time + padDur);
    });

    const melodyNotes = [NOTES.G4, NOTES.E5, NOTES.C5, NOTES.D5];
    melodyNotes.forEach((note, i) => {
      if (time + i * 1 < ctx.currentTime + duration) {
        playNote(ctx, dest, note, time + i * 1, 0.8, "sine", 0.05);
      }
    });
    time += padDur;
  }
}

function generateUpbeat(ctx: AudioContext, dest: AudioNode, duration: number) {
  const chords = [
    [NOTES.C4, NOTES.E4, NOTES.G4],
    [NOTES.G3, NOTES.B3, NOTES.D4],
    [NOTES.A3, NOTES.C4, NOTES.E4],
    [NOTES.F3, NOTES.A3, NOTES.C4],
  ];
  const beatDur = 0.35;
  let time = ctx.currentTime + 0.1;
  while (time < ctx.currentTime + duration) {
    for (const chord of chords) {
      if (time >= ctx.currentTime + duration) break;
      for (let beat = 0; beat < 4; beat++) {
        const noteIdx = beat % chord.length;
        playPluck(ctx, dest, chord[noteIdx], time + beat * beatDur, beatDur * 0.8, 0.08);
      }
      playNote(ctx, dest, chord[0] / 2, time, beatDur * 4, "sine", 0.05);
      time += beatDur * 4;
    }
  }
}

function generateCinematic(ctx: AudioContext, dest: AudioNode, duration: number) {
  let time = ctx.currentTime + 0.1;
  const droneDur = 6;
  const droneFreqs = [NOTES.C3, NOTES.G3];
  while (time < ctx.currentTime + duration) {
    droneFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.linearRampToValueAtTime(freq * 1.005, time + droneDur);
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.05, time + 2);
      env.gain.setValueAtTime(0.05, time + droneDur - 2);
      env.gain.linearRampToValueAtTime(0, time + droneDur);
      osc.connect(env);
      env.connect(dest);
      osc.start(time);
      osc.stop(time + droneDur);
    });

    const shimmerNotes = [NOTES.E5, NOTES.G5, NOTES.C5];
    shimmerNotes.forEach((note, i) => {
      if (time + 2 + i * 1.5 < ctx.currentTime + duration) {
        playNote(ctx, dest, note, time + 2 + i * 1.5, 1.5, "sine", 0.03);
      }
    });
    time += droneDur;
  }
}

function generateAcoustic(ctx: AudioContext, dest: AudioNode, duration: number) {
  const chords = [
    [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.C4],
    [NOTES.A3, NOTES.C4, NOTES.E4],
    [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.D4],
    [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.G4],
  ];
  const beatDur = 0.45;
  let time = ctx.currentTime + 0.1;
  while (time < ctx.currentTime + duration) {
    for (const chord of chords) {
      if (time >= ctx.currentTime + duration) break;
      chord.forEach((note, i) => {
        playPluck(ctx, dest, note, time + i * 0.08, beatDur * 3, 0.07);
      });
      for (let s = 1; s < 4; s++) {
        const strumNotes = [chord[chord.length - 1], chord[Math.floor(chord.length / 2)]];
        strumNotes.forEach((note, i) => {
          if (time + s * beatDur + i * 0.06 < ctx.currentTime + duration) {
            playPluck(ctx, dest, note, time + s * beatDur + i * 0.06, beatDur * 1.5, 0.05);
          }
        });
      }
      time += beatDur * 4;
    }
  }
}

export interface BundledTrack {
  id: string;
  label: string;
  file: string;
  artist: string;
  source: string;
}

export const BUNDLED_TRACKS: BundledTrack[] = [
  {
    id: "pixabay-fashion-luxury",
    label: "Fashion & Luxury",
    file: "/music/fashion-beauty-luxury-music-331431.mp3",
    artist: "lNPLUSMUSIC",
    source: "Pixabay",
  },
  {
    id: "pixabay-fun-travel",
    label: "Fun Exciting Travel",
    file: "/music/fun-exciting-travel-background-music-350761.mp3",
    artist: "MFCC",
    source: "Pixabay",
  },
  {
    id: "pixabay-luxury-electronic",
    label: "Luxury Electronic",
    file: "/music/luxury-luxury-music-490006.mp3",
    artist: "The_Mountain",
    source: "Pixabay",
  },
  {
    id: "pixabay-real-estate",
    label: "Real Estate",
    file: "/music/real-estate-132405.mp3",
    artist: "The_Mountain",
    source: "Pixabay",
  },
];

export function isBundledTrack(trackId: string): boolean {
  return BUNDLED_TRACKS.some(t => t.id === trackId);
}

export interface MusicPlayer {
  start: () => void;
  stop: () => void;
  getDestination: () => MediaStreamAudioDestinationNode | null;
  isActive: () => boolean;
}

export function createMusicPlayer(track: string, duration: number): MusicPlayer {
  const safeTrack: TrackType = isValidTrack(track) ? track : "elegant";
  let ctx: AudioContext | null = null;
  let streamDest: MediaStreamAudioDestinationNode | null = null;
  let active = false;

  return {
    start() {
      if (active) return;
      ctx = new AudioContext();
      streamDest = ctx.createMediaStreamDestination();
      const reverb = createReverb(ctx, 3, 2.5);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime);

      reverb.connect(masterGain);
      masterGain.connect(ctx.destination);
      masterGain.connect(streamDest);

      const generators: Record<TrackType, (ctx: AudioContext, dest: AudioNode, dur: number) => void> = {
        elegant: generateElegant,
        modern: generateModern,
        upbeat: generateUpbeat,
        cinematic: generateCinematic,
        acoustic: generateAcoustic,
      };
      generators[safeTrack](ctx, reverb, duration + 2);
      active = true;
    },
    stop() {
      if (ctx) {
        ctx.close();
        ctx = null;
        streamDest = null;
      }
      active = false;
    },
    getDestination() {
      return streamDest;
    },
    isActive() {
      return active;
    },
  };
}

export function createMusicForExport(track: string, duration: number): { stream: MediaStream; stop: () => void } {
  const safeTrack: TrackType = isValidTrack(track) ? track : "elegant";
  const ctx = new AudioContext();
  const streamDest = ctx.createMediaStreamDestination();
  const reverb = createReverb(ctx, 3, 2.5);
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime + duration - 1);
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  reverb.connect(masterGain);
  masterGain.connect(streamDest);

  const generators: Record<TrackType, (ctx: AudioContext, dest: AudioNode, dur: number) => void> = {
    elegant: generateElegant,
    modern: generateModern,
    upbeat: generateUpbeat,
    cinematic: generateCinematic,
    acoustic: generateAcoustic,
  };
  generators[safeTrack](ctx, reverb, duration + 2);

  return {
    stream: streamDest.stream,
    stop() { ctx.close(); },
  };
}

export function createBundledMusicPlayer(trackId: string, duration: number): MusicPlayer {
  const track = BUNDLED_TRACKS.find(t => t.id === trackId);
  let audio: HTMLAudioElement | null = null;
  let ctx: AudioContext | null = null;
  let streamDest: MediaStreamAudioDestinationNode | null = null;
  let active = false;

  return {
    start() {
      if (active) return;
      audio = new Audio(track?.file || "");
      audio.loop = true;
      audio.volume = 0.6;
      ctx = new AudioContext();
      streamDest = ctx.createMediaStreamDestination();
      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.connect(streamDest);
      audio.play().catch(() => {});
      active = true;
    },
    stop() {
      if (audio) {
        audio.pause();
        audio.src = "";
        audio = null;
      }
      if (ctx) {
        ctx.close();
        ctx = null;
        streamDest = null;
      }
      active = false;
    },
    getDestination() {
      return streamDest;
    },
    isActive() {
      return active;
    },
  };
}

export async function createBundledMusicForExport(trackId: string, duration: number): Promise<{ stream: MediaStream; stop: () => void }> {
  const track = BUNDLED_TRACKS.find(t => t.id === trackId);
  const audio = new Audio(track?.file || "");
  audio.loop = true;
  audio.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    audio.addEventListener("canplaythrough", () => resolve(), { once: true });
    audio.addEventListener("error", () => reject(new Error("Failed to load music")), { once: true });
    audio.load();
  });

  const ctx = new AudioContext();
  const streamDest = ctx.createMediaStreamDestination();
  const source = ctx.createMediaElementSource(audio);
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
  gainNode.gain.setValueAtTime(0.6, ctx.currentTime + duration - 1);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  source.connect(gainNode);
  gainNode.connect(streamDest);
  audio.play().catch(() => {});

  return {
    stream: streamDest.stream,
    stop() {
      audio.pause();
      audio.src = "";
      ctx.close();
    },
  };
}

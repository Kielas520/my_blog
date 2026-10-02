import { mkdir, writeFile } from 'node:fs/promises';

// Original phrases synthesized from oscillators; no samples or third-party recordings.
const sampleRate = 22050;
const output = new URL('../public/audio/', import.meta.url);
const pieces = [
  {
    file: 'rain-letter.wav', name: '雨声里的信', beat: 0.64, voice: 'piano',
    melody: [76,79,83,81,79,76,74,71,72,76,79,76,74,72,71,67,69,72,76,79,77,76,72,69,71,74,79,77,76,74,71,72],
    chords: [[60,64,67],[57,60,64],[53,57,60],[55,59,62]],
  },
  {
    file: 'spring-postcard.wav', name: '春天寄来的明信片', beat: 0.48, voice: 'box',
    melody: [79,83,86,83,81,79,76,74,76,79,84,83,79,76,74,72,77,81,84,81,79,77,76,72,74,79,83,81,79,76,74,72],
    chords: [[60,64,67],[57,60,64],[53,57,60],[55,59,62]],
  },
  {
    file: 'sea-night-radio.wav', name: '海风与晚安电台', beat: 0.72, voice: 'soft',
    melody: [74,78,81,78,76,74,71,69,71,74,78,76,74,71,69,66,67,71,74,78,76,74,71,67,69,73,76,74,73,69,66,62],
    chords: [[50,54,57],[47,50,54],[43,47,50],[45,49,52]],
  },
];

function render(piece) {
  const beats = piece.melody.length * 2;
  const duration = beats * piece.beat + 3;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const addNote = (midi, start, gain, decay, voice) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const length = Math.min(Math.ceil(3 * sampleRate), samples.length - Math.floor(start * sampleRate));
    const offset = Math.floor(start * sampleRate);
    for (let index = 0; index < length; index++) {
      const t = index / sampleRate;
      const envelope = Math.min(1, t / 0.008) * Math.exp(-decay * t);
      const phase = 2 * Math.PI * frequency * t;
      const second = voice === 'box' ? 0.32 : voice === 'piano' ? 0.19 : 0.08;
      const third = voice === 'box' ? 0.10 : 0.035;
      samples[offset + index] += gain * envelope * (Math.sin(phase) + second * Math.sin(2 * phase) + third * Math.sin(3 * phase));
    }
  };
  for (let beat = 0; beat < beats; beat++) {
    const phrase = beat % piece.melody.length;
    const note = piece.melody[phrase];
    addNote(note, beat * piece.beat, 0.20, piece.voice === 'box' ? 3.5 : 2.6, piece.voice);
    // The second phrase has a quiet upper response rather than a copied first pass.
    if (beat >= piece.melody.length && beat % 4 === 2) {
      addNote(note + 12, (beat + 0.5) * piece.beat, 0.045, 3.7, 'box');
    }
    const chord = piece.chords[Math.floor(beat / 8) % piece.chords.length];
    addNote(chord[beat % chord.length], beat * piece.beat, 0.055, 2.2, 'soft');
    if (beat % 4 === 0) addNote(chord[0] - 12, beat * piece.beat, 0.035, 1.8, 'soft');
  }
  const pcm = Buffer.alloc(44 + samples.length * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(sampleRate, 24); pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36);
  pcm.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index++) {
    const fade = Math.min(1, (samples.length - index) / (sampleRate * 0.4));
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[index] * fade)) * 32767), 44 + index * 2);
  }
  return { pcm, duration };
}

await mkdir(output, { recursive: true });
for (const piece of pieces) {
  const { pcm, duration } = render(piece);
  await writeFile(new URL(piece.file, output), pcm);
  console.log(`${piece.name}: ${piece.file}, ${duration.toFixed(2)}s, ${pcm.length} bytes`);
}

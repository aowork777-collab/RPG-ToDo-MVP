// Sound is synthesized locally. No downloads, tracking, or autoplay.
export class BattleAudio {
  constructor() { this.enabled = false; this.context = null; }
  async toggle() {
    if (this.enabled) { this.enabled = false; return false; }
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      this.context ||= new AudioContext();
      await this.context.resume();
      this.enabled = this.context.state === "running";
      if (this.enabled) this.play("select");
    } catch { this.enabled = false; }
    return this.enabled;
  }
  play(type) {
    if (!this.enabled || this.context?.state !== "running") return;
    const notes = { select: [660], attack: [220, 110], hurt: [120, 70],
      slash: [880, 440, 160], charge: [196, 294, 392, 588], ultimate: [130, 261, 392, 523, 784, 1046],
      heal: [440, 660, 880], guard: [260, 390], victory: [523, 659, 784, 1046], defeat: [220, 165, 110] }[type] || [330];
    notes.forEach((frequency, index) => {
      const start = this.context.currentTime + index * 0.085;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type === "attack" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(start); oscillator.stop(start + 0.2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  destroy() { this.context?.close().catch(() => {}); this.enabled = false; }
}

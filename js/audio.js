/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Audio Synthesizer (Web Audio API)
 * 
 * Simulates the physical 5V active piezo buzzer (GPIO 23) and IR sensor audio beeps.
 */

class BusAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.alarmInterval = null;
    this.isAlarmPlaying = false;
    this.volume = 0.25;

    // Load saved mute preference
    const savedMute = localStorage.getItem('smartbus_audio_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  // Ensure AudioContext is initialized after user interaction
  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('smartbus_audio_muted', muted);
    if (this.isMuted) {
      this.stopOverloadAlarm();
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  // Tone generator helper
  playTone(frequency, type = 'sine', duration = 0.15, gainMultiplier = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      const targetGain = this.volume * gainMultiplier;
      gain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Beep when passenger enters (IR Sensor 1)
  playPassengerEnter() {
    if (this.isMuted) return;
    // Pleasant ascending chime (980 Hz)
    this.playTone(980, 'sine', 0.1, 0.7);
  }

  // Beep when passenger exits (IR Sensor 2)
  playPassengerExit() {
    if (this.isMuted) return;
    // Pleasant lower chime (620 Hz)
    this.playTone(620, 'sine', 0.1, 0.7);
  }

  // Double beep when warning threshold (80%) reached
  playWarningChime() {
    if (this.isMuted) return;
    this.init();
    this.playTone(850, 'triangle', 0.16, 0.9);
    setTimeout(() => {
      this.playTone(850, 'triangle', 0.16, 0.9);
    }, 200);
  }

  // Urgent piezo buzzer alarm pattern for Overload Condition (2.4 kHz)
  startOverloadAlarm() {
    if (this.isMuted || this.isAlarmPlaying) return;
    this.init();
    this.isAlarmPlaying = true;

    // Rapid pulsing piezo tone at 2400 Hz (authentic ESP32 piezo frequency)
    const playBeep = () => {
      if (!this.isAlarmPlaying || this.isMuted) return;
      this.playTone(2400, 'square', 0.12, 0.85);
      setTimeout(() => {
        if (!this.isAlarmPlaying || this.isMuted) return;
        this.playTone(2400, 'square', 0.12, 0.85);
      }, 160);
    };

    playBeep();
    this.alarmInterval = setInterval(playBeep, 650);
  }

  stopOverloadAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Sound test button for testing the hardware buzzer in the dashboard
  testBuzzer() {
    this.init();
    this.playTone(2400, 'square', 0.35, 1.0);
  }
}

// Global audio synthesizer instance
window.busAudio = new BusAudioSynthesizer();

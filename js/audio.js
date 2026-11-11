/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Audio Synthesizer (Web Audio API)
 * Generates alert chimes and emergency piezo buzzer alarms natively.
 */

class BusAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.alarmInterval = null;
    this.isAlarmPlaying = false;
    
    // Check saved mute preference
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

  // Tone generator helper
  playTone(frequency, type = 'sine', duration = 0.15, volume = 0.2) {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
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
    this.playTone(880, 'sine', 0.1, 0.15); // A5 high pleasant blip
  }

  // Beep when passenger exits (IR Sensor 2)
  playPassengerExit() {
    if (this.isMuted) return;
    this.playTone(660, 'sine', 0.1, 0.15); // E5 lower pleasant blip
  }

  // Double beep when warning threshold (80%) reached
  playWarningChime() {
    if (this.isMuted) return;
    this.init();
    this.playTone(740, 'triangle', 0.18, 0.25);
    setTimeout(() => {
      this.playTone(740, 'triangle', 0.18, 0.25);
    }, 220);
  }

  // Rapid urgent piezo buzzer pattern for Overload Condition
  startOverloadAlarm() {
    if (this.isMuted || this.isAlarmPlaying) return;
    this.init();
    this.isAlarmPlaying = true;

    const triggerBurst = () => {
      if (!this.isAlarmPlaying || this.isMuted) return;
      
      // Hardware piezo buzzer sound: harsh square wave pulse at 2400 Hz (standard buzzer resonant freq)
      this.playTone(2400, 'square', 0.12, 0.3);
      setTimeout(() => {
        if (this.isAlarmPlaying) this.playTone(2400, 'square', 0.12, 0.3);
      }, 160);
      setTimeout(() => {
        if (this.isAlarmPlaying) this.playTone(2800, 'square', 0.20, 0.35);
      }, 320);
    };

    triggerBurst();
    this.alarmInterval = setInterval(triggerBurst, 1200);
  }

  stopOverloadAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }
}

// Global instance
window.busAudio = new BusAudioSynthesizer();

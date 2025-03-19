// Create an audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create an oscillator
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

// Configure the oscillator
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

// Configure the gain (volume)
gainNode.gain.setValueAtTime(0, audioContext.currentTime);
gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

// Start and stop the oscillator
oscillator.start(audioContext.currentTime);
oscillator.stop(audioContext.currentTime + 0.5);

// Record the audio
const mediaRecorder = new MediaRecorder(audioContext.destination.stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notification.mp3';
    a.click();
    URL.revokeObjectURL(url);
};

mediaRecorder.start();
setTimeout(() => mediaRecorder.stop(), 500); 
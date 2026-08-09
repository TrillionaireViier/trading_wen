import React, { useState, useRef } from 'react';

const ScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        chunksRef.current = []; // reset
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };

      // Handle user clicking "Stop sharing" from browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setVideoURL(null); // clear previous
      setTranscript(''); // reset transcript
      
      // Start AI Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.log('Speech recognition error', event.error);
        };
        
        recognitionRef.current.start();
      } else {
        console.warn("Speech Recognition not supported in this browser.");
      }
    } catch (err) {
      console.error("Error accessing screen/audio:", err);
      alert("Failed to start recording. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadVideo = () => {
    if (!videoURL) return;
    const a = document.createElement('a');
    a.href = videoURL;
    a.download = `screen-recording-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-meeting-notes-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '12px', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎥 Screen Recorder Pro</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Record your screen and microphone instantly right from the browser. No installation required.</p>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        {!isRecording ? (
          <button 
            className="btn-primary" 
            style={{ padding: '15px 30px', fontSize: '1.2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={startRecording}
          >
            <span style={{ fontSize: '1.5rem' }}>⏺</span> Start Recording
          </button>
        ) : (
          <button 
            className="btn-primary" 
            style={{ padding: '15px 30px', fontSize: '1.2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', background: '#ef4444' }}
            onClick={stopRecording}
          >
            <span style={{ fontSize: '1.5rem' }}>⏹</span> Stop Recording
          </button>
        )}
      </div>

      {isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem', animation: 'pulse 1.5s infinite' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
          Recording in progress...
        </div>
      )}

      {(isRecording || transcript) && (
        <div style={{ width: '100%', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', padding: '20px', borderRadius: '12px', marginTop: '20px', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '15px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🤖 AI Meeting Advisor (Live Notes)
          </h3>
          <div style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
            {transcript || <span style={{ color: 'var(--text-secondary)' }}>Waiting for speech...</span>}
          </div>
        </div>
      )}

      {videoURL && !isRecording && (
        <div style={{ width: '100%', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Preview & Downloads</h3>
          <video 
            src={videoURL} 
            controls 
            style={{ width: '100%', borderRadius: '8px', marginBottom: '20px', background: '#000' }}
          />
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              className="btn-primary" 
              style={{ padding: '12px 24px', fontSize: '1.1rem', flex: 1, background: '#10b981' }}
              onClick={downloadVideo}
            >
              ⬇ Video (.webm)
            </button>
            <button 
              className="btn-primary" 
              style={{ padding: '12px 24px', fontSize: '1.1rem', flex: 1, background: '#3b82f6' }}
              onClick={downloadTranscript}
              disabled={!transcript}
            >
              📝 AI Notes (.txt)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;

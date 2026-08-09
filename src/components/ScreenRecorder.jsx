import React, { useState, useRef } from 'react';

const ScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

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

      {videoURL && !isRecording && (
        <div style={{ width: '100%', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Preview</h3>
          <video 
            src={videoURL} 
            controls 
            style={{ width: '100%', borderRadius: '8px', marginBottom: '20px', background: '#000' }}
          />
          <button 
            className="btn-primary" 
            style={{ padding: '12px 24px', fontSize: '1.1rem', width: '100%', background: '#10b981' }}
            onClick={downloadVideo}
          >
            ⬇ Download Video (.webm)
          </button>
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;

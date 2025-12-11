import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import ParticleField from './components/ParticleField';
import OverlayUI from './components/OverlayUI';
import Scanner from './components/Scanner';

import Login from './components/Login';

// Desktop View Component
const DesktopView = () => {
  const socketRef = useRef(null);
  const [sessionId, setSessionId] = useState('');
  const [mode, setMode] = useState('sphere'); // sphere, paired
  const [authUser, setAuthUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [visualSequence, setVisualSequence] = useState(null); // Global Matcher Sequence
  const [challengeTimestamp, setChallengeTimestamp] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(''); // QR Code for easy scanning
  const [showQR, setShowQR] = useState(false); // Toggle QR display

  useEffect(() => {
    // Connect to server (relative path via Vite proxy)
    const newSocket = io();
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to server, requesting session...');
      // Request a new session (Global Matcher)
      newSocket.emit('create-session');
    });

    // Receive session details (ID + Challenge + Visual Sequence)
    newSocket.on('session-created', ({ sessionId, challenge, timestamp, sequence }) => {
      console.log('✅ Session Created:', sessionId);
      console.log('🎨 Visual Sequence:', sequence);
      setSessionId(sessionId);
      setChallenge(challenge);
      setChallengeTimestamp(timestamp);
      setVisualSequence(sequence);
    });

    // Legacy support (if needed)
    newSocket.on('session-challenge', ({ challenge: ch, timestamp }) => {
      console.log('🔑 Received challenge:', ch);
      setChallenge(ch);
      setChallengeTimestamp(timestamp);
    });

    newSocket.on('auth-success', (user) => {
      console.log('Auth Successful:', user);
      setAuthUser(user);
      setMode('paired');
    });

    return () => newSocket.disconnect();
  }, []);

  // Make challenge available globally for scanner
  useEffect(() => {
    if (challenge && challengeTimestamp) {
      window.currentChallenge = { challenge, timestamp: challengeTimestamp };
    }
  }, [challenge, challengeTimestamp]);

  // Generate QR code when session is created
  useEffect(() => {
    if (sessionId && challenge && challengeTimestamp) {
      const qrData = JSON.stringify({
        sessionId,
        challenge,
        timestamp: challengeTimestamp
      });
      QRCode.toDataURL(qrData, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => setQrCodeUrl(url));
    }
  }, [sessionId, challenge, challengeTimestamp]);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden">

      {/* Pairing Zone Container */}
      <div className={`relative z-10 group transition-all duration-1000 ${mode === 'paired' ? 'scale-110' : ''}`}>
        {/* The "Code" Box */}
        <div className={`relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] bg-black rounded-[3rem] overflow-hidden shadow-2xl ring-1 transition-all duration-500 ${mode === 'paired' ? 'ring-green-500 shadow-green-500/50' : 'ring-white/10 hover:ring-white/20'}`}>

          {/* 3D Scene - Only show if not paired or as background */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${mode === 'paired' ? 'opacity-20' : 'opacity-100'}`}>
            <Canvas
              camera={{ position: [0, 0, 4.5], fov: 45 }}
              gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
              className="w-full h-full"
            >
              <color attach="background" args={['#000000']} />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />

              <Suspense fallback={null}>
                <ParticleField count={4000} mode="sphere" visualOTP={visualSequence} />
              </Suspense>

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={1.5}
                enableDamping
              />
            </Canvas>
          </div>

          {/* Inner Glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"></div>

          {/* QR Code Overlay - For Easy Demo Scanning */}
          {showQR && qrCodeUrl && mode !== 'paired' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
              <img src={qrCodeUrl} alt="Scan to authenticate" className="w-[280px] h-[280px]" />
            </div>
          )}

          {/* Paired / Welcome Overlay */}
          {mode === 'paired' && authUser && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-700">
              <img
                src={authUser.avatar}
                alt={authUser.name}
                className="w-24 h-24 rounded-full border-4 border-green-500 shadow-lg shadow-green-500/50 mb-4"
              />
              <h2 className="text-white font-bold text-2xl tracking-tight">{authUser.name}</h2>
              <p className="text-green-400 text-sm font-mono uppercase tracking-widest mt-1">{authUser.role}</p>
              <div className="mt-6 px-4 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs">
                Authenticated via Visual Handshake
              </div>
            </div>
          )}
        </div>

        {/* Outer Glow Pulse */}
        <div className={`absolute -inset-4 rounded-[3.5rem] blur-xl -z-10 transition-colors duration-500 ${mode === 'paired' ? 'bg-green-500/30' : 'bg-indigo-500/20 animate-pulse'}`}></div>
      </div>

      {/* UI Overlay - Hide when paired */}
      {mode !== 'paired' && <OverlayUI mode={mode} />}

      {/* QR Toggle Button - For Demo */}
      {mode !== 'paired' && (
        <button
          onClick={() => setShowQR(!showQR)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full text-white font-medium transition-all flex items-center gap-2"
        >
          {showQR ? '🌀 Show Nebula' : '📱 Show QR Code'}
        </button>
      )}

      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(30,30,40,0.5)_0%,#000_70%)]"></div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DesktopView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/scanner" element={<Scanner />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

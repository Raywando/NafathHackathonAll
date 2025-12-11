import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { CheckCircle, QrCode, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scanner as QRScanner } from '@yudiel/react-qr-scanner';

const Scanner = () => {
    const socketRef = useRef(null); // Use ref instead of state
    const [status, setStatus] = useState('scanning'); // scanning, analyzing, paired
    const [debugInfo, setDebugInfo] = useState('');
    const [scanMode, setScanMode] = useState('qr'); // 'qr' or 'visual' - default to QR for reliability
    // Camera State
    const [cameraActive, setCameraActive] = useState(false);
    const [debugStats, setDebugStats] = useState({
        score: 0,
        detecting: false,
        brightPixels: 0,
        maxL: 0
    });
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const hasDetected = useRef(false); // Prevent multiple detections
    const [challenge, setChallenge] = useState(null);
    const [challengeTimestamp, setChallengeTimestamp] = useState(null);

    const frameHistory = useRef([]); // Store captured color frames
    const decodedChars = useRef([]); // Store decoded characters
    const lastSampleTime = useRef(0);
    const isSynced = useRef(false); // Track if we've started capturing
    const syncDetectedTime = useRef(0); // When we started
    const velocity = useRef({ x: 0, y: 0 }); // Track region motion for smooth tracking
    const [detectionLog, setDetectionLog] = useState([]); // Real-time detection log
    
    // TRANSITION-BASED DETECTION
    const lastStableColor = useRef({ core: null, aura: null }); // Last confirmed stable color
    const colorBuffer = useRef([]); // Buffer for stability detection (last N samples)
    const STABILITY_THRESHOLD = 3; // Number of consistent samples to confirm a color

    // Visual Passkey Decoder Function
    // Decodes visual properties back to hex character
    const decodeVisualProperties = (hue, brightness) => {
        // Reverse the encoding: hue (0-360) and brightness (0.5-1.0) -> hex (0-f)
        const hexFromHue = Math.round((hue / 360) * 15);
        const hexFromBrightness = Math.round((brightness - 0.5) * 2 * 15);

        // Average both signals for better accuracy
        const hexValue = Math.round((hexFromHue + hexFromBrightness) / 2);
        const clampedValue = Math.max(0, Math.min(15, hexValue));

        return clampedValue.toString(16);
    };

    // Extract dominant color using RGB CHANNEL DOMINANCE - much more reliable than hue
    // Cameras distort hues but relative RGB values are more preserved
    const extractColor = (imageData, stride = 4) => {
        const data = imageData.data;
        
        let totalR = 0, totalG = 0, totalB = 0, count = 0;

        for (let i = 0; i < data.length; i += stride * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very dark pixels
            if (r + g + b < 60) continue;

            totalR += r;
            totalG += g;
            totalB += b;
            count++;
        }

        if (count === 0) return { dominant: '?', r: 0, g: 0, b: 0, saturation: 0 };

        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;
        
        const max = Math.max(avgR, avgG, avgB);
        const min = Math.min(avgR, avgG, avgB);
        const saturation = max > 0 ? (max - min) / max : 0;

        // Find dominant channel - which color is strongest?
        let dominant = '?';
        const threshold = 1.2; // Dominant channel must be 20% higher than others
        
        if (avgR > avgG * threshold && avgR > avgB * threshold) {
            dominant = 'R';
        } else if (avgG > avgR * threshold && avgG > avgB * threshold) {
            dominant = 'G';
        } else if (avgB > avgR * threshold && avgB > avgG * threshold) {
            dominant = 'B';
        } else if (avgR > avgB && avgG > avgB) {
            // Yellow-ish (R+G dominant) - map to closest
            dominant = avgR > avgG ? 'R' : 'G';
        } else if (avgG > avgR && avgB > avgR) {
            // Cyan-ish (G+B dominant)
            dominant = avgG > avgB ? 'G' : 'B';
        } else if (avgR > avgG && avgB > avgG) {
            // Magenta-ish (R+B dominant)
            dominant = avgR > avgB ? 'R' : 'B';
        }

        return {
            dominant,
            r: Math.round(avgR),
            g: Math.round(avgG),
            b: Math.round(avgB),
            saturation
        };
    };

    // Detect spherical pattern using spatial analysis - OPTIMIZED
    const detectSpherePattern = (imageData, stride = 4) => {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Analyze color distribution in concentric rings
        const rings = [
            { inner: 0, outer: 25, colors: [] },      // Center (Expanded)
            { inner: 25, outer: 45, colors: [] },     // Mid
            { inner: 45, outer: 65, colors: [] }      // Outer
        ];

        for (let y = 0; y < height; y += stride) {
            for (let x = 0; x < width; x += stride) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Skip very dark pixels
                if (r + g + b < 40) continue;

                // Assign to ring
                for (let ring of rings) {
                    if (distance >= ring.inner && distance < ring.outer) {
                        ring.colors.push({ r, g, b });
                        break;
                    }
                }
            }
        }

        // Check if we have a radial distribution (sphere/nebula characteristic)
        // Adjusted thresholds for stride
        const thresholdScale = 1 / (stride * stride); // Scale down expectations
        const hasCenter = rings[0].colors.length > 20 * thresholdScale;
        const hasMid = rings[1].colors.length > 20 * thresholdScale;
        const hasOuter = rings[2].colors.length > 10 * thresholdScale;
        const hasRadialDistribution = hasCenter && hasMid && hasOuter;

        // Check for color variety (nebula has multiple colors)
        let totalColors = [];
        rings.forEach(ring => totalColors.push(...ring.colors));

        if (totalColors.length === 0) return { isSphere: false, centerPixels: 0, midPixels: 0, outerPixels: 0, colorVariance: 0 };

        const avgR = totalColors.reduce((sum, c) => sum + c.r, 0) / totalColors.length;
        const avgG = totalColors.reduce((sum, c) => sum + c.g, 0) / totalColors.length;
        const avgB = totalColors.reduce((sum, c) => sum + c.b, 0) / totalColors.length;

        // Check color variance (nebula should have variety, not uniform)
        const variance = totalColors.reduce((sum, c) => {
            return sum + Math.abs(c.r - avgR) + Math.abs(c.g - avgG) + Math.abs(c.b - avgB);
        }, 0) / totalColors.length;

        return {
            isSphere: hasRadialDistribution,
            centerPixels: rings[0].colors.length,
            midPixels: rings[1].colors.length,
            outerPixels: rings[2].colors.length,
            colorVariance: Math.floor(variance)
        };
    };

    // Debug helper - no longer needed since we use RGB dominance directly
    // Kept for compatibility but simplified

    const [detectedRegion, setDetectedRegion] = useState(null); // { x, y, width, height } in percentages
    const lastRegionPixels = useRef(null); // Store absolute pixels for tracking
    const lastLightness = useRef(0);
    const nextSampleTime = useRef(0); // For phase-locked sampling
    const smoothedRegion = useRef(null); // For UI smoothing

    // Find the sphere location - GLOBAL COARSE SEARCH
    const findSphereLocation = (video, canvas, ctx) => {
        // CRITICAL: Check if video is ready
        if (!video || !video.videoWidth || !video.videoHeight) {
            console.warn('⚠️ Video not ready:', {
                exists: !!video,
                width: video?.videoWidth,
                height: video?.videoHeight,
                readyState: video?.readyState
            });
            return null;
        }

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        console.log('📹 Video ready:', videoWidth, 'x', videoHeight, 'readyState:', video.readyState);

        // 1. COARSE SEARCH: Scan the whole frame at low resolution (40x40)
        // This is extremely fast and finds the nebula anywhere instantly
        const coarseSize = 40;
        canvas.width = coarseSize;
        canvas.height = coarseSize;

        // Draw video to canvas
        ctx.drawImage(video, 0, 0, coarseSize, coarseSize);

        // Get pixel data
        const coarseData = ctx.getImageData(0, 0, coarseSize, coarseSize).data;

        // DEBUG: Check if we got any data at all
        if (!coarseData || coarseData.length === 0) {
            console.error('❌ No image data from canvas!');
            return null;
        }

        // DEBUG: Sample first few pixels to see what we're getting
        console.log('🎨 Sample pixels (first 3):', [
            `RGB(${coarseData[0]},${coarseData[1]},${coarseData[2]})`,
            `RGB(${coarseData[4]},${coarseData[5]},${coarseData[6]})`,
            `RGB(${coarseData[8]},${coarseData[9]},${coarseData[10]})`
        ]);

        let bestScore = 0;
        let bestX = 0;
        let bestY = 0;

        // DEBUG: Count pixels and their brightness
        let totalPixels = 0;
        let darkPixels = 0;
        let brightPixels = 0;
        let maxLightness = 0;

        for (let y = 0; y < coarseSize; y++) {
            for (let x = 0; x < coarseSize; x++) {
                totalPixels++;
                const i = (y * coarseSize + x) * 4;
                const r = coarseData[i] / 255;
                const g = coarseData[i + 1] / 255;
                const b = coarseData[i + 2] / 255;

                // Simple HSL conversion for scoring
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const l = (max + min) / 2;

                maxLightness = Math.max(maxLightness, l);

                if (l < 0.2) {
                    darkPixels++;
                    continue; // Skip dark pixels
                }

                brightPixels++;

                const d = max - min;
                const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                let h = 0;
                if (d > 0) {
                    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    else if (max === g) h = ((b - r) / d + 2) / 6;
                    else h = ((r - g) / d + 4) / 6;
                }
                h *= 360;

                // Score: Brightness + Saturation (VERY PERMISSIVE FOR DEBUG)
                let score = l * 100 + s * 50;

                // Accept ANY bright or colorful spot
                if (s > 0.2 || l > 0.5) score += 50;

                if (score > bestScore) {
                    bestScore = score;
                    bestX = x;
                    bestY = y;
                }
            }
        }

        // DEBUG LOG
        console.log('📊 Pixel Stats:', {
            total: totalPixels,
            dark: darkPixels,
            bright: brightPixels,
            maxL: maxLightness.toFixed(2),
            bestScore: bestScore.toFixed(1),
            videoSize: `${videoWidth}x${videoHeight}`
        });

        // ULTRA LOW threshold for testing - detects even very dim light
        if (bestScore < 1) {
            setDebugStats({
                score: bestScore.toFixed(1),
                detecting: false,
                brightPixels,
                maxL: maxLightness.toFixed(2)
            });
            return null;
        }

        setDebugStats({
            score: bestScore.toFixed(1),
            detecting: true,
            brightPixels,
            maxL: maxLightness.toFixed(2)
        });

        // 2. REFINE: Map back to full resolution
        // Center the 100x100 analysis box on the found coarse pixel
        const scaleX = videoWidth / coarseSize;
        const scaleY = videoHeight / coarseSize;

        const centerX = Math.floor(bestX * scaleX + scaleX / 2);
        const centerY = Math.floor(bestY * scaleY + scaleY / 2);

        // Clamp to video bounds
        const boxSize = 100;
        const x = Math.max(0, Math.min(videoWidth - boxSize, centerX - boxSize / 2));
        const y = Math.max(0, Math.min(videoHeight - boxSize, centerY - boxSize / 2));

        return {
            x, y,
            width: boxSize,
            height: boxSize,
            score: bestScore
        };
    };

    useEffect(() => {
        // ... (Auth check code remains same) ...
        // Check Auth - try both storages
        let storedUser = localStorage.getItem('authUser') || sessionStorage.getItem('authUser');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(storedUser));
        const newSocket = io();
        socketRef.current = newSocket;
        newSocket.on('connect', () => {
            newSocket.emit('get-challenge', 'demo-session');
        });
        newSocket.on('challenge-response', ({ challenge: ch, timestamp }) => {
            setChallenge(ch);
            setChallengeTimestamp(timestamp);
        });
        newSocket.on('paired-success', () => setStatus('paired'));
        return () => newSocket.disconnect();
    }, [navigate]);

    // Camera initialization - only for VISUAL mode
    useEffect(() => {
        // Only initialize camera for visual mode
        if (scanMode !== 'visual') {
            // Stop camera when switching away from visual mode
            if (streamRef.current) {
                console.log('🛑 Stopping camera (switched to QR mode)...');
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                setCameraActive(false);
            }
            return;
        }

        // Prevent duplicate initialization
        if (streamRef.current) {
            console.log('📹 Camera already initialized, skipping...');
            return;
        }

        let isMounted = true;
        const startCamera = async () => {
            try {
                console.log('📹 Requesting camera access for visual mode...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                // Check if component is still mounted and still in visual mode
                if (!isMounted || !videoRef.current || scanMode !== 'visual') {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                videoRef.current.srcObject = stream;
                streamRef.current = stream;

                // Use event-based play instead of await to avoid AbortError
                videoRef.current.onloadedmetadata = () => {
                    if (!isMounted || !videoRef.current) return;

                    videoRef.current.play()
                        .then(() => {
                            if (!isMounted) return;
                            setCameraActive(true);
                            console.log('✅ Camera active:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                            console.log('📹 Video readyState:', videoRef.current.readyState);
                            setDebugInfo('Camera ready - Point at nebula');
                        })
                        .catch(err => {
                            // Ignore AbortError - happens during hot-reload in development
                            if (err.name === 'AbortError') {
                                console.log('⚠️ Play interrupted (hot-reload), will retry...');
                                return;
                            }
                            console.error('❌ Play error:', err);
                            setDebugInfo(`Play error: ${err.message}`);
                        });
                };

            } catch (err) {
                if (!isMounted) return;
                console.error('❌ Camera access error:', err);
                setDebugInfo(`Camera error: ${err.message}`);
                setCameraActive(false);
            }
        };

        startCamera();

        // Cleanup function
        return () => {
            isMounted = false;
            if (streamRef.current) {
                console.log('🛑 Stopping camera...');
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [scanMode]); // Re-run when scan mode changes

    // Visual Passkey Decoder Loop - only runs in visual mode
    useEffect(() => {
        // Only run in visual mode when user is logged in and scanning
        if (scanMode !== 'visual' || status !== 'scanning' || !user) return;

        const analyzeFrame = () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const now = Date.now();

                // Helper to add log entry
                const addLog = (message, type = 'info') => {
                    setDetectionLog(prev => [...prev.slice(-4), { message, type, time: new Date().toLocaleTimeString() }]);
                };

                // CONTINUOUSLY SCAN - analyze every frame for real-time updates
                // Use last known position as hint for speed
                const sphereRegion = findSphereLocation(video, canvas, ctx, lastRegionPixels.current);

                if (!sphereRegion) {
                    setDetectedRegion(null); // Lost tracking
                    lastRegionPixels.current = null;
                    velocity.current = { x: 0, y: 0 };
                    addLog('❌ No bright region (scanning...)', 'error');
                    setDebugInfo('📷 Scanning for sphere...');

                    if (status === 'scanning') {
                        requestAnimationFrame(analyzeFrame);
                    }
                    return;
                }

                // Calculate Velocity
                if (lastRegionPixels.current) {
                    const dx = sphereRegion.x - lastRegionPixels.current.x;
                    const dy = sphereRegion.y - lastRegionPixels.current.y;
                    // Smooth velocity update
                    velocity.current.x = velocity.current.x * 0.5 + dx * 0.5;
                    velocity.current.y = velocity.current.y * 0.5 + dy * 0.5;
                }

                // Update tracking ref
                lastRegionPixels.current = { x: sphereRegion.x, y: sphereRegion.y };

                // SMOOTH UI UPDATES (Low Pass Filter)
                const targetX = (sphereRegion.x / video.videoWidth) * 100;
                const targetY = (sphereRegion.y / video.videoHeight) * 100;
                const targetW = (sphereRegion.width / video.videoWidth) * 100;
                const targetH = (sphereRegion.height / video.videoHeight) * 100;

                if (!smoothedRegion.current) {
                    smoothedRegion.current = { x: targetX, y: targetY, w: targetW, h: targetH };
                } else {
                    const alpha = 0.2; // Smoothing factor (lower = smoother but more lag)
                    smoothedRegion.current.x += (targetX - smoothedRegion.current.x) * alpha;
                    smoothedRegion.current.y += (targetY - smoothedRegion.current.y) * alpha;
                    smoothedRegion.current.w += (targetW - smoothedRegion.current.w) * alpha;
                    smoothedRegion.current.h += (targetH - smoothedRegion.current.h) * alpha;
                }

                setDetectedRegion({ ...smoothedRegion.current });

                addLog(`✅ Region (${sphereRegion.x},${sphereRegion.y}) Score:${Math.floor(sphereRegion.score)}`, 'success');

                // Extract the sphere region for detailed analysis
                const size = 100;
                ctx.drawImage(
                    video,
                    sphereRegion.x, sphereRegion.y, sphereRegion.width, sphereRegion.height,
                    0, 0, size, size
                );
                const fullFrame = ctx.getImageData(0, 0, size, size);

                // SPHERE PATTERN DETECTION (on full frame)
                const sphereAnalysis = detectSpherePattern(fullFrame, 2);

                // DUAL ZONE EXTRACTION
                // 1. Core: Center 40% (40x40 at position 30,30 in 100x100 canvas)
                const coreSize = 40;
                const coreOffset = 30;
                const coreFrame = ctx.getImageData(coreOffset, coreOffset, coreSize, coreSize);

                // 2. Aura: Sample from OUTER EDGES to avoid core contamination
                // Sample 4 corners and combine
                const auraSize = 15;
                const auraData = [];

                // Top-left corner (0-15, 0-15)
                const tl = ctx.getImageData(0, 0, auraSize, auraSize);
                // Top-right corner (85-100, 0-15)
                const tr = ctx.getImageData(size - auraSize, 0, auraSize, auraSize);
                // Bottom-left corner (0-15, 85-100)
                const bl = ctx.getImageData(0, size - auraSize, auraSize, auraSize);
                // Bottom-right corner (85-100, 85-100)
                const br = ctx.getImageData(size - auraSize, size - auraSize, auraSize, auraSize);

                // Combine all corner data into one array for analysis
                const combinedAuraData = new Uint8ClampedArray(
                    tl.data.length + tr.data.length + bl.data.length + br.data.length
                );
                combinedAuraData.set(tl.data, 0);
                combinedAuraData.set(tr.data, tl.data.length);
                combinedAuraData.set(bl.data, tl.data.length + tr.data.length);
                combinedAuraData.set(br.data, tl.data.length + tr.data.length + bl.data.length);

                const auraFrame = {
                    data: combinedAuraData,
                    width: auraSize * 2,  // Approximate width for stride calculation
                    height: auraSize * 2
                };

                // ANALYZE BOTH ZONES using RGB channel dominance
                const coreAnalysis = extractColor(coreFrame, 2);
                const auraAnalysis = extractColor(auraFrame, 3);

                // Debug: Log detected colors
                addLog(`🎨 Core:RGB(${coreAnalysis.r},${coreAnalysis.g},${coreAnalysis.b})→${coreAnalysis.dominant} Aura:→${auraAnalysis.dominant}`, 'data');
                console.log('🔬 COLOR ANALYSIS:', {
                    core: { rgb: `${coreAnalysis.r},${coreAnalysis.g},${coreAnalysis.b}`, dominant: coreAnalysis.dominant },
                    aura: { rgb: `${auraAnalysis.r},${auraAnalysis.g},${auraAnalysis.b}`, dominant: auraAnalysis.dominant }
                });

                // Get the dominant colors directly from RGB analysis
                const coreChar = coreAnalysis.dominant;
                const auraChar = auraAnalysis.dominant;

                // Skip invalid samples (need clear color detection)
                if (coreChar === '?' || auraChar === '?' || 
                    coreAnalysis.saturation < 0.15 || auraAnalysis.saturation < 0.15) {
                    // Don't log every invalid frame - too noisy
                    if (status === 'scanning') requestAnimationFrame(analyzeFrame);
                    return;
                }

                // AUTO-START: Begin capturing when we see valid colors
                if (!isSynced.current && sphereAnalysis.isSphere) {
                    isSynced.current = true;
                    syncDetectedTime.current = now;
                    frameHistory.current = [];
                    colorBuffer.current = [];
                    lastStableColor.current = { core: null, aura: null };
                    addLog('🔄 Started capture...', 'sync');
                    setDebugInfo('🔄 Reading pattern...');
                }

                // TRANSITION-BASED SAMPLING (runs every frame when synced)
                if (isSynced.current && !hasDetected.current) {
                    const currentColor = { core: coreChar, aura: auraChar };
                    
                    // Add to stability buffer
                    colorBuffer.current.push(currentColor);
                    if (colorBuffer.current.length > STABILITY_THRESHOLD) {
                        colorBuffer.current.shift(); // Keep only last N samples
                    }
                    
                    // Check if buffer is stable (all samples match)
                    const isStable = colorBuffer.current.length >= STABILITY_THRESHOLD &&
                        colorBuffer.current.every(c => 
                            c.core === currentColor.core && c.aura === currentColor.aura
                        );
                    
                    if (isStable) {
                        // Check if this is a NEW color (different from last stable)
                        const isNewColor = lastStableColor.current.core !== currentColor.core ||
                                          lastStableColor.current.aura !== currentColor.aura;
                        
                        if (isNewColor) {
                            // Record this as a new frame in the sequence
                            lastStableColor.current = { ...currentColor };
                            frameHistory.current.push(currentColor);
                            
                            const currentSeq = frameHistory.current.map(s => `${s.core}${s.aura}`).join('-');
                            setDebugInfo(`Captured: ${currentSeq} (${frameHistory.current.length}/4)`);
                            addLog(`✅ Frame ${frameHistory.current.length}: ${currentColor.core}${currentColor.aura}`, 'success');
                            
                            console.log(`🎯 CAPTURED FRAME ${frameHistory.current.length}: ${currentColor.core}${currentColor.aura}`);
                            
                            // Check if we have a full 4-step sequence
                            if (frameHistory.current.length >= 4) {
                                hasDetected.current = true;
                                const sequenceKey = currentSeq;
                                
                                console.log('🔍 SCANNER CAPTURED SEQUENCE:');
                                console.log('   Frames:', frameHistory.current);
                                console.log('   Formatted:', sequenceKey);
                                
                                setStatus('analyzing');
                                setDebugInfo(`📤 SENDING: ${sequenceKey}`);
                                
                                if (socketRef.current) {
                                    socketRef.current.emit('identify-session', sequenceKey);
                                }
                            }
                        }
                    }
                }
            }

            if (status === 'scanning') {
                requestAnimationFrame(analyzeFrame);
            }
        };

        const animationId = requestAnimationFrame(analyzeFrame);
        return () => cancelAnimationFrame(animationId);
    }, [scanMode, status, user]); // Runs when mode/status/user changes

    // QR Code Scan Handler
    const handleQRScan = (result) => {
        if (!result || !result[0]?.rawValue || status === 'paired' || hasDetected.current) return;
        
        try {
            const data = JSON.parse(result[0].rawValue);
            console.log('📱 QR Scanned:', data);
            
            if (data.sessionId && data.challenge && data.timestamp) {
                hasDetected.current = true;
                setStatus('analyzing');
                setDebugInfo('✅ QR Scanned! Authenticating...');
                
                // Send auth handshake directly
                setTimeout(() => {
                    if (user && socketRef.current) {
                        socketRef.current.emit('auth-handshake', {
                            sessionId: data.sessionId,
                            user,
                            challengeResponse: data.challenge,
                            challengeTimestamp: data.timestamp
                        });
                        setStatus('paired');
                    }
                }, 500);
            }
        } catch (e) {
            console.log('Invalid QR data:', e);
        }
    };

    // Socket Listeners for Session Discovery
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on('session-found', ({ sessionId, challenge, timestamp }) => {
            console.log('✅ Session Found:', sessionId);
            setDebugInfo('✅ Session Found! Authenticating...');

            // Proceed to Auth Handshake
            setTimeout(() => {
                if (user) {
                    socket.emit('auth-handshake', {
                        sessionId,
                        user,
                        challengeResponse: challenge,
                        challengeTimestamp: timestamp
                    });
                    setStatus('paired');
                }
            }, 500);
        });

        socket.on('error', (err) => {
            const errorMessage = typeof err === 'string' ? err : err.message || 'Unknown error';

            // "Session not found" or "No session found" means sequence didn't match
            if (errorMessage.includes('Session not found') || errorMessage.includes('No session found')) {
                console.log('🔍 Sequence mismatch, resetting and trying again...');
                setDebugInfo('🔄 No match - rescanning...');
                
                // Reset immediately to try again
                setStatus('scanning');
                hasDetected.current = false;
                frameHistory.current = [];
                isSynced.current = false;
                syncDetectedTime.current = 0;
                nextSampleTime.current = 0;
                colorBuffer.current = [];
                lastStableColor.current = { core: null, aura: null };
                return;
            }

            // For other errors, log and reset
            console.error('❌ Socket Error:', errorMessage);
            setDebugInfo(`❌ Error: ${errorMessage}`);

            // Reset to scanning after error
            setTimeout(() => {
                if (status !== 'paired') {
                    setStatus('scanning');
                    hasDetected.current = false;
                    frameHistory.current = [];
                    isSynced.current = false;
                }
            }, 2000);
        });

        return () => {
            socket.off('session-found');
            socket.off('error');
        };
    }, [user, status]);

    return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* QR SCANNER MODE */}
            {scanMode === 'qr' && status !== 'paired' && (
                <div className="absolute inset-0 z-10">
                    <QRScanner
                        onScan={handleQRScan}
                        constraints={{ facingMode: 'environment' }}
                        styles={{
                            container: { width: '100%', height: '100%' },
                            video: { width: '100%', height: '100%', objectFit: 'cover' }
                        }}
                    />
                    {/* QR Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>
                        </div>
                    </div>
                    <div className="absolute top-8 left-0 right-0 text-center">
                        <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
                        <p className="text-white/60 text-sm mt-1">Point at the QR code on desktop</p>
                    </div>
                </div>
            )}

            {/* VISUAL SCANNER MODE (Legacy) */}
            {scanMode === 'visual' && status !== 'paired' && (
                <>
                    {/* Debug Overlay */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        zIndex: 1000
                    }}>
                        <div>📹 Camera: {cameraActive ? '✅ Active' : '❌ Inactive'}</div>
                        <div>🎯 Score: {debugStats.score}</div>
                        <div>👁️ Detecting: {debugStats.detecting ? '✅ YES' : '❌ NO'}</div>
                        <div>💡 Bright Pixels: {debugStats.brightPixels}/1600</div>
                        <div>🔆 Max Light: {debugStats.maxL}</div>
                        {detectedRegion && (
                            <div>📍 Region: {detectedRegion.x.toFixed(0)}%, {detectedRegion.y.toFixed(0)}%</div>
                        )}
                    </div>

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                </>
            )}

            {/* Hidden Canvas for Analysis */}
            <canvas ref={canvasRef} width="100" height="100" className="hidden" />

            {/* UI Overlay - Only for Visual Mode */}
            {scanMode === 'visual' && status !== 'paired' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">

                    {/* Detection Log Panel */}
                    <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 pointer-events-auto max-w-md">
                        <div className="text-xs font-mono text-white/70 mb-2 font-bold">Detection Log:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {detectionLog.map((log, i) => (
                                <div key={i} className={`text-xs font-mono ${log.type === 'success' ? 'text-green-400' :
                                    log.type === 'error' ? 'text-red-400' :
                                        log.type === 'sync' ? 'text-blue-400' :
                                            log.type === 'warn' ? 'text-yellow-400' :
                                                log.type === 'data' ? 'text-cyan-400' :
                                                    'text-white/60'
                                    }`}>
                                    <span className="text-white/40">{log.time}</span> {log.message}
                                </div>
                            ))}
                            {detectionLog.length === 0 && (
                                <div className="text-xs font-mono text-white/40">Waiting for camera...</div>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Analysis Reticle */}
                    <div className="absolute inset-0 overflow-hidden">
                        {detectedRegion ? (
                            <motion.div
                                initial={false}
                                animate={{
                                    left: `${detectedRegion.x}%`,
                                    top: `${detectedRegion.y}%`,
                                    width: `${detectedRegion.w}%`,
                                    height: `${detectedRegion.h}%`
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute border-2 border-green-400 rounded-lg shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                            >
                                {/* Corner Markers */}
                                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-green-400"></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-green-400"></div>
                                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-green-400"></div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-green-400"></div>

                                {/* Label */}
                                <div className="absolute -top-6 left-0 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">
                                    TARGET LOCKED
                                </div>
                            </motion.div>
                        ) : (
                            /* Searching State - Centered Scanning Box */
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-64 h-64 border border-white/10 rounded-xl">
                                    <div className="absolute inset-0 border-2 border-white/30 rounded-xl animate-pulse"></div>
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 blur-[1px] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    <div className="absolute -bottom-8 w-full text-center text-white/50 text-xs font-mono animate-pulse">
                                        SEARCHING FOR NEBULA...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="absolute bottom-24 left-0 right-0 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                            {status === 'scanning' && 'Align with Nebula'}
                            {status === 'analyzing' && 'Decoding Pattern...'}
                        </h2>
                        <p className="text-white/50 text-sm font-mono">
                            {debugInfo || 'Waiting for visual signal...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Mode Toggle Button */}
            {status !== 'paired' && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
                    <button
                        onClick={() => setScanMode(scanMode === 'qr' ? 'visual' : 'qr')}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full text-white font-medium transition-all flex items-center gap-2"
                    >
                        {scanMode === 'qr' ? (
                            <>
                                <Camera size={20} />
                                Switch to Visual Scan
                            </>
                        ) : (
                            <>
                                <QrCode size={20} />
                                Switch to QR Scan
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Success State */}
            {status === 'paired' && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-green-400 backdrop-blur-sm"
                >
                    <CheckCircle size={80} className="mb-4" />
                    <h2 className="text-3xl font-bold text-white">Authenticated</h2>
                </motion.div>
            )}
        </div>
    );
};

export default Scanner;

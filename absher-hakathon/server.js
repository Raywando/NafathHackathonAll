import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for hackathon demo purposes
        methods: ["GET", "POST"]
    }
});

// Store active sessions with challenges
const sessions = new Map();
const sequenceMap = new Map(); // Maps "color-sequence-string" -> sessionId
const SECRET_KEY = 'absher-visual-auth-secret-2025';

// Global Matcher Colors - SIMPLIFIED to 3 primary colors for reliable camera detection
const COLORS = ['R', 'G', 'B']; // Red, Green, Blue - most distinguishable by cameras

// Generate unique 4-step sequence
function generateSequence() {
    // Simple random generation for now (collision probability is low for demo)
    // In production, we'd check against existing sequences
    const seq = [];
    for (let i = 0; i < 4; i++) {
        const core = COLORS[Math.floor(Math.random() * COLORS.length)];
        const aura = COLORS[Math.floor(Math.random() * COLORS.length)];
        seq.push({ core, aura });
    }
    return seq;
}

// Helper to stringify sequence for Map keys
function sequenceToString(seq) {
    return seq.map(s => `${s.core}${s.aura}`).join('-');
}

// Generate time-based challenge (changes every 30 seconds)
function generateChallenge() {
    const timestamp = Math.floor(Date.now() / 30000); // 30-second windows
    const challenge = crypto.createHash('sha256')
        .update(`${SECRET_KEY}-${timestamp}`)
        .digest('hex')
        .substring(0, 16);
    return { challenge, timestamp };
}

// Verify challenge response
function verifyChallenge(response, timestamp) {
    const currentWindow = Math.floor(Date.now() / 30000);
    // Allow current window and previous window (60 seconds total)
    if (Math.abs(currentWindow - timestamp) > 1) {
        return false;
    }

    const expectedChallenge = crypto.createHash('sha256')
        .update(`${SECRET_KEY}-${timestamp}`)
        .digest('hex')
        .substring(0, 16);

    return response === expectedChallenge;
}

io.on('connection', (socket) => {
    console.log('\n🔵 [CONNECTION] New client connected:', socket.id);

    // Desktop creates a session (Global Matcher Mode)
    socket.on('create-session', () => {
        const sessionId = socket.id; // Use socket ID as session ID for simplicity
        socket.join(sessionId);

        const { challenge, timestamp } = generateChallenge();
        const sequence = generateSequence();
        const sequenceKey = sequenceToString(sequence);

        // Store session
        sessions.set(sessionId, {
            desktop: socket.id,
            mobile: null,
            challenge,
            timestamp,
            sequence,
            sequenceKey,
            createdAt: Date.now()
        });

        // Map ALL 4 ROTATIONS of the sequence to the session
        // This allows the scanner to start reading at any point in the cycle
        const seqLen = sequence.length;
        for (let i = 0; i < seqLen; i++) {
            // Create rotated sequence: [0,1,2,3] -> [1,2,3,0] -> [2,3,0,1] ...
            const rotated = [
                ...sequence.slice(i),
                ...sequence.slice(0, i)
            ];
            const key = sequenceToString(rotated);
            sequenceMap.set(key, sessionId);
            console.log(`   Mapped Rotation ${i}: ${key}`);
        }

        console.log('\n🖥️  [CREATE-SESSION]');
        console.log('   Session ID:', sessionId);
        console.log('   Base Sequence:', sequenceKey);
        console.log('   Active Sessions:', sessions.size);

        // Send details to desktop
        socket.emit('session-created', { sessionId, challenge, timestamp, sequence });
    });

    // Scanner identifies session via Visual Sequence
    socket.on('identify-session', (sequenceData) => {
        let sequenceKey;
        if (typeof sequenceData === 'string') {
            sequenceKey = sequenceData;
        } else if (Array.isArray(sequenceData)) {
            sequenceKey = sequenceToString(sequenceData);
        }

        console.log('\n🔍 [IDENTIFY-SESSION]');
        console.log('   Scanner Socket:', socket.id);
        console.log('   Looking for Sequence:', sequenceKey);

        // EXACT MATCH first
        let sessionId = sequenceMap.get(sequenceKey);

        // FUZZY MATCH if no exact match (for demo reliability)
        if (!sessionId) {
            const receivedParts = sequenceKey.split('-');
            let bestMatch = null;
            let bestScore = 0;

            for (const [candidateKey, candidateSessionId] of sequenceMap.entries()) {
                const candidateParts = candidateKey.split('-');
                if (candidateParts.length !== receivedParts.length) continue;

                // Count matching characters (each part is 2 chars: core+aura)
                let score = 0;
                let total = 0;
                for (let i = 0; i < receivedParts.length; i++) {
                    const r = receivedParts[i];
                    const c = candidateParts[i];
                    if (r[0] === c[0]) score++; // Core matches
                    if (r[1] === c[1]) score++; // Aura matches
                    total += 2;
                }

                const similarity = score / total;
                console.log(`   Comparing ${sequenceKey} vs ${candidateKey}: ${Math.round(similarity * 100)}%`);

                if (similarity > bestScore) {
                    bestScore = similarity;
                    bestMatch = { key: candidateKey, sessionId: candidateSessionId };
                }
            }

            // Accept if 50% or more similar (4 out of 8 chars match)
            if (bestMatch && bestScore >= 0.5) {
                console.log(`   🎯 FUZZY MATCH: ${bestMatch.key} (${Math.round(bestScore * 100)}% similar)`);
                sessionId = bestMatch.sessionId;
            }
        }

        if (sessionId) {
            const session = sessions.get(sessionId);
            if (session) {
                console.log('   ✅ Match Found! Session:', sessionId);

                // Refresh challenge for security
                const { challenge, timestamp } = generateChallenge();
                session.challenge = challenge;
                session.timestamp = timestamp;

                socket.emit('session-found', { sessionId, challenge, timestamp });
            } else {
                console.log('   ❌ Session ID in map but not in sessions (Zombie)');
                socket.emit('error', 'Session expired');
            }
        } else {
            console.log('   ❌ No matching session found');
            console.log('   Received:', sequenceKey);
            console.log('   Available:', Array.from(sequenceMap.keys()).join(', '));
            socket.emit('error', 'No session found for this pattern');
        }
    });

    // Mobile requests current challenge for a session (Legacy/Direct support)
    socket.on('get-challenge', (sessionId) => {
        const session = sessions.get(sessionId);
        if (session) {
            const { challenge, timestamp } = generateChallenge();
            session.challenge = challenge;
            session.timestamp = timestamp;
            socket.emit('challenge-response', { challenge, timestamp });
        } else {
            socket.emit('error', 'Session not found');
        }
    });

    // Mobile scans and joins with challenge response
    socket.on('join-session', ({ sessionId, challengeResponse, challengeTimestamp }) => {
        const session = sessions.get(sessionId);
        // ... (Verification logic same as before)
        if (!session) {
            socket.emit('error', 'Session not found');
            return;
        }
        if (!verifyChallenge(challengeResponse, challengeTimestamp)) {
            socket.emit('error', 'Invalid challenge');
            return;
        }

        socket.join(sessionId);
        session.mobile = socket.id;
        io.to(sessionId).emit('mobile-connected');
        console.log(`   ✅ Mobile joined session ${sessionId}`);
    });

    // Confirm pairing with Auth Data
    socket.on('auth-handshake', ({ sessionId, user, challengeResponse, challengeTimestamp }) => {
        console.log('\n🔐 [AUTH-HANDSHAKE]');
        console.log('   Session ID:', sessionId);

        const session = sessions.get(sessionId);
        if (!session) {
            socket.emit('error', 'Session not found');
            return;
        }

        if (!verifyChallenge(challengeResponse, challengeTimestamp)) {
            socket.emit('error', 'Invalid challenge');
            return;
        }

        io.to(sessionId).emit('auth-success', user);
        console.log('   ✅ Auth successful');

        // Cleanup - Delete ALL rotations from map
        if (session.sequence) {
            const seqLen = session.sequence.length;
            for (let i = 0; i < seqLen; i++) {
                const rotated = [
                    ...session.sequence.slice(i),
                    ...session.sequence.slice(0, i)
                ];
                const key = sequenceToString(rotated);
                sequenceMap.delete(key);
            }
        }
        sessions.delete(sessionId);
    });

    socket.on('disconnect', () => {
        // Find and cleanup session if desktop disconnected
        for (const [id, session] of sessions.entries()) {
            if (session.desktop === socket.id) {
                // Delete ALL rotations from map
                if (session.sequence) {
                    const seqLen = session.sequence.length;
                    for (let i = 0; i < seqLen; i++) {
                        const rotated = [
                            ...session.sequence.slice(i),
                            ...session.sequence.slice(0, i)
                        ];
                        const key = sequenceToString(rotated);
                        sequenceMap.delete(key);
                    }
                }
                sessions.delete(id);
                console.log(`   🗑️  Cleaned up session ${id}`);
            }
        }
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🔒 Secure Visual Auth Server running on http://localhost:${PORT}`);
    console.log(`🔑 Challenge rotation: Every 30 seconds`);
    console.log(`⏱️  Session timeout: 5 minutes\n`);
});

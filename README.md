# 🛡️ Nafath Hackathon - Visual Authentication & AI Risk Analysis Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Flutter-3.8.1-02569B?style=for-the-badge&logo=flutter" alt="Flutter"/>
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/OpenAI-o3-412991?style=for-the-badge&logo=openai" alt="OpenAI"/>
  <img src="https://img.shields.io/badge/Socket.io-4.8.1-010101?style=for-the-badge&logo=socket.io" alt="Socket.io"/>
  <img src="https://img.shields.io/badge/Three.js-r181-000000?style=for-the-badge&logo=three.js" alt="Three.js"/>
</p>

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Components](#-components)
  - [Web Frontend (absher-hakathon)](#1-web-frontend---absher-hakathon)
  - [Mobile App (nafath_replica)](#2-mobile-app---nafath_replica)
  - [Backend (NafathBackend)](#3-backend---nafathbackend)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Security Features](#-security-features)
- [Demo Credentials](#-demo-credentials)
- [Technologies Used](#-technologies-used)

---

## 🎯 Overview

This project is an innovative authentication platform built for the Nafath Hackathon that combines:

1. **Visual Authentication** - A revolutionary approach using animated 3D particle nebulas with encoded color sequences
2. **QR Code Authentication** - Traditional secure scanning method
3. **AI-Powered Risk Analysis** - Real-time fraud detection using OpenAI's o3 model
4. **Mobile Approval Workflow** - Flutter-based app mimicking the Nafath experience

The system provides a secure, multi-factor authentication solution for Saudi Arabian government and financial services, including banks, telecom providers, and government ministries.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NAFATH AUTHENTICATION PLATFORM                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐     WebSocket      ┌────────────────────┐           │
│  │   Desktop Client   │◄──────────────────►│   Express Server   │           │
│  │   (React + Three)  │                    │   (Socket.io)      │           │
│  │                    │                    │   Port: 3000       │           │
│  │  • 3D Nebula       │                    └────────────────────┘           │
│  │  • QR Generator    │                                                      │
│  │  • Session Manager │                                                      │
│  └────────────────────┘                                                      │
│           │                                                                  │
│           │ Visual/QR Scan                                                   │
│           ▼                                                                  │
│  ┌────────────────────┐                    ┌────────────────────┐           │
│  │   Mobile Scanner   │                    │   Flask Backend    │           │
│  │   (React)          │                    │   Port: 8002       │           │
│  │                    │                    │                    │           │
│  │  • Camera Capture  │    HTTP/REST       │  • Request Store   │           │
│  │  • Color Decoder   │                    │  • Approval Logic  │           │
│  │  • QR Scanner      │                    │  • AI Risk Engine  │           │
│  └────────────────────┘                    └────────────────────┘           │
│                                                     │                        │
│                                                     │ Polls                  │
│                                                     ▼                        │
│                                            ┌────────────────────┐           │
│                                            │   Flutter App      │           │
│                                            │   (Nafath Replica) │           │
│                                            │                    │           │
│                                            │  • Request Display │           │
│                                            │  • Approval Timer  │           │
│                                            │  • Accept/Reject   │           │
│                                            └────────────────────┘           │
│                                                     │                        │
│                                                     │ On Approve             │
│                                                     ▼                        │
│                                            ┌────────────────────┐           │
│                                            │   OpenAI o3        │           │
│                                            │   Risk Analysis    │           │
│                                            │                    │           │
│                                            │  • Fraud Detection │           │
│                                            │  • Pattern Analysis│           │
│                                            │  • Risk Scoring    │           │
│                                            └────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🌀 Visual Authentication System
- **3D Animated Nebula** - Particle-based sphere with 4000+ particles using Three.js shaders
- **Dual-Layer Color Encoding** - Core and Aura colors create a 4-step visual sequence
- **Camera-Based Decoding** - Mobile camera reads RGB color patterns in real-time
- **Rotation-Invariant Matching** - Sequences can be read starting from any point
- **Fuzzy Matching** - 50%+ similarity threshold for reliable detection

### 📱 QR Code Authentication
- **Dynamic QR Generation** - Session-specific codes with challenge tokens
- **30-Second Challenge Windows** - Time-based security tokens
- **Instant Verification** - Fallback for environments where visual scanning isn't optimal

### 🤖 AI-Powered Risk Analysis
- **OpenAI o3 Integration** - Advanced reasoning model for fraud detection
- **Multi-Signal Analysis** - Evaluates device, location, behavior patterns
- **Contextual Scoring** - 0-100 risk score with LOW/MEDIUM/HIGH/CRITICAL levels
- **Detailed Reporting** - Comprehensive risk reasons and assessments

### 📲 Mobile Approval Workflow
- **Real-Time Notifications** - Polling-based request detection
- **Visual Timer** - 60-second countdown with animated progress
- **One-Tap Actions** - Accept or reject with immediate feedback

### 🔒 Security Features
- **Device Fingerprinting** - Browser/device identification via WebGL, Canvas, Audio
- **IP Intelligence** - City, country, VPN detection
- **Historical Pattern Analysis** - Behavioral anomaly detection
- **Challenge-Response Protocol** - Cryptographic handshake verification

---

## 📦 Components

### 1. Web Frontend - `absher-hakathon`

A React + Vite application featuring:

| Feature | Description |
|---------|-------------|
| **Desktop View** | 3D particle nebula with color-encoded authentication |
| **Scanner View** | Camera-based visual pattern decoder |
| **Login System** | User authentication before scanning |
| **Real-time Sync** | Socket.io WebSocket communication |

**Key Technologies:**
- React 19.2 with React Router
- Three.js via React Three Fiber & Drei
- Framer Motion animations
- Tailwind CSS styling
- Socket.io client

### 2. Mobile App - `nafath_replica`

A Flutter cross-platform application:

| Feature | Description |
|---------|-------------|
| **Request Polling** | Fetches pending auth requests every 5 seconds |
| **Circular Timer** | Custom-painted 60-dash countdown display |
| **Approval Actions** | Accept/Reject buttons with API integration |
| **Auto-Timeout** | Automatic rejection when timer expires |

**Supported Platforms:**
- iOS
- Android
- Web
- macOS
- Windows
- Linux

### 3. Backend - `NafathBackend`

Python Flask API with AI integration:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/request` | POST | Store authentication request |
| `/api/request` | GET | Retrieve pending request |
| `/api/approval` | POST | Submit approval decision |
| `/api/approval` | GET | Fetch approval result with risk analysis |

**Additional Tools:**
- `fingerprinter.html` - Browser fingerprint generator
- `request_builder_2.html` - Interactive request builder UI
- `request_properties.json` - Request schema definition

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ (for web frontend)
- **Flutter** 3.8+ (for mobile app)
- **Python** 3.9+ (for backend)
- **OpenAI API Key** (for AI risk analysis)

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/NafathHackathonAll.git
cd NafathHackathonAll
```

### 2. Install Web Frontend

```bash
cd absher-hakathon

# Install dependencies
npm install

# Start development server (includes Express backend)
npm run dev
```

The server runs on `http://localhost:5173` (Vite) with WebSocket on port `3000`.

### 3. Install Backend

```bash
cd NafathBackend/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Add your OpenAI API key
# Edit agent.py and replace "OPENAI_KEY" with your actual key

# Start the server
python app.py
```

The API runs on `http://localhost:8002`.

### 4. Install Flutter App

```bash
cd nafath_replica

# Get dependencies
flutter pub get

# Run on your preferred platform
flutter run                    # Auto-detect device
flutter run -d chrome          # Web browser
flutter run -d macos           # macOS
flutter run -d ios             # iOS simulator
flutter run -d android         # Android emulator
```

---

## 📖 Usage

### Desktop Authentication Flow

1. **Open Desktop App** - Navigate to `http://localhost:5173`
2. **View Nebula** - A 3D particle sphere with encoded colors appears
3. **Toggle QR Mode** - Click "Show QR Code" for easier scanning

### Mobile Authentication Flow

1. **Login** - Go to `http://localhost:5173/login`
   - Username: `user1` or `user2`
   - Password: `password`
2. **Scan** - Point camera at desktop nebula or QR code
3. **Authenticate** - Session pairs automatically on match

### Request Builder Flow

1. **Open Builder** - Open `NafathBackend/request_builder_2.html` in browser
2. **Configure Request** - Fill in operation details, requester context
3. **Submit** - Send to backend
4. **Approve in App** - Open Flutter app and accept/reject
5. **View Risk** - Risk analysis appears after approval

### Flutter App Flow

1. **Launch App** - The app shows "Waiting for requests"
2. **Receive Request** - When a request is sent, it displays with a timer
3. **Approve/Reject** - Tap the appropriate button
4. **AI Analysis** - On approval, risk assessment is generated

---

## 🔌 API Reference

### Store Request
```http
POST /api/request
Content-Type: application/json

{
  "request_metadata": {
    "target_national_id": "1234567890"
  },
  "operation_details": {
    "client_name": "STC_BANK",
    "operation_type": "OPEN_BANK_ACCOUNT",
    "operation_sensitivity": "HIGH"
  },
  "requester_context": {
    "device": { ... },
    "ip_information": { ... }
  }
}
```

### Get Pending Request
```http
GET /api/request
```

### Submit Approval
```http
POST /api/approval
Content-Type: application/json

{
  "status": "approved"
}
```

### Get Approval Result
```http
GET /api/approval
```

Response includes AI risk analysis:
```json
{
  "status": "success",
  "approval_risk": {
    "risk_score": 35,
    "risk_level": "MEDIUM",
    "risk_reasons": ["First-time device usage", "IP city mismatch"],
    "overall_assessment": "Some anomalies detected but within acceptable parameters.",
    "analysis_confidence": 75
  }
}
```

---

## 🔐 Authentication Flow

```
[Service Provider]                [Backend]                [Mobile App]              [AI Engine]
       │                             │                          │                        │
       │  1. POST /api/request       │                          │                        │
       │────────────────────────────►│                          │                        │
       │                             │                          │                        │
       │                             │  2. GET /api/request     │                        │
       │                             │◄─────────────────────────│ (polling every 5s)    │
       │                             │                          │                        │
       │                             │  3. Request Data         │                        │
       │                             │─────────────────────────►│                        │
       │                             │                          │                        │
       │                             │                          │ 4. User Decision      │
       │                             │                          │    (60s timer)        │
       │                             │                          │                        │
       │                             │  5. POST /api/approval   │                        │
       │                             │◄─────────────────────────│                        │
       │                             │                          │                        │
       │                             │  6. Analyze Risk         │                        │
       │                             │─────────────────────────────────────────────────►│
       │                             │                          │                        │
       │                             │  7. Risk Assessment      │                        │
       │                             │◄─────────────────────────────────────────────────│
       │                             │                          │                        │
       │  8. GET /api/approval       │                          │                        │
       │◄────────────────────────────│                          │                        │
       │  (includes risk analysis)   │                          │                        │
```

---

## 🛡️ Security Features

### Visual Authentication Security

| Layer | Protection |
|-------|------------|
| **Color Encoding** | 4-step RGB sequence with core/aura dual-layer |
| **Rotation Tolerance** | All 4 rotations mapped for flexible reading |
| **Fuzzy Matching** | 50% similarity threshold prevents false negatives |
| **Session Isolation** | Each session has unique sequence |

### Challenge-Response Protocol

| Feature | Implementation |
|---------|----------------|
| **Time-Based Tokens** | 30-second challenge windows |
| **SHA-256 Hashing** | Cryptographic challenge generation |
| **Window Tolerance** | Current + previous window accepted |
| **Secret Key** | Server-side secret for token generation |

### AI Risk Analysis Signals

| Signal Group | Factors Analyzed |
|--------------|------------------|
| **Device Context** | Device hash, user agent, browser, OS |
| **IP Intelligence** | City, country, VPN status, ISP |
| **Behavioral Patterns** | Request frequency, historical cities, device usage |
| **Temporal Analysis** | 24-hour activity, session duration, timeouts |
| **Data Consistency** | Name, phone, address verification |

---

## 🧪 Demo Credentials

### Web Login
| Username | Password | Role |
|----------|----------|------|
| `user1` | `password` | Admin |
| `user2` | `password` | Visitor |

### Supported Service Providers
- Ministry of Justice
- Real Estate Registrars
- STC Bank / STC
- SAB Bank / Al Rajhi Bank / Alinma Bank
- Monshaat
- Ejar
- Mobily

### Supported Operations
- Platform Login
- Register Account
- Issue Power of Attorney
- Open Bank Account
- Issue New SIM
- Verify Trusted Device
- Verify Loan Request

---

## 🛠️ Technologies Used

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool |
| Three.js | 0.181.2 | 3D Graphics |
| React Three Fiber | 9.4.0 | React + Three.js Bridge |
| Socket.io Client | 4.8.1 | WebSocket Communication |
| Framer Motion | 12.23.24 | Animations |
| Tailwind CSS | 3.4.17 | Styling |
| Lucide React | 0.554.0 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Flask | 3.0.0 | API Framework |
| Flask-CORS | 4.0.0 | Cross-Origin Requests |
| OpenAI | Latest | AI Risk Analysis (o3 model) |
| Express | 5.1.0 | WebSocket Server |
| Socket.io | 4.8.1 | Real-time Communication |

### Mobile
| Technology | Version | Purpose |
|------------|---------|---------|
| Flutter | 3.8.1 | Cross-Platform Framework |
| http | 1.5.0 | HTTP Client |
| cupertino_icons | 1.0.8 | iOS Icons |

---

## 📁 Project Structure

```
NafathHackathonAll/
├── absher-hakathon/              # Web Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx         # User authentication
│   │   │   ├── Scanner.jsx       # Visual/QR scanner
│   │   │   ├── ParticleField.jsx # 3D nebula shader
│   │   │   └── OverlayUI.jsx     # UI overlays
│   │   ├── App.jsx               # Main app with routing
│   │   └── main.jsx              # Entry point
│   ├── server.js                 # Express + Socket.io server
│   └── package.json
│
├── nafath_replica/               # Flutter Mobile App
│   ├── lib/
│   │   ├── main.dart             # App entry point
│   │   └── process_screen.dart   # Request approval screen
│   └── pubspec.yaml
│
├── NafathBackend/                # Python Backend
│   ├── backend/
│   │   ├── app.py                # Flask API
│   │   ├── agent.py              # OpenAI risk analysis
│   │   ├── prompt.txt            # AI system prompt
│   │   └── requirements.txt      # Python dependencies
│   ├── fingerprinter.html        # Device fingerprinting tool
│   ├── request_builder_2.html    # Request builder UI
│   └── request_properties.json   # Request schema
│
└── README.md                     # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project was created for the Nafath Hackathon.

---

## 🙏 Acknowledgments

- **Nafath** - For the hackathon opportunity
- **OpenAI** - For the o3 reasoning model
- **Three.js Community** - For shader examples and guidance

---

<p align="center">
  Built with ❤️ for the Nafath Hackathon
</p>


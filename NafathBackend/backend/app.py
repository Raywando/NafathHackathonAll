from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import random
import time
from agent import analyze_risk

app = Flask(__name__)
CORS(app)

REQUEST_FILE = 'current_request.json'
APPROVAL_FILE = 'current_approval.json'
PREVIOUS_REQUEST_FILE = 'previous_request.json'
PREVIOUS_APPROVAL_FILE = 'previous_approval.json'
VISUAL_SESSION_FILE = 'visual_session.json'

# Color codes for visual pairing (same as absher-hakathon)
COLOR_CODES = ['R', 'G', 'B', 'Y', 'C', 'M']

def generate_visual_sequence(length=4):
    """Generate a random color sequence for visual pairing"""
    sequence = []
    last_color = None
    for _ in range(length):
        # Avoid same color twice in a row
        available = [c for c in COLOR_CODES if c != last_color]
        color = random.choice(available)
        sequence.append(color)
        last_color = color
    return sequence

@app.route('/api/request', methods=['POST'])
def store_request():
    data = request.json
    with open(REQUEST_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'status': 'success', 'message': 'Request stored'})

@app.route('/api/request', methods=['GET'])
def get_request():
    if not os.path.exists(REQUEST_FILE):
        return jsonify({'error': 'No request found'}), 404
    with open(REQUEST_FILE, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/approval', methods=['POST'])
def submit_approval():
    data = request.json
    approval_status = data.get('status')
    
    if approval_status == 'approved':
        with open(REQUEST_FILE, 'r') as ff:
            previous_request = json.load(ff)

        with open(PREVIOUS_REQUEST_FILE, 'w') as f:
            json.dump(previous_request, f, indent=2)
        
        # Clear current request
        with open(REQUEST_FILE, 'w') as f:
            json.dump({}, f, indent=2)

        response = analyze_risk(json.dumps(previous_request))

        with open(APPROVAL_FILE, 'w') as f:
            json.dump({'status': 'success', 'approval_risk': response}, f, indent=2)
        
        return jsonify({'status': 'success', 'approval_risk': response})
    
    elif approval_status == 'rejected':
        # Handle rejection - clear the request
        if os.path.exists(REQUEST_FILE):
            with open(REQUEST_FILE, 'r') as ff:
                previous_request = json.load(ff)
            with open(PREVIOUS_REQUEST_FILE, 'w') as f:
                json.dump(previous_request, f, indent=2)
        
        # Clear current request
        with open(REQUEST_FILE, 'w') as f:
            json.dump({}, f, indent=2)
        
        return jsonify({'status': 'rejected', 'message': 'Request rejected'})
    
    else:
        return jsonify({'status': 'failed'}), 400

@app.route('/api/approval', methods=['GET'])
def get_approval():
    if not os.path.exists(APPROVAL_FILE):
        return jsonify({'error': 'No approval found'}), 404
    with open(APPROVAL_FILE, 'r') as f:
        data = json.load(f)

    if data == {}:
        return jsonify({'error': 'No approval found'}), 404
    else:
        with open(PREVIOUS_APPROVAL_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        with open(APPROVAL_FILE, 'w') as f:
            json.dump({}, f, indent=2)
        return jsonify(data)

# ============ VISUAL PAIRING ENDPOINTS ============

@app.route('/api/visual/session', methods=['POST'])
def create_visual_session():
    """Create a new visual pairing session with a random sequence"""
    sequence = generate_visual_sequence(4)
    session_data = {
        'sequence': sequence,
        'sequence_str': '-'.join(sequence),
        'created_at': time.time(),
        'verified': False
    }
    
    with open(VISUAL_SESSION_FILE, 'w') as f:
        json.dump(session_data, f, indent=2)
    
    return jsonify({
        'status': 'success',
        'sequence': sequence,
        'sequence_str': '-'.join(sequence)
    })

@app.route('/api/visual/session', methods=['GET'])
def get_visual_session():
    """Get current visual session (for desktop display)"""
    if not os.path.exists(VISUAL_SESSION_FILE):
        # Auto-create if doesn't exist
        sequence = generate_visual_sequence(4)
        session_data = {
            'sequence': sequence,
            'sequence_str': '-'.join(sequence),
            'created_at': time.time(),
            'verified': False
        }
        with open(VISUAL_SESSION_FILE, 'w') as f:
            json.dump(session_data, f, indent=2)
        return jsonify(session_data)
    
    with open(VISUAL_SESSION_FILE, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/visual/verify', methods=['POST'])
def verify_visual_sequence():
    """Verify a scanned sequence against the current session"""
    data = request.json
    scanned_sequence = data.get('sequence', '')
    
    # Normalize - remove dashes and convert to uppercase
    scanned_clean = scanned_sequence.replace('-', '').upper()
    
    if not os.path.exists(VISUAL_SESSION_FILE):
        return jsonify({'status': 'error', 'message': 'No active session'}), 404
    
    with open(VISUAL_SESSION_FILE, 'r') as f:
        session_data = json.load(f)
    
    expected_sequence = ''.join(session_data.get('sequence', []))
    
    if scanned_clean == expected_sequence:
        # Mark as verified
        session_data['verified'] = True
        session_data['verified_at'] = time.time()
        
        with open(VISUAL_SESSION_FILE, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        return jsonify({
            'status': 'success',
            'message': 'Sequence verified!',
            'verified': True
        })
    else:
        return jsonify({
            'status': 'failed',
            'message': 'Sequence mismatch',
            'expected': expected_sequence,
            'received': scanned_clean,
            'verified': False
        })

@app.route('/api/visual/status', methods=['GET'])
def get_visual_status():
    """Check if visual session has been verified (for desktop polling)"""
    if not os.path.exists(VISUAL_SESSION_FILE):
        return jsonify({'verified': False, 'error': 'No session'}), 404
    
    with open(VISUAL_SESSION_FILE, 'r') as f:
        data = json.load(f)
    
    return jsonify({
        'verified': data.get('verified', False),
        'verified_at': data.get('verified_at')
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8002)

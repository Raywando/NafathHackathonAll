from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from agent import analyze_risk

app = Flask(__name__)
CORS(app)

REQUEST_FILE = 'current_request.json'
APPROVAL_FILE = 'current_approval.json'
PREVIOUS_REQUEST_FILE = 'previous_request.json'
PREVIOUS_APPROVAL_FILE = 'previous_approval.json'
PREDEFINED_FOLDER = 'predefined'

def load_predefined_scenario(scenario_name):
    scenario_file = os.path.join(PREDEFINED_FOLDER, f'{scenario_name}.json')
    if os.path.exists(scenario_file):
        with open(scenario_file, 'r') as f:
            return json.load(f)
    return {}

def merge_request_data(user_input, predefined_data):
    combined = {}
    combined['request_metadata'] = user_input.get('request_metadata', {})
    combined['operation_details'] = user_input.get('operation_details', {})
    combined['requester_context'] = predefined_data.get('requester_context', {})
    combined['approver_context'] = predefined_data.get('approver_context', {})
    combined['target_user_history'] = predefined_data.get('target_user_history', {})
    combined['vetting_information'] = predefined_data.get('vetting_information', {})
    return combined

@app.route('/api/request', methods=['POST'])
def store_request():
    user_data = request.json
    scenario = user_data.get('scenario', 'safe')
    
    predefined_data = load_predefined_scenario(scenario)
    
    combined_data = merge_request_data(user_data, predefined_data)
    
    with open(REQUEST_FILE, 'w') as f:
        json.dump(combined_data, f, indent=2)
    
    return jsonify({'status': 'success', 'message': 'Request stored with scenario data'})

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
        
        with open(REQUEST_FILE, 'w') as f:
            json.dump({}, f, indent=2)

        response = analyze_risk(json.dumps(previous_request))

        with open(APPROVAL_FILE, 'w') as f:
            json.dump({'status': 'success', 'approval_risk': response}, f, indent=2)
        
        return jsonify({'status': 'success', 'approval_risk': response})
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8001)

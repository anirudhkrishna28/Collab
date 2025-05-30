import eventlet
eventlet.monkey_patch()

from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Store the latest code per room
code_documents = {}

@app.route('/')
def index():
    return "Collaborative Coding + Video Chat Server is running!"

# === Code Sync Events ===

@socketio.on('join')
def on_join(data):
    room = data.get('room')
    join_room(room)
    print(f"🔵 Client joined room: {room}")
    # Send current code state to new user
    emit('code_update', {'code': code_documents.get(room, "")}, room=request.sid)

@socketio.on('leave')
def on_leave(data):
    room = data.get('room')
    leave_room(room)
    print(f"🔴 Client left room: {room}")

@socketio.on('code_change')
def on_code_change(data):
    room = data.get('room')
    code = data.get('code')
    code_documents[room] = code
    emit('code_update', {'code': code}, room=room, include_self=False)

# === WebRTC Signaling Events ===

@socketio.on('offer')
def handle_offer(data):
    room = data.get('room')
    offer = data.get('offer')
    print(f"📡 Received offer for room: {room}")
    emit('offer', {'offer': offer}, room=room, include_self=False)

@socketio.on('answer')
def handle_answer(data):
    room = data.get('room')
    answer = data.get('answer')
    print(f"📡 Received answer for room: {room}")
    emit('answer', {'answer': answer}, room=room, include_self=False)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    room = data.get('room')
    candidate = data.get('candidate')
    emit('ice-candidate', {'candidate': candidate}, room=room, include_self=False)

# === Connect / Disconnect ===

@socketio.on('connect')
def on_connect():
    print("✅ Client connected")

@socketio.on('disconnect')
def on_disconnect():
    print("❌ Client disconnected")

if __name__ == '__main__':
    print("🚀 Starting Flask-SocketIO server...")
    socketio.run(app, host='0.0.0.0', port=5000)

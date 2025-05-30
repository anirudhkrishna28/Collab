import React, { useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import "./App.css";

// Accept username and meetingCode as props
export default function MeetingPage({ username, meetingCode, onEndMeeting, onLogout }) {
  const [code, setCode] = useState("// Start coding...");
  const [connected, setConnected] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const wsRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ignoreNextUpdate = useRef(false);
  const chatEndRef = useRef(null);

  // Block render if missing username/meetingCode (should never happen if flow is done right)
  if (!username || !meetingCode) {
    return (
      <div style={{
        background: "#232323", color: "#fff", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column"
      }}>
        <div>Missing user or meeting code. Please login and join/create a meeting.</div>
        {onLogout && <button onClick={onLogout} style={{marginTop:20}}>Back to Login</button>}
      </div>
    );
  }

  // WebSocket and WebRTC logic (unchanged, except using meetingCode and username)
  useEffect(() => {
    const WS_SERVER_URL = "ws://127.0.0.1:8000/ws/collab/";
    const ws = new WebSocket(WS_SERVER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "join", data: { room: meetingCode, username } }));
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "code_update":
          if (ignoreNextUpdate.current) {
            ignoreNextUpdate.current = false;
            return;
          }
          setCode(msg.code);
          break;
        case "offer": {
          const peer = createPeer(false);
          await peer.setRemoteDescription(new window.RTCSessionDescription(msg.offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "answer", data: { room: meetingCode, answer } }));
          peerRef.current = peer;
          break;
        }
        case "answer":
          await peerRef.current?.setRemoteDescription(new window.RTCSessionDescription(msg.answer));
          break;
        case "ice-candidate":
          if (peerRef.current) {
            peerRef.current.addIceCandidate(new window.RTCIceCandidate(msg.candidate));
          }
          break;
        case "chat_message":
          setChatMessages((prev) => [
            ...prev,
            { username: msg.username, message: msg.message },
          ]);
          break;
        case "chat_history":
          setChatMessages(msg.messages || []);
          break;
        default:
      }
    };

    return () => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: "leave", data: { room: meetingCode } }));
      ws.close();
    };
    // eslint-disable-next-line
  }, [meetingCode, username]);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localVideoRef.current.srcObject = stream;
        startCall(stream);
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };
    getMedia();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function sendWS(obj) {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }

  function handleEditorChange(newValue) {
    setCode(newValue);
    ignoreNextUpdate.current = true;
    sendWS({ type: "code_change", data: { room: meetingCode, code: newValue } });
  }

  function createPeer(isInitiator) {
    const peer = new window.RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendWS({ type: "ice-candidate", data: { room: meetingCode, candidate: e.candidate } });
      }
    };

    peer.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    const localStream = localVideoRef.current.srcObject;
    if (localStream)
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    if (isInitiator) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => {
          sendWS({ type: "offer", data: { room: meetingCode, offer: peer.localDescription } });
        });
    }

    return peer;
  }

  function startCall() {
    const peer = createPeer(true);
    peerRef.current = peer;
  }

  // Toggle local audio mute/unmute
  const toggleAudio = () => {
    const localStream = localVideoRef.current.srcObject;
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = audioMuted; // flip mute state
    });
    setAudioMuted(!audioMuted);
  };

  // --- Chat handlers ---
  const handleChatInput = (e) => setChatInput(e.target.value);

  const sendChatMessage = (e) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendWS({
      type: "chat_message",
      data: { room: meetingCode, username, message: msg },
    });
    setChatInput("");
  };

  return (
    <div className="app-container">
      {/* Editor Section */}
      <div className="editor-section">
        <div
          style={{
            background: connected ? "#0f0" : "#f00",
            color: "#000",
            padding: "5px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {connected ? (
            <>Connected as <b>{username}</b> | Meeting: <b>{meetingCode}</b></>
          ) : (
            "Disconnected"
          )}
        </div>
        <MonacoEditor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
          }}
        />
      </div>

      {/* Video + Audio Chat Section */}
      <div className="sidebar-section">
        {/* Video Section (stacked) */}
        <div className="sidebar-video-stack">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
          />
        </div>
        <button
          className="mute-btn"
          onClick={toggleAudio}
        >
          {audioMuted ? "Unmute Audio" : "Mute Audio"}
        </button>

        {/* --- Chat Box --- */}
        <div className="chat-container">
          <div className="chat-header">Chat</div>
          <div className="chat-messages">
            {chatMessages.map((entry, idx) => {
              const isSelf = entry.username === username;
              return (
                <div
                  key={idx}
                  className={`chat-message-row ${isSelf ? "self" : "other"}`}
                >
                  <div className="chat-bubble">
                    <div className="chat-username">{entry.username}</div>
                    <div className="chat-text">{entry.message}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef}></div>
          </div>
          <form className="chat-form" onSubmit={sendChatMessage}>
            <input
              className="chat-input"
              type="text"
              value={chatInput}
              onChange={handleChatInput}
              placeholder="Type a message..."
              maxLength={300}
              autoComplete="off"
            />
            <button className="chat-send-btn" type="submit">
              Send
            </button>
          </form>
        </div>
        <button
          className="mute-btn"
          style={{ background: "#444", color: "#fff", marginTop: 10 }}
          onClick={onEndMeeting}
        >
          Leave Meeting
        </button>
        {onLogout && (
          <button
            style={{ background: "#f44", color: "#fff", marginTop: 10, width: "100%", borderRadius: 6, border: "none", fontWeight: "bold", padding: 10, cursor: "pointer" }}
            onClick={onLogout}
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
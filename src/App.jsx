import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import MonacoEditor from "@monaco-editor/react";

const SOCKET_SERVER_URL = "http://localhost:5000";
const ROOM_ID = "my-room";

export default function App() {
  const [code, setCode] = useState("// Start coding...");
  const [connected, setConnected] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ignoreNextUpdate = useRef(false);

  // Initialize socket and WebRTC signaling
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server");
      setConnected(true);
      socket.emit("join", { room: ROOM_ID });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setConnected(false);
    });

    socket.on("code_update", ({ code: newCode }) => {
      if (ignoreNextUpdate.current) {
        ignoreNextUpdate.current = false;
        return;
      }
      setCode(newCode);
    });

    // WebRTC signaling handlers
    socket.on("offer", async ({ offer }) => {
      console.log("📩 Received offer");
      const peer = createPeer(false);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", { room: ROOM_ID, answer });
      peerRef.current = peer;
    });

    socket.on("answer", async ({ answer }) => {
      console.log("📩 Received answer");
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", ({ candidate }) => {
      console.log("📩 Received ICE candidate");
      if (peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.emit("leave", { room: ROOM_ID });
      socket.disconnect();
    };
  }, []);

  // Get media stream and start WebRTC call
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
  }, []);

  function handleEditorChange(newValue) {
    setCode(newValue);
    ignoreNextUpdate.current = true;
    if (socketRef.current) {
      socketRef.current.emit("code_change", { room: ROOM_ID, code: newValue });
    }
  }

  function createPeer(isInitiator) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("ice-candidate", { room: ROOM_ID, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    const localStream = localVideoRef.current.srcObject;
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    if (isInitiator) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit("offer", { room: ROOM_ID, offer: peer.localDescription });
        });
    }

    return peer;
  }

  function startCall(stream) {
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

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "row" }}>
      {/* Editor Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            background: connected ? "#0f0" : "#f00",
            color: "#000",
            padding: "5px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {connected ? "Connected to collaboration server" : "Disconnected"}
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
      <div style={{ width: "220px", padding: "10px", backgroundColor: "#1e1e1e" }}>
        <h3 style={{ color: "white", marginBottom: "10px" }}>Video Chat</h3>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: 4 }}
        />
        <button
          onClick={toggleAudio}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {audioMuted ? "Unmute Audio" : "Mute Audio"}
        </button>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", marginTop: "10px", borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

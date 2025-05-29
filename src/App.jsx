import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import MonacoEditor from "@monaco-editor/react";

const SOCKET_SERVER_URL = "http://localhost:5000";
const ROOM_ID = "my-room";

export default function App() {
  const [code, setCode] = useState("// Start coding...");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const ignoreNextUpdate = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket"], // Ensure it uses websocket only
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server");
      setConnected(true);
      socket.emit("join", { room: ROOM_ID });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setConnected(false);
    });

    socket.on("code_update", ({ code: newCode }) => {
      if (ignoreNextUpdate.current) {
        ignoreNextUpdate.current = false;
        return;
      }
      setCode(newCode);
    });

    return () => {
      socket.emit("leave", { room: ROOM_ID });
      socket.disconnect();
    };
  }, []);

  // Emit code change
  const handleEditorChange = (newValue) => {
    setCode(newValue);
    ignoreNextUpdate.current = true;
    if (socketRef.current) {
      socketRef.current.emit("code_change", { room: ROOM_ID, code: newValue });
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          background: connected ? "#0f0" : "#f00",
          padding: "6px 10px",
          color: "#000",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {connected ? "Connected to collaboration server" : "Disconnected"}
      </div>
      <div style={{ flexGrow: 1 }}>
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
    </div>
  );
}

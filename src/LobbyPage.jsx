import React, { useState } from "react";

function randomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export default function LobbyPage({ user, setMeetingCode }) {
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");

  function handleCreate() {
    // Just generate code and proceed (let server create room as in your backend)
    setMeetingCode(randomCode());
  }
  function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) {
      setErr("Enter meeting code");
      return;
    }
    setMeetingCode(joinCode.trim().toUpperCase());
  }
  return (
    <div style={{ minHeight: "100vh", background: "#181818", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#232323", borderRadius: 10, boxShadow: "0 0 30px #000b", padding: 36, minWidth: 320, color: "#fff" }}>
        <h2 style={{ textAlign: "center", marginBottom: 18 }}>Welcome, {user.username}!</h2>
        <button style={btnStyle} onClick={handleCreate}>Create Meeting</button>
        <div style={{ color: "#bbb", textAlign: "center", margin: "15px 0" }}>— OR —</div>
        <form onSubmit={handleJoin}>
          <input
            style={inputStyle}
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
            maxLength={8}
            placeholder="Enter Meeting Code"
            autoFocus
          />
          <button style={btnStyle} type="submit">Join Meeting</button>
        </form>
        {err && <div style={{ color: "#f55", marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}
const inputStyle = {
  width: "100%",
  padding: 11,
  borderRadius: 7,
  border: "none",
  outline: "none",
  fontSize: "1.07em",
  background: "#191c1f",
  color: "#fff",
  marginBottom: 13
};
const btnStyle = {
  width: "100%",
  padding: 12,
  fontSize: "1.1em",
  background: "#63e6be",
  color: "#222",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer"
};
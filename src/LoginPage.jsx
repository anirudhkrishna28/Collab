import React, { useState } from "react";

const API = "http://localhost:8000/api"; // change if backend is hosted elsewhere

export default function LoginPage({ setUser }) {
  const [mode, setMode] = useState("login"); // or "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!username || !password) {
      setErr("Username and password required");
      return;
    }
    const url = `${API}/${mode}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      setUser({ username: data.username });
    } else {
      setErr(data.error || "Unknown error");
    }
  }
  return (
    <div style={{ minHeight: "100vh", background: "#181818", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form style={{ background: "#232323", borderRadius: 12, color: "#fff", padding: 32, minWidth: 280, boxShadow: "0 0 30px #000b" }} onSubmit={handleSubmit}>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>{mode === "login" ? "Login" : "Register"}</h2>
        <label>Username</label>
        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <label>Password</label>
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button style={btnStyle} type="submit">{mode === "login" ? "Login" : "Register"}</button>
        {err && <div style={{ color: "#f55", marginTop: 10 }}>{err}</div>}
        <div style={{ color: "#ccc", marginTop: 22, fontSize: "1em", textAlign: "center" }}>
          {mode === "login" ? (
            <>Don't have an account? <span style={linkStyle} onClick={() => setMode("register")}>Register</span></>
          ) : (
            <>Already registered? <span style={linkStyle} onClick={() => setMode("login")}>Login</span></>
          )}
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  margin: "7px 0 14px 0",
  borderRadius: 7,
  border: "none",
  outline: "none",
  background: "#191c1f",
  color: "#fff",
  fontSize: "1.07em"
};
const btnStyle = {
  width: "100%",
  padding: 12,
  margin: "11px 0 0 0",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "1.1em",
  border: "none",
  background: "#63e6be",
  color: "#222",
  cursor: "pointer"
};
const linkStyle = {
  color: "#63e6be",
  cursor: "pointer",
  fontWeight: 600
};
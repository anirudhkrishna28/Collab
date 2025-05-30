import React, { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import LobbyPage from "./LobbyPage";
import MeetingPage from "./MeetingPage";

function getStoredUser() {
  const username = localStorage.getItem("username");
  return username ? { username } : null;
}
function getStoredMeetingCode() {
  return localStorage.getItem("meetingCode") || "";
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [meetingCode, setMeetingCode] = useState(getStoredMeetingCode());

  useEffect(() => {
    // Save username and meetingCode in localStorage for refresh persistency
    if (user?.username) localStorage.setItem("username", user.username);
    else localStorage.removeItem("username");
    if (meetingCode) localStorage.setItem("meetingCode", meetingCode);
    else localStorage.removeItem("meetingCode");
  }, [user, meetingCode]);

  if (!user) {
    return <LoginPage setUser={setUser} />;
  }
  if (!meetingCode) {
    return <LobbyPage user={user} setMeetingCode={setMeetingCode} />;
  }
  return (
    <MeetingPage
      username={user.username}
      meetingCode={meetingCode}
      onEndMeeting={() => setMeetingCode("")}
      onLogout={() => {
        setUser(null);
        setMeetingCode("");
      }}
    />
  );
}
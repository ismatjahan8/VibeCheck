import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../screens/LoginPage";
import SignupPage from "../screens/SignupPage";
import ResetPasswordPage from "../screens/ResetPasswordPage";
import OAuthGoogleCallbackPage from "../screens/OAuthGoogleCallbackPage";
import ChatsPage from "../screens/ChatsPage";
import ChatPage from "../screens/ChatPage";
import ContactsPage from "../screens/ContactsPage";
import ProfilePage from "../screens/ProfilePage";
import SettingsPage from "../screens/SettingsPage";
import { useAuthStore } from "../stores/auth";
import { useEffect } from "react";
import { useUiStore } from "../stores/ui";

export default function App() {
  const token = useAuthStore((s) => s.token);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth/google/callback" element={<OAuthGoogleCallbackPage />} />

      <Route path="/" element={token ? <Navigate to="/chats" /> : <Navigate to="/login" />} />
      <Route path="/chats" element={token ? <ChatsPage /> : <Navigate to="/login" />} />
      <Route path="/chats/:conversationId" element={token ? <ChatPage /> : <Navigate to="/login" />} />
      <Route path="/contacts" element={token ? <ContactsPage /> : <Navigate to="/login" />} />
      <Route path="/profile" element={token ? <ProfilePage /> : <Navigate to="/login" />} />
      <Route path="/settings" element={token ? <SettingsPage /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}


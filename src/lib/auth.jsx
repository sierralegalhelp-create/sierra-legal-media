import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signOut as fbSignOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { ensureClientDoc, isAdmin, watchClient } from "./data";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [client, setClient]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setError("");
      if (!u) {
        setUser(null);
        setClient(null);
        setLoading(false);
        return;
      }
      setUser(u);
      if (!isAdmin(u)) {
        try {
          await ensureClientDoc(u);
        } catch (e) {
          setError("We couldn't load your account. Try signing in again.");
        }
      }
      setLoading(false);
    });
  }, []);

  // Keep the client record live so subscription changes land instantly.
  useEffect(() => {
    if (!user || isAdmin(user)) return;
    return watchClient(user.uid, setClient);
  }, [user]);

  const value = {
    user,
    client,
    admin: isAdmin(user),
    loading,
    error,
    setError,
    signInGoogle: () => signInWithPopup(auth, googleProvider),
    signInEmail:  (e, p) => signInWithEmailAndPassword(auth, e, p),
    signUpEmail:  (e, p) => createUserWithEmailAndPassword(auth, e, p),
    resetPassword: (e) => sendPasswordResetEmail(auth, e),
    signOut: () => fbSignOut(auth),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

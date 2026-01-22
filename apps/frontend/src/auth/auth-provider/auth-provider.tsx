import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { pb } from "@/services/pb/client";

import { AuthContext } from "../auth-context/auth-context";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(pb.authStore.isValid);
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setIsAuthed(pb.authStore.isValid);
      setUser(pb.authStore.record);
    });
    setIsAuthed(pb.authStore.isValid);
    setUser(pb.authStore.record);
    setLoading(false);
    return unsub;
  }, []);

  const logout = async () => {
    pb.authStore.clear();
    setIsAuthed(false);
    setUser(null);
  };

  // We might be able to use `isSuperUser` from authStore
  const isAdmin = (user as { role?: string } | null)?.role === "admin";

  return (
    <AuthContext.Provider value={{ isAuthed, isAdmin, user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

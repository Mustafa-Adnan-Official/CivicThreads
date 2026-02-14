"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@/lib/types";
import { MOCK_USER } from "@/lib/mock-data";

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Firebase Auth signInWithEmailAndPassword
      await new Promise((r) => setTimeout(r, 500));
      setUser({ ...MOCK_USER, accountName: email.split("@")[0] ?? "User" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    // TODO: Firebase Auth signOut
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

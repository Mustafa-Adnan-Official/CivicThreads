"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import type { User, UserRole } from "@/lib/types";

interface SignUpOptions {
  email: string;
  password: string;
  accountName: string;
  role: UserRole;
  /** required for CITY_ADMIN */
  cityId?: string;
  /** display name for a new city (CITY_ADMIN only) */
  cityName?: string;
  /** required for WARD_REP */
  wardId?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  signUp: (opts: SignUpOptions) => Promise<void>;
  sendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function userDocToUser(uid: string, data: Record<string, unknown>): User {
  return {
    uid,
    role: (data.role as UserRole) ?? "RESIDENT",
    accountName: (data.accountName as string) ?? "",
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    cityId: (data.cityId as string) ?? undefined,
    wardId: (data.wardId as string) ?? undefined,
  };
}

/**
 * After a WARD_REP verifies their email and signs in, link their uid to the ward
 * IF their email matches wardRepEmail and repUid is not yet set.
 */
async function tryLinkRepToWard(uid: string, email: string) {
  if (!db) return;
  try {
    // Search all cities for wards where wardRepEmail matches and repUid is empty
    const citiesSnap = await getDocs(collection(db, "cities"));
    for (const cityDoc of citiesSnap.docs) {
      const wardsRef = collection(db, "cities", cityDoc.id, "wards");
      const q = query(wardsRef, where("wardRepEmail", "==", email.toLowerCase()));
      const wardsSnap = await getDocs(q);
      for (const wardDoc of wardsSnap.docs) {
        const data = wardDoc.data();
        if (!data.repUid) {
          await updateDoc(doc(db, "cities", cityDoc.id, "wards", wardDoc.id), {
            repUid: uid,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (e) {
    console.error("tryLinkRepToWard:", e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      setFirebaseUser(fbUser ?? null);

      if (!fbUser) { setUser(null); setIsLoading(false); return; }
      if (!fbUser.emailVerified) { setUser(null); setIsLoading(false); return; }
      if (!db) { setUser(null); setIsLoading(false); return; }

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        let userData: User | null = null;

        if (snap.exists()) {
          userData = userDocToUser(fbUser.uid, snap.data());
        } else {
          await setDoc(ref, { role: "RESIDENT", accountName: fbUser.email?.split("@")[0] ?? "Resident", createdAt: serverTimestamp() }, { merge: true });
          const snap2 = await getDoc(ref);
          if (snap2.exists()) userData = userDocToUser(fbUser.uid, snap2.data());
        }

        // If WARD_REP with verified email, link to ward (deferred from signup)
        if (userData?.role === "WARD_REP" && fbUser.email) {
          await tryLinkRepToWard(fbUser.uid, fbUser.email.toLowerCase());
        }

        setUser(userData);
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Auth not ready");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(() => {
    auth && firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const signUp = useCallback(
    async (opts: SignUpOptions) => {
      if (!auth || !db) throw new Error("Auth not ready");
      const { email, password, accountName, role, cityId, cityName, wardId } = opts;

      // ---------- WARD_REP pre-checks (before creating the Auth user) ----------
      if (role === "WARD_REP" && cityId && wardId) {
        const wardRef = doc(db, "cities", cityId, "wards", wardId);
        const wardSnap = await getDoc(wardRef);
        if (!wardSnap.exists()) {
          throw new Error("This ward has not been created by the city admin yet.");
        }
        const wardData = wardSnap.data();
        if (!wardData?.wardRepEmail || wardData.wardRepEmail.toLowerCase() !== email.trim().toLowerCase()) {
          throw new Error("Your email does not match the ward representative email on file. Contact your city admin.");
        }
        if (wardData?.repUid) {
          throw new Error("A representative is already linked to this ward.");
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // users/{uid} — store cityId/wardId so we can read it back on login
      const userDoc: Record<string, unknown> = { role, accountName, createdAt: serverTimestamp() };
      if (cityId) userDoc.cityId = cityId;
      if (wardId) userDoc.wardId = wardId;
      await setDoc(doc(db, "users", uid), userDoc);

      // ---------- CITY_ADMIN: create-or-join city ----------
      if (role === "CITY_ADMIN" && cityId) {
        const cityRef = doc(db, "cities", cityId);
        const citySnap = await getDoc(cityRef);
        if (!citySnap.exists()) {
          // Create the city doc
          await setDoc(cityRef, {
            cityName: cityName || cityId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        // Add admin
        await setDoc(doc(db, "cities", cityId, "admins", uid), {
          onboarded: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // ---------- WARD_REP: do NOT write repUid yet — deferred to verified login ----------

      await sendEmailVerification(cred.user);
    },
    []
  );

  const sendVerification = useCallback(async () => {
    if (!firebaseUser) return;
    await sendEmailVerification(firebaseUser);
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) throw new Error("Auth not ready");
    await sendPasswordResetEmail(auth, email);
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, signIn, signOut, signUp, sendVerification, resetPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

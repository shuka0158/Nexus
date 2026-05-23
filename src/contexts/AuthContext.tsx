'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, updateUserProfile } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserDisplayName: (name: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await updateUserProfile(firebaseUser.uid, { lastSeen: Timestamp.now() });
        } catch { /* non-critical — don't block loading */ }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await createUserProfile(cred.user.uid, {
      uid: cred.user.uid,
      email,
      displayName,
      photoURL: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || 'en',
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await createUserProfile(cred.user.uid, {
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: cred.user.displayName ?? '',
      photoURL: cred.user.photoURL,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || 'en',
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserDisplayName = async (name: string) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name });
    await updateUserProfile(auth.currentUser.uid, { displayName: name });
  };

  const updateUserEmail = async (email: string) => {
    if (!auth.currentUser) return;
    await updateEmail(auth.currentUser, email);
    await updateUserProfile(auth.currentUser.uid, { email });
  };

  const updateUserPassword = async (password: string) => {
    if (!auth.currentUser) return;
    await updatePassword(auth.currentUser, password);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      signIn, signUp, signInWithGoogle,
      logout, resetPassword,
      updateUserDisplayName, updateUserEmail, updateUserPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

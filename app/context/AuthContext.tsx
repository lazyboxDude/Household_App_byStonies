"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { account } from "../lib/appwrite";
import { OAuthProvider } from "appwrite";

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: User[];
}

interface AuthContextType {
  user: User | null;
  household: Household | null;
  login: (name: string, email?: string, avatar?: string) => void;
  loginWithGoogle: () => void;
  logout: () => void;
  createHousehold: (name: string) => void;
  joinHousehold: (code: string) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load from Appwrite or localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Try Appwrite Session
        const appwriteUser = await account.get();
        setUser({
          id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${appwriteUser.name}`
        });
      } catch (error) {
        // 2. Fallback to LocalStorage (for "Name only" login)
        const storedUser = localStorage.getItem("household_user");
        if (storedUser) setUser(JSON.parse(storedUser));
      }

      // Load household data
      const storedHousehold = localStorage.getItem("household_data");
      if (storedHousehold) setHousehold(JSON.parse(storedHousehold));
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (name: string, email?: string, avatar?: string) => {
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    setUser(newUser);
    localStorage.setItem("household_user", JSON.stringify(newUser));
  };

  const loginWithGoogle = () => {
    try {
      // Redirects to Google OAuth flow
      account.createOAuth2Session(
        OAuthProvider.Google,
        window.location.origin, // Success URL (Home)
        `${window.location.origin}/login` // Failure URL
      );
    } catch (error) {
      console.error("Appwrite Login Error:", error);
      alert("Failed to initialize Google Login. Check Appwrite config.");
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (error) {
      // Ignore error if already logged out
    }
    setUser(null);
    setHousehold(null);
    localStorage.removeItem("household_user");
    localStorage.removeItem("household_data");
    router.push("/login");
  };

  const createHousehold = (name: string) => {
    if (!user) return;
    
    const newHousehold: Household = {
      id: Date.now().toString(),
      name,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      members: [user]
    };
    
    setHousehold(newHousehold);
    localStorage.setItem("household_data", JSON.stringify(newHousehold));
  };

  const joinHousehold = (code: string) => {
    if (!user) return false;

    // In a real app, this would verify against a DB.
    // Here we simulate joining by "finding" a mock household if the code matches a pattern
    // or just accepting it for demo purposes if it's not empty.
    
    // Demo: If code is "DEMO123", join the "Stonies Family"
    if (code === "DEMO123" || code.length === 6) {
      const demoHousehold: Household = {
        id: "demo-house",
        name: "The Stonies",
        inviteCode: code,
        members: [
          { id: "mom", name: "Mom", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mom" },
          { id: "dad", name: "Dad", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dad" },
          user
        ]
      };
      setHousehold(demoHousehold);
      localStorage.setItem("household_data", JSON.stringify(demoHousehold));
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      household, 
      login, 
      loginWithGoogle,
      logout, 
      createHousehold, 
      joinHousehold,
      isAuthenticated: !!user 
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

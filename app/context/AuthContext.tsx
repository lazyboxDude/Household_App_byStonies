"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("household_user");
    const storedHousehold = localStorage.getItem("household_data");

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedHousehold) setHousehold(JSON.parse(storedHousehold));
    setIsLoading(false);
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
    // SIMULATION: In a real app, this would use Firebase/NextAuth
    // We'll simulate a successful Google login
    const mockGoogleUser = {
      name: "Stonie (Google)",
      email: "stonie@gmail.com",
      avatar: "https://lh3.googleusercontent.com/a/ACg8ocIq8d_...=s96-c" // Generic placeholder or keep using dicebear
    };
    
    // Use a slight delay to simulate network request
    setTimeout(() => {
      login(mockGoogleUser.name, mockGoogleUser.email, `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockGoogleUser.name}`);
    }, 800);
  };

  const logout = () => {
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

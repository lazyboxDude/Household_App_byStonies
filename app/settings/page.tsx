"use client";

import { useAuth } from "../context/AuthContext";
import { Copy, LogOut, User, Home, Shield, ArrowRight } from "lucide-react";
import Image from 'next/image';
import { useState } from "react";

export default function SettingsPage() {
  const { user, household, logout, login, loginWithGoogle } = useAuth();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const copyCode = () => {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) login(name);
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      loginWithGoogle();
      setIsGoogleLoading(false);
    }, 1000);
  };

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Log in to manage your household</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="e.g. Alex"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-medium py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h1>
      
      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <User className="w-5 h-5 text-orange-500" />
          My Profile
        </h2>
        <div className="flex items-center gap-4">
          <Image
            src={user.avatar}
            alt={user.name}
            width={64}
            height={64}
            unoptimized
            className="w-16 h-16 rounded-full bg-gray-100"
          />
          <div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-sm text-gray-500">Member since Nov 2025</p>
          </div>
        </div>
      </div>

      {/* Household Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <Home className="w-5 h-5 text-orange-500" />
          Household Management
        </h2>
        
        {household ? (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Household Name</label>
              <p className="font-medium text-gray-900 dark:text-white text-lg">{household.name}</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800">
              <label className="text-sm font-medium text-orange-800 dark:text-orange-300 block mb-2">
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded border border-orange-200 dark:border-orange-800 font-mono text-lg tracking-widest text-center">
                  {household.inviteCode}
                </code>
                <button 
                  onClick={copyCode}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  title="Copy Code"
                >
                  {copied ? <Shield className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                Share this code with family members to let them join your household.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Members ({household.members.length})</h3>
              <div className="space-y-2">
                {household.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Image src={member.avatar} alt={member.name} width={32} height={32} unoptimized className="w-8 h-8 rounded-full bg-gray-100" />
                      <span className="text-gray-700 dark:text-gray-300">{member.name}</span>
                    </div>
                    {member.id === user.id && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">You are not part of a household yet.</p>
          </div>
        )}
      </div>

      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}

"use client";

import { useAuth } from "../context/AuthContext";
import { Copy, LogOut, User, Home, Shield } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user, household, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

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
          <img 
            src={user.avatar} 
            alt={user.name} 
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
                      <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full bg-gray-100" />
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

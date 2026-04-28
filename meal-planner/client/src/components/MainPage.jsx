import React, { useState } from 'react';
import { User, Package, Calendar, Heart, ChefHat, Settings, LogOut } from 'lucide-react';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Ingredients from './Ingredients';
import Plans from './Plans';
import Favorites from './Favorites';
import { apiService } from '../api_client'; // ← use existing API client

function getUserId() {
  try { return JSON.parse(localStorage.getItem('userId') || 'null'); } catch { return null; }
}

const MealPlannerApp = ({ userEmail, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChefHat },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ingredients', label: 'Ingredients', icon: Package },
    { id: 'plans', label: 'Meal Plans', icon: Calendar },
    { id: 'favorites', label: 'Favourites', icon: Heart },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <Dashboard />;
      case 'profile':     return <Profile userEmail={userEmail} />;
      case 'ingredients': return <Ingredients />;
      case 'plans':       return <Plans />;
      case 'favorites':   return <Favorites />;
      default:            return <Dashboard />;
    }
  };
  async function handleDeleteAccount() {
    setError('');
    const userId = getUserId();
    if (!userId) { setError('Missing user id. Please sign in again.'); return; }
    try {
      setDeleting(true);
      await apiService.deleteUser(userId);
      // Clear local state + storage, then sign out
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
      setSettingsOpen(false);
      onSignOut?.();
    } catch (e) {
      console.error(e);
      setError('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                MealWizard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors duration-200 border border-gray-200"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button
                onClick={onSignOut}
                className="p-2 bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200 border border-gray-200"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 space-y-2">
            <nav className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
                      active
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 bg-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">Settings</h2>
              <p className="mt-1 text-sm text-gray-600">
                Permanently delete your account and all data (meal plans, favourites, ingredients).
              </p>

              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Type <span className="font-semibold">DELETE</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="DELETE"
                />
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => { setSettingsOpen(false); setConfirmText(''); setError(''); }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!canDelete || deleting}
                className={`px-4 py-2 rounded-xl text-white ${
                  (!canDelete || deleting)
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlannerApp;

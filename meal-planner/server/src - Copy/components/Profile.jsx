import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../api_client';
import { FitnessGoal, FitnessLevel, Gender } from '../../../common/constants';
import { Edit3, Check, X, User, Target, Activity, Scale } from 'lucide-react';

const colorPairs = [
  ['from-purple-600', 'to-pink-600'],
  ['from-indigo-600', 'to-cyan-600'],
  ['from-rose-600', 'to-orange-500'],
  ['from-emerald-600', 'to-lime-500'],
  ['from-blue-600', 'to-violet-600'],
  ['from-amber-600', 'to-red-500'],
];

function avatarFrom(name = '') {
  const s = name.trim().toLowerCase();
  const code = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = colorPairs[code % colorPairs.length];
  const initial = (s.match(/[a-z0-9]/i)?.[0] || 'U').toUpperCase();
  return { bg: `bg-gradient-to-br ${from} ${to}`, initial };
}

const cuisineOptions = [
  'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 
  'French', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Chinese'
];

const Profile = ({ userEmail: emailProp }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);

  // form state for edits
  const [form, setForm] = useState({
    weight: '',
    fitnessGoal: '',
    fitnessLevel: '',
    gender: '',
    favoriteCuisines: [],
    username: '',
  });
  const [saving, setSaving] = useState(false);

  const email = useMemo(
    () => emailProp || (typeof localStorage !== 'undefined' ? localStorage.getItem('email') : '') || '',
    [emailProp]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!email) {
        setErr('Not signed in.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr('');
      try {
        const all = await apiService.request('/');
        const found = Array.isArray(all)
          ? all.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
          : null;
        if (!cancelled) {
          if (!found) {
            setErr('No profile found for the signed-in user.');
            setUser(null);
          } else {
            setUser(found);
            // fill form with existing values
            setForm({
              weight: found.weight ?? '',
              fitnessGoal: found.fitnessGoal ?? '',
              fitnessLevel: found.fitnessLevel ?? '',
              gender: found.gender ?? '',
              favoriteCuisines: Array.isArray(found.favoriteCuisines) ? found.favoriteCuisines : [],
              username: found.username ?? '',
            });
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to load profile', e);
        if (!cancelled) {
          setErr('Failed to load profile.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const pretty = (s) =>
    (s || '')
      .toString()
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());

  const displayName = user?.username || 'User';
  const { bg, initial } = avatarFrom(displayName);

  const getGoalIcon = (goal) => {
    switch ((goal || '').toLowerCase()) {
      case 'weight_loss': return '🎯';
      case 'muscle_gain': return '💪';
      case 'maintenance': return '⚖️';
      default: return '🏃';
    }
  };
  const getActivityIcon = (level) => {
    switch ((level || '').toLowerCase()) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🔥';
      case 'advanced': return '⚡';
      default: return '📊';
    }
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {};
        if (form.username !== '') payload.username = form.username;
        if (form.weight !== '') payload.weight = Number(form.weight);
        if (form.fitnessGoal !== '') payload.fitnessGoal = form.fitnessGoal;
        if (form.fitnessLevel !== '') payload.fitnessLevel = form.fitnessLevel;
        if (form.gender !== '') payload.gender = form.gender;
        if (Array.isArray(form.favoriteCuisines)) payload.favoriteCuisines = form.favoriteCuisines;
      const updated = await apiService.updateUser(user.id, payload);
      setUser(updated);
      setEditing(false);
    } catch (e) {
      console.error('Save failed', e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="animate-pulse">
              <div className="flex items-center gap-8 mb-12">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full shadow-lg" />
                <div className="space-y-4 flex-1">
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-1/2" />
                  <div className="h-5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg w-2/3" />
                  <div className="flex gap-3">
                    <div className="h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24" />
                    <div className="h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-20" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-inner" />
                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-inner" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-red-200 max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 text-lg font-semibold">{err}</p>
        </div>
      </div>
    );
  }

  const cuisines = Array.isArray(user?.favoriteCuisines) ? user.favoriteCuisines : [];

  return (
    <div className="space-y-6">
      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        {/* Header with Avatar and Basic Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
          <div className="relative">
            <div className={`w-32 h-32 ${bg} rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white/50`}>
              {initial}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {displayName}
            </h1>
            <p className="text-gray-600 mb-4">{email}</p>

            {/* Edit/Cancel/Save Buttons*/}
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { 
                      setEditing(false); 
                      setForm({
                        weight: user.weight ?? '',
                        fitnessGoal: user.fitnessGoal ?? '',
                        fitnessLevel: user.fitnessLevel ?? '',
                        gender: user.gender ?? '',
                        favoriteCuisines: Array.isArray(user.favoriteCuisines) ? user.favoriteCuisines : [],
                        username: user.username ?? '',
                      }); 
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    onClick={save}
                    className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                      saving 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dietary Preferences Card */}
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-6 border border-orange-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🍽️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Dietary Preferences</h3>
            </div>

            {!editing ? (
              cuisines.length ? (
                <div className="flex flex-wrap gap-3">
                  {cuisines.map((c, i) => (
                    <span
                      key={`${c}-${i}`}
                      className="bg-white/80 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-md border border-white/50 hover:shadow-lg transition-shadow duration-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic bg-white/50 rounded-xl p-4 border border-white/30">
                  No preferences set yet. Click "Edit Profile" to add your favorite cuisines!
                </div>
              )
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4 font-medium">Select your favorite cuisines:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cuisineOptions.map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          favoriteCuisines: f.favoriteCuisines.includes(cuisine)
                            ? f.favoriteCuisines.filter((x) => x !== cuisine)
                            : [...f.favoriteCuisines, cuisine],
                        }))
                      }
                      className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium text-sm hover:scale-105 ${
                        form.favoriteCuisines.includes(cuisine)
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-lg'
                          : 'bg-white/80 text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                    >
                      {form.favoriteCuisines.includes(cuisine) && '✓ '}
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Goals & Attributes Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Goals & Attributes</h3>
            </div>

            {!editing ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/80 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getGoalIcon(user?.fitnessGoal)}</span>
                    <span className="text-gray-700 font-medium">Fitness Goal</span>
                  </div>
                  <span className="inline-flex items-center h-9 px-4 font-bold text-gray-800 bg-white/50 rounded-full border border-white/30">
                    {pretty(user?.fitnessGoal) || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/80 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getActivityIcon(user?.fitnessLevel)}</span>
                    <span className="text-gray-700 font-medium">Activity Level</span>
                  </div>
                  <span className="inline-flex items-center h-9 px-4 font-bold text-gray-800 bg-white/50 rounded-full border border-white/30">
                    {pretty(user?.fitnessLevel) || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/80 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <span className="text-gray-700 font-medium">Gender</span>
                  </div>
                  <span className="inline-flex items-center h-9 px-4 font-bold text-gray-800 bg-white/50 rounded-full border border-white/30">
                    {pretty(user?.gender) || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/80 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚖️</span>
                    <span className="text-gray-700 font-medium">Weight</span>
                  </div>
                  <span className="inline-flex items-center h-9 px-4 font-bold text-gray-800 bg-white/50 rounded-full border border-white/30">
                    {user?.weight ? `${user.weight} lbs` : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Username and Weight Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <User className="w-4 h-4" />
                      Username
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
                      placeholder="Enter your username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Scale className="w-4 h-4" />
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      value={form.weight}
                      onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
                      placeholder="Enter your weight"
                    />
                  </div>
                </div>

                {/* Enhanced Select Dropdowns */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Target className="w-4 h-4" />
                      Fitness Goal
                    </label>
                    <select
                      value={form.fitnessGoal}
                      onChange={(e) => setForm((f) => ({ ...f, fitnessGoal: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium cursor-pointer hover:border-blue-300"
                    >
                      <option value="">Select your fitness goal</option>
                      <option value={FitnessGoal.CUTTING}>🎯 Cutting (Fat Loss)</option>
                      <option value={FitnessGoal.BULKING}>💪 Bulking (Muscle Gain)</option>
                      <option value={FitnessGoal.MAINTAINING}>⚖️ Maintaining (Current Weight)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Activity className="w-4 h-4" />
                      Activity Level
                    </label>
                    <select
                      value={form.fitnessLevel}
                      onChange={(e) => setForm((f) => ({ ...f, fitnessLevel: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium cursor-pointer hover:border-blue-300"
                    >
                      <option value="">Select your activity level</option>
                      <option value={FitnessLevel.SEDENTARY}>🛋️ Sedentary (Little to no exercise)</option>
                      <option value={FitnessLevel.LIGHT}>🌱 Light (Light exercise 1-3 days/week)</option>
                      <option value={FitnessLevel.MODERATE}>🔥 Moderate (Moderate exercise 3-5 days/week)</option>
                      <option value={FitnessLevel.ACTIVE}>⚡ Active (Hard exercise 6-7 days/week)</option>
                      <option value={FitnessLevel.VERY_ACTIVE}>🚀 Very Active (Very hard exercise, physical job)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <User className="w-4 h-4" />
                      Gender
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium cursor-pointer hover:border-blue-300"
                    >
                      <option value="">Select your gender</option>
                      <option value={Gender.MALE}>👨 Male</option>
                      <option value={Gender.FEMALE}>👩 Female</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
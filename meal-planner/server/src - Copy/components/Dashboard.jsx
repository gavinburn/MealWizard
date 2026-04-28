import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Package, Heart, ChefHat, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { apiService } from '../api_client';

function getUserId() {
  try { return JSON.parse(localStorage.getItem('userId') || 'null'); } catch { return null; }
}
function getUserEmail() {
  try {
    const raw = localStorage.getItem('email') || '';
    const unwrapped = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return unwrapped.replace(/^['"]+|['"]+$/g, '').trim();
  } catch {
    return '';
  }
}

// Normalize to base units for thresholding (g / mL)
function toBaseUnit(item) {
  const q = Number(item?.quantity ?? 0);
  const u = (item?.unit || '').trim();
  if (u === 'g')   return { type: 'mass', base: q,       show: `${q} g` };
  if (u === 'kg')  return { type: 'mass', base: q * 1000, show: `${q} kg` };
  if (u === 'mL')  return { type: 'vol',  base: q,       show: `${q} mL` };
  if (u === 'L')   return { type: 'vol',  base: q * 1000, show: `${q} L` };
  return { type: 'other', base: q, show: `${q} ${u || ''}` };
}

export default function Dashboard() {
  const userId = getUserId();
  const email = getUserEmail();
  const emailName = (email.split('@')[0] || 'there').replace(/^['"]+|['"]+$/g, '').trim();

  // Header display name: start with email's local-part, then upgrade to DB username if available
  const [displayName, setDisplayName] = useState(emailName);

  const [plans, setPlans] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState({ plans: true, ingredients: true, favs: true });
  const [err, setErr] = useState('');

  // Fetch username from the API (fallback already set from email local-part)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      try {
        const all = await apiService.request('/'); // GET /api → list users
        const found = Array.isArray(all)
          ? all.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
          : null;
        const uname = (found?.username || '').toString().trim();
        if (!cancelled && uname) {
          setDisplayName(uname.replace(/^['"]+|['"]+$/g, ''));
          try { localStorage.setItem('username', JSON.stringify(uname)); } catch { /* empty */ }
        }
      } catch {
        // non-fatal for header; keep emailName
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  // Load ACTIVE meal plans
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) { setLoading(l => ({ ...l, plans: false })); return; }
      try {
        const list = await apiService.getUserMealPlans(userId, 'ACTIVE');
        if (!ignore) setPlans(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr(prev => prev || 'Failed to load meal plans.');
      } finally {
        if (!ignore) setLoading(l => ({ ...l, plans: false }));
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  // Load ingredients
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) { setLoading(l => ({ ...l, ingredients: false })); return; }
      try {
        const list = await apiService.getUserIngredients(userId);
        if (!ignore) setIngredients(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr(prev => prev || 'Failed to load ingredients.');
      } finally {
        if (!ignore) setLoading(l => ({ ...l, ingredients: false }));
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  // Load favourites
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId || !apiService.getUserFavorites) { setLoading(l => ({ ...l, favs: false })); return; }
      try {
        const list = await apiService.getUserFavorites(userId);
        if (!ignore) setFavs(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr(prev => prev || 'Failed to load favourites.');
      } finally {
        if (!ignore) setLoading(l => ({ ...l, favs: false }));
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  // Compute low-stock items: < 100 g OR < 100 mL
  const lowStock = useMemo(() => {
    const THRESHOLD = 100; // base units (g / mL)
    const flagged = (ingredients || []).filter(it => {
      const norm = toBaseUnit(it);
      if (norm.type === 'mass' || norm.type === 'vol') {
        return Number.isFinite(norm.base) && norm.base < THRESHOLD;
      }
      return false; // unknown units not flagged
    });
    return flagged
      .map(it => ({ it, norm: toBaseUnit(it) }))
      .sort((a, b) => (a.norm.base || 0) - (b.norm.base || 0))
      .map(x => x.it);
  }, [ingredients]);

  const statSkeleton = (
    <div className="h-8 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse" aria-hidden />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-gray-200/50 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl" />
          <div className="absolute top-10 right-20 w-8 h-8 bg-yellow-300/60 rounded-full animate-pulse" />
          <div className="absolute bottom-8 left-32 w-4 h-4 bg-pink-400/60 rounded-full animate-pulse delay-1000" />
          
          <div className="relative z-10 flex items-center gap-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
                <ChefHat className="w-11 h-11 text-white drop-shadow-sm" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-visible">
              <h1
                className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.25] sm:leading-[1.15] pb-2"
              >
                Welcome back, {displayName}!
              </h1>
              <p className="text-gray-600">Your meal planning hub at a glance.</p>
            </div>
            <div className="hidden lg:block">
              <div className="text-right text-sm text-gray-500">
                <div className="font-medium">Today</div>
                <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Plans */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-xl" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-md">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-1">Active Plans</p>
                <p className="text-3xl font-black text-gray-800">
                  {loading.plans ? statSkeleton : plans.length}
                </p>
              </div>
            </div>
          </div>

          {/* Pantry Items */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-emerald-100/30 to-green-100/30 rounded-full blur-xl" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-1">Pantry Items</p>
                <p className="text-3xl font-black text-gray-800">
                  {loading.ingredients ? statSkeleton : ingredients.length}
                </p>
              </div>
            </div>
          </div>

          {/* Favourites */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-rose-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-pink-100/30 to-rose-100/30 rounded-full blur-xl" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-1">Favourites</p>
                <p className="text-3xl font-black text-gray-800">
                  {loading.favs ? statSkeleton : favs.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Running Low */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/50 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-amber-100/30 to-orange-100/20 blur-2xl" />
          
          <div className="relative z-10 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Running Low
                  </h2>
                  <p className="text-gray-600">Items under 100g or 100mL</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm text-amber-700 font-medium">Under threshold</span>
              </div>
            </div>

            {loading.ingredients ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span className="font-medium">Loading ingredients...</span>
                </div>
              </div>
            ) : lowStock.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-green-50/50 to-emerald-50/30 border border-green-200/50 rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-gray-800">All stocked up!</p>
                  <p className="text-gray-600">Nothing under threshold right now.</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50/50 to-white rounded-2xl border border-gray-200/50 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {lowStock.slice(0, 8).map((i, index) => (
                    <div key={i.id} className="group p-6 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-800 truncate text-lg">{i.name}</p>
                            <p className="text-gray-600 mt-1">
                              <span className="text-sm">Quantity:</span>
                              <span className="font-semibold ml-1">{i.quantity} {i.unit}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs text-gray-500 hidden sm:block">
                            #{index + 1} lowest
                          </div>
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200 shadow-sm">
                            Low Stock
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {lowStock.length > 8 && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-t border-gray-200">
                    <p className="text-center text-sm font-medium text-gray-600">
                      And {lowStock.length - 8} more items running low
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {err && (
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-red-200/50 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-pink-50/40" />
            <div className="relative z-10 p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-lg">Something went wrong</p>
                <p className="text-red-700">{err}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

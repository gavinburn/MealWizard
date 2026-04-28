import React, { useEffect, useState } from 'react';
import { Heart, Calendar, Utensils, Clock, X, Flame } from 'lucide-react';
import { apiService } from '../api_client';

function getUserId() {
  try { return JSON.parse(localStorage.getItem('userId') || 'null'); } catch { return null; }
}

export default function Favorites() {
  const userId = getUserId();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfavingId, setUnfavingId] = useState(null);
  const [notice, setNotice] = useState(null); // {kind,msg}

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const favs = await apiService.listFavoritePlans(userId);
        if (!ignore) setItems(Array.isArray(favs) ? favs : []);
      } catch (e) {
        console.error('Fetch favorites failed:', e);
        if (!ignore) setNotice({ kind: 'error', msg: 'Failed to load favourites.' });
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  const unfavorite = async (planId) => {
    if (!userId) return;
    try {
      setUnfavingId(planId);
      await apiService.unfavoriteMealPlan(userId, planId);
      setItems(prev => prev.filter(f => f.planId !== planId));
      setNotice({ kind: 'success', msg: 'Removed from favourites.' });
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error('Unfavourite failed:', e);
      setNotice({ kind: 'error', msg: 'Could not remove favourite.' });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setUnfavingId(null);
    }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString(); } catch { return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Favourites</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">{items.length} saved</span>
            <Heart className="w-5 h-5 text-pink-500" />
          </div>
        </div>

        {/* Inline notice */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-xl border p-4 text-sm font-medium flex items-start gap-3 ${
              notice.kind === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className={`mt-0.5 w-2 h-2 rounded-full ${notice.kind === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="flex-1">{notice.msg}</div>
            <button
              onClick={() => setNotice(null)}
              className="shrink-0 px-2 py-1 rounded-md hover:bg-white/50 transition"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">No favourites yet</p>
            <p className="text-gray-600">Tap the <span className="font-medium">Favourite</span> button on any meal plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(card => (
              <div key={card.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800">{card.name}</h3>
                  <button
                    onClick={() => unfavorite(card.planId)}
                    disabled={unfavingId === card.planId}
                    className="text-pink-700 bg-pink-50 hover:bg-white px-3 py-1.5 rounded-lg border border-pink-200 inline-flex items-center gap-2"
                    title="Remove from favourites"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    {unfavingId === card.planId ? 'Removing…' : 'Favourited'}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mb-3">Saved {formatDate(card.createdAt)}</div>

                {/* Vital preview info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-500">Duration</div>
                      <div className="text-sm font-medium text-gray-800">{card.preview.durationDays || 0} days</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-500">Meals / day</div>
                      <div className="text-sm font-medium text-gray-800">{card.preview.mealsPerDay || 0}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-500">Total meals</div>
                      <div className="text-sm font-medium text-gray-800">{card.preview.totalMeals || 0}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-xs text-gray-500">Target kcal/day</div>
                      <div className="text-sm font-medium text-gray-800">
                        {card.preview.targetCaloriesPerDay ? Math.round(card.preview.targetCaloriesPerDay) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {card.preview.cuisineStyle && (
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="text-gray-500">Cuisine: </span>
                    <span className="font-medium">{card.preview.cuisineStyle}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
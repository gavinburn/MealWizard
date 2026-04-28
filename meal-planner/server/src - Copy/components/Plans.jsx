import React, { useEffect, useState } from 'react';
import {
  Plus, X, Calendar, Utensils, RefreshCcw, CheckCircle, FolderCheck, Archive, Heart, Flame, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiService } from '../api_client';

function getUserId() {
  try { return JSON.parse(localStorage.getItem('userId') || 'null'); } catch { return null; }
}

const Plans = () => {
  const userId = getUserId();
  const [showModal, setShowModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [activePlans, setActivePlans] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [favingId, setFavingId] = useState(null);
  const [userFavPlanIds, setUserFavPlanIds] = useState(new Set());

  const [expandedPlanIds, setExpandedPlanIds] = useState(new Set());

  const [notice, setNotice] = useState(null); // { kind: 'success' | 'error', msg: string }

  // load existing ACTIVE plans
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) { setLoadingList(false); return; }
      try {
        const list = await apiService.getUserMealPlans(userId, 'ACTIVE');
        if (!ignore) setActivePlans(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Fetch meal plans failed:', e);
      } finally {
        if (!ignore) setLoadingList(false);
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  // load favourites for the user so we can show heart state on cards
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) return;
      try {
        const favs = await apiService.listFavoritePlans(userId);
        if (!ignore && Array.isArray(favs)) {
          setUserFavPlanIds(new Set(favs.map(f => f.planId)));
        } else if (!ignore) {
          setUserFavPlanIds(new Set());
        }
      } catch (e) {
        console.error('Fetch favourites failed:', e);
        if (!ignore) setUserFavPlanIds(new Set());
      }
    })();
    return () => {
      ignore = true;
    };
  }, [userId]);


  const validate = () => {
    const e = {};
    const d = Number(durationDays);
    const m = Number(mealsPerDay);
    if (!planName.trim()) e.planName = 'Give your plan a name';
    if (!Number.isFinite(d) || d < 1 || d > 30) e.durationDays = 'Choose 1–30 days';
    if (!Number.isFinite(m) || m < 1 || m > 6) e.mealsPerDay = 'Choose 1–6 meals/day';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openModal = () => { setErrors({}); setShowModal(true); };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const createPlan = async () => {
    if (!validate() || !userId) return;
    setSubmitting(true);
    setLoadingPlan(true);
    try {
      const generated = await apiService.generateMealPlan({
        userId,
        durationDays: Number(durationDays),
        mealsPerDay: Number(mealsPerDay),
        name: planName.trim(),
      });
      setPlan(generated?.plan || generated);
      setShowModal(false);

      setNotice({ kind: 'success', msg: 'Meal plan created. Review and Accept to save.' });
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error('Generate plan failed:', err);
      setNotice({ kind: 'error', msg: 'Failed to generate meal plan. Please try again.' });
      setTimeout(() => setNotice(null), 4500);
    } finally {
      setSubmitting(false);
      setLoadingPlan(false);
    }
  };

  const regenerate = async () => {
    await createPlan();
  };

  const accept = async () => {
    if (!userId || !plan) return;
    try {
      const { savedPlan } = await apiService.acceptMealPlan({
        userId,
        name: planName.trim(),
        plan,
      });
      setActivePlans(prev => [savedPlan, ...prev]);
      setPlan(null);
      setPlanName('');
      setDurationDays('');
      setMealsPerDay('');

      setNotice({ kind: 'success', msg: 'Meal plan saved and pantry updated.' });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Accept plan failed:', err);
      setNotice({ kind: 'error', msg: 'Failed to save meal plan. Please try again.' });
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const cancel = () => {
  // Return to the main meal-plans view
  setPlan(null);
  setPlanName('');
  setDurationDays('');
  setMealsPerDay('');
  setNotice(null);
  setShowModal(false);
};

  const markDone = async (planId) => {
    try {
      if (apiService.updateMealPlan) {
        await apiService.updateMealPlan(planId, { status: 'DONE' });
      } else {
        await apiService.request(`/meal-plans/${planId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' })
        });
      }
      setActivePlans(prev => prev.filter(p => p.id !== planId));
      setNotice({ kind: 'success', msg: 'Marked as done.' });
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      console.error('Mark done failed:', e);
      setNotice({ kind: 'error', msg: 'Failed to mark as done.' });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const favoritePlan = async (planId) => {
    if (!userId || !apiService.favoriteMealPlan) return;
    try {
      setFavingId(planId);
      await apiService.favoriteMealPlan(userId, planId);
      setUserFavPlanIds(prev => new Set(prev).add(planId));
      setNotice({ kind: 'success', msg: 'Added to favourites.' });
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error('Favourite failed:', e);
      setNotice({ kind: 'error', msg: 'Could not favourite this plan.' });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setFavingId(null);
    }
  };

  const unfavoritePlan = async (planId) => {
    if (!userId || !apiService.unfavoriteMealPlan) return;
    try {
      setFavingId(planId);
      await apiService.unfavoriteMealPlan(userId, planId);
      setUserFavPlanIds(prev => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });
      setNotice({ kind: 'success', msg: 'Removed from favourites.' });
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      console.error('Unfavourite failed:', e);
      setNotice({ kind: 'error', msg: 'Could not remove favourite.' });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setFavingId(null);
    }
  };

  const toggleExpanded = (planId) => {
    setExpandedPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const renderPlanCompact = (root) => {
    const meta = root?.meta || {};
    const days = Number(meta?.durationDays ?? root?.days?.length ?? 0);
    const mpd = Number(meta?.mealsPerDay ?? (Array.isArray(root?.days?.[0]?.meals) ? root.days[0].meals.length : 0));
    const kcal = Number(meta?.targetCaloriesPerDay ?? 0);
    const cuisineStyle = meta?.cuisineStyle;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-blue-600/80 uppercase tracking-wide">Duration</div>
                <div className="text-lg font-bold text-blue-900">{days || 0} days</div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 border border-emerald-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Utensils className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-emerald-600/80 uppercase tracking-wide">Per Day</div>
                <div className="text-lg font-bold text-emerald-900">{mpd || 0} meals</div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4 border border-purple-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-purple-600/80 uppercase tracking-wide">Total</div>
                <div className="text-lg font-bold text-purple-900">{(days || 0) * (mpd || 0)} meals</div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-4 border border-orange-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-orange-600/80 uppercase tracking-wide">Daily Target</div>
                <div className="text-lg font-bold text-orange-900">{kcal ? Math.round(kcal) : '—'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {cuisineStyle && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-600">Cuisine Style:</span>
              <span className="text-sm font-bold text-gray-800">{cuisineStyle}</span>
            </div>
          </div>
        )}
        
        {root?.days?.[0]?.meals?.[0]?.instructions && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-3 border border-gray-200/50">
            <div className="text-xs font-medium text-gray-500 mb-1">Sample cooking instruction:</div>
            <div className="text-sm text-gray-700 italic leading-relaxed">
              "{Array.isArray(root.days[0].meals[0].instructions) 
                ? root.days[0].meals[0].instructions[0] 
                : root.days[0].meals[0].instructions}"
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlanDetailed = (root) => {
    const days = Array.isArray(root?.days) ? root.days : [];

    return (
      <div className="space-y-6">
        {days.map((d, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-4 border-b border-gray-200/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="font-bold text-gray-800 text-lg">Day {idx + 1}</div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(d.meals || []).map((m, i) => {
                  // normalize instructions
                  let steps = [];
                  if (Array.isArray(m.instructions)) {
                    steps = m.instructions;
                  } else if (typeof m.instructions === 'string' && m.instructions.trim()) {
                    steps = [m.instructions];
                  }

                  return (
                    <div key={i} className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 text-lg mb-1">{m.name || m.title}</div>
                          {m.calories && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              <Flame className="w-3 h-3" />
                              ~{Math.round(m.calories)} kcal
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {Array.isArray(m.uses) && m.uses.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Ingredients</div>
                          <div className="flex flex-wrap gap-1">
                            {m.uses.map((u, ui) => (
                              <span key={ui} className="inline-flex items-center px-2 py-1 bg-white rounded-lg border border-blue-200/50 text-xs text-blue-800">
                                {u.name} ({u.quantity} {u.unit})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 rounded-xl p-4 border border-green-100">
                        <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Utensils className="w-3 h-3" />
                          Cooking Instructions
                        </div>
                        {steps.length > 0 ? (
                          <div className="space-y-2">
                            {steps.map((s, si) => (
                              <div key={si} className="flex gap-3">
                                <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {si + 1}
                                </div>
                                <div className="text-sm text-green-800 leading-relaxed">{s}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-700">
                            <Clock className="w-4 h-4" />
                            <p className="text-sm italic">Simple prep: combine ingredients and cook until done.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Meal Plans
            </h2>
            <p className="text-gray-600 text-lg">Create, preview, favourite, expand, and manage your plans.</p>
          </div>
          <button
            onClick={openModal}
            className="group relative inline-flex items-center gap-3 rounded-2xl px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="p-1 bg-white/20 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold">Create Plan</span>
          </button>
        </div>

        {/* Inline notice */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 ${
              notice.kind === 'success'
                ? 'bg-emerald-50/80 border-emerald-200/50 text-emerald-800'
                : 'bg-rose-50/80 border-rose-200/50 text-rose-800'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 w-3 h-3 rounded-full ${notice.kind === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <div className="flex-1 font-medium">{notice.msg}</div>
              <button
                onClick={() => setNotice(null)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loadingPlan ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-lg font-medium">Generating your perfect meal plan...</span>
            </div>
          </div>
        ) : plan ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-xl p-8 space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Preview Ready
              </div>
              <div className="text-xl font-bold text-gray-800">
                "{planName || 'Unnamed plan'}" 
                <span className="text-gray-500 font-normal"> - Not saved yet</span>
              </div>
            </div>
            
            <div className="space-y-8">
              {renderPlanCompact(plan)}
              {renderPlanDetailed(plan)}
            </div>
            
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={accept}
                className="group inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Accept & Save</span>
              </button>
              <button
                onClick={regenerate}
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <RefreshCcw className="w-5 h-5" />
                <span className="font-semibold">Regenerate</span>
              </button>
              <button
                onClick={cancel}
                className="group inline-flex items-center gap-3 rounded-xl px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
                <X className="w-5 h-5" />
                <span className="font-semibold">Cancel</span>
              </button>

            </div>
          </div>
        ) : null}

        {/* Saved plans list */}
        {(!plan && loadingList) ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-lg font-medium">Loading your meal plans...</span>
            </div>
          </div>
        ) : (!plan && activePlans.length === 0) ? (
          <div className="text-center py-20 bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 shadow-sm">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-sm">
                <Utensils className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-800">No saved meal plans yet</p>
                <p className="text-gray-600 text-lg">Click <span className="font-semibold text-blue-600">Create Plan</span> to get started with your first meal plan.</p>
              </div>
            </div>
          </div>
        ) : (!plan && activePlans.length > 0) ? (
          <div className="space-y-6">
            {activePlans.map(p => {
              const root = p.planJson || p;
              const isFav = userFavPlanIds.has(p.id);
              const isExpanded = expandedPlanIds.has(p.id);

              return (
                <div key={p.id} className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl">
                          <FolderCheck className="w-6 h-6 text-emerald-700" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-gray-800">{p.name}</div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                            ACTIVE
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => isFav ? unfavoritePlan(p.id) : favoritePlan(p.id)}
                          disabled={favingId === p.id}
                          className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 ${
                            isFav
                              ? 'border-pink-200 text-pink-700 bg-pink-50 hover:bg-pink-100 shadow-sm'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm'
                          }`}
                          title={isFav ? 'Unfavourite' : 'Add to favourites'}
                        >
                          <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${isFav ? 'fill-current' : ''}`} />
                          <span className="font-medium">
                            {isFav ? (favingId === p.id ? 'Saving...' : 'Favourited') : (favingId === p.id ? 'Saving...' : 'Favourite')}
                          </span>
                        </button>
                        
                        <button
                          onClick={() => toggleExpanded(p.id)}
                          className="group inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-300"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 transition-transform group-hover:scale-110" /> : <ChevronDown className="w-4 h-4 transition-transform group-hover:scale-110" />}
                          <span className="font-medium">{isExpanded ? 'Collapse' : 'Expand'}</span>
                        </button>
                        
                        <button
                          onClick={() => markDone(p.id)}
                          className="group inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-300"
                        >
                          <Archive className="w-4 h-4 transition-transform group-hover:scale-110" />
                          <span className="font-medium">Mark Done</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      {renderPlanCompact(root)}
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-200/50 pt-6">
                        {renderPlanDetailed(root)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Create Plan modal */}
        {showModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <div className="absolute inset-x-0 top-20 mx-auto max-w-lg">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-gray-900">Create Meal Plan</h3>
                      <p className="text-gray-600">Tell us your preferences</p>
                    </div>
                    <button onClick={closeModal} className="p-2 rounded-2xl hover:bg-white/50 transition-colors">
                      <X className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Plan name
                    </label>
                    <input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="e.g., Cutting Week 1"
                      className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none transition-all duration-300 bg-gray-50 focus:bg-white ${
                        errors.planName ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.planName && <p className="text-sm text-red-600 flex items-center gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      {errors.planName}
                    </p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                        placeholder="7"
                        className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none transition-all duration-300 bg-gray-50 focus:bg-white ${
                          errors.durationDays ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                      />
                      {errors.durationDays && <p className="text-sm text-red-600 flex items-center gap-2">
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                        {errors.durationDays}
                      </p>}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Meals per day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={mealsPerDay}
                        onChange={(e) => setMealsPerDay(e.target.value)}
                        placeholder="3"
                        className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none transition-all duration-300 bg-gray-50 focus:bg-white ${
                          errors.mealsPerDay ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                      />
                      {errors.mealsPerDay && <p className="text-sm text-red-600 flex items-center gap-2">
                        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                        {errors.mealsPerDay}
                      </p>}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50/50 px-8 py-6 border-t border-gray-100 flex items-center justify-end gap-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 rounded-2xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createPlan}
                    disabled={submitting}
                    className={`px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 ${
                      submitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : 'Create Plan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
import React, { createElement, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  PackageOpen,
  Heart,
  AlertTriangle,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import { apiService } from "../api_client";

function getUserId() {
  try {
    return JSON.parse(localStorage.getItem("userId") || "null");
  } catch {
    return null;
  }
}
function getUserEmail() {
  try {
    const raw = localStorage.getItem("email") || "";
    const unwrapped = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return unwrapped.replace(/^['"]+|['"]+$/g, "").trim();
  } catch {
    return "";
  }
}

// Normalize to base units for thresholding (g / mL)
function toBaseUnit(item) {
  const q = Number(item?.quantity ?? 0);
  const u = (item?.unit || "").trim();
  if (u === "g") return { type: "mass", base: q, show: `${q} g` };
  if (u === "kg") return { type: "mass", base: q * 1000, show: `${q} kg` };
  if (u === "mL") return { type: "vol", base: q, show: `${q} mL` };
  if (u === "L") return { type: "vol", base: q * 1000, show: `${q} L` };
  return { type: "other", base: q, show: `${q} ${u || ""}` };
}

export default function Dashboard({ onNavigate }) {
  const userId = getUserId();
  const email = getUserEmail();
  const emailName = (email.split("@")[0] || "there")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();

  // Header display name: start with email's local-part, then upgrade to DB username if available
  const [displayName, setDisplayName] = useState(emailName);

  const [plans, setPlans] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState({
    plans: true,
    ingredients: true,
    favs: true,
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (localStorage.getItem("isDemo") === "true") {
      setDisplayName("DemoUser"); // <-- force DemoUser
    }
  }, []);

  // Fetch username from the API (fallback already set from email local-part)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      if (localStorage.getItem("isDemo") === "true") return; // <-- guard
      try {
        const all = await apiService.request("/");
        const found = Array.isArray(all)
          ? all.find(
              (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
            )
          : null;
        const uname = (found?.username || "").toString().trim();
        if (!cancelled && uname) {
          setDisplayName(uname.replace(/^['"]+|['"]+$/g, ""));
          try {
            localStorage.setItem("username", JSON.stringify(uname));
          } catch {
            /* empty */
          }
        }
      } catch {
        // keep emailName fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  // Load ACTIVE meal plans
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) {
        setLoading((l) => ({ ...l, plans: false }));
        return;
      }
      try {
        const list = await apiService.getUserMealPlans(userId, "ACTIVE");
        if (!ignore) setPlans(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr((prev) => prev || "Failed to load meal plans.");
      } finally {
        if (!ignore) setLoading((l) => ({ ...l, plans: false }));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Load ingredients
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) {
        setLoading((l) => ({ ...l, ingredients: false }));
        return;
      }
      try {
        const list = await apiService.getUserIngredients(userId);
        if (!ignore) setIngredients(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr((prev) => prev || "Failed to load ingredients.");
      } finally {
        if (!ignore) setLoading((l) => ({ ...l, ingredients: false }));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Load favourites
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId || !apiService.getUserFavorites) {
        setLoading((l) => ({ ...l, favs: false }));
        return;
      }
      try {
        const list = await apiService.getUserFavorites(userId);
        if (!ignore) setFavs(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr((prev) => prev || "Failed to load favourites.");
      } finally {
        if (!ignore) setLoading((l) => ({ ...l, favs: false }));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Compute low-stock items: < 100 g OR < 100 mL
  const lowStock = useMemo(() => {
    const THRESHOLD = 100; // base units (g / mL)
    const flagged = (ingredients || []).filter((it) => {
      const norm = toBaseUnit(it);
      if (norm.type === "mass" || norm.type === "vol") {
        return Number.isFinite(norm.base) && norm.base < THRESHOLD;
      }
      return false; // unknown units not flagged
    });
    return flagged
      .map((it) => ({ it, norm: toBaseUnit(it) }))
      .sort((a, b) => (a.norm.base || 0) - (b.norm.base || 0))
      .map((x) => x.it);
  }, [ingredients]);

  const isLoading = loading.plans || loading.ingredients || loading.favs;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const stats = [
    {
      label: "Active plans",
      value: plans.length,
      loading: loading.plans,
      icon: CalendarDays,
      tab: "plans",
      note: "Ready for the week",
    },
    {
      label: "Kitchen items",
      value: ingredients.length,
      loading: loading.ingredients,
      icon: PackageOpen,
      tab: "ingredients",
      note: lowStock.length
        ? `${lowStock.length} running low`
        : "Everything looks good",
    },
    {
      label: "Saved recipes",
      value: favs.length,
      loading: loading.favs,
      icon: Heart,
      tab: "favorites",
      note: "Your favourites",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">
            <span /> {today.toUpperCase()}
          </span>
          <h1>
            Good to see you,
            <br />
            <em>{displayName}.</em>
          </h1>
          <p>Here’s what’s happening in your kitchen today.</p>
        </div>
        <button
          className="dashboard-plan-button"
          onClick={() => onNavigate?.("plans")}
        >
          Plan something good <ArrowRight size={18} />
        </button>
        <span className="dashboard-spark" aria-hidden="true">
          ✳
        </span>
      </div>
      {err && (
        <div className="dashboard-alert" role="alert">
          <AlertTriangle size={19} />
          <div>
            <strong>We couldn’t load everything.</strong>
            <span>{err}</span>
          </div>
        </div>
      )}
      <section className="dashboard-stats" aria-label="Kitchen summary">
        {stats.map(
          ({ label, value, loading: statLoading, icon, tab, note }, index) => (
            <button
              key={label}
              onClick={() => onNavigate?.(tab)}
              className="dashboard-stat"
            >
              <span className="dashboard-stat-number">0{index + 1}</span>
              <span className="dashboard-stat-icon">
                {createElement(icon, { size: 20 })}
              </span>
              <span className="dashboard-stat-label">{label}</span>
              {statLoading ? (
                <span
                  className="dashboard-stat-skeleton"
                  aria-label={`Loading ${label}`}
                />
              ) : (
                <strong>{value}</strong>
              )}
              <span className="dashboard-stat-note">
                {note}
                <ArrowRight size={14} />
              </span>
            </button>
          ),
        )}
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-low">
          <div className="dashboard-card-header">
            <div>
              <span className="eyebrow">PANTRY CHECK</span>
              <h2>Running low.</h2>
              <p>Ingredients with less than 100 g or 100 mL remaining.</p>
            </div>
            <button onClick={() => onNavigate?.("ingredients")}>
              View kitchen <ArrowRight size={15} />
            </button>
          </div>
          {loading.ingredients ? (
            <div className="dashboard-loading">
              <span />
              Checking your shelves…
            </div>
          ) : lowStock.length === 0 ? (
            <div className="dashboard-empty">
              <CircleCheck size={27} />
              <div>
                <strong>Your kitchen is nicely stocked.</strong>
                <span>Nothing is below the low-stock threshold.</span>
              </div>
            </div>
          ) : (
            <ul className="dashboard-low-list">
              {lowStock.slice(0, 6).map((item, index) => (
                <li key={item.id ?? `${item.name}-${index}`}>
                  <span className="dashboard-low-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{toBaseUnit(item).show}</span>
                  </div>
                  <span className="dashboard-low-badge">Low</span>
                </li>
              ))}
            </ul>
          )}
          {!loading.ingredients && lowStock.length > 6 && (
            <button
              className="dashboard-more"
              onClick={() => onNavigate?.("ingredients")}
            >
              And {lowStock.length - 6} more in your kitchen{" "}
              <ArrowRight size={15} />
            </button>
          )}
        </section>
        <aside className="dashboard-card dashboard-nudge">
          <span className="dashboard-nudge-icon">
            <Sparkles size={20} />
          </span>
          <span className="eyebrow">A LITTLE INSPIRATION</span>
          <h2>What could your kitchen make today?</h2>
          <p>
            Turn the ingredients you already have into a plan built around your
            tastes and goals.
          </p>
          <button onClick={() => onNavigate?.("plans")}>
            Make a meal plan <ArrowRight size={17} />
          </button>
          <span className="dashboard-nudge-spark" aria-hidden="true">
            ✳
          </span>
        </aside>
      </div>
      {isLoading && (
        <span className="sr-only" aria-live="polite">
          Loading your dashboard
        </span>
      )}
    </div>
  );
}

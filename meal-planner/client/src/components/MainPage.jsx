import { createElement, useEffect, useState } from "react";
import {
  CalendarDays,
  ChefHat,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageOpen,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import Ingredients from "./Ingredients";
import Plans from "./Plans";
import Favorites from "./Favorites";
import { apiService } from "../api_client";

function getUserId() {
  try {
    return JSON.parse(localStorage.getItem("userId") || "null");
  } catch {
    return null;
  }
}
const tabs = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "ingredients", label: "My kitchen", icon: PackageOpen },
  { id: "plans", label: "Meal plans", icon: CalendarDays },
  { id: "favorites", label: "Favourites", icon: Heart },
  { id: "profile", label: "My profile", icon: UserRound },
];

export default function MealPlannerApp({ userEmail, onSignOut }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setMenuOpen(false), [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <Profile userEmail={userEmail} />;
      case "ingredients":
        return <Ingredients />;
      case "plans":
        return <Plans />;
      case "favorites":
        return <Favorites onNavigate={setActiveTab} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    setConfirmText("");
    setError("");
  };
  async function handleDeleteAccount() {
    setError("");
    const userId = getUserId();
    if (!userId) {
      setError("Your session is missing an account ID. Please sign in again.");
      return;
    }
    try {
      setDeleting(true);
      await apiService.deleteUser(userId);
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      closeSettings();
      onSignOut?.();
    } catch (requestError) {
      console.error(requestError);
      setError("We couldn’t delete your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="app-mobile-menu"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>
        <div className="app-logo">
          <span>
            <ChefHat size={23} />
          </span>
          MealWizard<i>.</i>
        </div>
        <span className="app-mobile-title">{activeLabel}</span>
        <div className="app-header-actions">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings size={19} />
          </button>
          <button onClick={onSignOut} aria-label="Sign out">
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="app-sidebar-top">
          <div className="app-logo">
            <span>
              <ChefHat size={23} />
            </span>
            MealWizard<i>.</i>
          </div>
          <button
            className="app-sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="app-sidebar-label">Your kitchen</div>
        <nav aria-label="Application navigation">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              className={activeTab === id ? "is-active" : ""}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
            >
              {createElement(icon, { size: 18 })}
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="app-sidebar-note">
          <span>✳</span>
          <p>
            <strong>A little planning.</strong> A lot of good food.
          </p>
        </div>
        <div className="app-sidebar-actions">
          <button onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
            Settings
          </button>
          <button onClick={onSignOut}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="app-sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="app-content">{renderContent()}</main>
      {settingsOpen && (
        <div
          className="app-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeSettings()
          }
        >
          <section
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="app-modal-heading">
              <div>
                <span className="eyebrow">ACCOUNT SETTINGS</span>
                <h2 id="settings-title">A clean slate.</h2>
              </div>
              <button onClick={closeSettings} aria-label="Close settings">
                <X size={19} />
              </button>
            </div>
            <p>
              Deleting your account permanently removes your meal plans,
              favourites, and ingredients.
            </p>
            <label htmlFor="delete-confirmation">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              id="delete-confirmation"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            {error && (
              <div className="app-modal-error" role="alert">
                {error}
              </div>
            )}
            <div className="app-modal-actions">
              <button onClick={closeSettings}>Keep my account</button>
              <button
                className="danger"
                onClick={handleDeleteAccount}
                disabled={!canDelete || deleting}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

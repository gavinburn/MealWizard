import { ArrowLeft, ChefHat, Leaf, Sparkles, Check } from "lucide-react";

export default function AuthLayout({
  children,
  onBack,
  backLabel = "Back to MealWizard",
  creating = false,
}) {
  return (
    <div className="landing auth-page">
      <header className="auth-header landing-container">
        <button className="landing-brand text-button" onClick={onBack}>
          <span className="brand-mark">
            <ChefHat size={25} />
          </span>
          MealWizard<span className="brand-dot">.</span>
        </button>
        <button className="auth-back" onClick={onBack}>
          <ArrowLeft size={16} />
          {backLabel}
        </button>
      </header>
      <main
        className={`auth-layout landing-container ${creating ? "auth-layout-wide" : ""}`}
      >
        <aside className="auth-story">
          <span className="eyebrow">
            <span /> GOOD FOOD STARTS HERE.
          </span>
          <h2>
            {creating ? (
              <>
                A plan with
                <br />
                your name
                <br />
                <em>on it.</em>
              </>
            ) : (
              <>
                Back for
                <br />a little more
                <br />
                <em>magic?</em>
              </>
            )}
          </h2>
          <p>
            {creating
              ? "Tell us a little about yourself. We’ll help turn your everyday ingredients into meals that fit your life."
              : "Your ingredients, your favourite flavours, and your next good meal. Right where you left them."}
          </p>
          <div className="auth-photo">
            <img
              src="/images/meal-bowl.jpg"
              alt="Fresh salad with tomatoes, leafy greens, and croutons"
            />
            <span>
              <Leaf size={16} /> A fresh start, every day.
            </span>
          </div>
          <div className="auth-story-note">
            <Sparkles size={18} />
            <span>
              {creating
                ? "Your tastes. Your goals. Your everyday."
                : "Less guesswork. More good food."}
            </span>
            <Check size={16} />
          </div>
        </aside>
        <section className="auth-panel">{children}</section>
      </main>
      <footer className="auth-footer landing-container">
        A little magic for your everyday meals.
      </footer>
    </div>
  );
}

export function AuthField({ label, name, error, children, hint }) {
  return (
    <div className="auth-field">
      <label htmlFor={`auth-${name}`}>{label}</label>
      {children}
      {hint && (
        <p className="auth-hint" id={`auth-${name}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="auth-error" role="alert" id={`auth-${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

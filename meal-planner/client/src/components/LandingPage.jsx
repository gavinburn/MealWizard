import {
  ArrowUpRight,
  ArrowRight,
  ChefHat,
  Check,
  Sparkles,
  ScanLine,
  Leaf,
  CalendarDays,
  Clock3,
  Utensils,
} from "lucide-react";
const steps = [
  {
    icon: ScanLine,
    title: "Start with what you have.",
    text: "Add your fridge and pantry staples, or scan a grocery receipt to fill your inventory.",
  },
  {
    icon: Sparkles,
    title: "Make it personal.",
    text: "Your tastes, dietary preferences, and fitness goals shape a plan that feels like you.",
  },
  {
    icon: Utensils,
    title: "Make something good.",
    text: "Get a meal plan built around your ingredients. Save your favourites and keep cooking.",
  },
];
function StepIcon({ icon }) {
  const Icon = icon;
  return <Icon size={25} strokeWidth={1.5} />;
}
export default function LandingPage({
  onSignIn,
  onGetStarted,
  onDemo,
  isSubmitting,
  error,
}) {
  return (
    <div className="landing">
      <header className="landing-header landing-container">
        <a className="landing-brand" href="#" aria-label="MealWizard home">
          <span className="brand-mark">
            <ChefHat size={25} />
          </span>
          MealWizard<span className="brand-dot">.</span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#made-for-you">Why MealWizard</a>
        </nav>
        <div className="nav-actions">
          <button className="text-button" onClick={onSignIn}>
            Sign in
          </button>
          <button className="landing-button small" onClick={onGetStarted}>
            Get started <ArrowUpRight size={17} />
          </button>
        </div>
      </header>
      <main>
        <section
          className="hero landing-container"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> A LITTLE PLANNING. A LOT OF GOOD FOOD.
            </div>
            <h1 id="hero-title">
              Your fridge.
              <br />
              Your goals.
              <br />
              <span>A little magic.</span>
            </h1>
            <p className="hero-description">
              Turn what you already have into meals you’ll actually look forward
              to. Personalised meal planning, with a little help from AI.
            </p>
            <div className="hero-actions">
              <button className="landing-button" onClick={onGetStarted}>
                Let’s make a plan <ArrowUpRight size={20} />
              </button>
              <button
                className="demo-button"
                disabled={isSubmitting}
                onClick={onDemo}
              >
                {isSubmitting ? "Preparing your demo…" : "Take a look around"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
            {error && (
              <p className="landing-error" role="alert">
                {error}
              </p>
            )}
            <div className="hero-reassurance">
              <Check size={15} /> A plan that fits your life <span>·</span> A
              demo to try it out
            </div>
          </div>
          <div className="hero-art">
            <div className="photo-frame">
              <img
                src="/images/meal-bowl.jpg"
                alt="A fresh salad with leafy greens, tomatoes, and golden croutons"
                fetchPriority="high"
              />
              <div className="photo-caption">
                <span>GOOD FOOD, LESS GUESSWORK</span>
                <span>✳</span>
              </div>
            </div>
            <div className="ingredient-note">
              <span className="note-icon">
                <Leaf size={20} />
              </span>
              <div>
                Already in your kitchen
                <strong>Fresh ingredients. Fresh ideas.</strong>
              </div>
              <Check size={16} />
            </div>
            <div className="meal-preview">
              <div className="preview-heading">
                <Sparkles size={14} /> A LITTLE MEAL INSPIRATION
              </div>
              <h3>Your next favourite lunch.</h3>
              <p>Green goddess grain bowl</p>
              <div className="meal-details">
                <span>
                  <Clock3 size={14} /> 20 min
                </span>
                <span>
                  <Leaf size={14} /> Fresh & colourful
                </span>
              </div>
              <div className="preview-footer">
                <span>Made for your everyday.</span>
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div className="art-spark" aria-hidden="true">
              ✳
            </div>
          </div>
        </section>
        <div className="benefit-strip">
          <div className="landing-container">
            <span>
              <Leaf size={19} /> Use what you have
            </span>
            <span>
              <Sparkles size={19} /> Discover something delicious
            </span>
            <span>
              <CalendarDays size={19} /> Make your week easier
            </span>
          </div>
        </div>
        <section id="how-it-works" className="how-section landing-container">
          <div className="section-intro">
            <div>
              <span className="eyebrow">
                FROM “WHAT’S FOR DINNER?” TO “THAT WAS GOOD.”
              </span>
              <h2>
                Less figuring it out.
                <br />
                More digging in.
              </h2>
            </div>
            <p>
              Good meals don’t need a complicated routine.
              <br />
              Just a starting point, and a plan that gets you.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map(({ icon, title, text }, i) => (
              <article className="step" key={title}>
                <div className="step-top">
                  <span className="step-icon">
                    <StepIcon icon={icon} />
                  </span>
                  <span className="step-number">/0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="made-for-you"
          className="personal-section landing-container"
        >
          <div className="personal-card">
            <span className="personal-spark" aria-hidden="true">
              ✳
            </span>
            <div>
              <span className="eyebrow">YOUR TASTE. YOUR PACE. YOUR PLAN.</span>
              <h2>
                A little more you.
                <br />
                In every meal.
              </h2>
              <p>
                From your favourite cuisines to your fitness goals, MealWizard
                brings it all to the table.
              </p>
            </div>
            <div className="personal-actions">
              <button className="landing-button light" onClick={onGetStarted}>
                Find your everyday magic <ArrowUpRight size={19} />
              </button>
              <span>It starts with what’s in your fridge.</span>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <a className="landing-brand" href="#">
          <ChefHat size={22} /> MealWizard<span className="brand-dot">.</span>
        </a>
        <p>A little magic for your everyday meals.</p>
        <span>Made with good taste.</span>
      </footer>
    </div>
  );
}

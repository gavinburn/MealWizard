import React, { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import { Eye, EyeOff, ArrowUpRight, ArrowRight } from "lucide-react";
import AuthLayout, { AuthField } from "./AuthLayout";
import MealPlannerApp from "./MainPage"; // Import your main app
import CreateAccount from "./CreateAccount"; // Import your create account component
import { apiService } from "../api_client";

const SignInPage = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [showSignIn, showCreateAccount, isSignedIn]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = (email) => {
    setUserEmail(email);
    setIsSignedIn(true);
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setUserEmail("");
    setShowCreateAccount(false);
    setShowSignIn(false);
    setFormData({ email: "", password: "" });
    setErrors({});
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      localStorage.removeItem("isDemo");
      localStorage.removeItem("displayName");
    } catch {
      // ignoring storage errors (e.g., private mode)
    }
  };

  // Small helper: stash a token if backend returns it
  const persistTokenIfPresent = (result) => {
    try {
      if (result?.token) localStorage.setItem("token", result.token);
    } catch {
      // ignoring storage errors (e.g., private mode)
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !validateForm()) return;

    setIsSubmitting(true);

    try {
      // Real API login
      const result = await apiService.login({
        email: formData.email,
        password: formData.password,
      });

      persistTokenIfPresent(result);

      try {
        localStorage.removeItem("isDemo");
        localStorage.removeItem("displayName");
      } catch {
        // ignore storage errors
      }

      // Normalize shape: support { user: {...} } or flat {...}
      const userObj = result?.user ?? result ?? {};
      const userId = userObj.id ?? userObj.userId ?? null;
      const emailToUse = userObj.email ?? result?.email ?? formData.email;

      // Persist identity for id-based routes
      try {
        if (userId != null)
          localStorage.setItem("userId", JSON.stringify(userId));
        if (emailToUse)
          localStorage.setItem("email", JSON.stringify(emailToUse));
      } catch {
        // ignore storage errors
      }

      handleSignIn(emailToUse);
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ general: "Invalid email or password. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleDemo = async () => {
    setIsSubmitting(true);
    try {
      const result = await apiService.createDemoUser();
      // persist token if you later add one server-side
      persistTokenIfPresent(result);

      // store identity (your app already relies on this shape)
      localStorage.setItem("userId", JSON.stringify(result.user.id));
      localStorage.setItem("email", result.user.email);
      localStorage.setItem("isDemo", "true"); // <—
      localStorage.setItem("displayName", "Demo User"); // <—
      setUserEmail(result.user.email);
      setIsSignedIn(true);
    } catch (err) {
      console.error("Demo sign-in failed:", err);
      setErrors({ general: "Failed to start demo. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If signed in, render the main app
  if (isSignedIn) {
    return <MealPlannerApp userEmail={userEmail} onSignOut={handleSignOut} />;
  }

  // If showing create account, render the create account component
  if (showCreateAccount) {
    return (
      <CreateAccount
        onBack={() => {
          setShowCreateAccount(false);
          setShowSignIn(true);
          setErrors({});
        }}
      />
    );
  }

  if (!showSignIn) {
    return (
      <LandingPage
        onSignIn={() => setShowSignIn(true)}
        onGetStarted={() => setShowCreateAccount(true)}
        onDemo={handleDemo}
        isSubmitting={isSubmitting}
        error={errors.general}
      />
    );
  }

  return (
    <AuthLayout
      onBack={() => {
        setShowSignIn(false);
        setErrors({});
      }}
    >
      <span className="eyebrow">YOUR KITCHEN IS CALLING.</span>
      <h1>Welcome back.</h1>
      <p className="auth-intro">Sign in and pick up where you left off.</p>
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {errors.general && (
          <div className="auth-alert" role="alert">
            {errors.general}
          </div>
        )}
        <AuthField label="Email address" name="email" error={errors.email}>
          <input
            id="auth-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "auth-email-error" : undefined}
            disabled={isSubmitting}
          />
        </AuthField>
        <AuthField label="Password" name="password" error={errors.password}>
          <div className="auth-password">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Your password"
              autoComplete="current-password"
              required
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "auth-password-error" : undefined
              }
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </AuthField>
        <button
          className="landing-button auth-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"} <ArrowUpRight size={19} />
        </button>
        <div className="auth-divider">
          <span>Just looking around?</span>
        </div>
        <button
          className="auth-demo"
          type="button"
          onClick={handleDemo}
          disabled={isSubmitting}
        >
          Try the demo <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        New to MealWizard?{" "}
        <button
          onClick={() => {
            setShowCreateAccount(true);
            setErrors({});
          }}
        >
          Create an account
        </button>
      </p>
    </AuthLayout>
  );
};

export default SignInPage;

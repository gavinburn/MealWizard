import React, { useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  ArrowUpRight,
  User,
  Target,
  ChefHat,
} from "lucide-react";
import AuthLayout, { AuthField } from "./AuthLayout";
import { apiService } from "../api_client";
import { FitnessGoal, FitnessLevel, Gender } from "../../../common/constants";

const AccountCreationPage = ({ onBack }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    weight: "",
    fitnessGoal: "", // Initialize as empty string, not the enum object
    gender: "", // Initialize as empty string, not the enum object
    fitnessLevel: "", // Initialize as empty string, not the enum object
    cuisines: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cuisineOptions = [
    "Italian",
    "Mexican",
    "Asian",
    "Mediterranean",
    "American",
    "Indian",
    "French",
    "Thai",
    "Japanese",
    "Greek",
    "Middle Eastern",
    "Chinese",
  ];

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

  const handleCuisineToggle = (cuisine) => {
    setFormData((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine],
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!formData.weight) newErrors.weight = "Weight is required";
    else if (isNaN(formData.weight) || formData.weight <= 0)
      newErrors.weight = "Weight must be a positive number";
    if (!formData.fitnessGoal)
      newErrors.fitnessGoal = "Fitness goal is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.fitnessLevel)
      newErrors.fitnessLevel = "Fitness level is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Create payload with proper field names matching your server
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        weight: parseFloat(formData.weight),
        fitnessGoal: formData.fitnessGoal, // This will be enum values like 'BULKING', 'CUTTING', etc.
        gender: formData.gender, // This will be 'MALE' or 'FEMALE'
        fitnessLevel: formData.fitnessLevel, // This will be 'SEDENTARY', 'LIGHT', etc.
        favoriteCuisines: formData.cuisines, // Match server field name
      };

      await apiService.createUser(payload);

      // Set success state instead of immediately calling onBack
      setIsSuccess(true);

      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
        weight: "",
        fitnessGoal: "",
        gender: "",
        fitnessLevel: "",
        cuisines: [],
      });
    } catch (error) {
      console.error("Error:", error);
      setErrors({
        general: "We couldn’t create your account. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    if (onBack && !isSubmitting) {
      onBack();
    }
  };

  const inputProps = (name) => ({
    id: `auth-${name}`,
    name,
    value: formData[name],
    onChange: handleInputChange,
    required: true,
    disabled: isSubmitting,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `auth-${name}-error` : undefined,
  });

  if (isSuccess) {
    return (
      <AuthLayout
        creating
        onBack={handleBackToSignIn}
        backLabel="Back to sign in"
      >
        <div className="auth-success">
          <span className="auth-success-icon">
            <Check size={30} />
          </span>
          <span className="eyebrow">YOU’RE ALL SET.</span>
          <h1>A fresh start.</h1>
          <p>
            Your account is ready. Sign in to add your ingredients and make your
            first meal plan.
          </p>
          <button
            className="landing-button auth-submit"
            onClick={handleBackToSignIn}
          >
            Let’s get cooking <ArrowUpRight size={19} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      creating
      onBack={handleBackToSignIn}
      backLabel="Back to sign in"
    >
      <span className="eyebrow">MAKE ROOM FOR SOMETHING GOOD.</span>
      <h1>Make it yours.</h1>
      <p className="auth-intro">A few details now. Better meal plans ahead.</p>
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
        <fieldset className="auth-section">
          <legend>
            <User size={17} /> Your account <span>01</span>
          </legend>
          <div className="auth-field-grid">
            <AuthField label="Username" name="username" error={errors.username}>
              <input
                {...inputProps("username")}
                autoComplete="username"
                placeholder="What should we call you?"
              />
            </AuthField>
            <AuthField label="Email address" name="email" error={errors.email}>
              <input
                {...inputProps("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </AuthField>
          </div>
          <AuthField
            label="Password"
            name="password"
            error={errors.password}
            hint="Use at least 6 characters."
          >
            <div className="auth-password">
              <input
                {...inputProps("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                placeholder="Create your password"
                aria-describedby={
                  errors.password
                    ? "auth-password-error auth-password-hint"
                    : "auth-password-hint"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </AuthField>
        </fieldset>
        <fieldset className="auth-section">
          <legend>
            <Target size={17} /> Your everyday goals <span>02</span>
          </legend>
          <p className="auth-section-description">
            These details help personalise your calories and portions.
          </p>
          <div className="auth-field-grid">
            <AuthField label="Weight (lbs)" name="weight" error={errors.weight}>
              <input
                {...inputProps("weight")}
                type="number"
                step="any"
                min="0.1"
                placeholder="e.g. 150"
              />
            </AuthField>
            <AuthField
              label="Fitness goal"
              name="fitnessGoal"
              error={errors.fitnessGoal}
            >
              <select {...inputProps("fitnessGoal")}>
                <option value="">Choose your goal</option>
                <option value={FitnessGoal.CUTTING}>Cutting · Fat loss</option>
                <option value={FitnessGoal.BULKING}>
                  Bulking · Muscle gain
                </option>
                <option value={FitnessGoal.MAINTAINING}>
                  Maintaining · Current weight
                </option>
              </select>
            </AuthField>
          </div>
          <fieldset
            className="auth-gender"
            aria-describedby={errors.gender ? "auth-gender-error" : undefined}
          >
            <legend>Gender</legend>
            <div className="auth-radio-group">
              {[
                { value: Gender.MALE, label: "Male" },
                { value: Gender.FEMALE, label: "Female" },
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={formData.gender === option.value}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    aria-invalid={!!errors.gender}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="auth-error" id="auth-gender-error" role="alert">
                {errors.gender}
              </p>
            )}
          </fieldset>
          <AuthField
            label="Activity level"
            name="fitnessLevel"
            error={errors.fitnessLevel}
          >
            <select {...inputProps("fitnessLevel")}>
              <option value="">Choose your activity level</option>
              <option value={FitnessLevel.SEDENTARY}>
                Sedentary · Little to no exercise
              </option>
              <option value={FitnessLevel.LIGHT}>
                Light · Exercise 1–3 days/week
              </option>
              <option value={FitnessLevel.MODERATE}>
                Moderate · Exercise 3–5 days/week
              </option>
              <option value={FitnessLevel.ACTIVE}>
                Active · Exercise 6–7 days/week
              </option>
              <option value={FitnessLevel.VERY_ACTIVE}>
                Very active · Intense exercise or physical work
              </option>
            </select>
          </AuthField>
        </fieldset>
        <fieldset className="auth-section">
          <legend>
            <ChefHat size={17} /> Your favourite flavours <span>03</span>
          </legend>
          <p className="auth-section-description">
            Pick the cuisines you love. This part is optional.
          </p>
          <div className="auth-cuisines">
            {cuisineOptions.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                aria-pressed={formData.cuisines.includes(cuisine)}
                disabled={isSubmitting}
                onClick={() => handleCuisineToggle(cuisine)}
              >
                {formData.cuisines.includes(cuisine) && <Check size={13} />}
                {cuisine}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          className="landing-button auth-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating your account…" : "Create my account"}
          <ArrowUpRight size={19} />
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{" "}
        <button disabled={isSubmitting} onClick={handleBackToSignIn}>
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
};

export default AccountCreationPage;

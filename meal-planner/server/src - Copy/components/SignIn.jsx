import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Zap, Star, ChefHat } from 'lucide-react';
import MealPlannerApp from './MainPage'; // Import your main app
import CreateAccount from './CreateAccount'; // Import your create account component
import { apiService } from '../api_client';

const SignInPage = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
    setUserEmail('');
    setShowCreateAccount(false);
    setFormData({ email: '', password: '' });
    setErrors({});
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
    } catch {
      // ignoring storage errors (e.g., private mode)
    }
  };

  // Small helper: stash a token if backend returns it
  const persistTokenIfPresent = (result) => {
    try {
      if (result?.token) localStorage.setItem('token', result.token);
    } catch {
       // ignoring storage errors (e.g., private mode)
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Real API login
      const result = await apiService.login({
        email: formData.email,
        password: formData.password,
      });

      // Save token (if your backend returns one)
      persistTokenIfPresent(result);

      // Normalize shape: support { user: {...} } or flat {...}
      const userObj = result?.user ?? result ?? {};
      const userId = userObj.id ?? userObj.userId ?? null;
      const emailToUse = userObj.email ?? result?.email ?? formData.email;

      // Persist identity for id-based routes
      try {
        if (userId != null) localStorage.setItem('userId', JSON.stringify(userId));
        if (emailToUse) localStorage.setItem('email', JSON.stringify(emailToUse));
      } catch {
        // ignore storage errors
      }

      handleSignIn(emailToUse);

    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        general: 'Invalid email or password. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If signed in, render the main app
  if (isSignedIn) {
    return <MealPlannerApp userEmail={userEmail} onSignOut={handleSignOut} />;
  }

  // If showing create account, render the create account component
  if (showCreateAccount) {
    return <CreateAccount onBack={() => setShowCreateAccount(false)} />;
  }

  // Otherwise, show the sign-in form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-3xl p-6 text-white relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-3">
                <ChefHat className="w-8 h-8" />
                <h1 className="text-3xl font-bold">MealWizard</h1>
              </div>
              <p className="text-white/90">Sign in to continue your fitness journey</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="bg-white/20 rounded-full px-3 py-1 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-medium">Meal Planning</span>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 flex items-center gap-2">
                  <Star className="w-3 h-3" />
                  <span className="text-xs font-medium">Fitness Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                  errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                } focus:outline-none`}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-colors ${
                    errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  } focus:outline-none`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button 
                onClick={() => setShowCreateAccount(true)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

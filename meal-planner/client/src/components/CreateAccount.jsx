import React, { useState } from 'react';
import { Check, User, Mail, Lock, Weight, Target, Users, Activity, ChefHat, ArrowLeft } from 'lucide-react';
import { apiService } from '../api_client';
import { FitnessGoal, FitnessLevel, Gender } from '../../../common/constants';

const AccountCreationPage = ({ onBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    weight: '',
    fitnessGoal: '', // Initialize as empty string, not the enum object
    gender: '',      // Initialize as empty string, not the enum object
    fitnessLevel: '', // Initialize as empty string, not the enum object
    cuisines: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const cuisineOptions = [
    'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 
    'French', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Chinese'
  ];

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

  const handleCuisineToggle = (cuisine) => {
    setFormData(prev => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter(c => c !== cuisine)
        : [...prev.cuisines, cuisine]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.weight) newErrors.weight = 'Weight is required';
    else if (isNaN(formData.weight) || formData.weight <= 0) newErrors.weight = 'Weight must be a positive number';
    if (!formData.fitnessGoal) newErrors.fitnessGoal = 'Fitness goal is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.fitnessLevel) newErrors.fitnessLevel = 'Fitness level is required';

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
          favoriteCuisines: formData.cuisines // Match server field name
        };

        await apiService.createUser(payload);
        
        // Set success state instead of immediately calling onBack
        setIsSuccess(true);
        
        // Reset form
        setFormData({
          username: '',
          email: '',
          password: '',
          weight: '',
          fitnessGoal: '',
          gender: '',
          fitnessLevel: '',
          cuisines: []
        });
        
    } catch (error) {
      console.error('Error:', error);
      alert('Account creation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    if (onBack && !isSubmitting) {
      onBack();
    }
  };

  // Show success message
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Created!</h2>
            <p className="text-gray-600 mb-6">Your account has been successfully created. You can now sign in.</p>
            <button
              onClick={handleBackToSignIn}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <button
            onClick={handleBackToSignIn}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-lg text-gray-600">Join our fitness community and start your journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Username */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 mr-2" />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                errors.username ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none`}
              placeholder="Enter your username"
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
          </div>

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
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 mr-2" />
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none`}
              placeholder="Create a secure password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* Weight */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Weight className="w-4 h-4 mr-2" />
              Weight (lbs)
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                errors.weight ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none`}
              placeholder="Enter your weight"
            />
            {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
          </div>

          {/* Fitness Goal - Using enum values */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 mr-2" />
              Fitness Goal
            </label>
            <select
              name="fitnessGoal"
              value={formData.fitnessGoal}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                errors.fitnessGoal ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none`}
            >
              <option value="">Select your goal</option>
              <option value={FitnessGoal.CUTTING}>Cutting (Fat Loss)</option>
              <option value={FitnessGoal.BULKING}>Bulking (Muscle Gain)</option>
              <option value={FitnessGoal.MAINTAINING}>Maintaining (Current Weight)</option>
            </select>
            {errors.fitnessGoal && <p className="mt-1 text-sm text-red-600">{errors.fitnessGoal}</p>}
          </div>

          {/* Gender - Using enum values */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 mr-2" />
              Gender
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value={Gender.MALE}
                  checked={formData.gender === Gender.MALE}
                  onChange={handleInputChange}
                  className="mr-2 text-blue-500"
                />
                Male
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value={Gender.FEMALE}
                  checked={formData.gender === Gender.FEMALE}
                  onChange={handleInputChange}
                  className="mr-2 text-blue-500"
                />
                Female
              </label>
            </div>
            {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
          </div>

          {/* Fitness Level - Using enum values */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Activity className="w-4 h-4 mr-2" />
              Fitness Level
            </label>
            <select
              name="fitnessLevel"
              value={formData.fitnessLevel}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                errors.fitnessLevel ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              } focus:outline-none`}
            >
              <option value="">Select your activity level</option>
              <option value={FitnessLevel.SEDENTARY}>Sedentary (Little to no exercise)</option>
              <option value={FitnessLevel.LIGHT}>Light (Light exercise 1-3 days/week)</option>
              <option value={FitnessLevel.MODERATE}>Moderate (Moderate exercise 3-5 days/week)</option>
              <option value={FitnessLevel.ACTIVE}>Active (Hard exercise 6-7 days/week)</option>
              <option value={FitnessLevel.VERY_ACTIVE}>Very Active (Very hard exercise, physical job)</option>
            </select>
            {errors.fitnessLevel && <p className="mt-1 text-sm text-red-600">{errors.fitnessLevel}</p>}
          </div>

          {/* Favorite Cuisines */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <ChefHat className="w-4 h-4 mr-2" />
              Favorite Cuisines <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cuisineOptions.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => handleCuisineToggle(cuisine)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    formData.cuisines.includes(cuisine)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  {formData.cuisines.includes(cuisine) && <Check className="w-4 h-4 inline mr-1" />}
                  {cuisine}
                </button>
              ))}
            </div>
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
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCreationPage;
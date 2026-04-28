// Helper function to validate enum values
export const validateEnumValue = (value, enumObject, fieldName) => {
    if (value && !Object.values(enumObject).includes(value)) {
        throw new Error(`Invalid ${fieldName}: ${value}. Valid values are: ${Object.values(enumObject).join(', ')}`);
    }
}

export const FitnessGoal = {
  BULKING: 'BULKING',
  CUTTING: 'CUTTING',
  MAINTAINING: 'MAINTAINING'
};

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
};

export const FitnessLevel = {
  SEDENTARY: 'SEDENTARY',
  LIGHT: 'LIGHT',
  MODERATE: 'MODERATE',
  ACTIVE: 'ACTIVE',
  VERY_ACTIVE: 'VERY_ACTIVE'
};

// Helper functions for UI display
export const getFitnessGoalLabel = (goal) => {
  const labels = {
    [FitnessGoal.BULKING]: 'Bulking (Gain Muscle)',
    [FitnessGoal.CUTTING]: 'Cutting (Lose Fat)',
    [FitnessGoal.MAINTAINING]: 'Maintaining Current Weight'
  };
  return labels[goal] || goal;
};

export const getGenderLabel = (gender) => {
  const labels = {
    [Gender.MALE]: 'Male',
    [Gender.FEMALE]: 'Female'
  };
  return labels[gender] || gender;
};

export const getFitnessLevelLabel = (level) => {
  const labels = {
    [FitnessLevel.SEDENTARY]: 'Sedentary (Little/No Exercise)',
    [FitnessLevel.LIGHT]: 'Light (Light Exercise 1-3 Days/Week)',
    [FitnessLevel.MODERATE]: 'Moderate (Moderate Exercise 3-5 Days/Week)',
    [FitnessLevel.ACTIVE]: 'Active (Heavy Exercise 6-7 Days/Week)',
    [FitnessLevel.VERY_ACTIVE]: 'Very Active (Very Heavy Exercise/Physical Job)'
  };
  return labels[level] || level;
};

// Get all values as arrays for dropdowns
export const getAllFitnessGoals = () => Object.values(FitnessGoal);
export const getAllGenders = () => Object.values(Gender);
export const getAllFitnessLevels = () => Object.values(FitnessLevel);
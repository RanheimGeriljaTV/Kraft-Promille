/** Grenser og standardverdier for profilen. */
export const PROFILE_LIMITS = {
  weightKg: { min: 40, max: 160, default: 80, unit: 'kg', label: 'Vekt' },
  heightCm: { min: 140, max: 210, default: 180, unit: 'cm', label: 'Høyde' },
  age: { min: 18, max: 90, default: 30, unit: 'år', label: 'Alder' },
};

export const DEFAULT_PROFILE = {
  sex: 'male',
  weightKg: PROFILE_LIMITS.weightKg.default,
  heightCm: PROFILE_LIMITS.heightCm.default,
  age: PROFILE_LIMITS.age.default,
  stomach: 'fed',
};

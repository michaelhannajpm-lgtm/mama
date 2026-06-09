// First-name + last-initial pool for synthetic mom_profiles.
// Picked to span ethnic + cultural diversity for Tampa demographics.

export const FIRST_NAMES = [
  'Sara', 'Mei', 'Aisha', 'Priya', 'Jamie', 'Talia', 'Renee',
  'Maria', 'Jessica', 'Ashley', 'Kayla', 'Samantha', 'Brittany',
  'Stephanie', 'Nicole', 'Megan', 'Lauren', 'Rachel', 'Emily',
  'Hannah', 'Lakshmi', 'Yuki', 'Fatima', 'Olivia', 'Sophia',
  'Isabella', 'Amara', 'Camila', 'Zara', 'Daniela', 'Sana',
  'Nadia', 'Elena', 'Bianca', 'Jasmine', 'Naomi', 'Leah',
  'Maya', 'Anika', 'Noor', 'Layla', 'Valeria', 'Gabriela',
  'Marisol', 'Alina', 'Kavya', 'Nora', 'Ivy', 'Grace',
  'Avery', 'Chloe', 'Mila', 'Lucia', 'Adriana', 'Carolina',
  'Imani', 'Tess', 'Brielle', 'Ana', 'Mariam', 'Kelsey'
];

export const LAST_INITIALS = [
  'A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V', 'W', 'Y',
];

// Generate up to 60 x 20 = 1200 unique (firstName, lastInitial) combos
// before we need to add a numeric suffix.
export const generateDisplayName = (idx) => {
  const first = FIRST_NAMES[idx % FIRST_NAMES.length];
  const initial = LAST_INITIALS[Math.floor(idx / FIRST_NAMES.length) % LAST_INITIALS.length];
  return `${first} ${initial}.`;
};

export const generateUsername = (idx) => {
  const first = FIRST_NAMES[idx % FIRST_NAMES.length].toLowerCase();
  const initial = LAST_INITIALS[Math.floor(idx / FIRST_NAMES.length) % LAST_INITIALS.length].toLowerCase();
  // Suffix idx so the username is deterministic and globally unique
  // even if two seeded moms share the same name + initial.
  return `${first}${initial}${idx}`;
};

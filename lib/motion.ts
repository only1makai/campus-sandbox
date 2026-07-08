/**
 * Restrained motion system — single source of truth for framer-motion timing.
 * Replaces the old per-file SPRING cubic-bezier(0.34,1.56,0.64,1) overshoot
 * (Session 11). Shadow/elevation values live in app/globals.css as CSS
 * tokens (--shadow-resting / --shadow-elevated) instead, since those don't
 * need JS interpolation.
 */
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;

export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.2;

/** Entrance: quick fade + rise, no tilt. */
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION_BASE, ease: EASE_STANDARD },
};

/** Hover lift for cards — pair with `hover:shadow-elevated transition-shadow` in className. */
export const hoverLift = { y: -2 };

/** Press feedback for buttons — subtle scale-down, no offset-shadow animation. */
export const tapPress = { scale: 0.98 };

export const transitionFast = { duration: DURATION_FAST, ease: EASE_STANDARD };
export const transitionBase = { duration: DURATION_BASE, ease: EASE_STANDARD };

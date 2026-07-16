export const EASE_ACCEL = [0.16, 1, 0.3, 1];
export const EASE_FLOW = [0.65, 0, 0.35, 1];

export const MOTION_TRANSITIONS = {
  quick: { duration: 0.18, ease: EASE_ACCEL },
  enter: { duration: 0.42, ease: EASE_ACCEL },
  flow: { duration: 0.56, ease: EASE_FLOW },
  spring: { type: 'spring', stiffness: 360, damping: 28, mass: 0.72 },
};

export const FADE_SLIDE = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export const STAGGER_CONTAINER = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const STAGGER_ITEM = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

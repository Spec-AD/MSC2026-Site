import { motion as Motion, useReducedMotion } from 'framer-motion';
import { MOTION_TRANSITIONS } from '../../utils/motion';

export default function MotionButton({ children, loading = false, disabled = false, className = '', ...props }) {
  const reduceMotion = useReducedMotion();
  const inactive = disabled || loading;

  return (
    <Motion.button
      {...props}
      disabled={inactive}
      whileHover={!inactive && !reduceMotion ? { y: -2 } : undefined}
      whileTap={!inactive && !reduceMotion ? { scale: 0.965, y: 0 } : undefined}
      transition={MOTION_TRANSITIONS.quick}
      className={`relative overflow-hidden ${className}`}
    >
      <span className={`relative z-10 flex items-center justify-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        {children}
      </span>
      {loading && (
        <Motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-current opacity-70"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 0.72, 1] }}
          transition={{ duration: 1.15, times: [0, 0.72, 1], ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
        />
      )}
    </Motion.button>
  );
}

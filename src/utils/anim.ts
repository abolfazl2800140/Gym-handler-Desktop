// Centralized animation configuration and variants for consistent UX
export const anim = {
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  durations: {
    xs: 0.18,
    sm: 0.25,
    md: 0.35,
    lg: 0.45,
  },
  spring: { type: "spring", stiffness: 380, damping: 28 },
  list: {
    container: {
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.065, delayChildren: 0.03 },
      },
    },
    item: {
      hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
      show: { opacity: 1, y: 0, filter: "blur(0)" },
    },
  },
  // Common variants
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    content: {
      initial: { y: 24, scale: 0.98, opacity: 0 },
      animate: { y: 0, scale: 1, opacity: 1 },
      exit: { y: 24, scale: 0.98, opacity: 0 },
    },
  },
};
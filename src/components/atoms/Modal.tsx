import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { anim } from "../../utils/anim";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "default" | "tall";
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size,
}: ModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          onClick={onClose}
          initial={anim.modal.backdrop.initial}
          animate={anim.modal.backdrop.animate}
          exit={anim.modal.backdrop.exit}
        >
          <motion.div
            className={`modal-content ${size === "tall" ? "tall" : ""}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            initial={anim.modal.content.initial}
            animate={anim.modal.content.animate}
            exit={anim.modal.content.exit}
            transition={{ duration: anim.durations.md, ease: anim.ease }}
          >
            <div className="modal-header">
              <h2 className="text-heading-3">{title}</h2>
              <button className="modal-close ripple" onClick={onClose}>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


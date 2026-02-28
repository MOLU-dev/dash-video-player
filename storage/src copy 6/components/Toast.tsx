// // components/Toast.tsx
// "use client";

// import React, { useEffect, useState } from "react";

// interface ToastProps {
//   message: string;
//   actionLabel?: string;
//   onAction?: () => void;
//   duration?: number;
//   onClose: () => void;
// }

// export function Toast({
//   message,
//   actionLabel,
//   onAction,
//   duration = 5000,
//   onClose,
// }: ToastProps) {
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     // Show toast with slight delay for animation
//     const showTimer = setTimeout(() => {
//       setIsVisible(true);
//     }, 100);

//     // Auto hide after duration
//     const hideTimer = setTimeout(() => {
//       setIsVisible(false);
//       setTimeout(onClose, 300); // Wait for fade out animation
//     }, duration);

//     return () => {
//       clearTimeout(showTimer);
//       clearTimeout(hideTimer);
//     };
//   }, [duration, onClose]);

//   const handleAction = () => {
//     onAction?.();
//     setIsVisible(false);
//     setTimeout(onClose, 300);
//   };

//   return (
//     <div className={`toast ${isVisible ? "toast-visible" : ""}`}>
//       <span className="toast-message">{message}</span>
//       {actionLabel && (
//         <button className="toast-action" onClick={handleAction}>
//           {actionLabel}
//         </button>
//       )}
//       <button className="toast-close" onClick={onClose}>
//         ×
//       </button>

//       <style jsx>{`
//         .toast {
//           position: fixed;
//           top: 20px;
//           right: 20px;
//           background: rgba(0, 0, 0, 0.9);
//           color: white;
//           padding: 12px 16px;
//           border-radius: 8px;
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           z-index: 1000;
//           transform: translateX(100%);
//           opacity: 0;
//           transition: all 0.3s ease;
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
//           max-width: 400px;
//         }

//         .toast.toast-visible {
//           transform: translateX(0);
//           opacity: 1;
//         }

//         .toast-message {
//           flex: 1;
//           font-size: 14px;
//           font-weight: 500;
//         }

//         .toast-action {
//           background: #ff4444;
//           color: white;
//           border: none;
//           padding: 6px 12px;
//           border-radius: 4px;
//           font-size: 12px;
//           font-weight: 600;
//           cursor: pointer;
//           transition: background 0.2s ease;
//         }

//         .toast-action:hover {
//           background: #cc0000;
//         }

//         .toast-close {
//           background: none;
//           border: none;
//           color: #ccc;
//           font-size: 18px;
//           cursor: pointer;
//           padding: 0;
//           width: 20px;
//           height: 20px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }

//         .toast-close:hover {
//           color: white;
//         }

//         @media (max-width: 600px) {
//           .toast {
//             top: 10px;
//             right: 10px;
//             left: 10px;
//             max-width: none;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }


// components/Toast.tsx
"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  onClose: () => void;
  position?: "top" | "bottom";
}

export function Toast({ 
  message, 
  actionLabel, 
  onAction, 
  duration = 4000, 
  onClose,
  position = "top"
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show toast immediately
    setIsVisible(true);

    // Auto hide after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade out animation
  };

  const handleAction = () => {
    onAction?.();
    handleClose();
  };

  return (
    <div className={`toast toast-${position} ${isVisible ? 'toast-visible' : ''}`}>
      <span className="toast-message">{message}</span>
      {actionLabel && (
        <button className="toast-action" onClick={handleAction}>
          {actionLabel}
        </button>
      )}
      <button className="toast-close" onClick={handleClose}>×</button>
      
      <style jsx>{`
        .toast {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 1000;
          opacity: 0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 90%;
          white-space: nowrap;
        }

        .toast-top {
          top: 20px;
        }

        .toast-bottom {
          bottom: 80px; /* Above controls */
        }

        .toast.toast-visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .toast-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #fff;
        }

        .toast-action {
          background: #ff4444;
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .toast-action:hover {
          background: #cc0000;
          transform: scale(1.05);
        }

        .toast-close {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #ccc;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        @media (max-width: 600px) {
          .toast {
            padding: 10px 16px;
            gap: 12px;
            max-width: 95%;
          }

          .toast-message {
            font-size: 13px;
          }

          .toast-action {
            padding: 5px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
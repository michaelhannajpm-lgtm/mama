import { C } from '../theme';

// Responsive layout wrapper.
// Mobile (< 768 px): children fill the device viewport edge-to-edge.
//                    No notch, no rounded corners, no dark bezel.
// Desktop (≥ 768 px): traditional phone-frame mock with notch + bezel,
//                     used for demo / press shots.
export const PhoneFrame = ({ children }) => (
  <div
    className="relative w-screen h-[100dvh] md:w-auto md:h-auto md:p-3 md:phoneframe-desktop"
    style={{
      // Desktop bezel + shadow live in CSS via the .phoneframe-desktop class
      // below so they don't apply on mobile.
    }}
  >
    <div
      className="relative w-full h-full overflow-hidden md:rounded-[42px]"
      style={{
        background: C.cream,
        // Respect iOS / Android safe-area insets on real devices so the
        // system status bar doesn't overlap content. Desktop ignores these.
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Notch — desktop only */}
      <div
        className="hidden md:block absolute left-1/2 -translate-x-1/2 z-50"
        style={{
          top: 10, width: 110, height: 30, borderRadius: 20, background: '#1B1517',
        }}
      />
      {children}
    </div>

    <style>{`
      @media (min-width: 768px) {
        .phoneframe-desktop {
          width: min(390px, calc(100vw - 16px));
          height: min(820px, calc(100vh - 24px));
          max-height: 820px;
          border-radius: 54px;
          background: #1B1517;
          box-shadow:
            0 40px 80px -20px rgba(42,30,34,.45),
            0 0 0 1px rgba(0,0,0,.5),
            inset 0 0 0 1px rgba(255,255,255,.06);
        }
      }
    `}</style>
  </div>
);

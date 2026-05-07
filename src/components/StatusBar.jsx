// StatusBar — was a simulated phone time + signal + battery row.
// Now a no-op. Rendered as nothing so screens get a clean top edge.
// On real iOS the system bar handles itself via safe-area insets
// (see PhoneFrame's env(safe-area-inset-top) padding).
//
// The `light` prop is kept so existing call-sites (`<StatusBar light />`)
// keep type-checking, but it has no effect.
// eslint-disable-next-line no-unused-vars
export const StatusBar = ({ light = false }) => null;

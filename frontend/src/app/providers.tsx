"use client";

// frontend/src/app/providers.tsx
// NextAuth's SessionProvider uses React Context and must live in a client
// component. We wrap it here and import it from the server-side layout.tsx.

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

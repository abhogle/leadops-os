import { SessionProvider } from "../../src/providers/SessionProvider";
import { AppShellLayout } from "../../src/components/layout/AppShellLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShellLayout>{children}</AppShellLayout>
    </SessionProvider>
  );
}

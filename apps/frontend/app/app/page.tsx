"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/inbox");
  }, [router]);

  return null;
}

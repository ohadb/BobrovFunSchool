"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/lib/auth";

export default function Home(): React.ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    const user = getLoggedInUser();
    if (!user) {
      router.replace("/login");
    } else {
      router.replace(user.role === "parent" ? "/dashboard" : "/student");
    }
  }, [router]);

  return null;
}

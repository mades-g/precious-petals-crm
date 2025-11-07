import type { JSX } from "react";
import { Navigate } from "react-router";
import { Spinner } from "@radix-ui/themes";

import { useAuth } from "../hooks/use-auth";

export default function RedirectIfAuthed({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthed, loading } = useAuth();

  if (loading) return <Spinner size="3" />;
  return isAuthed ? <Navigate to="/" replace /> : children;
}

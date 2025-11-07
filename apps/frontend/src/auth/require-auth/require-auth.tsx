import { Navigate, Outlet, useLocation } from "react-router";
import { Spinner } from "@radix-ui/themes";

import { useAuth } from "../hooks/use-auth";

export default function RequireAuth() {
  const { isAuthed, loading } = useAuth();

  const location = useLocation();
  if (loading) return <Spinner size="3" />;
  return isAuthed ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

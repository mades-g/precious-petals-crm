import { Navigate, Outlet, useLocation } from "react-router";
import { Spinner } from "@radix-ui/themes";

import { useAuth } from "../hooks/use-auth";

export default function RequireAdmin() {
  const { isAuthed, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner size="3" />;

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

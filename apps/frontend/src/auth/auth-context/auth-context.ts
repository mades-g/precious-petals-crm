import { createContext } from "react";

import type { AuthRecord } from "pocketbase";

export type AuthContext = {
  isAuthed: boolean;
  user: AuthRecord | null;
  loading: boolean;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContext | undefined>(undefined);

import { createContext } from "react";

export type AuthContext = {
  isAuthed: boolean;
  user: unknown | null;
  loading: boolean;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContext | undefined>(undefined);

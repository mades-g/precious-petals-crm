import PocketBase from "pocketbase";
import type { TypedPocketBase } from "@/services/pb/types";

const baseUrl = import.meta.env.VITE_PB_URL || "http://127.0.0.1:8090";

export const pb = new PocketBase(baseUrl) as TypedPocketBase;

export const login = async (email: string, password: string) =>
  pb
    .collection("users")
    .authWithPassword(email, password)
    .then((res) => res);

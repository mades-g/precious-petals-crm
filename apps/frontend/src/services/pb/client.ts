import PocketBase from "pocketbase"
import type { TypedPocketBase } from "@/services/pb/types"
import { COLLECTIONS } from "@/services/pb/constants"

const baseUrl = import.meta.env.VITE_PB_URL || "http://127.0.0.1:8090"

export const pb = new PocketBase(baseUrl) as TypedPocketBase

export const login = async (email: string, password: string) => pb.collection("users").authWithPassword(email, password).then(res => res)

// TODO define queryParams type
// TODO define collections type aka record model
export const getCostumers = async () => {
  const costumers = await pb.collection(COLLECTIONS.COSTUMERS).getFullList({
    expand: 'orderId,orderId.frameOrderId,orderId.paperweightOrderId'
  })
  return costumers
}

export const getOrders = async () => await pb.collection('orders').getFullList({ expand: "orderId" })

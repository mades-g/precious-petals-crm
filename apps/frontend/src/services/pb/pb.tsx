import PocketBase from "pocketbase"

export const pb = new PocketBase(import.meta.env.VITE_PB_URL || "http://127.0.0.1:8090")

export const login = async (email: string, password: string) => pb.collection("users").authWithPassword(email, password).then(res => res)

// TODO define queryParams type
// TODO define collections type aka record model
export const getCostumers = async () => {
  const costumers = await pb.collection('costumers').getFullList({
    expand: 'orderId,orderId.frameOrderId,orderId.paperweightOrderId'
  })
  return costumers
}


export const getOrders = async () => await pb.collection('orders').getFullList({ expand: "orderId" })

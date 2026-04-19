export function createInMemoryServicingOrderStore(initialOrders = []) {
  const orders = initialOrders.map((order) => structuredClone(order))

  return {
    create(order) {
      const storedOrder = structuredClone(order)
      orders.push(storedOrder)
      return structuredClone(storedOrder)
    },

    list() {
      return orders.map((order) => structuredClone(order))
    },

    getById(servicingOrderId) {
      const matchingOrder = orders.find((order) => order.servicingOrderId === servicingOrderId)
      return matchingOrder ? structuredClone(matchingOrder) : null
    },
  }
}

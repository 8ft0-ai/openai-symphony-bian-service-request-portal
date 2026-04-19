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
      const foundOrder = orders.find((order) => order.servicingOrderId === servicingOrderId)
      return foundOrder ? structuredClone(foundOrder) : null
    },

    updateById(servicingOrderId, nextOrder) {
      const index = orders.findIndex((order) => order.servicingOrderId === servicingOrderId)

      if (index < 0) {
        return null
      }

      const clonedOrder = structuredClone(nextOrder)
      orders[index] = clonedOrder
      return structuredClone(clonedOrder)
    },
  }
}

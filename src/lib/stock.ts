import prisma from "./prisma";

export interface ProductStockInfo {
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

/**
 * Calculates current stock for a given product by summing stock ledger entries
 */
export async function getProductStock(productId: string): Promise<number> {
  const result = await prisma.stockLedger.aggregate({
    where: { productId },
    _sum: { qty: true },
  });
  return result._sum.qty || 0;
}

/**
 * Gets stock for multiple products in a single grouped query
 */
export async function getProductsStockMap(productIds?: string[]): Promise<Map<string, number>> {
  const where = productIds && productIds.length > 0 ? { productId: { in: productIds } } : {};
  const ledgerSums = await prisma.stockLedger.groupBy({
    by: ["productId"],
    where,
    _sum: { qty: true },
  });

  const map = new Map<string, number>();
  for (const item of ledgerSums) {
    map.set(item.productId, item._sum.qty || 0);
  }
  return map;
}

/**
 * Validates whether requested quantities are available in stock
 */
export async function validateStockAvailability(
  items: { productId: string; qty: number }[]
): Promise<{ valid: boolean; errors: string[] }> {
  const productIds = items.map((i) => i.productId);
  const stockMap = await getProductsStockMap(productIds);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const errors: string[] = [];

  for (const item of items) {
    const currentStock = stockMap.get(item.productId) || 0;
    if (currentStock < item.qty) {
      const prod = productMap.get(item.productId);
      const name = prod ? `${prod.name} (${prod.unit})` : "Product";
      errors.push(
        `Insufficient stock for "${name}": Available ${currentStock} units, Requested ${item.qty} units.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

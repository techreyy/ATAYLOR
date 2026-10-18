import { apiFetch } from "@/core/api/client";
import type { ICatalogRepository, OrderInsights, ProductInput } from "@/core/repositories/catalog.repository";
import type { CatalogProductOption } from "@/core/repositories/order.repository";

class ApiCatalogAdapter implements ICatalogRepository {
  async getProducts(includeInactive = false) {
    const query = includeInactive ? { include_inactive: "1" } : undefined;
    return (await apiFetch<{ data: CatalogProductOption[] }>("/products", { query })).data;
  }

  async createProduct(input: ProductInput) {
    return (await apiFetch<{ data: CatalogProductOption }>("/products", { method: "POST", body: input })).data;
  }

  async updateProduct(id: string, input: ProductInput) {
    return (await apiFetch<{ data: CatalogProductOption }>(`/products/${id}`, { method: "PATCH", body: input })).data;
  }

  async getOrderInsights(days: 30 | 90 | 365) {
    return (await apiFetch<{ data: OrderInsights }>("/ai/order-insights", { query: { days: String(days) } })).data;
  }
}

export const catalogRepository: ICatalogRepository = new ApiCatalogAdapter();

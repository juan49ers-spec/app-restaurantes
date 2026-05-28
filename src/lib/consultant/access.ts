import type {
  ConsultantClientLinkRow,
  ConsultantClientRestaurantRow,
  ConsultantClientSummary,
} from './types'

export function mapOwnedRestaurantClient(
  row: ConsultantClientRestaurantRow,
  activeRestaurantId: string | null,
): ConsultantClientSummary {
  return {
    restaurantId: row.id,
    name: row.name,
    role: 'OWNER',
    status: 'ACTIVE',
    consultantName: row.consultant_name,
    isActive: row.id === activeRestaurantId,
  }
}

export function mapConsultantClientRow(
  row: ConsultantClientLinkRow,
  activeRestaurantId: string | null,
): ConsultantClientSummary | null {
  const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants
  if (!restaurant) return null

  return {
    restaurantId: row.restaurant_id,
    name: restaurant.name,
    role: row.role,
    status: row.status,
    consultantName: restaurant.consultant_name,
    isActive: row.restaurant_id === activeRestaurantId,
  }
}

export function mergeConsultantPortfolio(
  ownedClients: ConsultantClientSummary[],
  linkedClients: ConsultantClientSummary[],
): ConsultantClientSummary[] {
  const byRestaurant = new Map<string, ConsultantClientSummary>()

  for (const client of linkedClients) {
    byRestaurant.set(client.restaurantId, client)
  }

  for (const client of ownedClients) {
    byRestaurant.set(client.restaurantId, client)
  }

  return [...byRestaurant.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'es')
  )
}

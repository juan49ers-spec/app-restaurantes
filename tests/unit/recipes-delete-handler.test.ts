/**
 * TESTS UNITARIOS: Recipes - Delete Recipe Handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock chain
let mockResponseQueue: Array<{ data: any; error: any }> = []
let callCount = 0

const createMockChain = () => {
  callCount = 0
  const chain: any = {}
  chain.from = vi.fn().mockReturnThis()
  chain.select = vi.fn().mockReturnThis()
  chain.insert = vi.fn().mockReturnThis()
  chain.update = vi.fn().mockReturnThis()
  chain.delete = vi.fn().mockReturnThis()
  chain.eq = vi.fn().mockImplementation(() => {
    const response = mockResponseQueue.shift() || { data: null, error: null }
    return Promise.resolve(response)
  })
  return chain
}

let mockSupabase = createMockChain()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase))
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('@/app/actions/safe-action', () => ({
  executeSafeAction: vi.fn().mockImplementation(async (schema: any, data: any, handler: (data: any, context: any) => Promise<any>) => {
    try {
      const result = await handler(data, { restaurant_id: '550e8400-e29b-41d4-a716-446655440000' })
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}))

describe('deleteRecipe Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
    callCount = 0
    mockSupabase = createMockChain()
  })

  it('debería llamar deleteRecipe', async () => {
    const { deleteRecipe } = await import('@/app/actions/recipes')
    
    mockResponseQueue = [
      { data: null, error: null },
      { data: null, error: null }
    ]

    const result = await deleteRecipe('550e8400-e29b-41d4-a716-446655440001')

    expect(result).toBeDefined()
  })

  it('debería manejar error en deleteRecipe', async () => {
    const { deleteRecipe } = await import('@/app/actions/recipes')
    
    mockResponseQueue = [
      { data: null, error: { message: 'Error' } }
    ]

    const result = await deleteRecipe('550e8400-e29b-41d4-a716-446655440001')

    expect(result.success).toBe(false)
  })
})

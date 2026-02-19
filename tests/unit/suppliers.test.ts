/**
 * TEST UNITARIOS: Suppliers Actions
 * 
 * Tests para el módulo de gestión de proveedores
 * Incluye: CRUD completo de proveedores
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de createClient
const mockSupabaseChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseChain)
}))

// Mock de getUserRestaurant
vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

// Mock de next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('Suppliers Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSuppliers', () => {
    it('debería existir la función getSuppliers', async () => {
      const { getSuppliers } = await import('@/app/actions/suppliers')
      expect(getSuppliers).toBeDefined()
      expect(typeof getSuppliers).toBe('function')
    })

    it('debería llamar a la tabla suppliers con filtros correctos', async () => {
      const { getSuppliers } = await import('@/app/actions/suppliers')
      
      mockSupabaseChain.order.mockResolvedValueOnce({ 
        data: [{ id: '1', name: 'Proveedor A' }], 
        error: null 
      })

      await getSuppliers()

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('suppliers')
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('restaurant_id', '550e8400-e29b-41d4-a716-446655440000')
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('name')
    })
  })

  describe('getSupplier', () => {
    it('debería existir la función getSupplier', async () => {
      const { getSupplier } = await import('@/app/actions/suppliers')
      expect(getSupplier).toBeDefined()
      expect(typeof getSupplier).toBe('function')
    })

    it('debería obtener un proveedor específico por ID', async () => {
      const { getSupplier } = await import('@/app/actions/suppliers')
      const supplierId = '550e8400-e29b-41d4-a716-446655440001'
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { id: supplierId, name: 'Proveedor A' },
        error: null
      })

      await getSupplier(supplierId)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('suppliers')
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', supplierId)
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('restaurant_id', '550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('createSupplier', () => {
    it('debería existir la función createSupplier', async () => {
      const { createSupplier } = await import('@/app/actions/suppliers')
      expect(createSupplier).toBeDefined()
      expect(typeof createSupplier).toBe('function')
    })

    it('debería insertar un proveedor con datos validados', async () => {
      const { createSupplier } = await import('@/app/actions/suppliers')
      const { revalidatePath } = await import('next/cache')
      
      const formData = new FormData()
      formData.append('name', 'Nuevo Proveedor')
      formData.append('tax_id', 'B12345678')
      formData.append('contact_email', 'proveedor@test.com')
      formData.append('contact_phone', '123456789')

      mockSupabaseChain.insert.mockResolvedValueOnce({ error: null })

      await createSupplier(formData)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('suppliers')
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/suppliers')
    })
  })

  describe('updateSupplier', () => {
    it('debería existir la función updateSupplier', async () => {
      const { updateSupplier } = await import('@/app/actions/suppliers')
      expect(updateSupplier).toBeDefined()
      expect(typeof updateSupplier).toBe('function')
    })

    it('debería actualizar un proveedor y revalidar paths', async () => {
      const { updateSupplier } = await import('@/app/actions/suppliers')
      const { revalidatePath } = await import('next/cache')
      
      const supplierId = '550e8400-e29b-41d4-a716-446655440001'
      const formData = new FormData()
      formData.append('name', 'Proveedor Actualizado')
      formData.append('tax_id', 'B87654321')
      formData.append('contact_email', 'nuevo@test.com')
      formData.append('contact_phone', '987654321')

      // Setup the chain for update -> eq -> eq
      mockSupabaseChain.update.mockReturnThis()

      await updateSupplier(supplierId, formData)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('suppliers')
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/suppliers')
      expect(revalidatePath).toHaveBeenCalledWith(`/suppliers/${supplierId}`)
    })
  })

  describe('deleteSupplier', () => {
    it('debería existir la función deleteSupplier', async () => {
      const { deleteSupplier } = await import('@/app/actions/suppliers')
      expect(deleteSupplier).toBeDefined()
      expect(typeof deleteSupplier).toBe('function')
    })

    it('debería eliminar un proveedor y revalidar path', async () => {
      const { deleteSupplier } = await import('@/app/actions/suppliers')
      const { revalidatePath } = await import('next/cache')
      
      const supplierId = '550e8400-e29b-41d4-a716-446655440001'

      // Setup the chain for delete -> eq -> eq
      mockSupabaseChain.delete.mockReturnThis()

      await deleteSupplier(supplierId)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('suppliers')
      expect(mockSupabaseChain.delete).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/suppliers')
    })

    it('debería lanzar error si falla la eliminación', async () => {
      const { deleteSupplier } = await import('@/app/actions/suppliers')
      const supplierId = '550e8400-e29b-41d4-a716-446655440001'

      // Simular error en la cadena de delete
      mockSupabaseChain.delete.mockImplementation(() => {
        throw new Error('Cannot delete: supplier has invoices')
      })

      await expect(deleteSupplier(supplierId)).rejects.toThrow('Cannot delete: supplier has invoices')
    })
  })

  describe('Manejo de errores', () => {
    it('debería lanzar error si getSuppliers falla', async () => {
      const { getSuppliers } = await import('@/app/actions/suppliers')
      
      mockSupabaseChain.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection error' } 
      })

      await expect(getSuppliers()).rejects.toThrow('Database connection error')
    })

    it('debería lanzar error si getSupplier no encuentra el proveedor', async () => {
      const { getSupplier } = await import('@/app/actions/suppliers')
      const supplierId = 'non-existent-id'
      
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Supplier not found' }
      })

      await expect(getSupplier(supplierId)).rejects.toThrow('Supplier not found')
    })

    it('debería lanzar error si createSupplier falla en la inserción', async () => {
      const { createSupplier } = await import('@/app/actions/suppliers')
      
      const formData = new FormData()
      formData.append('name', 'Nuevo Proveedor')
      formData.append('tax_id', 'B12345678')
      formData.append('contact_email', 'proveedor@test.com')
      formData.append('contact_phone', '123456789')

      mockSupabaseChain.insert.mockResolvedValueOnce({ 
        error: { message: 'Duplicate tax_id' } 
      })

      await expect(createSupplier(formData)).rejects.toThrow('Duplicate tax_id')
    })

    it('debería lanzar error si updateSupplier falla', async () => {
      const { updateSupplier } = await import('@/app/actions/suppliers')
      
      const supplierId = '550e8400-e29b-41d4-a716-446655440001'
      const formData = new FormData()
      formData.append('name', 'Proveedor Actualizado')
      formData.append('tax_id', 'B87654321')
      formData.append('contact_email', 'nuevo@test.com')
      formData.append('contact_phone', '987654321')

      // Simular error en update
      mockSupabaseChain.update.mockImplementation(() => {
        throw new Error('Update failed: row not found')
      })

      await expect(updateSupplier(supplierId, formData)).rejects.toThrow('Update failed: row not found')
    })
  })
})

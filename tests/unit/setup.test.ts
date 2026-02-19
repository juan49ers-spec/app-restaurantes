import { describe, it, expect } from 'vitest'

describe('Vitest Infrastructure', () => {
  it('should work with basic assertions', () => {
    expect(true).toBe(true)
    expect(1 + 1).toBe(2)
  })

  it('should work with objects', () => {
    const obj = { name: 'test', value: 123 }
    expect(obj).toEqual({ name: 'test', value: 123 })
    expect(obj).toHaveProperty('name')
    expect(obj.name).toBe('test')
  })

  it('should work with arrays', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
    expect(arr).toEqual([1, 2, 3])
  })

  it('should work with async code', async () => {
    const asyncFn = async () => 'success'
    const result = await asyncFn()
    expect(result).toBe('success')
  })

  it('should support testing library matchers', () => {
    // This test verifies that jest-dom matchers are available
    const element = document.createElement('div')
    element.textContent = 'Hello'
    document.body.appendChild(element)

    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Hello')
    expect(element).toBeVisible()

    document.body.removeChild(element)
  })
})

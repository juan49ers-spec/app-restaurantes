import { describe, expect, it } from 'vitest'
import { parseEmployeesCsvPreview } from '@/lib/importing/employees-csv'

describe('parseEmployeesCsvPreview', () => {
  it('parses employees with roles, wages and duplicate emails', () => {
    const preview = parseEmployeesCsvPreview({
      csvText: [
        'first_name;last_name;role;email;phone;contract_type;wage_type;hourly_rate;monthly_base_salary',
        'Maria;Lopez;FLOOR_STAFF;maria@example.com;600000001;INDEFINIDO;HOURLY;12,50;0',
        'Marta;Lopez;KITCHEN_STAFF;maria@example.com;600000002;TEMPORAL;SALARIED;0;1800',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(2)
    expect(preview.summary.totalEmployees).toBe(2)
    expect(preview.summary.activeRows).toBe(2)
    expect(preview.summary.estimatedMonthlyCost).toBe(3800)
    expect(preview.duplicates).toEqual([{ key: 'email:maria@example.com', rowNumbers: [2, 3] }])
  })

  it('rejects invalid roles and negative wages', () => {
    const preview = parseEmployeesCsvPreview({
      csvText: [
        'first_name;last_name;role;hourly_rate',
        'Juan;Garcia;CHEF;-4',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(0)
    expect(preview.invalidRows).toBe(1)
    expect(preview.rows[0].errors).toContain('Rol no reconocido: CHEF.')
    expect(preview.rows[0].errors).toContain('hourly_rate debe ser mayor o igual que 0.')
  })

  it('requires first_name, last_name and role headers', () => {
    const preview = parseEmployeesCsvPreview({
      csvText: 'first_name;role\nMaria;FLOOR_STAFF',
    })

    expect(preview.fileErrors).toEqual(['Falta la columna obligatoria last_name.'])
    expect(preview.rows[0].status).toBe('invalid')
  })
})

import { describe, expect, it } from 'vitest'
import { parseShiftsCsvPreview } from '@/lib/importing/shifts-csv'

describe('parseShiftsCsvPreview', () => {
  it('parses valid shifts with Spanish CSV delimiter and summaries hours', () => {
    const preview = parseShiftsCsvPreview({
      csvText: [
        'date;employee_name;start_time;end_time;break_minutes;shift_type;status;notes',
        '2026-02-01;Maria Lopez;09:00;17:00;30;ALMUERZO;scheduled;Sala',
        '2026-02-02;Maria Lopez;18:00;01:00;0;CENA;completed;Cierre',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(2)
    expect(preview.invalidRows).toBe(0)
    expect(preview.summary).toEqual({
      totalShifts: 2,
      totalHours: 14.5,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-02',
      employeeRefs: 1,
    })
  })

  it('detects duplicate shifts by employee date and time', () => {
    const preview = parseShiftsCsvPreview({
      csvText: [
        'date;employee_name;start_time;end_time',
        '2026-02-01;Maria Lopez;09:00;17:00',
        '2026-02-01;maria   lopez;09:00;17:00',
      ].join('\n'),
    })

    expect(preview.duplicates).toEqual([
      {
        key: '2026-02-01|name:maria lopez|09:00|17:00',
        rowNumbers: [2, 3],
      },
    ])
  })

  it('requires an employee identifier and valid shift times', () => {
    const preview = parseShiftsCsvPreview({
      csvText: [
        'date;start_time;end_time;break_minutes',
        '2026-02-01;25:00;17:00;-1',
      ].join('\n'),
    })

    expect(preview.fileErrors).toContain('Falta employee_id o employee_name para identificar al empleado.')
    expect(preview.validRows).toBe(0)
    expect(preview.invalidRows).toBe(1)
  })
})

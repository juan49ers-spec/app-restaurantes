import { z } from 'zod'

// Alert Types
export const AlertTypeSchema = z.enum([
  'PRICE_CHANGE',
  'MARGIN_DROP',
  'WASTE_HIGH',
  'INGREDIENT_LOW_STOCK',
  'SUPPLIER_PRICE_INCREASE',
  'MENU_ITEM_UNPROFITABLE',
  'INVOICE_ANOMALY',
  'PRICE_DISCREPANCY',
  'REPORT_PUBLISHED',
  'CLIENT_MEETING_REQUEST'
])

export type AlertType = z.infer<typeof AlertTypeSchema>

// Alert Severities
export const AlertSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL'])
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>

// Alert Configuration Schema
export const AlertRuleSchema = z.object({
  id: z.string().uuid().optional(),
  restaurant_id: z.string().uuid(),
  name: z.string().min(1),
  type: AlertTypeSchema,
  enabled: z.boolean().default(true),
  conditions: z.object({
    threshold: z.number(),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
    timeWindow: z.number().optional(), // in hours
  }),
  severity: AlertSeveritySchema.default('WARNING'),
  channels: z.object({
    inApp: z.boolean().default(true),
    email: z.boolean().default(false),
    push: z.boolean().default(false),
  }),
  cooldown: z.number().default(24), // hours between same alert
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
})

export type AlertRule = z.infer<typeof AlertRuleSchema>

// Alert Notification Schema
export const AlertNotificationSchema = z.object({
  id: z.string().uuid().optional(),
  restaurant_id: z.string().uuid(),
  rule_id: z.string().uuid().nullable().optional(),
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string(),
  entity_type: z.enum(['INGREDIENT', 'RECIPE', 'SUPPLIER', 'INVOICE', 'MENU', 'REPORT']),
  entity_id: z.string(),
  entity_name: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  read: z.boolean().default(false),
  read_at: z.date().optional(),
  created_at: z.date().optional(),
})

export type AlertNotification = z.infer<typeof AlertNotificationSchema>

// Predefined Alert Rules
export const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Cambio de Precio Significativo',
    type: 'PRICE_CHANGE',
    enabled: true,
    conditions: {
      threshold: 15, // 15% change
      operator: 'gt',
      timeWindow: 24, // 24 hours
    },
    severity: 'WARNING',
    channels: { inApp: true, email: false, push: false },
    cooldown: 24,
  },
  {
    name: 'Margen Bajo',
    type: 'MARGIN_DROP',
    enabled: true,
    conditions: {
      threshold: 60, // 60% margin
      operator: 'lt',
    },
    severity: 'CRITICAL',
    channels: { inApp: true, email: true, push: false },
    cooldown: 12,
  },
  {
    name: 'Merma Elevada',
    type: 'WASTE_HIGH',
    enabled: true,
    conditions: {
      threshold: 20, // 20% waste
      operator: 'gt',
    },
    severity: 'WARNING',
    channels: { inApp: true, email: false, push: false },
    cooldown: 48,
  },
  {
    name: 'Subida de Precio Proveedor',
    type: 'SUPPLIER_PRICE_INCREASE',
    enabled: true,
    conditions: {
      threshold: 10, // 10% increase
      operator: 'gt',
    },
    severity: 'WARNING',
    channels: { inApp: true, email: true, push: false },
    cooldown: 24,
  },
  {
    name: 'Plato No Rentable',
    type: 'MENU_ITEM_UNPROFITABLE',
    enabled: true,
    conditions: {
      threshold: 50, // 50% margin
      operator: 'lt',
    },
    severity: 'CRITICAL',
    channels: { inApp: true, email: true, push: true },
    cooldown: 24,
  },
  {
    name: 'Anomalía en Factura',
    type: 'INVOICE_ANOMALY',
    enabled: true,
    conditions: {
      threshold: 3, // 3 sigma
      operator: 'gt',
    },
    severity: 'INFO',
    channels: { inApp: true, email: false, push: false },
    cooldown: 1,
  },
]

// Alert Templates
export const ALERT_TEMPLATES: Record<AlertType, { title: string; message: string }> = {
  PRICE_CHANGE: {
    title: 'Cambio de Precio Detectado',
    message: '{{entity_name}} ha cambiado de precio un {{change_pct}}%',
  },
  MARGIN_DROP: {
    title: 'Margen Bajo',
    message: '{{entity_name}} tiene un margen del {{current_margin}}% (objetivo: {{target_margin}}%)',
  },
  WASTE_HIGH: {
    title: 'Merma Elevada',
    message: '{{entity_name}} tiene una merma del {{waste_pct}}%',
  },
  INGREDIENT_LOW_STOCK: {
    title: 'Stock Bajo',
    message: '{{entity_name}} está por debajo del nivel mínimo',
  },
  SUPPLIER_PRICE_INCREASE: {
    title: 'Subida de Precio',
    message: '{{supplier_name}} ha subido el precio de {{entity_name}} un {{increase_pct}}%',
  },
  MENU_ITEM_UNPROFITABLE: {
    title: 'Plato No Rentable',
    message: '{{entity_name}} tiene margen insuficiente para ser rentable',
  },
  INVOICE_ANOMALY: {
    title: 'Anomalía Detectada',
    message: 'La factura de {{supplier_name}} presenta valores inusuales',
  },
  PRICE_DISCREPANCY: {
    title: 'Discrepancia de Precio',
    message: 'Diferencia de precio detectada entre proveedores para {{entity_name}}',
  },
  REPORT_PUBLISHED: {
    title: 'Informe publicado',
    message: 'El informe {{entity_name}} ya está visible en el portal cliente',
  },
  CLIENT_MEETING_REQUEST: {
    title: 'Solicitud de reunión',
    message: 'El cliente ha solicitado revisar {{entity_name}}',
  },
}

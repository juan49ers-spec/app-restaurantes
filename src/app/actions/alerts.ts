'use server'

import { createClient } from '@/lib/supabaseServer'
import { createClient as createSupabaseClient } from '@/lib/supabaseServer'
import { getUserRestaurant } from './utils'
import { AlertRule, AlertNotification, AlertType, AlertSeverity, DEFAULT_ALERT_RULES } from '@/types/alerts'
import { revalidatePath } from 'next/cache'

// Legacy alert creation for backward compatibility
export async function createAlert(
  type: 'price_spike' | 'low_stock' | 'staffing' | 'system',
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createSupabaseClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return

  const { error } = await supabase
    .from('alerts')
    .insert({
      restaurant_id: restaurantId,
      type,
      title,
      message,
      metadata,
      is_read: false
    })

  if (error) console.error("Error creating alert:", error)
}

// Legacy function for backward compatibility
export async function getRecentAlerts(limit = 5) {
  const supabase = await createSupabaseClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return []

  const { data } = await supabase
    .from('alerts')
    .select('id, type, title, message, metadata, is_read, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('type', 'price_spike')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// Get all alert rules for a restaurant
export async function getAlertRules(): Promise<AlertRule[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return []

  const { data, error } = await supabase
    .from('alert_rules')
    .select('id, name, type, severity, is_active, conditions, channels, created_at, updated_at, restaurant_id, enabled, cooldown')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alert rules:', error)
    return []
  }

  return (data || []) as AlertRule[]
}

// Create default alert rules if none exist
export async function initializeDefaultAlertRules(): Promise<void> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return

  // Check if rules already exist
  const { count } = await supabase
    .from('alert_rules')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)

  if (count && count > 0) return

  // Create default rules
  const rules = DEFAULT_ALERT_RULES.map(rule => ({
    ...rule,
    restaurant_id: restaurantId,
    conditions: JSON.stringify(rule.conditions),
    channels: JSON.stringify(rule.channels),
  }))

  const { error } = await supabase.from('alert_rules').insert(rules)

  if (error) {
    console.error('Error creating default alert rules:', error)
  }
}

// Create or update alert rule
export async function saveAlertRule(rule: Partial<AlertRule>): Promise<AlertRule> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) throw new Error('No restaurant assigned')

  const ruleData = {
    ...rule,
    restaurant_id: restaurantId,
    conditions: JSON.stringify(rule.conditions),
    channels: JSON.stringify(rule.channels),
  }

  const { data, error } = await supabase
    .from('alert_rules')
    .upsert(ruleData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/settings/alerts')
  return data
}

// Delete alert rule
export async function deleteAlertRule(ruleId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', ruleId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings/alerts')
}

// Get notifications with pagination
export async function getNotifications(
  options: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ notifications: AlertNotification[]; total: number; unread: number }> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { notifications: [], total: 0, unread: 0 }

  let query = supabase
    .from('alert_notifications')
    .select('id, rule_id, entity_id, entity_type, type, severity, message, description, data, read, read_at, created_at, restaurant_id, title, entity_name', { count: 'exact' })
    .eq('restaurant_id', restaurantId)

  if (options.unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], total: 0, unread: 0 }
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('alert_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('read', false)

  return {
    notifications: (data || []) as AlertNotification[],
    total: count || 0,
    unread: unreadCount || 0,
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alert_notifications')
    .update({ read: true, read_at: new Date() })
    .eq('id', notificationId)

  if (error) throw new Error(error.message)
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return

  const { error } = await supabase
    .from('alert_notifications')
    .update({ read: true, read_at: new Date() })
    .eq('restaurant_id', restaurantId)
    .eq('read', false)

  if (error) throw new Error(error.message)
}

// Delete old notifications
export async function cleanupOldNotifications(days: number = 30): Promise<void> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { error } = await supabase
    .from('alert_notifications')
    .delete()
    .eq('restaurant_id', restaurantId)
    .lt('created_at', cutoffDate.toISOString())

  if (error) throw new Error(error.message)
}

// Check if alert should be triggered based on cooldown
export async function shouldTriggerAlert(
  ruleId: string,
  entityId: string,
  cooldownHours: number
): Promise<boolean> {
  const supabase = await createClient()

  const cooldownDate = new Date()
  cooldownDate.setHours(cooldownDate.getHours() - cooldownHours)

  const { data } = await supabase
    .from('alert_notifications')
    .select('created_at')
    .eq('rule_id', ruleId)
    .eq('entity_id', entityId)
    .gte('created_at', cooldownDate.toISOString())
    .limit(1)

  return !data || data.length === 0
}

// Create notification
export async function createNotification(
  notification: Omit<AlertNotification, 'id' | 'created_at'>
): Promise<AlertNotification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alert_notifications')
    .insert(notification)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Get notification stats
export async function getNotificationStats(): Promise<{
  total: number
  unread: number
  bySeverity: Record<AlertSeverity, number>
  byType: Record<AlertType, number>
}> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  if (!restaurantId) {
    return {
      total: 0,
      unread: 0,
      bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 },
      byType: { PRICE_CHANGE: 0, MARGIN_DROP: 0, WASTE_HIGH: 0, INGREDIENT_LOW_STOCK: 0, SUPPLIER_PRICE_INCREASE: 0, MENU_ITEM_UNPROFITABLE: 0, INVOICE_ANOMALY: 0, PRICE_DISCREPANCY: 0 },
    }
  }

  const { data, error } = await supabase
    .from('alert_notifications')
    .select('severity, type, read')
    .eq('restaurant_id', restaurantId)

  if (error || !data) {
    return {
      total: 0,
      unread: 0,
      bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 },
      byType: {
        PRICE_CHANGE: 0,
        MARGIN_DROP: 0,
        WASTE_HIGH: 0,
        INGREDIENT_LOW_STOCK: 0,
        SUPPLIER_PRICE_INCREASE: 0,
        MENU_ITEM_UNPROFITABLE: 0,
        INVOICE_ANOMALY: 0,
        PRICE_DISCREPANCY: 0,
      },
    }
  }

  const stats = {
    total: data.length,
    unread: data.filter(n => !n.read).length,
    bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 } as Record<AlertSeverity, number>,
    byType: {
      PRICE_CHANGE: 0,
      MARGIN_DROP: 0,
      WASTE_HIGH: 0,
      INGREDIENT_LOW_STOCK: 0,
      SUPPLIER_PRICE_INCREASE: 0,
      MENU_ITEM_UNPROFITABLE: 0,
      INVOICE_ANOMALY: 0,
      PRICE_DISCREPANCY: 0,
    } as Record<AlertType, number>,
  }

  data.forEach(n => {
    stats.bySeverity[n.severity as AlertSeverity]++
    stats.byType[n.type as AlertType]++
  })

  return stats
}

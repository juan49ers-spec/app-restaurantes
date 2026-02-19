'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertNotification, AlertSeverity } from '@/types/alerts'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getNotificationStats } from '@/app/actions/alerts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Loader2,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const SEVERITY_ICONS: Record<AlertSeverity, React.ElementType> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertTriangle,
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: 'text-blue-500 bg-blue-50',
  WARNING: 'text-amber-500 bg-amber-50',
  CRITICAL: 'text-red-500 bg-red-50',
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getNotifications({ limit: 20 })
      setNotifications(result.notifications)
      setUnreadCount(result.unread)
      setTotalCount(result.total)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load notifications when popover opens
  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open, loadNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const stats = await getNotificationStats()
        setUnreadCount(stats.unread)
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (_error) {
      toast.error('Error al marcar como leído')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch (_error) {
      toast.error('Error al marcar como leídas')
    }
  }

  function getEntityLink(notification: AlertNotification): string {
    switch (notification.entity_type) {
      case 'INGREDIENT':
        return '/ingredients'
      case 'RECIPE':
        return `/recipes/${notification.entity_id}/edit`
      case 'SUPPLIER':
        return `/suppliers/${notification.entity_id}`
      case 'INVOICE':
        return `/invoices/${notification.entity_id}`
      case 'MENU':
        return '/menu-engineering'
      default:
        return '#'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificaciones</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todo
              </Button>
            )}
            <Link href="/settings/alerts">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">{totalCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Sin leer
              <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <NotificationList
              notifications={notifications}
              loading={loading}
              onMarkAsRead={handleMarkAsRead}
              getEntityLink={getEntityLink}
            />
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <NotificationList
              notifications={notifications.filter(n => !n.read)}
              loading={loading}
              onMarkAsRead={handleMarkAsRead}
              getEntityLink={getEntityLink}
            />
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t bg-muted/50">
          <Link href="/notifications">
            <Button variant="ghost" className="w-full">
              Ver historial completo
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface NotificationListProps {
  notifications: AlertNotification[]
  loading: boolean
  onMarkAsRead: (id: string) => void
  getEntityLink: (n: AlertNotification) => string
}

function NotificationList({ notifications, loading, onMarkAsRead, getEntityLink }: NotificationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mb-2 opacity-20" />
        <p>No hay notificaciones</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y">
        {notifications.map((notification) => {
          const Icon = SEVERITY_ICONS[notification.severity]

          return (
            <div
              key={notification.id}
              className={cn(
                "flex gap-3 p-4 hover:bg-muted/50 transition-colors",
                !notification.read && "bg-primary/5"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                SEVERITY_COLORS[notification.severity]
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={getEntityLink(notification)}
                    className="flex-1 min-w-0"
                  >
                    <p className={cn(
                      "font-medium text-sm truncate",
                      !notification.read && "text-primary"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.entity_name} • {' '}
                      {formatDistanceToNow(new Date(notification.created_at!), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </Link>

                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => notification.id && onMarkAsRead(notification.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

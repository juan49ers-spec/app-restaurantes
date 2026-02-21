'use client'

import { useState } from 'react'
import { AlertNotification } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/alerts'

interface NotificationHistoryProps {
  notifications: AlertNotification[]
  total: number
}

const SEVERITY_ICONS = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertTriangle,
}

const SEVERITY_COLORS = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function NotificationHistory({ notifications, total }: NotificationHistoryProps) {
  const [filter, setFilter] = useState('')

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(filter.toLowerCase()) ||
    n.message.toLowerCase().includes(filter.toLowerCase()) ||
    n.entity_name.toLowerCase().includes(filter.toLowerCase())
  )

  async function handleMarkAsRead(id: string) {
    try {
      await markNotificationAsRead(id)
      toast.success('Notificación marcada como leída')
    } catch {
      toast.error('Error al marcar como leída')
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead()
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Historial de Notificaciones
              <Badge variant="secondary">{total} total</Badge>
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificaciones..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 w-64"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todo como leído
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Estado</TableHead>
                <TableHead>Alerta</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Bell className="h-12 w-12 mb-2 opacity-20" />
                      <p>No hay notificaciones</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notification) => {
                  const Icon = SEVERITY_ICONS[notification.severity]

                  return (
                    <TableRow
                      key={notification.id}
                      className={cn(!notification.read && "bg-primary/5")}
                    >
                      <TableCell>
                        {!notification.read ? (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted" />
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "p-1.5 rounded",
                            SEVERITY_COLORS[notification.severity]
                          )}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{notification.entity_name}</Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={SEVERITY_COLORS[notification.severity]}>
                          {notification.severity}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {notification.created_at && format(new Date(notification.created_at), 'PPp', { locale: es })}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => notification.id && handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Marcar leído
                            </Button>
                          )}

                          <Link href={getEntityLink(notification)}>
                            <Button variant="ghost" size="sm">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

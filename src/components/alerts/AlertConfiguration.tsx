'use client'

import { useState, useEffect } from 'react'
import { AlertRule, AlertType, AlertSeverity } from '@/types/alerts'
import { getAlertRules, saveAlertRule, deleteAlertRule, initializeDefaultAlertRules } from '@/app/actions/alerts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
// Tabs imports removed
import { Slider } from '@/components/ui/slider'
import {
  Bell,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
  ChefHat,
  FileText,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: React.ElementType; description: string }> = {
  PRICE_CHANGE: {
    label: 'Cambio de Precio',
    icon: TrendingUp,
    description: 'Alerta cuando un ingrediente cambia de precio significativamente'
  },
  MARGIN_DROP: {
    label: 'Caída de Margen',
    icon: DollarSign,
    description: 'Alerta cuando el margen de una receta cae por debajo del objetivo'
  },
  WASTE_HIGH: {
    label: 'Merma Elevada',
    icon: AlertTriangle,
    description: 'Alerta cuando la merma de un ingrediente es muy alta'
  },
  INGREDIENT_LOW_STOCK: {
    label: 'Stock Bajo',
    icon: Package,
    description: 'Alerta cuando el stock de un ingrediente está bajo'
  },
  SUPPLIER_PRICE_INCREASE: {
    label: 'Subida de Precio Proveedor',
    icon: TrendingUp,
    description: 'Alerta cuando un proveedor sube precios'
  },
  MENU_ITEM_UNPROFITABLE: {
    label: 'Plato No Rentable',
    icon: ChefHat,
    description: 'Alerta cuando un plato del menú no es rentable'
  },
  INVOICE_ANOMALY: {
    label: 'Anomalía en Factura',
    icon: FileText,
    description: 'Alerta cuando se detecta algo inusual en una factura'
  },
  PRICE_DISCREPANCY: {
    label: 'Discrepancia de Precio',
    icon: DollarSign,
    description: 'Alerta cuando hay diferencias de precio entre proveedores'
  },
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: 'bg-blue-100 text-blue-800 border-blue-200',
  WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
}

export function AlertConfiguration() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<Partial<AlertRule> | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    setLoading(true)
    try {
      // Initialize defaults if none exist
      await initializeDefaultAlertRules()
      const data = await getAlertRules()
      setRules(data)
    } catch {
      toast.error('Error al cargar reglas de alertas')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!editingRule) return

    try {
      await saveAlertRule(editingRule)
      toast.success('Regla guardada correctamente')
      setEditingRule(null)
      setIsCreating(false)
      loadRules()
    } catch {
      toast.error('Error al guardar la regla')
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) return

    try {
      await deleteAlertRule(ruleId)
      toast.success('Regla eliminada')
      loadRules()
    } catch {
      toast.error('Error al eliminar la regla')
    }
  }

  function startCreate() {
    setIsCreating(true)
    setEditingRule({
      name: '',
      type: 'PRICE_CHANGE',
      enabled: true,
      conditions: { threshold: 10, operator: 'gt' },
      severity: 'WARNING',
      channels: { inApp: true, email: false, push: false },
      cooldown: 24,
    })
  }

  function getActiveRulesByType(type: AlertType) {
    return rules.filter(r => r.type === type && r.enabled).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Configuración de Alertas
          </h2>
          <p className="text-muted-foreground mt-1">
            Personaliza qué alertas quieres recibir y cómo
          </p>
        </div>

        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Alerta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(ALERT_TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          const activeCount = getActiveRulesByType(type as AlertType)

          return (
            <Card key={type} className={cn(
              "transition-colors",
              activeCount > 0 && "border-primary"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={activeCount > 0 ? "default" : "secondary"}>
                    {activeCount} activa{activeCount !== 1 && 's'}
                  </Badge>
                </div>
                <h3 className="font-medium mt-3">{config.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {config.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(isCreating || editingRule) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{isCreating ? 'Nueva Alerta' : 'Editar Alerta'}</CardTitle>
            <CardDescription>
              Configura las condiciones y canales de notificación
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingRule?.name || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="Ej: Alerta de subida de precios"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Alerta</Label>
                <Select
                  value={editingRule?.type}
                  onValueChange={(v) => setEditingRule({ ...editingRule, type: v as AlertType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALERT_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severidad</Label>
              <div className="flex gap-2">
                {(['INFO', 'WARNING', 'CRITICAL'] as AlertSeverity[]).map((sev) => (
                  <Button
                    key={sev}
                    type="button"
                    variant={editingRule?.severity === sev ? 'default' : 'outline'}
                    className={cn(
                      "flex-1",
                      editingRule?.severity === sev && sev === 'CRITICAL' && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => setEditingRule({ ...editingRule, severity: sev })}
                  >
                    {sev === 'INFO' && 'Informativo'}
                    {sev === 'WARNING' && 'Advertencia'}
                    {sev === 'CRITICAL' && 'Crítico'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Umbral (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[editingRule?.conditions?.threshold || 0]}
                    onValueChange={([v]) => setEditingRule({
                      ...editingRule,
                      conditions: {
                        threshold: v,
                        operator: editingRule?.conditions?.operator || 'gt'
                      }
                    })}
                    max={100}
                    step={1}
                  />
                  <span className="w-12 text-right font-mono">
                    {editingRule?.conditions?.threshold}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Operador</Label>
                <Select
                  value={editingRule?.conditions?.operator || 'gt'}
                  onValueChange={(v) => setEditingRule({
                    ...editingRule,
                    conditions: {
                      threshold: editingRule?.conditions?.threshold || 0,
                      operator: v as 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">Mayor que (&gt;)</SelectItem>
                    <SelectItem value="gte">Mayor o igual (&gt;=)</SelectItem>
                    <SelectItem value="lt">Menor que (&lt;)</SelectItem>
                    <SelectItem value="lte">Menor o igual (&lt;=)</SelectItem>
                    <SelectItem value="eq">Igual (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canales de Notificación</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRule?.channels?.inApp ?? true}
                    onCheckedChange={(v) => setEditingRule({
                      ...editingRule,
                      channels: {
                        inApp: v,
                        email: editingRule?.channels?.email ?? false,
                        push: editingRule?.channels?.push ?? false
                      }
                    })}
                  />
                  <Label>En la app</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingRule?.channels?.email ?? false}
                    onCheckedChange={(v) => setEditingRule({
                      ...editingRule,
                      channels: {
                        inApp: editingRule?.channels?.inApp ?? true,
                        email: v,
                        push: editingRule?.channels?.push ?? false
                      }
                    })}
                  />
                  <Label>Email</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cooldown (horas entre alertas similares)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[editingRule?.cooldown || 24]}
                  onValueChange={([v]) => setEditingRule({ ...editingRule, cooldown: v })}
                  max={72}
                  step={1}
                />
                <span className="w-16 text-right font-mono">
                  {editingRule?.cooldown}h
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRule?.enabled}
                  onCheckedChange={(v) => setEditingRule({ ...editingRule, enabled: v })}
                />
                <Label>Alerta activa</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null)
                    setIsCreating(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reglas Activas</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay reglas configuradas. Crea tu primera alerta.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const typeConfig = ALERT_TYPE_CONFIG[rule.type]
                const Icon = typeConfig.icon

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-lg",
                      !rule.enabled && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.name}</span>
                          <Badge className={SEVERITY_COLORS[rule.severity]}>
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeConfig.label} • {rule.conditions.operator} {rule.conditions.threshold}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => {
                          setEditingRule({ ...rule, enabled: !rule.enabled })
                          handleSave()
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRule(rule)}
                      >
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => rule.id && handleDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

// import { useState } from 'react'
import { OperationalAlert, OperationalKPIs, PendingTask } from '@/app/actions/operational'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  ChefHat,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  alerts: OperationalAlert[]
  kpis: OperationalKPIs
  tasks: PendingTask[]
  restaurantName: string
}

export function OperationalDashboardClient({ alerts, kpis, tasks }: Omit<Props, 'restaurantName'>) {
  // const [refreshing, setRefreshing] = useState(false) - Removed unused state

  const highPriorityAlerts = alerts.filter(a => a.severity === 'high')


  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Ingredientes"
          value={kpis.totalIngredients}
          subtitle={`${kpis.ingredientsWithoutPrice} sin precio`}
          icon={Package}
          trend={kpis.ingredientsWithoutPrice > 0 ? 'down' : 'up'}
          color={kpis.ingredientsWithoutPrice > 0 ? 'red' : 'green'}
        />
        <KPICard
          title="Recetas"
          value={kpis.totalRecipes}
          subtitle={`${kpis.recipesBelowTargetMargin} bajo margen`}
          icon={ChefHat}
          trend={kpis.recipesBelowTargetMargin > 0 ? 'down' : 'up'}
          color={kpis.recipesBelowTargetMargin > 0 ? 'yellow' : 'green'}
        />
        <KPICard
          title="Food Cost Medio"
          value={`${kpis.avgFoodCostPercentage.toFixed(1)}%`}
          subtitle="de las recetas"
          icon={TrendingDown}
          trend={kpis.avgFoodCostPercentage > 30 ? 'down' : 'up'}
          color={kpis.avgFoodCostPercentage > 30 ? 'red' : 'green'}
        />
        <KPICard
          title="Merma Media"
          value={`${(kpis.avgWastePercentage * 100).toFixed(1)}%`}
          subtitle="de ingredientes"
          icon={AlertCircle}
          trend={kpis.avgWastePercentage > 0.15 ? 'down' : 'up'}
          color={kpis.avgWastePercentage > 0.15 ? 'yellow' : 'green'}
        />
      </div>

      {/* Alerts & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Alertas Operativas</CardTitle>
            </div>
            {highPriorityAlerts.length > 0 && (
              <Badge variant="destructive">{highPriorityAlerts.length} críticas</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>¡Todo en orden!</AlertTitle>
                <AlertDescription>
                  No hay alertas operativas pendientes.
                </AlertDescription>
              </Alert>
            ) : (
              alerts.slice(0, 5).map(alert => (
                <Alert
                  key={alert.id}
                  variant={alert.severity === 'high' ? 'destructive' : 'default'}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    alert.severity === 'medium' && "border-amber-200 bg-amber-50"
                  )}
                >
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    alert.severity === 'high' ? 'text-red-600' :
                      alert.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                  )} />
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-medium flex items-center gap-2">
                      {alert.title}
                      <Badge variant="outline" className="text-xs">
                        {alert.entityType === 'ingredient' ? 'Ingrediente' : 'Receta'}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      <span className="font-medium">{alert.entityName}</span>: {alert.description}
                    </AlertDescription>
                  </div>
                  <Link
                    href={alert.entityType === 'ingredient' ? '/escandallos' : `/recipes/${alert.entityId}/edit`}
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </Alert>
              ))
            )}
            {alerts.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                ... y {alerts.length - 5} alertas más
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tasks Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle>Tareas Pendientes</CardTitle>
            </div>
            <Badge variant="secondary">{tasks.length} pendientes</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Sin tareas</AlertTitle>
                <AlertDescription>
                  No hay tareas pendientes. ¡Buen trabajo!
                </AlertDescription>
              </Alert>
            ) : (
              tasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge
                        variant={task.priority === 'high' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {task.entityName}: {task.description}
                    </p>
                  </div>
                  <Link href={task.entityType === 'ingredient' ? '/escandallos' : `/recipes/${task.entityId}/edit`}>
                    <Button variant="ghost" size="sm" className="h-8">
                      Resolver
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
            {tasks.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                ... y {tasks.length - 5} tareas más
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton
              href="/escandallos"
              icon={Package}
              label="Ver Ingredientes"
              description="Gestionar stock"
            />
            <QuickActionButton
              href="/escandallos"
              icon={ChefHat}
              label="Ver Recetas"
              description="Revisar escandallos"
            />
            <QuickActionButton
              href="/menu-engineering"
              icon={TrendingUp}
              label="Ingeniería Menú"
              description="Análisis de rentabilidad"
            />
            <QuickActionButton
              href="/purchasing"
              icon={RefreshCw}
              label="Actualizar Precios"
              description="Importar facturas"
            />
          </div>
        </CardContent>
      </Card>

      {/* Health Score */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Estado de Operaciones</h3>
              <p className="text-slate-300 text-sm">
                Basado en {alerts.length} alertas y {tasks.length} tareas pendientes
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">
                {calculateHealthScore(alerts, tasks)}%
              </div>
              <p className="text-sm text-slate-300">Salud Operativa</p>
            </div>
          </div>
          <Progress
            value={calculateHealthScore(alerts, tasks)}
            className="mt-4 bg-slate-700"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Components

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  trend: 'up' | 'down'
  color: 'red' | 'yellow' | 'green'
}) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200'
  }

  const iconColorClasses = {
    red: 'text-red-600',
    yellow: 'text-amber-600',
    green: 'text-green-600'
  }

  return (
    <Card className={cn("border", colorClasses[color])}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              <div className={cn(
                "flex items-center text-xs font-medium mb-1",
                trend === 'up' ? "text-green-600" : "text-red-600",
                // Invert colors for "bad" metrics where up is bad, but for now assuming standard green=up, red=down
                // Actually the parent passes color based on logic, so maybe just use that or standard?
                // Examples pass 'down' when bad (e.g. ingredientsWithoutPrice > 0).
                // Let's stick to standard up/down icons but color based on context if we want, or just generic.
                // But wait, "Trend" usually implies direction.
                // Let's use the icons.
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={cn("p-2 rounded-lg bg-background", iconColorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  description
}: {
  href: string
  icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
      >
        <Icon className="h-6 w-6 text-primary" />
        <div className="text-center">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </div>
      </Button>
    </Link>
  )
}

function calculateHealthScore(alerts: OperationalAlert[], tasks: PendingTask[]): number {
  const highAlerts = alerts.filter(a => a.severity === 'high').length
  const mediumAlerts = alerts.filter(a => a.severity === 'medium').length
  const highTasks = tasks.filter(t => t.priority === 'high').length

  // Base score 100, subtract penalties
  let score = 100
  score -= highAlerts * 15
  score -= mediumAlerts * 5
  score -= highTasks * 10

  return Math.max(0, Math.min(100, score))
}

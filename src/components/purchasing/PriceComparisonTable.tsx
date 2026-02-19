'use client'

import { useState } from 'react'
import { PriceComparison } from '@/app/actions/supplier-mapping'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingDown, TrendingUp, Minus, Search, ArrowRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'

interface PriceComparisonTableProps {
  comparisons: PriceComparison[]
}

export function PriceComparisonTable({ comparisons }: PriceComparisonTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'savings' | 'variance' | 'name'>('savings')

  const filteredComparisons = comparisons
    .filter(comp => 
      comp.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.ingredient_name.localeCompare(b.ingredient_name)
      
      // Calculate potential savings
      const aBest = Math.min(...a.suppliers.map(s => s.price))
      const aWorst = Math.max(...a.suppliers.map(s => s.price))
      const bBest = Math.min(...b.suppliers.map(s => s.price))
      const bWorst = Math.max(...b.suppliers.map(s => s.price))
      
      const aSavings = aWorst - aBest
      const bSavings = bWorst - bBest
      
      return sortBy === 'savings' ? bSavings - aSavings : bSavings - aSavings
    })

  const formatPrice = (price: number) => `€${price.toFixed(2)}`
  const formatVariance = (variance: number) => {
    const sign = variance > 0 ? '+' : ''
    return `${sign}${variance.toFixed(1)}%`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Comparador de Precios
            <Badge variant="secondary">{filteredComparisons.length} productos</Badge>
          </CardTitle>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ingrediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant={sortBy === 'savings' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortBy('savings')}
          >
            Mayor Ahorro
          </Button>
          <Button 
            variant={sortBy === 'variance' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortBy('variance')}
          >
            Mayor Variación
          </Button>
          <Button 
            variant={sortBy === 'name' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortBy('name')}
          >
            Nombre
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredComparisons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay suficientes datos de precios para comparar.
            <br />
            Sube más facturas para ver comparaciones.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredComparisons.map((comp) => {
              const prices = comp.suppliers.map(s => s.price)
              const bestPrice = Math.min(...prices)
              const worstPrice = Math.max(...prices)
              const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
              const savings = worstPrice - bestPrice
              const savingsPct = worstPrice > 0 ? (savings / worstPrice) * 100 : 0

              return (
                <div key={comp.ingredient_id} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{comp.ingredient_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Unidad base: <Badge variant="outline" className="text-xs">{comp.base_unit}</Badge>
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Mejor precio</p>
                          <p className="text-lg font-bold text-green-600">{formatPrice(bestPrice)}</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Ahorro potencial</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatPrice(savings)}
                            <span className="text-sm ml-1">({savingsPct.toFixed(0)}%)</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Variación</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Última compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comp.suppliers
                        .sort((a, b) => a.price - b.price)
                        .map((supplier) => (
                        <TableRow key={supplier.supplier_id}>
                          <TableCell className="font-medium">
                            {supplier.supplier_name}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <span className={`font-mono font-medium ${
                              supplier.is_best_price ? 'text-green-600' : ''
                            }`}>
                              {formatPrice(supplier.price)}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            {supplier.variance_pct > 0 ? (
                              <span className="text-red-600 flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {formatVariance(supplier.variance_pct)}
                              </span>
                            ) : supplier.variance_pct < 0 ? (
                              <span className="text-green-600 flex items-center justify-end gap-1">
                                <TrendingDown className="h-3 w-3" />
                                {formatVariance(supplier.variance_pct)}
                              </span>
                            ) : (
                              <span className="text-gray-500 flex items-center justify-end gap-1">
                                <Minus className="h-3 w-3" />
                                0%
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            {supplier.is_best_price ? (
                              <Badge className="bg-green-600">
                                Mejor Precio
                              </Badge>
                            ) : (
                              <Tooltip content={`€${(supplier.price - bestPrice).toFixed(2)} más caro`}>
                                <Badge variant="outline" className="text-xs">
                                  +{((supplier.price - bestPrice) / bestPrice * 100).toFixed(0)}%
                                </Badge>
                              </Tooltip>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {new Date(supplier.last_updated).toLocaleDateString('es-ES')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

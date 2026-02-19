#!/bin/bash

# ==========================================
# MÓDULO RESULTADOS - EXECUTOR DE MIGRACIÓN
# ==========================================

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} MÓDULO RESULTADOS - MIGRACIÓN SQL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar si hay archivo de configuración
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Archivo .env.local no encontrado${NC}"
    echo "Asegúrate de tener tu archivo .env.local configurado"
    exit 1
fi

# Leer URL de Supabase
SUPERBASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2 | tr -d '"')

if [ -z "$SUPERBASE_URL" ]; then
    echo -e "${YELLOW}⚠️  No se pudo leer NEXT_PUBLIC_SUPABASE_URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase URL detectada: ${SUPERBASE_URL}${NC}"
echo ""

# Mostrar pasos a seguir
echo -e "${BLUE}📋 PASOS PARA EJECUTAR LA MIGRACIÓN:${NC}"
echo ""
echo "1. Ingresa a tu panel de Supabase:"
echo "   - Abre: ${SUPERBASE_URL}/"
echo "   - Click en 'SQL Editor' en el menú lateral"
echo ""
echo "2. Copia TODO el contenido del archivo:"
echo "   - migrations/MIGRACION_COMPLETA_SQL.sql"
echo ""
echo "3. Pega el contenido en el SQL Editor de Supabase"
echo ""
echo "4. Ejecuta el SQL (botón 'Run' o Ctrl+Enter)"
echo ""
echo "5. Verifica que todas las tablas y funciones se crearon"
echo "   - Tablas: operating_expenses, monthly_results"
echo "   - Funciones: calculate_monthly_results, close_month"
echo "   - Índices y RLS policies creados"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ MIGRACIÓN LISTA PARA EJECUTAR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}💡 CONSEJO:${NC}"
echo "Luego de ejecutar la migración, puedes probarla ejecutando:"
echo "  pnpm exec ts-node scripts/test-migration.ts"
echo ""

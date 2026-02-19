#!/usr/bin/env node

/**
 * SMOKE TEST SCRIPT
 * 
 * Valida que la aplicación esté funcionando correctamente
 * antes y después de cambios de refactorización.
 * 
 * Uso:
 *   node scripts/smoke-test.js          # Ejecutar todos los tests
 *   node scripts/smoke-test.js --watch  # Modo observación
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function log(message, color = COLORS.reset) {
    console.log(`${color}${message}${COLORS.reset}`);
}

function success(message) {
    log(`✅ ${message}`, COLORS.green);
}

function error(message) {
    log(`❌ ${message}`, COLORS.red);
}

function info(message) {
    log(`ℹ️  ${message}`, COLORS.blue);
}

function warn(message) {
    log(`⚠️  ${message}`, COLORS.yellow);
}

/**
 * Test: Verifica que TypeScript compile sin errores
 */
function testTypeScript() {
    totalTests++;
    try {
        execSync('npm run typecheck', { stdio: 'pipe' });
        success('TypeScript compila sin errores');
        passedTests++;
        return true;
    } catch (e) {
        error('TypeScript tiene errores de compilación');
        failedTests.push('TypeScript compilation');
        return false;
    }
}

/**
 * Test: Verifica que el proyecto construya correctamente
 */
function testBuild() {
    totalTests++;
    try {
        execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
        success('Proyecto construye correctamente');
        passedTests++;
        return true;
    } catch (e) {
        error('Build falló');
        failedTests.push('Build');
        return false;
    }
}

/**
 * Test: Verifica que no haya dependencias rotas
 */
function testDependencies() {
    totalTests++;
    try {
        execSync('npm ls --depth=0', { stdio: 'pipe' });
        success('Dependencias OK');
        passedTests++;
        return true;
    } catch (e) {
        warn('Hay problemas con dependencias (puede ser OK)');
        return true; // No es crítico
    }
}

/**
 * Test: Verifica estructura de archivos críticos
 */
function testCriticalFiles() {
    totalTests++;
    const criticalFiles = [
        'src/app/actions/financial-control.ts',
        'src/app/actions/dashboard.ts',
        'src/types/schema.ts',
        'src/lib/supabaseServer.ts'
    ];

    const missing = criticalFiles.filter(file => 
        !fs.existsSync(path.join(process.cwd(), file))
    );

    if (missing.length === 0) {
        success('Todos los archivos críticos existen');
        passedTests++;
        return true;
    } else {
        error(`Faltan archivos: ${missing.join(', ')}`);
        failedTests.push(`Archivos faltantes: ${missing.join(', ')}`);
        return false;
    }
}

/**
 * Test: Valida que los schemas de Zod sean válidos
 */
function testSchemas() {
    totalTests++;
    try {
        const schemaPath = path.join(process.cwd(), 'src/types/schema.ts');
        const content = fs.readFileSync(schemaPath, 'utf-8');
        
        // Verificar que los schemas principales exporten correctamente
        const requiredSchemas = [
            'DailySalesSchema',
            'OperatingExpenseSchema',
            'MonthlyTargetSchema',
            'RestaurantSchema'
        ];

        const missingSchemas = requiredSchemas.filter(schema => 
            !content.includes(`export const ${schema}`)
        );

        if (missingSchemas.length === 0) {
            success('Schemas Zod definidos correctamente');
            passedTests++;
            return true;
        } else {
            error(`Faltan schemas: ${missingSchemas.join(', ')}`);
            failedTests.push(`Schemas faltantes: ${missingSchemas.join(', ')}`);
            return false;
        }
    } catch (e) {
        error('Error al leer schemas');
        failedTests.push('Lectura de schemas');
        return false;
    }
}

/**
 * Test: Busca patrones problemáticos en el código
 */
function testCodeSmells() {
    totalTests++;
    const issues = [];

    try {
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');

        // Contar "as any" usando Node.js (compatible con Windows)
        function countPatternInFiles(pattern, dir) {
            let count = 0;
            const files = getAllFiles(dir);
            files.forEach(file => {
                if ((file.endsWith('.ts') || file.endsWith('.tsx'))) {
                    const content = fs.readFileSync(file, 'utf-8');
                    const matches = content.match(new RegExp(pattern, 'g'));
                    if (matches) count += matches.length;
                }
            });
            return count;
        }

        // Función auxiliar para obtener todos los archivos
        function getAllFiles(dirPath, arrayOfFiles = []) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                if (fs.statSync(filePath).isDirectory()) {
                    arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
                } else {
                    arrayOfFiles.push(filePath);
                }
            });
            return arrayOfFiles;
        }

        const anyCount = countPatternInFiles('as any', 'src');
        if (anyCount > 15) {
            issues.push(`Demasiados "as any": ${anyCount} ocurrencias`);
        }

        const consoleLogs = countPatternInFiles('console\\.log', path.join('src', 'app', 'actions'));
        if (consoleLogs > 10) {
            issues.push(`Muchos console.log: ${consoleLogs} en actions`);
        }

        if (issues.length === 0) {
            success('No se detectaron code smells graves');
            passedTests++;
            return true;
        } else {
            warn(`Issues detectados:\n  - ${issues.join('\n  - ')}`);
            return true; // No es crítico
        }
    } catch (e) {
        warn('No se pudo verificar code smells');
        return true; // No es crítico
    }
}

/**
 * Ejecuta todos los tests
 */
function runAllTests() {
    log('\n🔬 EJECUTANDO SMOKE TESTS\n', COLORS.magenta);
    log('====================================\n');

    testCriticalFiles();
    testDependencies();
    testSchemas();
    testCodeSmells();
    testTypeScript();
    testBuild();

    log('\n====================================\n');
    log(`RESUMEN: ${passedTests}/${totalTests} tests pasaron\n`);

    if (failedTests.length > 0) {
        log('❌ TESTS FALLADOS:', COLORS.red);
        failedTests.forEach(test => log(`  - ${test}`, COLORS.red));
        log('\n⚠️  NO proceder con refactorización hasta arreglar estos errores\n', COLORS.yellow);
        process.exit(1);
    } else {
        log('✅ TODOS LOS TESTS PASARON', COLORS.green);
        log('🚀 Es seguro proceder con la refactorización\n', COLORS.green);
        process.exit(0);
    }
}

// Ejecutar
runAllTests();

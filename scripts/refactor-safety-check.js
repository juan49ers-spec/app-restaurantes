#!/usr/bin/env node

/**
 * REFACTOR SAFETY CHECK
 * 
 * Compara resultados antes/después de refactorizar
 * para asegurar que el comportamiento es idéntico.
 * 
 * Uso:
 *   1. Añadir este código a tu función
 *   2. Ejecutar la función con datos de prueba
 *   3. Comparar resultados
 */

const fs = require('fs');
const path = require('path');

/**
 * Guarda el resultado de una función antes de refactorizar
 */
function captureBeforeSnapshot(functionName, inputData, result) {
    const snapshotPath = path.join(__dirname, '../.refactor-snapshots');
    
    if (!fs.existsSync(snapshotPath)) {
        fs.mkdirSync(snapshotPath, { recursive: true });
    }

    const snapshot = {
        timestamp: new Date().toISOString(),
        functionName,
        inputData,
        result: JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))
    };

    fs.writeFileSync(
        path.join(snapshotPath, `${functionName}.before.json`),
        JSON.stringify(snapshot, null, 2)
    );
}

/**
 * Compara el resultado actual con el snapshot anterior
 */
function compareWithSnapshot(functionName, newResult) {
    const snapshotPath = path.join(__dirname, '../.refactor-sn apshots');
    const beforePath = path.join(snapshotPath, `${functionName}.before.json`);

    if (!fs.existsSync(beforePath)) {
        console.log(`⚠️  No hay snapshot previo para ${functionName}. Creando uno nuevo.`);
        return null;
    }

    const before = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
    const newResultSerializable = JSON.parse(JSON.stringify(newResult, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    const beforeStr = JSON.stringify(before.result);
    const afterStr = JSON.stringify(newResultSerializable);

    if (beforeStr === afterStr) {
        console.log(`✅ ${functionName}: Resultados idénticos`);
        return true;
    } else {
        console.log(`❌ ${functionName}: Resultados DIFERENTES`);
        console.log('\nDiferencias detectadas:');
        
        // Mostrar diferencias de forma útil
        const diffs = findDifferences(before.result, newResultSerializable);
        diffs.forEach(diff => console.log(`  - ${diff}`));
        
        return false;
    }
}

/**
 * Encuentra diferencias entre dos objetos
 */
function findDifferences(obj1, obj2, path = '') {
    const diffs = [];

    if (obj1 === obj2) return diffs;
    if (typeof obj1 !== typeof obj2) {
        diffs.push(`${path}: tipo diferente (${typeof obj1} vs ${typeof obj2})`);
        return diffs;
    }
    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
        if (obj1 !== obj2) {
            diffs.push(`${path}: valor diferente (${obj1} vs ${obj2})`);
        }
        return diffs;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj1)) {
            diffs.push(`${newPath}: clave faltante en objeto 1`);
        } else if (!(key in obj2)) {
            diffs.push(`${newPath}: clave faltante en objeto 2`);
        } else {
            diffs.push(...findDifferences(obj1[key], obj2[key], newPath));
        }
    }

    return diffs;
}

/**
 * EJEMPLO DE USO en tu código:
 * 
 * // ANTES de refactorizar:
 * function myFunction(input) {
 *     const result = calculateSomething(input);
 *     
 *     // Capturar snapshot (descomentar para guardar)
 *     // captureBeforeSnapshot('myFunction', input, result);
 *     
 *     return result;
 * }
 * 
 * // DESPUÉS de refactorizar:
 * function myFunction(input) {
 *     const newResult = calculateSomethingNewWay(input);
 *     
 *     // Verificar que es igual (descomentar para comparar)
 *     // const matches = compareWithSnapshot('myFunction', newResult);
 *     // if (matches === false) {
 *     //     throw new Error('Refactorización cambió el comportamiento');
 *     // }
 *     
 *     return newResult;
 * }
 */

module.exports = { captureBeforeSnapshot, compareWithSnapshot, findDifferences };

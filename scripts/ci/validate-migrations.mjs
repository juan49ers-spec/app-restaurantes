import { readdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
const timestampPattern = /^(\d{14})_.+\.sql$/i

async function listSqlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return listSqlFiles(fullPath)
      }
      return entry.isFile() && entry.name.endsWith('.sql') ? [fullPath] : []
    }),
  )

  return files.flat()
}

const migrationFiles = await listSqlFiles(migrationsDir)
const timestampOwners = new Map()
const failures = []
const changedSqlFiles = new Set(getChangedMigrationFiles())

function getChangedMigrationFiles() {
  const diffBase = process.env.MIGRATION_BASE_REF ?? 'origin/main'

  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=AM', `${diffBase}...HEAD`, '--', 'supabase/migrations/*.sql'],
      { encoding: 'utf8' },
    )

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((filePath) => path.resolve(process.cwd(), filePath))
  } catch {
    return []
  }
}

for (const filePath of migrationFiles) {
  const fileName = path.basename(filePath)
  const sql = await readFile(filePath, 'utf8')
  const trimmedSql = sql.trim()

  if (changedSqlFiles.has(path.resolve(filePath)) && !trimmedSql) {
    failures.push(`${fileName}: migration file is empty`)
  }

  if (trimmedSql.includes('\0')) {
    failures.push(`${fileName}: migration file contains a null byte`)
  }

  const match = timestampPattern.exec(fileName)
  if (!match) {
    continue
  }

  const timestamp = match[1]
  const existingOwner = timestampOwners.get(timestamp)
  if (existingOwner) {
    failures.push(
      `${fileName}: duplicate migration timestamp ${timestamp} already used by ${existingOwner}`,
    )
    continue
  }

  timestampOwners.set(timestamp, fileName)
}

if (failures.length > 0) {
  console.error('Migration validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Validated ${migrationFiles.length} SQL migration files.`)

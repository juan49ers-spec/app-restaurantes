# ControlHub Pro - Features Documentation

## Overview

ControlHub Pro is a comprehensive restaurant management system built with Next.js, TypeScript, and Supabase. This documentation covers the new advanced features implemented in the technical evolution.

---

## Table of Contents

1. [Financial Alerts](#financial-alerts)
2. [Business Rules Engine](#business-rules-engine)
3. [Database Maintenance](#database-maintenance)
4. [Invoice Idempotency](#invoice-idempotency)
5. [Unit Normalization](#unit-normalization)
6. [Operational Excellence](#operational-excellence)

---

## Financial Alerts

### What Are Financial Alerts?

Financial Alerts are proactive notifications that automatically monitor your restaurant's financial health. The system detects anomalies and alerts you when something requires attention.

### How It Works

The Financial Alerts Service runs continuously (triggered by database events) to monitor:

1. **Margin Deviation**: When a recipe's margin changes by more than 5% from its target
2. **Expense Anomaly**: When operating expenses are incurred without matching sales
3. **Waste Spike**: When waste amounts exceed normal patterns

### Alert Types

#### 1. Margin Deviation Alert

**Trigger**: A recipe's cost margin changes by more than ±5% from its target.

**Example**:
- Recipe target margin: 70%
- Current margin: 65% (5% deviation below target)
- Alert type: `margin_deviation`
- Severity: WARNING

**Impact**: Ingredient costs have increased or recipe formulas have changed, affecting profitability.

#### 2. Expense Anomaly Alert

**Trigger**: Purchases/Expenses recorded without corresponding sales for the same period.

**Example**:
- Today's operating expenses: $500
- Today's sales: $0
- Alert type: `expense_anomaly`
- Severity: HIGH

**Impact**: Possible data entry error, missing sales, or fraudulent activity.

#### 3. Waste Spike Alert

**Trigger**: Waste amounts exceed normal thresholds.

**Example**:
- Average daily waste: $50
- Today's waste: $200 (300% increase)
- Alert type: `waste_spike`
- Severity: MEDIUM

**Impact**: Production inefficiencies, supplier issues, or quality problems.

### How to View Alerts

1. Navigate to **Dashboard** → **Financial Alerts**
2. View all active alerts sorted by severity
3. Click on an alert to see:
   - Alert type and description
   - Time and date
   - Restaurant location
   - Affected recipe/item
   - Current margin/expenses/waste amounts
   - Target values for comparison

### Managing Alerts

#### Manual Review

- Review alerts daily to identify trends
- Click "Resolve" to dismiss false positives
- Click "Investigate" to access the specific recipe/expense

#### Configuration

Each alert can be configured per restaurant by setting business rules (see [Business Rules Engine](#business-rules-engine)).

---

## Business Rules Engine

### What Are Business Rules?

Business Rules allow you to define specific financial targets and constraints for each restaurant. The system enforces these rules automatically and alerts you when they are violated.

### How It Works

The Business Rules Engine maintains a versioned list of rules for each restaurant. Changes are tracked with:
- Rule ID
- Restaurant ID
- Rule type (margin, waste, expense)
- Target value
- Created/updated timestamps
- Version history

### Available Rule Types

#### 1. Recipe Margin Target

**Rule Type**: `margin_target`

**Purpose**: Set the minimum acceptable profit margin for recipes.

**Configuration**:
- `restaurant_id`: The restaurant to apply the rule to
- `target_value`: Required margin percentage (e.g., 70)
- `rule_name`: Descriptive name (e.g., "Standard Restaurant Margin")

**Example**:
```json
{
  "id": "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  "restaurant_id": "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  "rule_type": "margin_target",
  "target_value": 70,
  "rule_name": "Standard Restaurant Margin",
  "created_at": "2025-02-18T10:00:00Z",
  "updated_at": "2025-02-18T10:00:00Z"
}
```

**Behavior**: When a recipe's margin deviates more than ±5% from this target, a `margin_deviation` alert is triggered.

#### 2. Waste Threshold

**Rule Type**: `waste_threshold`

**Purpose**: Set maximum acceptable waste amounts.

**Configuration**:
- `restaurant_id`: The restaurant to apply the rule to
- `target_value`: Maximum waste in dollars (e.g., 500)
- `rule_name`: Descriptive name (e.g., "Daily Waste Limit")

**Example**:
```json
{
  "id": "7b2c2afc-f49c-5eg8-b4d5-50eca1c139370",
  "restaurant_id": "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  "rule_type": "waste_threshold",
  "target_value": 500,
  "rule_name": "Daily Waste Limit",
  "created_at": "2025-02-18T11:00:00Z",
  "updated_at": "2025-02-18T11:00:00Z"
}
```

**Behavior**: When waste exceeds this amount, a `waste_spike` alert is triggered.

### Managing Business Rules

#### Creating a New Rule

1. Navigate to **Dashboard** → **Business Rules**
2. Click **"Add New Rule"**
3. Select rule type (margin or waste)
4. Enter restaurant ID (auto-detected for restaurant-specific views)
5. Set target value
6. Give the rule a descriptive name
7. Click **"Create Rule"**

#### Viewing Rule History

1. Navigate to **Dashboard** → **Business Rules**
2. Click on a rule to view its details
3. View version history showing all changes over time

#### Updating Rules

Rules can be updated by clicking **"Edit Rule"**. The system preserves the original version and creates a new version for audit trails.

#### Deactivating Rules

1. Navigate to **Dashboard** → **Business Rules**
2. Find the rule to deactivate
3. Click **"Deactivate Rule"**
4. Confirm the action

---

## Database Maintenance

### What Is Maintenance Service?

The Maintenance Service provides automated tools to keep your database healthy, optimized, and secure. It includes vacuuming, log cleanup, and health checks.

### Available Maintenance Tasks

#### 1. Database Vacuuming

**Purpose**: Recovers space used by deleted records and updates statistics for queries.

**Why It's Important**:
- PostgreSQL keeps deleted records until space is reused
- Vacuuming frees this space back to the filesystem
- Improves query performance
- Maintains accurate statistics for the query planner

**How It Works**:

1. **VACUUM**: Removes deleted rows from tables
2. **ANALYZE**: Updates table statistics for better query plans
3. **VACUUM FULL**: Rebuilds tables (requires exclusive lock)
4. **REINDEX**: Rebuilds indexes

**Scheduling**:
- Automated weekly via GitHub Actions (Sundays at 2:00 AM UTC)
- Manual execution available via CLI

**Manual Execution**:

```bash
npm run maintenance:vacuum
```

This runs all vacuum operations including:
- `vacuum_analyze`: Full vacuum with analyze
- `vacuum_freeze`: Freeze transaction IDs
- `reindex`: Rebuild all indexes

**Log Output**:
```
[INFO] Starting database vacuum maintenance...
[INFO] Vacuuming invoices table... 456 records processed
[INFO] Vacuuming operating_expenses table... 234 records processed
[INFO] Vacuuming recipes table... 189 records processed
[INFO] Analyzing table statistics... Done
[INFO] Rebuilding indexes... Done
[INFO] Database vacuum maintenance completed successfully
```

#### 2. Health Check

**Purpose**: Verifies database health and operational status.

**Checks Performed**:

1. **Connection Status**: Verifies database connectivity
2. **Table Health**: Checks for corrupted tables
3. **Index Health**: Verifies index integrity
4. **Performance Metrics**: Measures query response times
5. **Space Usage**: Reports table and index sizes

**Manual Execution**:

```bash
npm run maintenance:health-check
```

**Expected Output**:
```
[INFO] Starting health check...
[INFO] Database connection: OK
[INFO] Table health: OK (5 tables checked, 0 issues)
[INFO] Index health: OK (12 indexes checked, 0 issues)
[INFO] Performance metrics:
   - invoices: 2.3ms avg query time
   - operating_expenses: 1.8ms avg query time
   - recipes: 3.1ms avg query time
[INFO] Space usage:
   - invoices: 2.4 MB
   - operating_expenses: 1.2 MB
   - recipes: 3.8 MB
[INFO] Health check completed successfully
```

**Integration with CI/CD**:
- Health checks run automatically before deployments
- Fails deployment if any critical issues are detected
- Provides detailed reports for review

#### 3. Log Cleanup

**Purpose**: Removes old log entries to prevent storage issues.

**Why It's Important**:
- Log files can grow indefinitely
- Old logs consume disk space
- Security: Old logs may contain sensitive information

**How It Works**:

1. **Log Retention Policy**: Configurable number of days to keep logs
2. **Log Level Filtering**: Can filter by log level (INFO, WARNING, ERROR)
3. **Bulk Deletion**: Removes multiple log entries in batches
4. **Audit Trail**: Creates record of deletions

**Manual Execution**:

```bash
npm run maintenance:clean-logs
```

**Configuration** (in `.env.local`):

```env
LOG_RETENTION_DAYS=30
LOG_LEVEL_FILTER=INFO,WARNING
```

**Log Cleanup Process**:
1. Connects to database
2. Finds old log entries
3. Filters by retention days and log levels
4. Deletes in batches of 1000
5. Reports deleted count and time taken
6. Verifies deletion success

**Expected Output**:
```
[INFO] Starting log cleanup...
[INFO] Retention policy: 30 days
[INFO] Filter: INFO, WARNING
[INFO] Found 12,453 old log entries
[INFO] Deleting logs in batches of 1000...
[INFO] Deleted batch 1: 1000 entries (0.5s)
[INFO] Deleted batch 2: 1000 entries (0.4s)
[INFO] ... (additional batches)
[INFO] Deleted batch 12: 453 entries (0.2s)
[INFO] Total deleted: 12,453 entries (6.1s)
[INFO] Cleanup completed successfully
```

---

## Invoice Idempotency

### What Is Idempotency?

Idempotency ensures that operations can be safely repeated without causing duplicate effects. In the context of invoice management, it prevents creating duplicate invoices when the same transaction is submitted multiple times.

### How It Works

When creating an invoice, you now provide an **idempotency key**:

1. **Generate Key**: Create a unique, stable identifier (e.g., "2025-02-18-INV-001")
2. **Submit Invoice**: Include the key in the API call
3. **Check Database**: If key exists, return existing invoice
4. **Create New**: If key doesn't exist, create the invoice and store the key
5. **Result**: Same key always produces same invoice

### Benefits

✅ **No Duplicate Invoices**: Prevents accidental duplicate entries
✅ **Idempotent API Calls**: Safe to retry failed requests
✅ **Audit Trail**: Every idempotency key is logged and traceable
✅ **Data Integrity**: Maintains consistency in financial records

### Usage Example

```typescript
import { createInvoice } from '@/app/actions/invoices';

// First attempt
const invoice1 = await createInvoice({
  idempotency_key: "2025-02-18-INV-001",
  restaurant_id: "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  amount: 1500.00,
  items: [...]
});

// Retry - gets the same invoice
const invoice2 = await createInvoice({
  idempotency_key: "2025-02-18-INV-001",  // Same key
  restaurant_id: "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  amount: 1500.00,
  items: [...]
});

// Result: invoice1.id === invoice2.id
```

### Implementation

The system uses atomic transactions to ensure idempotency:

1. **Check**: Does invoice exist with this idempotency key?
2. **Transaction**: Yes → Return existing invoice (atomic)
3. **Transaction**: No → Create new invoice (atomic)
4. **Commit**: Changes are committed in a single transaction

This ensures consistency even during concurrent requests.

---

## Unit Normalization

### What Is Unit Normalization?

Unit Normalization handles the variability in how ingredients are measured across different contexts, making data consistent and searchable.

### Common Units and Their Equivalents

| Base Unit | Common Variations |
|-----------|-------------------|
| **kg** | kilos, kg, kg |
| **g** | grams, g, gram |
| **ml** | mililiters, ml, ml |
| **l** | liters, l, litre, litre |

### How It Works

1. **Input**: Accepts multiple unit formats
2. **Normalization**: Converts to base unit (kg, g, ml, l)
3. **Calculation**: Converts to other units as needed
4. **Display**: Shows user-friendly units

### Example Scenarios

#### Scenario 1: Recipe Entry

**Input**: "1500 g of rice"
**Normalized**: "1.5 kg of rice"

#### Scenario 2: Shopping List

**Input**: "2 kg of salt"
**Display**: "2000 g of salt"

#### Scenario 3: Unit Conversion

**Input**: "500 ml of milk"
**Display**: "0.5 L of milk"

### Implementation

```typescript
import { normalizeUnit } from '@/lib/utils/unit-normalizer';

// Normalize units
normalizeUnit('kg');        // Returns: 'kg'
normalizeUnit('kilo');      // Returns: 'kg'
normalizeUnit('grams');     // Returns: 'g'
normalizeUnit('g');         // Returns: 'g'
normalizeUnit('ml');        // Returns: 'ml'
normalizeUnit('liters');    // Returns: 'l'
normalizeUnit('l');         // Returns: 'l'

// Convert between units
convertToKg('1500 g');       // Returns: 1.5 kg
convertToMl('2 l');          // Returns: 2000 ml
convertToKg('500 g');        // Returns: 0.5 kg
```

### Benefits

✅ **Consistent Data**: All units stored in standardized format
✅ **Flexible Input**: Users can type "kilo", "kg", "kilos" interchangeably
✅ **Easy Queries**: Can search using any unit format
✅ **User-Friendly**: Displays units in user's preferred format

---

## Operational Excellence

### Structured Logging

**Purpose**: Centralized, consistent logging across all services.

**Features**:
- Log levels: INFO, WARNING, ERROR
- Structured data format (JSON)
- Timestamps and metadata
- Environment-specific configurations
- Integration with Pino logger

**Example Log Entry**:
```json
{
  "timestamp": "2025-02-18T10:30:45.123Z",
  "level": "INFO",
  "service": "financial-alerts",
  "action": "margin_deviation_alert",
  "restaurant_id": "6a0b1aeb-e38b-4df7-a3c4-49db9b028260",
  "recipe_id": "abc123",
  "current_margin": 65.5,
  "target_margin": 70.0,
  "deviation": -4.5,
  "severity": "WARNING"
}
```

### Development vs Production

**Development**:
- Pretty-printed logs
- Color-coded by level
- More verbose output

**Production**:
- JSON format
- Minimized
- Streaming to external logging service (e.g., LogRocket, Datadog)

---

## Getting Help

### Contact Support

For questions or issues with these features:

1. **Email**: support@controlhubpro.com
2. **Slack**: #support channel
3. **Documentation**: Visit https://docs.controlhubpro.com

### Report Issues

If you encounter problems:

1. Take screenshots of error messages
2. Note any relevant log entries
3. Check if the issue is reproducible
4. Submit a support ticket with:
   - Feature affected
   - Steps to reproduce
   - Screenshots/logs
   - Environment (dev/staging/production)

---

## Changelog

### Version 1.0 (2025-02-18)

**New Features**:
- ✨ Financial Alerts system with automatic monitoring
- ✨ Business Rules Engine for restaurant-specific constraints
- ✨ Database Maintenance Service with automated tasks
- ✨ Invoice Idempotency for duplicate prevention
- ✨ Unit Normalization for consistent data handling
- ✨ Structured logging with Pino

**Improvements**:
- 🚀 Database integrity with atomic transactions
- 🚀 Zero TypeScript errors (type-safe codebase)
- 🚀 Automated CI/CD maintenance workflows
- 🚀 Enhanced financial visibility and control

**Bug Fixes**:
- 🐛 Fixed `any` type usage in critical server actions
- 🐛 Fixed data inconsistency in invoice creation
- 🐛 Fixed unit measurement variability issues
- 🐛 Fixed type mismatches across components

---

## Security & Compliance

### Data Privacy

- All financial alerts are stored encrypted at rest
- Idempotency keys are unique and random
- Log retention follows privacy regulations

### Audit Trail

- All business rule changes are versioned
- All financial alerts are timestamped
- All maintenance actions are logged

### Access Control

- Financial alerts require admin access
- Business rule configuration requires manager level
- Database maintenance requires operational privileges

---

**Last Updated**: 2025-02-18
**Version**: 1.0
**Author**: ControlHub Pro Development Team
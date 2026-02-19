-- Migration: Add employee contract and salary fields
-- Date: 2025-02-18
-- Description: Adds hourly_rate, monthly_base_salary, contract_type, contract_hours_weekly, and color_code to employees table

-- Add hourly_rate column (cost per hour for the company)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0.00;

-- Add monthly_base_salary column (base monthly salary)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS monthly_base_salary NUMERIC(12, 2);

-- Add contract_type column (type of employment contract)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'INDEFINIDO'
CHECK (contract_type IN ('INDEFINIDO', 'TEMPORAL', 'PRACTICAS', 'AUTONOMO', 'OTRO'));

-- Add contract_hours_weekly column (weekly contract hours)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS contract_hours_weekly INTEGER DEFAULT 40;

-- Add color_code column (for UI/display purposes)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS color_code VARCHAR(7) DEFAULT '#3b82f6';

-- Add comments for documentation
COMMENT ON COLUMN employees.hourly_rate IS 'Hourly cost rate for the employee in EUR';
COMMENT ON COLUMN employees.monthly_base_salary IS 'Monthly base salary in EUR';
COMMENT ON COLUMN employees.contract_type IS 'Type of employment contract: INDEFINIDO, TEMPORAL, PRACTICAS, AUTONOMO, OTRO';
COMMENT ON COLUMN employees.contract_hours_weekly IS 'Number of hours per week in the contract';
COMMENT ON COLUMN employees.color_code IS 'Color code for UI display (hex format)';

-- Create index on contract_type for filtering
CREATE INDEX IF NOT EXISTS idx_employees_contract_type ON employees(contract_type);

-- Create index on is_active for filtering active employees
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Add idempotency_key to invoices and recipes to prevent duplicate submissions
-- This is especially useful for OCR or slow server actions where the user might click twice.
-- 1. Invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency_key ON public.invoices(idempotency_key);
-- 2. Recipes
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_recipes_idempotency_key ON public.recipes(idempotency_key);
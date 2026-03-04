export interface BillingModule {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    is_base: boolean;
    features: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdateModuleParams {
    id: string;
    name?: string;
    description?: string;
    price_monthly?: number;
    price_yearly?: number;
    features?: string[];
    is_active?: boolean;
}

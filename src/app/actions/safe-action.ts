import { z } from 'zod';
import { getUserRestaurant } from './utils';

export type ActionResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
};



/**
 * Executes a server action with safety checks:
 * 1. Validates authentication and retrieves restaurant_id
 * 2. Validates input data against Zod schema
 * 3. Handles errors gracefully
 */
export async function executeSafeAction<TInput, TOutput>(
    schema: z.Schema<TInput>,
    rawData: unknown,
    handler: (validatedData: TInput, restaurantId: string) => Promise<TOutput>
): Promise<ActionResponse<TOutput>> {
    try {
        // 1. Authentication & Context
        const restaurantId = await getUserRestaurant();
        if (!restaurantId) {
            return { success: false, error: 'No restaurant assigned to this user' };
        }

        // 2. Validation
        const result = schema.safeParse(rawData);
        if (!result.success) {
            const errorMessage = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Error: ${errorMessage}` };
        }

        // 3. Execution
        const data = await handler(result.data, restaurantId);

        return { success: true, data };

    } catch (error: unknown) {
        const isAccessDenied = error instanceof Error && error.message.includes('Access denied')
        const clientMessage = isAccessDenied
            ? 'No tienes permiso para esta operación'
            : 'Ha ocurrido un error inesperado'

        return { success: false, error: clientMessage };
    }
}

/**
 * Factory to create a server action with safety checks baked in.
 */
export function safeAction<TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (validatedData: TInput, ctx: { restaurant_id: string }) => Promise<TOutput>
) {
    return async (rawData: unknown): Promise<ActionResponse<TOutput>> => {
        return executeSafeAction(schema, rawData, (data, restaurantId) => handler(data, { restaurant_id: restaurantId }))
    }
}

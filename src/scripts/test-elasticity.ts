
import { MenuIntelligence } from "../components/menu-engineering/menu-intelligence";
// Mock Interface to avoid importing React Context
interface SimulatedMenuItem {
    id: string
    recipe_id: string
    name: string
    quantity_sold: number
    price_per_unit: number
    cost_per_unit: number
    price: number
    cost: number
    category: string
    contribution_margin?: number
    total_sales?: number
    total_cost?: number
    total_profit?: number
    popularity_pct?: number
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
}

// Mock Item Factory
const createItem = (price: number, cost: number, category: string): SimulatedMenuItem => ({
    id: "test-item",
    recipe_id: "r1",
    name: "Test Item",
    quantity_sold: 100, // Base volume
    price_per_unit: price,
    cost_per_unit: cost,
    price,
    cost,
    category,
    contribution_margin: price - cost,
    total_sales: price * 100,
    total_cost: cost * 100,
    total_profit: (price - cost) * 100,
    popularity_pct: 10,
    classification: 'STAR'
});

const runTest = (name: string, item: SimulatedMenuItem, newPrice: number, avgCatPrice: number = 0) => {
    console.log(`\n--- Test: ${name} ---`);
    console.log(`Current: €${item.price} -> New: €${newPrice}`);
    const result = MenuIntelligence.simulatePriceChange(item, newPrice, avgCatPrice);

    const volChange = ((result.newVolume - item.quantity_sold) / item.quantity_sold) * 100;
    console.log(`Volume Change: ${volChange.toFixed(2)}%`);
    console.log(`New Volume: ${result.newVolume.toFixed(2)}`);
    console.log(`Profit Change: €${result.profitChange.toFixed(2)}`);
    return result;
}

// 1. Basic Elasticity (No barrier)
runTest("Basic Elasticity (Low)", createItem(10, 3, "MAIN"), 11); // +10% price

// 2. Psychological Barrier (9.90 -> 10.50)
runTest("Psych Barrier (9.90 -> 10.50)", createItem(9.90, 3, "MAIN"), 10.50);

// 3. Category Sensitivity (Drink vs Main)
runTest("Drink Sensitivity", createItem(10, 3, "DRINK"), 11);
runTest("Main Sensitivity", createItem(10, 3, "MAIN"), 11);

// 4. Anchor Effect
runTest("Anchor Effect (Way above avg)", createItem(20, 5, "MAIN"), 35, 20); // Avg 20, New 35

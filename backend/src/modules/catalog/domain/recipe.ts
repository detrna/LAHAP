export interface RecipeLineInput {
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

export function isSameRecipe(current: readonly RecipeLineInput[], next: readonly RecipeLineInput[]): boolean {
    if (current.length !== next.length) return false;
    const quantities = new Map(current.map(line => [line.ingredientId, line.quantityPerPortion]));
    return next.every(line => quantities.get(line.ingredientId) === line.quantityPerPortion);
}

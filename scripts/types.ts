export enum PriceFunction {
    LINEAR,
    EXP,
}

export type ConfigurationGroup = {
    name: string,
    symbol: string,
    openSeaMetadata: string,
    legacyTilesContract: string,
    projectId: number | string,
    basePrice: string,
    priceCap: string,
    multiplier: number | string,
    tierSize: number | string,
    jbxDirectory: string;
    stringHelpersLibrary: string,
    tileContentProvider: string,
    gatewayAnimationUrl: string,
    gatewayPreviewUrl: string,
    priceResolver: string,
    priceResolverType: 'SupplyPriceResolver' | 'LegacyOwnershipPriceResolver' | 'MerkleRootPriceResolver',
    token: string,
    royalty: number,
    manager: string,
    minters: string[],
    gift: string[]
}

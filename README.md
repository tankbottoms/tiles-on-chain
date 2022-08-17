# Infinite Tiles v2

## About

Inspired by both [Neoplastics](https://neolastics.com/) and Infinite Tiles v1 algorithm, this repo reversed-engineered the [TilesDAO's](https://tiles.art/#/) minified api-server at [Tiles-API](https://github.com/TileDAO/tiles-api) to derive the Tile generation algorithm to implement it in Solidity. Infinite Tiles generates a Tile for each Ethereum address. The repository uses Typescript and Solidity.

The Smart Contracts for Infinite Tiles is significantly different than other NFTs, such that a content provider on-chain, pricing resolver, metadata and the frontend gallery were all written from scratch in Svelte, including the DAO treasury is a version 2 of Juicebox.

[https://Tiles.wtf](https://tiles.wtf); The Tiles minting front-end as well as an operational Juicebox Treasury together make [Tiles-wtf-gallery](https://github.com/tankbottoms/tiles-wtf-gallery) a helpful reference source for anyone interested in a full-featured decentralized application or DAPP.

## Minting

There are three different minting options in the contract.

- `mint()` The first allows the caller to mint a tile with their own address;
- `grab(address)` The second allows the caller to mint a tile with an arbitraty address; and
- `seize()` The last function allows the caller to seize the tile for their address from the current owner.

#### Pricing

Prices depend on the current amount of Tiles already minted, the price starts at `0.0001 Ether` and doubles every `512 mints`. These two numbers are configuration parameters. Holders of the original Tiles NFTs at [0x64931F06d3266049Bf0195346973762E6996D764](https://looksrare.org/collections/0x64931F06d3266049Bf0195346973762E6996D764) can mint their Tiles on this contract for free.

The contract itself also has a `merkleMint()` function, but that is not used in the current deployment.

### More about `seize()`

This function exists to always give access to the owner of the private key to their unique Tile. This functionality has some implications. If a user decides the squat tiles for addresses of well-know people, these tiles will simply be taken away from them through the seize function. There is still a price to pay for calling seize which is the current mint price. The current mint price may be higher than what the squatter paid and this amount will be sent to the current holder in exchange for the NFT.

This mechanic also discourages sales of owned address Tiles since they can always be seized back even if they were sold on a 3rd party market.

## Development

This is a Nodejs project written in Typescript. Bootstrap it with `yarn`. After that use the usual hardhat commands. `npx hardhat compile`, `npx hardhat test` and `npx hardhat coverage` build, test and calculate code coverage respectively. There are several scripts available as well.

```bash
yarn
npx hardhat compile
npx hardhat test
npx hardhat coverage
```

### Hot-reload

There is a hot-reload script you can run as `source ./scripts/dev.sh` which deploys the contracts to a local testnet and spins up an http display service at [https://localhost:3000](https://localhost:3000/).

```bash
yarn
source ./scripts/dev.sh
```

### Deployment

Deployment requires configuration which is loaded from a `.env` file. The following keys are necessary:

```
- PRIVATE_KEY=
- ALCHEMY_RINKEBY_URL=
- ALCHEMY_RINKEBY_KEY=
- ALCHEMY_MAINNET_URL=
- ALCHEMY_MAINNET_KEY=
- ETHERSCAN_API_KEY=
- COINMARKETCAP_KEY=
- REPORT_GAS=
```

Put these contracts on chain with `npx hardhat run scripts/deploy.ts --network rinkeby`. Most recent test deployment is at [0xe9595c465Bf76F72279D67d09f7425969f11bC46](https://rinkeby.etherscan.io/address/0xe9595c465Bf76F72279D67d09f7425969f11bC46). You can see how it's rendered on [looksrare](https://rinkeby.looksrare.org/collections/0xe9595c465Bf76F72279D67d09f7425969f11bC46/1#about).

```bash
npx hardhat run scripts/deploy.ts --network rinkeby
```

#### Mainnet deployment

The `log/deploy.log` contains the relevant ouput from the deployment, as provided below for convenience.

```bash
Alchemy mainnet https://eth-mainnet.g.alchemy.com/v2/kiaHfA88GhCn8XkX9ILDmNGp2L30hLs6 set.
No need to generate any newer typings.
 ·--------------------------------|--------------|----------------·
 |  Contract Name                 ·  Size (KiB)  ·  Change (KiB)  │
 ·································|··············|·················
 |  Base64                        ·       0.044  ·                │
 ·································|··············|·················
 |  IndexedTokenURIResolver       ·       1.783  ·                │
 ·································|··············|·················
 |  InfiniteTiles                 ·      20.911  ·                │
 ·································|··············|·················
 |  JBTokens                      ·       0.183  ·                │
 ·································|··············|·················
 |  LegacyOwnershipPriceResolver  ·       3.323  ·                │
 ·································|··············|·················
 |  MerkleProof                   ·       0.044  ·                │
 ·································|··············|·················
 |  MerkleRootPriceResolver       ·       2.915  ·                │
 ·································|··············|·················
 |  StringHelpers                 ·       2.772  ·                │
 ·································|··············|·················
 |  Strings                       ·       0.044  ·                │
 ·································|··············|·················
 |  SupplyPriceResolver           ·       2.500  ·                │
 ·································|··············|·················
 |  TileContentProvider           ·      19.213  ·                │
 ·--------------------------------|--------------|----------------·
Alchemy mainnet https://eth-mainnet.g.alchemy.com/v2/kiaHfA88GhCn8XkX9ILDmNGp2L30hLs6 set.
2022-08-17T06:01:58.545Z|info|deploying tiles on mainnet as 0x8a97426C1a720a45B8d69E974631f01f1168232B
2022-08-17T06:01:58.545Z|info|StringHelpers contract reported at 0xa8c720adbea12435a7a2678bbeba821c7a94d48d
2022-08-17T06:01:58.545Z|info|deploying TileContentProvider
2022-08-17T06:02:12.350Z|info|deployed new TileContentProvider contract to 0x0003fCcD5860CBC57e5181740b2D5649E5c5cb13 in 0x2560694772d253b5df42710c5655f3242da5014a2c2fb166e7b04b2b023533d9
2022-08-17T06:02:12.352Z|info|LegacyOwnershipPriceResolver contract reported at 0x30ebbf18cc7286105e0d02cb06ee78684aff722c
2022-08-17T06:08:37.655Z|info|deployed new InfiniteTiles contract to 0x894EaDA0D9eA2314CdB72C016d0FAA424Db0e4a0 in 0x213ab22fbe899b1a745fb434a1726847cfd60d70999817b17b83c60f1623c87b
2022-08-17T06:08:58.914Z|info|set parent on TileContentProvider at 0x0003fCcD5860CBC57e5181740b2D5649E5c5cb13 to 0x894EaDA0D9eA2314CdB72C016d0FAA424Db0e4a0
2022-08-17T06:09:15.998Z|info|set http gateways on TileContentProvider at 0x0003fCcD5860CBC57e5181740b2D5649E5c5cb13 to https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/, https://us-central1-juicebox-svelte.cloudfunctions.net/app/render/simple/
2022-08-17T06:09:29.184Z|info|added minter 0x63a2368f4b509438ca90186cb1c15156713d5834 to 0x894EaDA0D9eA2314CdB72C016d0FAA424Db0e4a0
2022-08-17T06:09:54.228Z|info|added minter 0x823b92d6a4b2aed4b15675c7917c9f922ea8adad to 0x894EaDA0D9eA2314CdB72C016d0FAA424Db0e4a0
2022-08-17T06:10:11.287Z|info|set royalties to 0.05
Nothing to compile
No need to generate any newer typings.
 ·--------------------------------|--------------|----------------·
 |  Contract Name                 ·  Size (KiB)  ·  Change (KiB)  │
 ·································|··············|·················
 |  Base64                        ·       0.044  ·                │
 ·································|··············|·················
 |  IndexedTokenURIResolver       ·       1.783  ·                │
 ·································|··············|·················
 |  InfiniteTiles                 ·      20.911  ·                │
 ·································|··············|·················
 |  JBTokens                      ·       0.183  ·                │
 ·································|··············|·················
 |  LegacyOwnershipPriceResolver  ·       3.323  ·                │
 ·································|··············|·················
 |  MerkleProof                   ·       0.044  ·                │
 ·································|··············|·················
 |  MerkleRootPriceResolver       ·       2.915  ·                │
 ·································|··············|·················
 |  StringHelpers                 ·       2.772  ·                │
 ·································|··············|·················
 |  Strings                       ·       0.044  ·                │
 ·································|··············|·················
 |  SupplyPriceResolver           ·       2.500  ·                │
 ·································|··············|·················
 |  TileContentProvider           ·      19.213  ·                │
 ·--------------------------------|--------------|----------------·
2022-08-17T06:10:11.689Z|error|Could not register contract code ENOENT: no such file or directory, open '/Users/mark.phillips/Developer/tiles-on-chain/tiles-on-chain/artifacts/build-info/1226f6de64372184916b28e460032d58.json'
```

#### Configuration parameters

The `script/deploy.ts` uses configuration parameters sourced from `source/config.json`,

The following `Rinkeby keys` provide for other contract resources or configurations which make sense for testing purposes.

```json
{
    "rinkeby": {
        "name": "Test Tiles 2.0",
        "symbol": "TESTEES2",
        "openSeaMetadata": "ipfs://QmShnESruGc1tUAEStzULuFHGcCZV1RXepBGbFKjGBiC2z",
        "legacyTilesContract": "0x64931F06d3266049Bf0195346973762E6996D764",
        "projectId": "4471",
        "basePrice": "0.0001",
        "priceCap": "128",
        "multiplier": 2,
        "tierSize": 16,
        "jbxDirectory": "0x1A9b04A9617ba5C9b7EBfF9668C30F41db6fC21a",
        "stringHelpersLibrary": "0x5e0925172c6F09D02f115eb9C6cE999C4fEa1f99",
        "tileContentProvider": "0x6FeCD1448dA6fA697e84AA1CC4e0737EB0be98B5",
        "gatewayAnimationUrl": "https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/",
        "gatewayPreviewUrl": "https://us-central1-juicebox-svelte.cloudfunctions.net/app/render/simple/",
        "priceResolver": "0x432124c3eE06A95e0Cf01A3A1a02AF19F1600a59",
        "priceResolverType": "SupplyPriceResolver",
        "token": "0xe9595c465Bf76F72279D67d09f7425969f11bC46",
        "royalty": 750,
        "manager": "0x3dC17b930D586b70AD2Bb7f09465bE455BFA8fE6",
        "minters": [
            "0x8a97426C1a720a45B8d69E974631f01f1168232B",
            "0x63a2368f4b509438ca90186cb1c15156713d5834",
            "0x823b92d6a4b2aed4b15675c7917c9f922ea8adad"
        ],
        "gift": [
            "0x8a97426C1a720a45B8d69E974631f01f1168232B",
            "0xC38ace8d13c4EdBc0deD20803bcbA7B3497947BD"
        ]
    },
    "mainnet": {
        "name": "Infinite Tiles 2.0",
        "symbol": "TILES2",
        "openSeaMetadata": "ipfs://QmShnESruGc1tUAEStzULuFHGcCZV1RXepBGbFKjGBiC2z",
        "legacyTilesContract": "0x64931F06d3266049Bf0195346973762E6996D764",
        "projectId": "41",
        "basePrice": "0.0001",
        "priceCap": "128",
        "multiplier": 2,
        "tierSize": 512,
        "jbxDirectory": "0xCc8f7a89d89c2AB3559f484E0C656423E979ac9C",
        "stringHelpersLibrary": "0xa8c720adbea12435a7a2678bbeba821c7a94d48d",
        "tileContentProvider": "",
        "gatewayAnimationUrl": "https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/",
        "gatewayPreviewUrl": "https://us-central1-juicebox-svelte.cloudfunctions.net/app/render/simple/",
        "priceResolver": "0x30ebbf18cc7286105e0d02cb06ee78684aff722c",
        "priceResolverType": "LegacyOwnershipPriceResolver",
        "token": "",
        "royalty": 500,
        "manager": "",
        "minters": [
            "0x4493287882f75dFFcdB40FD41d38d6308Fb8c181"
            "0x823b92d6a4b2aed4b15675c7917c9f922ea8adad",
            "0x5d95baEBB8412AD827287240A5c281E3bB30d27E",
        ],
        "gift": [
            "0x90eda5165e5e1633e0bdb6307cdecae564b10ff7",
            "0x63a2368f4b509438ca90186cb1c15156713d5834"',
            "0x823b92d6a4b2aed4b15675c7917c9f922ea8adad"',
            "0xe7879a2d05dba966fcca34ee9c3f99eee7edefd1"',
            "0x1dd2091f250876ba87b6fe17e6ca925e1b1c0cf0"',
            "0x4823e65c10daa3ef320e5e262cfa8d0a059e02a6"',
            "0x5566b7cb1cccb3e147084cf971d6dda770a3c90f"',
            "0x5d95baebb8412ad827287240a5c281e3bb30d27e"',
            "0x30670d81e487c80b9edc54370e6eaf943b6eab39"',
            "0x6860f1a0cf179ed93abd3739c7f6c8961a4eea3c",
            "0xe41188926607921763d25392475f1156ac5f9033",
            "0x90eda5165e5e1633e0bdb6307cdecae564b10ff7",
            "0x28c173b8f20488eef1b0f48df8453a2f59c38337",
            "0x2DdA8dc2f67f1eB94b250CaEFAc9De16f70c5A51",
        ]
    }
}
```

## Contract Features

Tiles v2 is a collection of contracts hidden behind [InfiniteTiles.sol](./blob/main/contracts/InfiniteTiles.sol). This contract is an implementation of ERC721 based on the version from [rari capital](https://github.com/Rari-Capital). It includes several features from ERC721Enumerable from [openzeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts). On top of this are modules to provide pricing and content creation features.

This NFT is fully on-chain. The NFT content, starting with the metadata, is generated by a smart contract function. This includes the basic description, dynamic trait collection and the svg image content.

This collection feeds into a [Juicebox Project](https://juicebox.money/v2/p/41) for mint payments and royalty distribution.

### Default Configuration

In its currently-deployed configuration InfiniteTiles.sol relies on [TileContentProvider.sol](./blob/main/contracts/components/TileContentProvider.sol) to generate metadata and image content. The image content is populated directly into the metadata json as base64-encoded svg. It comes in three flavors for broad market support: `image`, `image_data`, and `animation_url`. The latter relies on an ipfs-deployed html page which adds some animation features to the image. Finally, minting is controlled by [LegacyOwnershipPriceResolver.sol](./blob/main/contracts/LegacyOwnershipPriceResolver.sol) which allows for free mints to the holders of the original tiles contract at [0x64931F06d3266049Bf0195346973762E6996D764](https://etherscan.io/address/0x64931F06d3266049Bf0195346973762E6996D764).

### Options

It's possible to use this contract set to create your own dynamic on-chain art collection. You'll need to implement a contract similar to [TileContentProvider.sol](./blob/main/contracts/components/TileContentProvider.sol) which uses [AbstractTileNFTContent.sol](./blob/main/contracts/components/AbstractTileNFTContent.sol) for the image algorithm.

For controlling the minting process, in addition to [LegacyOwnershipPriceResolver.sol](./blob/main/contracts/LegacyOwnershipPriceResolver.sol), there is also [MerkleRootPriceResolver.sol](./blob/main/contracts/MerkleRootPriceResolver.sol) which allows setting of different prices for the general sale vs listed sale. There is also a more basic pricer implementation in [SupplyPriceResolver.sol](./blob/main/contracts/SupplyPriceResolver.sol).

## Examples

There are a few places where you can observe the contract on rinkeby:

- [LooksRare](https://rinkeby.looksrare.org/collections/0x7345aA6B298DbA85bb01F5ab7963E20399F860D9/1#about),
- [Etherscan](https://rinkeby.etherscan.io/address/0x7345aA6B298DbA85bb01F5ab7963E20399F860D9),
- [Dethcode](https://rinkeby.etherscan.deth.net/address/0x7345aA6B298DbA85bb01F5ab7963E20399F860D9).

- # You can also preview the [animation_url](https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/?resolution=low&tile=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpzdmdqcz0iaHR0cDovL3N2Z2pzLmRldi9zdmdqcyIgdmVyc2lvbj0iMS4xIiB3aWR0aD0iMzYwIiBoZWlnaHQ9IjM2MCIgaWQ9IlN2Z2pzU3ZnMTAwMCI+PHJlY3Qgd2lkdGg9IjM2MCIgaGVpZ2h0PSIzNjAiIGZpbGw9IiNmYWYzZTgiIC8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwzMCwzMCkiPjxnPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMCwwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwwKSI+PHBhdGggZD0iTTAgMEwwIDEwMEgxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMCkiPjxwYXRoIGQ9Ik01MCAwQzUwIDI3LjYxNDIgNzIuMzg1OCA1MCAxMDAgNTBWMEg1MFoiIGZpbGw9IiMyMjIiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDEwMCkiPjxwYXRoIGQ9Ik01MCAxMDBDNTAgNzIuMzg1OCAyNy42MTQyIDUwIDAgNTBWMTAwSDUwWiIgZmlsbD0iIzFBNDlFRiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwxMDApIj48cGF0aCBkPSJNMTAwIDEwMEgwTDEwMCAwVjEwMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMTAwKSI+PHBhdGggZD0iTTUwIDEwMEM1MCA3Mi4zODU4IDcyLjM4NTggNTAgMTAwIDUwVjEwMEg1MFoiIGZpbGw9IiMyMjIiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDIwMCkiPjxwYXRoIGQ9Ik0wIDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiNGRTQ0NjUiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwxMDAsMjAwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iIzFBNDlFRiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwyMDApIj48cGF0aCBkPSJNNTAgMTAwQzUwIDcyLjM4NTggNzIuMzg1OCA1MCAxMDAgNTBWMTAwSDUwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRkU0NDY1IiB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiICBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMTAwLDApIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzFBNDlFRiIgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDApIiAgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iI0ZFNDQ2NSIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMTAwKSI+PHBhdGggZD0iTTUwIDBDNTAgMjcuNjE0MiA3Mi4zODU4IDUwIDEwMCA1MFYwSDUwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwxMDApIj48cGF0aCBkPSJNMCAxMDBIMTAwTDAgMFYxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMEgwTDEwMCAxMDBWMFoiIGZpbGw9IiNGRTQ0NjUiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDIwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwSDBMMTAwIDBWMTAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwyMDApIj48cGF0aCBkPSJNMTAwIDEwMEgwTDEwMCAwVjEwMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMjAwKSI+PHBhdGggZD0iTTAgMEMwIDU1LjIyODUgNDQuNzcxNSAxMDAgMTAwIDEwMEMxMDAgNDQuNzcxNSA1NS4yMjg1IDAgMCAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMjAwKSI+PGNpcmNsZSByPSI0NS4wMDAwMCIgZmlsbD0iI2ZhZjNlOCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlPSIjZmFmM2U4IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiPjxwYXRoIGQ9Ik0wIDEwMEwwIDBIMTAwQzEwMCA1NS4yMjg1IDU1LjIyODUgMTAwIDAgMTAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwwKSI+PHBhdGggZD0iTTAgMEMwIDU1LjIyODUgNDQuNzcxNSAxMDAgMTAwIDEwMEMxMDAgNDQuNzcxNSA1NS4yMjg1IDAgMCAwWiIgZmlsbD0iI0ZFNDQ2NSIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwwKSI+PHBhdGggZD0iTTAgMEgxMDBMMCAxMDBWMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAwSDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMTAwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAwSDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBaIiBmaWxsPSIjMjIyIiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDEwMCkiPjxwYXRoIGQ9Ik0wIDBMMCAxMDBIMTAwQzEwMCA0NC43NzE1IDU1LjIyODUgMCAwIDBaIiBmaWxsPSIjRjhEOTM4IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMCwyMDApIj48cGF0aCBkPSJNMCAxMDBDMCA0NC43NzE1IDQ0Ljc3MTUgMCAxMDAgMEMxMDAgNTUuMjI4NSA1NS4yMjg1IDEwMCAwIDEwMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwxMDAsMjAwKSI+PHBhdGggZD0iTTAgMTAwQzAgNDQuNzcxNSA0NC43NzE1IDAgMTAwIDBDMTAwIDU1LjIyODUgNTUuMjI4NSAxMDAgMCAxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDIwMCkiPjxwYXRoIGQ9Ik0wIDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PC9nPjwvZz48L3N2Zz4=) via ipfs.

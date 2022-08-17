# infinite tiles (tiles.wtf smart contracts)

## about

inspired by [neoplastics](https://neolastics.com/), which will be addressed in follow on projects. this repo contains infinite tiles v2 which was based on tiles v1 algorithm reversed-engineered from [tilesDAO's](https://tiles.art/#/) minified api server at [tiles-api](https://github.com/TileDAO/tiles-api). implementation was first completed in typescript and then rewritten in solidity.

everything has been updated, smart contracts for infinite tiles with a content provider on-chain, pricing resolver, metadata and the frontend gallery rewritten in svelte routing to juicebox v2 at [tiles](https://tiles.wtf); additionally, the tiles dao juicebox treasury is included in the gallery, making for a full featured dao application or dapp.

## developing

this is a nodejs project written in typescript. bootstrap it with `yarn` or `npm i`. after that use the usual hardhat commands. `npx hardhat compile`, `npx hardhat test` and `npx hardhat coverage` build, test and calculate code coverage respectively. there are several scripts available as well.

### hot-reload

there is a hot-reload script you can run as `source ./scripts/dev.sh` which deploys the contracts to a local testnet and spins up an http display service at [https://localhost:3000](https://localhost:3000/).  it is super useful for svg generation debugging.

### deployment

to put these contracts on chain with `npx hardhat run scripts/deploy.ts --network rinkeby`. most recent test deployment is at [0x2291df55F60d0544E631d70cB9Df934Ac29fcB45](https://rinkeby.etherscan.io/address/0x2291df55F60d0544E631d70cB9Df934Ac29fcB45). you can see how it's rendered on [looksrare](https://rinkeby.looksrare.org/collections/0x2291df55F60d0544E631d70cB9Df934Ac29fcB45/1#about).

## contract features

tiles v2 is a collection of contracts hidden behind [InfiniteTiles.sol](./blob/main/contracts/InfiniteTiles.sol). This contract is an implementation of ERC721 based on the version from [rari capital](https://github.com/Rari-Capital). it includes several features from ERC721Enumerable from [openzeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts). on top of this i've added modules to provide pricing and content creation features.

this nft is fully on-chain. the nft content, starting with the metadata, is generated by a smart contract function. this includes the basic description, dynamic trait collection and the svg image content.

this collection feeds into a [juicebox project](https://juicebox.money/v2/p/41) for mint payments and royalty distribution.

### default configuration

it its currently-deployed configuration InfiniteTiles.sol relies on [TileContentProvider.sol](./blob/main/contracts/components/TileContentProvider.sol) to generate metadata and image content. the image content is populated directly into the metadata json as base64-encoded svg. it comes in three flavors for broad market support: `image`, `image_data`, and `animation_url`. the latter relies on an ipfs-deployed html page which adds some animation features to the image. Finally, minting is controlled by [LegacyOwnershipPriceResolver.sol](./blob/main/contracts/LegacyOwnershipPriceResolver.sol) which allows for free mints to the holders of the original tiles contract at [0x64931F06d3266049Bf0195346973762E6996D764](https://etherscan.io/address/0x64931F06d3266049Bf0195346973762E6996D764).

### options

it's possible to use this contract set to create your own dymaic on-chain art collection. you'll need to implement a contract similar to [TileContentProvider.sol](./blob/main/contracts/components/TileContentProvider.sol) which uses [AbstractTileNFTContent.sol](./blob/main/contracts/components/AbstractTileNFTContent.sol) for the image algorithm.

for controlling the minting process, in addition to [LegacyOwnershipPriceResolver.sol](./blob/main/contracts/LegacyOwnershipPriceResolver.sol), there is also [MerkleRootPriceResolver.sol](./blob/main/contracts/MerkleRootPriceResolver.sol) which allows setting of different prices for the general sale vs listed sale. there is also a more basic pricer implementation in [SupplyPriceResolver.sol](./blob/main/contracts/SupplyPriceResolver.sol).

## examples

there are a few places where you can observe the contract on rinkeby: [looksrare](https://rinkeby.looksrare.org/collections/0x2291df55F60d0544E631d70cB9Df934Ac29fcB45/1#about), [etherscan](https://rinkeby.etherscan.io/address/0x2291df55F60d0544E631d70cB9Df934Ac29fcB45), [dethcode](https://rinkeby.etherscan.deth.net/address/0x2291df55F60d0544E631d70cB9Df934Ac29fcB45). you can also preview the [animation_url](https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/?resolution=low&tile=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpzdmdqcz0iaHR0cDovL3N2Z2pzLmRldi9zdmdqcyIgdmVyc2lvbj0iMS4xIiB3aWR0aD0iMzYwIiBoZWlnaHQ9IjM2MCIgaWQ9IlN2Z2pzU3ZnMTAwMCI+PHJlY3Qgd2lkdGg9IjM2MCIgaGVpZ2h0PSIzNjAiIGZpbGw9IiNmYWYzZTgiIC8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwzMCwzMCkiPjxnPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMCwwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwwKSI+PHBhdGggZD0iTTAgMEwwIDEwMEgxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMCkiPjxwYXRoIGQ9Ik01MCAwQzUwIDI3LjYxNDIgNzIuMzg1OCA1MCAxMDAgNTBWMEg1MFoiIGZpbGw9IiMyMjIiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDEwMCkiPjxwYXRoIGQ9Ik01MCAxMDBDNTAgNzIuMzg1OCAyNy42MTQyIDUwIDAgNTBWMTAwSDUwWiIgZmlsbD0iIzFBNDlFRiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwxMDApIj48cGF0aCBkPSJNMTAwIDEwMEgwTDEwMCAwVjEwMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMTAwKSI+PHBhdGggZD0iTTUwIDEwMEM1MCA3Mi4zODU4IDcyLjM4NTggNTAgMTAwIDUwVjEwMEg1MFoiIGZpbGw9IiMyMjIiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDIwMCkiPjxwYXRoIGQ9Ik0wIDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiNGRTQ0NjUiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwxMDAsMjAwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iIzFBNDlFRiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwyMDApIj48cGF0aCBkPSJNNTAgMTAwQzUwIDcyLjM4NTggNzIuMzg1OCA1MCAxMDAgNTBWMTAwSDUwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRkU0NDY1IiB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiICBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMTAwLDApIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzFBNDlFRiIgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDApIiAgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwwKSI+PHBhdGggZD0iTTEwMCAwTDEwMCAxMDBIMEMwIDQ0Ljc3MTUgNDQuNzcxNSAwIDEwMCAwWiIgZmlsbD0iI0ZFNDQ2NSIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMTAwKSI+PHBhdGggZD0iTTUwIDBDNTAgMjcuNjE0MiA3Mi4zODU4IDUwIDEwMCA1MFYwSDUwWiIgZmlsbD0iI0Y4RDkzOCIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwxMDApIj48cGF0aCBkPSJNMCAxMDBIMTAwTDAgMFYxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMEgwTDEwMCAxMDBWMFoiIGZpbGw9IiNGRTQ0NjUiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDIwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwSDBMMTAwIDBWMTAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwyMDApIj48cGF0aCBkPSJNMTAwIDEwMEgwTDEwMCAwVjEwMFoiIGZpbGw9IiNGOEQ5MzgiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDAsMjAwKSI+PHBhdGggZD0iTTAgMEMwIDU1LjIyODUgNDQuNzcxNSAxMDAgMTAwIDEwMEMxMDAgNDQuNzcxNSA1NS4yMjg1IDAgMCAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMjAwKSI+PGNpcmNsZSByPSI0NS4wMDAwMCIgZmlsbD0iI2ZhZjNlOCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlPSIjZmFmM2U4IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDAsMCkiPjxwYXRoIGQ9Ik0wIDEwMEwwIDBIMTAwQzEwMCA1NS4yMjg1IDU1LjIyODUgMTAwIDAgMTAwWiIgZmlsbD0iIzIyMiIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDEwMCwwKSI+PHBhdGggZD0iTTAgMEMwIDU1LjIyODUgNDQuNzcxNSAxMDAgMTAwIDEwMEMxMDAgNDQuNzcxNSA1NS4yMjg1IDAgMCAwWiIgZmlsbD0iI0ZFNDQ2NSIgc3R5bGU9Im9wYWNpdHk6IDAuODg7IiAvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLDIwMCwwKSI+PHBhdGggZD0iTTAgMEgxMDBMMCAxMDBWMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAwSDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMTAwLDEwMCkiPjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAwSDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBaIiBmaWxsPSIjMjIyIiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDEwMCkiPjxwYXRoIGQ9Ik0wIDBMMCAxMDBIMTAwQzEwMCA0NC43NzE1IDU1LjIyODUgMCAwIDBaIiBmaWxsPSIjRjhEOTM4IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMCwyMDApIj48cGF0aCBkPSJNMCAxMDBDMCA0NC43NzE1IDQ0Ljc3MTUgMCAxMDAgMEMxMDAgNTUuMjI4NSA1NS4yMjg1IDEwMCAwIDEwMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwxMDAsMjAwKSI+PHBhdGggZD0iTTAgMTAwQzAgNDQuNzcxNSA0NC43NzE1IDAgMTAwIDBDMTAwIDU1LjIyODUgNTUuMjI4NSAxMDAgMCAxMDBaIiBmaWxsPSIjRkU0NDY1IiBzdHlsZT0ib3BhY2l0eTogMC44ODsiIC8+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDEsMjAwLDIwMCkiPjxwYXRoIGQ9Ik0wIDBDMCA1NS4yMjg1IDQ0Ljc3MTUgMTAwIDEwMCAxMDBDMTAwIDQ0Ljc3MTUgNTUuMjI4NSAwIDAgMFoiIGZpbGw9IiMxQTQ5RUYiIHN0eWxlPSJvcGFjaXR5OiAwLjg4OyIgLz48L2c+PC9nPjwvZz48L3N2Zz4=) via ipfs.

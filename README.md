## tiles v1.2 (on-chain)

with inspiration from [neoplastics](https://neolastics.com/). reversed engineered the [tilesDAO](https://tiles.art/#/) minified api server at [tiles-api](https://github.com/TileDAO/tiles-api) and reimplemented the svg generation in solidity on-chain. relaunched on juicebox v2 at [tiles](https://tiles.wtf); additionally, the tiles dao juicebox treasury is accessible outside of the juicebox.money website

#### branch development/sacred-geometry-badge

for the purpose of a on-chain generated sacred geometry project token, genesis nft reward, or any other tokenUriResolver which could use an on-chain generated graphic, this branch is an experiment on the variablity of this sacred geometry algorithm. configurable parameters include size, number of overlapping-circles, color of background, color of geometry and rotation (one or more of the circles). the example contract `SacredGeometryBadgeNFT.sol` returns geometry based on the above parameters.

#### install

```bash
yarn
```

#### hot-reloading

individuals with short attention spans will appreciate [https://localhost:3000](https://localhost:3000/) while manipulating the svg shapes or color palette

```bash
./script/dev.sh
```

#### compile & test

`yarn && npx hardhat compile && yarn run coverage`

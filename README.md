## Infinite Tiles v2 

Tiles updated to generate 

with inspiration from [neoplastics](https://neolastics.com/). reversed engineered the [tilesDAO](https://tiles.art/#/) minified api server at [tiles-api](https://github.com/TileDAO/tiles-api) and reimplemented the svg generation in solidity on-chain. relaunched on juicebox v2 at [tiles](https://tiles.wtf); additionally, the tiles dao juicebox treasury is accessible outside of the juicebox.money website

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

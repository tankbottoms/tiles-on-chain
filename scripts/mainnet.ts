import * as hre from 'hardhat';
import { ethers } from 'hardhat';

enum PriceFunction {
  LINEAR,
  EXP,
}

const jbDirectory: any = {
  mainnet: '0xCc8f7a89d89c2AB3559f484E0C656423E979ac9C',
  rinkeby: '0x1A9b04A9617ba5C9b7EBfF9668C30F41db6fC21a',
};

const tilesMetadata = {
  name: `Infinite Tiles 2.0`,
  symbol: `TILES2`,
  openSeaMetadata: `ipfs://QmShnESruGc1tUAEStzULuFHGcCZV1RXepBGbFKjGBiC2z`,
  legacyTilesContract: `0x64931F06d3266049Bf0195346973762E6996D764`,
};

async function main() {
  const projectId = '41';
  const basePrice = ethers.utils.parseEther('0.0001');
  const priceCap = ethers.utils.parseEther('128');
  const multiplier = 2;
  const tierSize = 512;
  const jbDirectoryAddress = jbDirectory[hre.network.name];

  const [deployer] = await ethers.getSigners();

  const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', deployer);
  const stringHelpersLibrary = await stringHelpersFactory.connect(deployer).deploy();

  const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
    libraries: { StringHelpers: stringHelpersLibrary.address },
    signer: deployer,
  });

  const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();
  await tileContentProvider.deployed();

  const legacyOwnershipPriceResolverFactory = await ethers.getContractFactory(
    'LegacyOwnershipPriceResolver',
    deployer,
  );
  const legacyOwnershipPriceResolver = await legacyOwnershipPriceResolverFactory
    .connect(deployer)
    .deploy(
      tilesMetadata.legacyTilesContract,
      basePrice,
      multiplier,
      tierSize,
      priceCap,
      PriceFunction.LINEAR,
    );
  await legacyOwnershipPriceResolver.deployed();

  const tileNFTFactory = await ethers.getContractFactory('TileNFT', deployer);
  const tileNFT = await tileNFTFactory
    .connect(deployer)
    .deploy(
      tilesMetadata.name,
      tilesMetadata.symbol,
      '',
      legacyOwnershipPriceResolver.address,
      tileContentProvider.address,
      jbDirectoryAddress,
      projectId,
      tilesMetadata.openSeaMetadata,
    );
  await tileNFT.deployed();

  console.log(`tiles: ${tileNFT.address}`); //

  try {
    await hre.run('verify:verify', {
      address: tileNFT.address,
      constructorArguments: [
        tilesMetadata.name,
        tilesMetadata.symbol,
        '',
        legacyOwnershipPriceResolver.address,
        tileContentProvider.address,
        jbDirectoryAddress,
        projectId,
        tilesMetadata.openSeaMetadata,
      ],
    });
  } catch (err) {
    console.error('Could not register contract code', err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run scripts/rinkeby.ts --network mainnet

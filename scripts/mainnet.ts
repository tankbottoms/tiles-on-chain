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

async function main() {
  const projectId = '41';
  const basePrice = ethers.utils.parseEther('0.0001');
  const priceCap = ethers.utils.parseEther('128');
  const multiplier = 2;
  const tierSize = 128;
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

  const supplyPriceResolverFactory = await ethers.getContractFactory(
    'SupplyPriceResolver',
    deployer,
  );
  const linearSupplyPriceResolver = await supplyPriceResolverFactory
    .connect(deployer)
    .deploy(basePrice, multiplier, tierSize, priceCap, PriceFunction.LINEAR);
  await linearSupplyPriceResolver.deployed();

  const tileNFTFactory = await ethers.getContractFactory('TileNFT', deployer);
  const tileNFT = await tileNFTFactory
    .connect(deployer)
    .deploy(
      'Tiles on Chain',
      'TOC',
      '',
      linearSupplyPriceResolver.address,
      tileContentProvider.address,
      jbDirectoryAddress,
      projectId,
      'ipfs://metadata',
    );
  await tileNFT.deployed();

  console.log(`tiles: ${tileNFT.address}`); // 0xB9c73D46357708e23B99106FBF9e26C0F0412743

  try {
    await hre.run('verify:verify', {
      address: tileNFT.address,
      constructorArguments: [
        'On-chain Tile',
        'OT',
        '',
        linearSupplyPriceResolver.address,
        tileContentProvider.address,
        jbDirectoryAddress,
        projectId,
        'ipfs://metadata',
      ],
    });
  } catch (err) {
    console.log('could not register contract code');
    console.log(err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run scripts/rinkeby.ts --network rinkeby

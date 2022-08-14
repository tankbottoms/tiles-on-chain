import express from 'express';
import child_process from 'child_process';
import { ethers } from 'hardhat';
import path from 'path';
import fs from 'fs';
import { Contract } from 'ethers';
import { TileNFT } from '../../typechain';

const app = express();

enum PriceFunction {
  LINEAR,
  EXP,
}

let contract: TileNFT;

async function deploy() {
  const basePrice = ethers.utils.parseEther('0.0001');
  const priceCap = ethers.utils.parseEther('128');
  const multiplier = 2;
  const tierSize = 128;

  console.log('deploying...');
  const signer = (await ethers.getSigners())[0];
  const Factory = await ethers.getContractFactory('TileNFT');

  const supplyPriceResolverFactory = await ethers.getContractFactory('SupplyPriceResolver', signer);
  const linearSupplyPriceResolver = await supplyPriceResolverFactory
    .connect(signer)
    .deploy(basePrice, multiplier, tierSize, priceCap, PriceFunction.LINEAR);

  const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', signer);
  const stringHelpersLibrary = await stringHelpersFactory.connect(signer).deploy();
  const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
    libraries: { StringHelpers: stringHelpersLibrary.address },
    signer: signer,
  });

  const tileContentProvider = await tileContentProviderFactory.connect(signer).deploy();

  contract = await Factory.connect(signer).deploy(
    'Infinite Tile v2',
    'TILES2',
    '',
    linearSupplyPriceResolver.address,
    tileContentProvider.address,
    ethers.constants.AddressZero,
    'ipfs://metadata',
  );
  await contract.deployTransaction.wait(1);

  for (let i = 0; i < 1; i++) {
    const mintTxn = await contract.mint({
      value: basePrice,
    });
    const mintTxnResponse = await mintTxn.wait();
    console.log('Minted', mintTxnResponse.events?.[0].args?.id?.toString());
  }
}

deploy();

app.get('/', handleRequest);
app.get('/:tokenId', handleRequest);

const reloadScript = '<script>setTimeout(() => location.reload(), 3000)</script>';

async function handleRequest(req: express.Request, res: express.Response) {
  if (!contract) return res.send(reloadScript);
  const metadataDataUri = await contract.tokenURI(req.params.tokenId || 1);
  const metadataBase64 = metadataDataUri.split(',')[1];
  const metadata = JSON.parse(Buffer.from(metadataBase64, 'base64').toString());
  res.send(`<img src="${metadata.image}" width="300" />${reloadScript}`);
}

fs.watch(
  path.resolve(__dirname, '../../contracts'),
  { recursive: true },
  (eventType: string, filename: string) => {
    if (filename.endsWith('.sol')) {
      console.log('Updated', filename);
      console.log('Restarting...');
      process.exit(0);
    }
  },
);

app.listen(3000, () => {
  console.log('listening on port 3000');
});

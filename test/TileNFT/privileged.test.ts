import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '../../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '../../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

enum PriceFunction {
  LINEAR,
  EXP,
}

describe('TileNFT privileged operations tests', function () {
  const basePrice = ethers.utils.parseEther('0.0001');
  const priceCap = ethers.utils.parseEther('128');
  const multiplier = 2;
  const tierSize = 128;
  const projectId = 99;
  const ethToken = '0x000000000000000000000000000000000000EEEe'; // JBTokens.ETH

  async function setup() {
    const [deployer, ...accounts] = await ethers.getSigners();

    const ethTerminal = await deployMockContract(deployer, jbETHPaymentTerminal.abi);
    await ethTerminal.mock.pay.returns(0);

    const mockJbDirectory = await deployMockContract(deployer, jbDirectory.abi);
    await mockJbDirectory.mock.primaryTerminalOf
      .withArgs(projectId, ethToken)
      .returns(ethTerminal.address);
    await mockJbDirectory.mock.isTerminalOf.withArgs(projectId, ethTerminal.address).returns(true);
    await mockJbDirectory.mock.isTerminalOf.withArgs(projectId, deployer.address).returns(false);

    const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', deployer);
    const stringHelpersLibrary = await stringHelpersFactory.connect(deployer).deploy();

    const supplyPriceResolverFactory = await ethers.getContractFactory(
      'SupplyPriceResolver',
      deployer,
    );
    const linearSupplyPriceResolver = await supplyPriceResolverFactory
      .connect(deployer)
      .deploy(basePrice, multiplier, tierSize, priceCap, PriceFunction.LINEAR);

    const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
      libraries: { StringHelpers: stringHelpersLibrary.address },
      signer: deployer,
    });

    const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

    const anotherTileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

    const tileNFTFactory = await ethers.getContractFactory('TileNFT', deployer);
    const tileNFT = await tileNFTFactory
      .connect(deployer)
      .deploy(
        'On-chain Tile',
        'OT',
        '',
        linearSupplyPriceResolver.address,
        tileContentProvider.address,
        mockJbDirectory.address,
        projectId,
        'ipfs://metadata',
      );

    const balanceTileNFT = await tileNFTFactory
      .connect(deployer)
      .deploy(
        'On-chain Tile',
        'OT',
        '',
        linearSupplyPriceResolver.address,
        anotherTileContentProvider.address,
        mockJbDirectory.address,
        projectId,
        'ipfs://metadata',
      );

    return {
      deployer,
      accounts,
      tileNFT,
      balanceTileNFT,
    };
  }

  it('Should mint to 3rd party address using deployer account', async function () {
    const { deployer, tileNFT, accounts } = await setup();

    let expectedTokenId = 1;
    let addressIndex = 0;
    await expect(tileNFT.connect(deployer).superMint(accounts[0].address, accounts[1].address))
      .to.emit(tileNFT, 'Transfer')
      .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

    expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[addressIndex].address);

    fs.writeFileSync(
      `tile-${accounts[1].address.toString()}.json`,
      await tileNFT.tokenURI(expectedTokenId),
    );

    expect(await tileNFT.contractURI()).to.equal('ipfs://metadata');
  });

  it('Should not mint to 3rd party address with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(
      tileNFT.connect(accounts[0]).superMint(accounts[0].address, accounts[1].address),
    ).to.be.revertedWith('PRIVILEDGED_OPERATION()');
  });

  it('Should register minter with the deployer account', async function () {
    const { deployer, tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(deployer).registerMinter(accounts[0].address));
  });

  it('Should not register minter with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(
      tileNFT.connect(accounts[0]).registerMinter(accounts[0].address),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Should remove minter with the deployer account', async function () {
    const { deployer, tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(deployer).removeMinter(accounts[0].address));
  });

  it('Should not remove minter with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(accounts[0]).removeMinter(accounts[0].address)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });

  it('Should transfer balance with the deployer account', async function () {
    const { deployer, balanceTileNFT, accounts } = await setup();

    await expect(
      balanceTileNFT
        .connect(deployer)
        .transferBalance(deployer.address, ethers.utils.parseEther('128')),
    ).to.be.revertedWith('INVALID_AMOUNT()');

    await balanceTileNFT.connect(accounts[0]).mint({ value: ethers.utils.parseEther('0.0001') });
    expect(
      await balanceTileNFT
        .connect(deployer)
        .transferBalance(deployer.address, ethers.utils.parseEther('0.0001')),
    ).to.changeEtherBalance(balanceTileNFT, ethers.utils.parseEther('-0.0001'));
  });

  it('Should not transfer balance with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(
      tileNFT
        .connect(accounts[0])
        .transferBalance(accounts[0].address, ethers.utils.parseEther('128')),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Should not transfer balance to 0-address', async function () {
    const { deployer, tileNFT } = await setup();

    await expect(
      tileNFT
        .connect(deployer)
        .transferBalance(ethers.constants.AddressZero, ethers.utils.parseEther('128')),
    ).to.be.revertedWith('INVALID_ADDRESS()');
  });

  it('Should set price resolver with the deployer account', async function () {
    const { deployer, tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(deployer).setPriceResolver(accounts[0].address));
  });

  it('Should not set price resolver with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(
      tileNFT.connect(accounts[0]).setPriceResolver(accounts[0].address),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Should set contract metadata uri with the deployer account', async function () {
    const { deployer, tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(deployer).setContractUri('ipfs://...'));
  });

  it('Should not set contract metadata uri with a non-deployer account', async function () {
    const { tileNFT, accounts } = await setup();

    await expect(tileNFT.connect(accounts[0]).setContractUri('ipfs://...')).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });
});

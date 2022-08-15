import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';

import iOriginalTileNFT from '../../artifacts/contracts/interfaces/IOriginalInfiniteTiles.sol/IOriginalInfiniteTiles.json';
import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

enum PriceFunction {
  LINEAR,
  EXP,
}

describe('InfiniteTiles legacy mint tests', () => {
  const basePrice = ethers.utils.parseEther('0.0001');
  const priceCap = ethers.utils.parseEther('128');
  const multiplier = 2;
  const tierSize = 128;
  const legacyTuples = [
    { id: 1, address: '0xa999999999999999999999999999999999999999', owner: '' },
    { id: 2, address: '0xa888888888888888888888888888888888888888', owner: '' },
  ];
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

    const legacyNFT = await deployMockContract(deployer, iOriginalTileNFT.abi);

    legacyTuples.map(async (t, i) => {
      await legacyNFT.mock.idOfAddress.withArgs(t.address).returns(t.id);
      await legacyNFT.mock.ownerOf.withArgs(t.id).returns(accounts[i].address);
      t.owner = accounts[i].address;
    });

    const legacyOwnershipPriceResolverFactory = await ethers.getContractFactory(
      'LegacyOwnershipPriceResolver',
      deployer,
    );
    const legacyOwnershipPriceResolver = await legacyOwnershipPriceResolverFactory
      .connect(deployer)
      .deploy(legacyNFT.address, basePrice, multiplier, tierSize, priceCap, PriceFunction.LINEAR);

    const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
      libraries: { StringHelpers: stringHelpersLibrary.address },
      signer: deployer,
    });

    const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

    const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
    const tileNFT = await tileNFTFactory
      .connect(deployer)
      .deploy(
        'On-chain Tile',
        'OT',
        '',
        legacyOwnershipPriceResolver.address,
        tileContentProvider.address,
        mockJbDirectory.address,
        projectId,
        'ipfs://metadata',
      );

    return {
      deployer,
      accounts,
      tileNFT,
      legacyOwnershipPriceResolver,
    };
  }

  it('Should mint for legacy owner address at 0 cost', async () => {
    const { tileNFT, accounts } = await setup();

    let expectedTokenId = 1;
    await expect(
      tileNFT
        .connect(accounts[0])
        .grab(legacyTuples[0].address, { value: ethers.utils.parseEther('0') }),
    )
      .to.emit(tileNFT, 'Transfer')
      .withArgs(ethers.constants.AddressZero, accounts[0].address, expectedTokenId);

    expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[0].address);
  });

  it('Should not mint at 0 cost, not legacy owner', async function () {
    const { tileNFT, accounts } = await setup();

    let expectedTokenId = 1;
    await expect(
      tileNFT
        .connect(accounts[1])
        .grab(legacyTuples[0].address, { value: ethers.utils.parseEther('0') }),
    ).to.be.revertedWith('INCORRECT_PRICE()');
  });

  it('Unsupported price requests', async function () {
    const { legacyOwnershipPriceResolver, accounts } = await setup();

    await expect(legacyOwnershipPriceResolver.getPrice()).to.be.revertedWith(
      'UNSUPPORTED_OPERATION()',
    );
    await expect(legacyOwnershipPriceResolver.getPriceFor(accounts[0].address)).to.be.revertedWith(
      'UNSUPPORTED_OPERATION()',
    );
    await expect(legacyOwnershipPriceResolver.getPriceOf(0)).to.be.revertedWith(
      'UNSUPPORTED_OPERATION()',
    );
  });
});

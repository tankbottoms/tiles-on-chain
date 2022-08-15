import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

import * as MerkleHelper from '../components/MerkleHelper';

describe('InfiniteTiles Merkle-tree mint tests', function () {
  const listedPrice = ethers.utils.parseEther('0.0001');
  const unlistedPrice = ethers.utils.parseEther('0.001');
  const listedAccountOffset = 3;
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

    const snapshot = MerkleHelper.makeSampleSnapshot(
      accounts.filter((a, i) => i >= listedAccountOffset).map((a) => a.address),
    );
    const merkleData = MerkleHelper.buildMerkleTree(snapshot);

    const merkleRootPriceResolverFactory = await ethers.getContractFactory(
      'MerkleRootPriceResolver',
      deployer,
    );
    const merkleRootPriceResolverResolver = await merkleRootPriceResolverFactory
      .connect(deployer)
      .deploy(merkleData.merkleRoot, listedPrice, unlistedPrice);

    const zeroMerkleRootPriceResolverResolver = await merkleRootPriceResolverFactory
      .connect(deployer)
      .deploy(merkleData.merkleRoot, listedPrice, 0);

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
        merkleRootPriceResolverResolver.address,
        tileContentProvider.address,
        mockJbDirectory.address,
        projectId,
        'ipfs://metadata',
      );

    return {
      deployer,
      accounts,
      tileNFT,
      merkleRootPriceResolverResolver,
      merkleData,
      zeroMerkleRootPriceResolverResolver,
    };
  }

  it('Get listed price from Merkle-root resolver', async function () {
    const { accounts, merkleRootPriceResolverResolver, merkleData } = await setup();

    let addressIndex = listedAccountOffset;
    let merkleItem = merkleData.claims[accounts[addressIndex].address];
    let proof =
      '0x' +
      accounts[addressIndex].address.slice(2) +
      merkleItem.proof.map((i) => i.slice(2)).join('');
    expect(
      await merkleRootPriceResolverResolver.getPriceWithParams(
        merkleItem.data,
        merkleItem.index,
        proof,
      ),
    ).to.equal(listedPrice);
  });

  it('Fail proof validation', async function () {
    const { accounts, merkleRootPriceResolverResolver, merkleData } = await setup();

    let addressIndex = 0;
    let merkleItem = merkleData.claims[accounts[listedAccountOffset].address]; // proof not owned
    let proof =
      '0x' +
      accounts[addressIndex].address.slice(2) +
      merkleItem.proof.map((i) => i.slice(2)).join('');
    await expect(
      merkleRootPriceResolverResolver.getPriceWithParams(merkleItem.data, merkleItem.index, proof),
    ).to.be.revertedWith('INVALID_PROOF()');
  });

  it('Mint with listed price', async function () {
    const { accounts, merkleData, tileNFT } = await setup();

    let expectedTokenId = 1;
    let addressIndex = listedAccountOffset;
    let merkleItem = merkleData.claims[accounts[addressIndex].address];
    let proof =
      '0x' +
      accounts[addressIndex].address.slice(2) +
      merkleItem.proof.map((i) => i.slice(2)).join('');
    await expect(
      tileNFT
        .connect(accounts[addressIndex])
        .merkleMint(merkleItem.index, merkleItem.data, proof, { value: listedPrice }),
    )
      .to.emit(tileNFT, 'Transfer')
      .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

    expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[addressIndex].address);
  });

  it('Fail to mint with incorrect price', async function () {
    const { accounts, merkleData, tileNFT } = await setup();

    let expectedTokenId = 1;
    let addressIndex = listedAccountOffset;
    let merkleItem = merkleData.claims[accounts[addressIndex].address];
    let proof =
      '0x' +
      accounts[addressIndex].address.slice(2) +
      merkleItem.proof.map((i) => i.slice(2)).join('');
    await expect(
      tileNFT
        .connect(accounts[addressIndex])
        .merkleMint(merkleItem.index, merkleItem.data, proof, { value: unlistedPrice }),
    ).to.be.revertedWith('INCORRECT_PRICE()');
  });

  it('Fail to mint with un-owned proof', async function () {
    const { accounts, merkleData, tileNFT } = await setup();

    let addressIndex = 0;
    let merkleItem = merkleData.claims[accounts[listedAccountOffset].address]; // proof not owned
    let proof =
      '0x' +
      accounts[addressIndex].address.slice(2) +
      merkleItem.proof.map((i) => i.slice(2)).join('');
    await expect(
      tileNFT
        .connect(accounts[addressIndex])
        .merkleMint(merkleItem.index, merkleItem.data, proof, { value: listedPrice }),
    ).to.be.revertedWith('INVALID_PROOF()');
  });

  it('Unsupported price requests', async function () {
    const { merkleRootPriceResolverResolver, zeroMerkleRootPriceResolverResolver, accounts } =
      await setup();

    expect(await merkleRootPriceResolverResolver.getPrice()).to.equal(unlistedPrice);
    expect(await merkleRootPriceResolverResolver.getPriceFor(accounts[0].address)).to.equal(
      unlistedPrice,
    );
    expect(await merkleRootPriceResolverResolver.getPriceOf(0)).to.equal(unlistedPrice);

    await expect(zeroMerkleRootPriceResolverResolver.getPrice()).to.be.revertedWith(
      'NO_UNLISTED_PRICE()',
    );
  });
});

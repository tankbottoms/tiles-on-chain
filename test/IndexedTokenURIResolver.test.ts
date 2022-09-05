import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('IndexedTokenURIResolver Tests', function () {
  const baseUri = 'ipfs://blah/';
  const previewUri = 'https://blah/';

  async function setup() {
    const [deployer, ...accounts] = await ethers.getSigners();

    const indexedTokenURIResolverFactory = await ethers.getContractFactory(
      'IndexedTokenURIResolver',
      deployer,
    );
    const indexedTokenURIResolver = await indexedTokenURIResolverFactory
      .connect(deployer)
      .deploy(baseUri, previewUri);

    return {
      deployer,
      accounts,
      indexedTokenURIResolver,
    };
  }

  it('Should return token URI', async function () {
    const { indexedTokenURIResolver } = await setup();

    expect(await indexedTokenURIResolver.tokenUri(0)).to.equal('ipfs://blah/0');
  });

  it('Should return preview URL', async function () {
    const { indexedTokenURIResolver, accounts } = await setup();

    expect(await indexedTokenURIResolver.externalPreviewUrl(accounts[0].address)).to.equal(`https://blah/${accounts[0].address.toLowerCase()}`);
  });
});

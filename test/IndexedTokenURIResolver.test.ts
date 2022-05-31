import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('IndexedTokenURIResolver Tests', function () {
    const baseUri = 'ipfs://blah/';

    async function setup() {
        const [deployer, ...accounts] = await ethers.getSigners();

        const indexedTokenURIResolverFactory = await ethers.getContractFactory('IndexedTokenURIResolver', deployer);
        const indexedTokenURIResolver = await indexedTokenURIResolverFactory
            .connect(deployer)
            .deploy(baseUri);

        return {
            deployer,
            accounts,
            indexedTokenURIResolver
        };
    }

    it('Should return token URI', async function () {
        const { indexedTokenURIResolver } = await setup();

        expect(await indexedTokenURIResolver.tokenUri(0)).to.equal('ipfs://blah/0');
    });
});

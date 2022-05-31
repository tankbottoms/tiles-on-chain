import { expect } from 'chai';
import { ethers } from 'hardhat';

enum PriceFunction {
    LINEAR,
    EXP
}

describe('SupplyPriceResolver Tests', function () {
    const basePrice = ethers.utils.parseEther('0.0001');
    const priceCap = ethers.utils.parseEther('128');
    const multiplier = 2;
    const tierSize = 128;

    async function setup() {
        const [deployer, ...accounts] = await ethers.getSigners();

        const supplyPriceResolverFactory = await ethers.getContractFactory('SupplyPriceResolver', deployer);
        const linearSupplyPriceResolver = await supplyPriceResolverFactory
            .connect(deployer)
            .deploy(
                basePrice,
                multiplier,
                tierSize,
                priceCap,
                PriceFunction.LINEAR
            );

        const exponentialSupplyPriceResolver = await supplyPriceResolverFactory
            .connect(deployer)
            .deploy(
                basePrice,
                multiplier,
                tierSize,
                priceCap,
                PriceFunction.EXP
            );

        return {
            deployer,
            accounts,
            linearSupplyPriceResolver,
            exponentialSupplyPriceResolver
        };
    }

    it('Should revert getPrice()', async function () {
        const { linearSupplyPriceResolver } = await setup();

        await expect(linearSupplyPriceResolver.getPrice()).to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should revert getPriceFor(address)', async function () {
        const { linearSupplyPriceResolver, accounts } = await setup();

        await expect(linearSupplyPriceResolver.getPriceFor(accounts[0].address)).to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should revert getPriceOf(uint256)', async function () {
        const { linearSupplyPriceResolver } = await setup();

        await expect(linearSupplyPriceResolver.getPriceOf(0)).to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('getPriceWithParams(address, uint256, bytes); 0 supply, linear', async function () {
        const { linearSupplyPriceResolver, accounts } = await setup();

        const currentSupply = 0;
        const currentSupplyBytes = '0x' + (`0000000000000000000000000000000000000000000000000000000000000000` + (currentSupply).toString(16)).slice(-64);

        expect(await linearSupplyPriceResolver.getPriceWithParams(accounts[0].address, 0, currentSupplyBytes)).to.equal(basePrice);
    });

    it('getPriceWithParams(address, uint256, bytes); 100 supply, linear', async function () {
        const { linearSupplyPriceResolver, accounts } = await setup();

        const currentSupply = 100;
        const currentSupplyBytes = '0x' + (`0000000000000000000000000000000000000000000000000000000000000000` + (currentSupply).toString(16)).slice(-64);

        expect(await linearSupplyPriceResolver.getPriceWithParams(accounts[0].address, 0, currentSupplyBytes)).to.equal(basePrice);
    });

    it('getPriceWithParams(address, uint256, bytes); 385 supply, linear', async function () {
        const { linearSupplyPriceResolver, accounts } = await setup();

        const currentSupply = tierSize * 3 + 1;
        const currentSupplyBytes = '0x' + (`0000000000000000000000000000000000000000000000000000000000000000` + (currentSupply).toString(16)).slice(-64);

        expect(await linearSupplyPriceResolver.getPriceWithParams(accounts[0].address, 0, currentSupplyBytes)).to.equal(basePrice.mul(6));
    });

    it('getPriceWithParams(address, uint256, bytes); 385 supply, exponential', async function () {
        const { exponentialSupplyPriceResolver, accounts } = await setup();

        const currentSupply = tierSize * 3 + 1;
        const currentSupplyBytes = '0x' + (`0000000000000000000000000000000000000000000000000000000000000000` + (currentSupply).toString(16)).slice(-64);

        expect(await exponentialSupplyPriceResolver.getPriceWithParams(accounts[0].address, 0, currentSupplyBytes)).to.equal(basePrice.mul(8));
    });

    it('getPriceWithParams(address, uint256, bytes); 100,000,000 supply, linear', async function () {
        const { linearSupplyPriceResolver, accounts } = await setup();

        const currentSupply = 100_000_000;
        const currentSupplyBytes = '0x' + (`0000000000000000000000000000000000000000000000000000000000000000` + (currentSupply).toString(16)).slice(-64);

        expect(await linearSupplyPriceResolver.getPriceWithParams(accounts[0].address, 0, currentSupplyBytes)).to.equal(priceCap);
    });
});

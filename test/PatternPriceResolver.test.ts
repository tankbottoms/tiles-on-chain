import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('PatternPriceResolver Tests', () => {
    let twoBytePatternPriceResolver: any;
    let oneBytePatternPriceResolver: any;
    let halfBytePatternPriceResolver: any;
    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];

    const basePrice = ethers.utils.parseEther('0.01');
    const priceIncrement = ethers.utils.parseEther('0.01125');

    const addressParam = ethers.constants.AddressZero;
    const supplyParam = '0x0000000000000000000000000000000000000000000000000000000000000000';

    before(async () => {
        [deployer, ...accounts] = await ethers.getSigners();

        const patternPriceResolverFactory = await ethers.getContractFactory('PatternPriceResolver', deployer);

        twoBytePatternPriceResolver = await patternPriceResolverFactory
            .connect(deployer)
            .deploy(basePrice, priceIncrement, 16);

        oneBytePatternPriceResolver = await patternPriceResolverFactory
            .connect(deployer)
            .deploy(basePrice, priceIncrement.div(2), 8);

        halfBytePatternPriceResolver = await patternPriceResolverFactory
            .connect(deployer)
            .deploy(basePrice, priceIncrement.div(4), 4);
    });

    it('Should revert getPrice()', async function () {
        await expect(twoBytePatternPriceResolver.getPrice())
            .to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should revert getPriceFor(address)', async function () {
        await expect(twoBytePatternPriceResolver.getPriceFor(accounts[0].address))
            .to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should revert getPriceOf(uint256)', async function () {
        await expect(twoBytePatternPriceResolver.getPriceOf(0))
            .to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('getPriceWithParams(address, uint256, bytes), 1 + 6 16-bit pairs', async function () {
        const params = ethers.utils.solidityPack(
            ['address', 'address'],
            [supplyParam, '0x0000AAAA000000000000AAAA0000000000000000']);

        expect(await twoBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.mul(7)));

        expect(await oneBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(2).mul(16)));

        expect(await halfBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(4).mul(7 + 27)));
    });

    it('getPriceWithParams(address, uint256, bytes), no pairs', async function () {
        const params = ethers.utils.solidityPack(
            ['address', 'address'],
            [supplyParam, '0x8a97426C1a720a45B8d69E974631f01f1168232B']);

        expect(await twoBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice);

        expect(await oneBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice);

        expect(await halfBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(4).mul(20)));
    });

    it('getPriceWithParams(address, uint256, bytes), 1 4-bit pair', async function () {
        const params = ethers.utils.solidityPack(
            ['address', 'address'],
            [supplyParam, '0x8a9700CC1a720a45B8d69E974631f01f116823CC']);

        expect(await twoBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice);

        expect(await oneBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(2)));

        expect(await halfBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(4).mul(20)));
    });

    it('getPriceWithParams(address, uint256, bytes), 35 4-bit pairs', async function () {
        const params = ethers.utils.solidityPack(
            ['address', 'address'],
            [supplyParam, '0xffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);

        expect(await twoBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.mul(8)));

        expect(await oneBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(2).mul(17)));

        expect(await halfBytePatternPriceResolver.getPriceWithParams(addressParam, 0, params))
            .to.equal(basePrice.add(priceIncrement.div(4).mul(35)));
    });
});

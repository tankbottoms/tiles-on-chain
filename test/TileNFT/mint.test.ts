import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

enum PriceFunction {
    LINEAR,
    EXP,
}

describe('InfiniteTiles supply mint tests', () => {
    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let tileNFT: any;
    let staticUriTileNFT: any;
    let pricelessTileNFT: any;

    before(async () => {
        const basePrice = ethers.utils.parseEther('0.0001');
        const priceCap = ethers.utils.parseEther('128');
        const multiplier = 2;
        const tierSize = 128;
        const projectId = 99;
        const ethToken = '0x000000000000000000000000000000000000EEEe'; // JBTokens.ETH

        [deployer, ...accounts] = await ethers.getSigners();

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

        const anotherTileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

        const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        tileNFT = await tileNFTFactory
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

        staticUriTileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                'On-chain Tile',
                'OT',
                '',
                linearSupplyPriceResolver.address,
                ethers.constants.AddressZero,
                mockJbDirectory.address,
                projectId,
                'ipfs://metadata',
            );

        pricelessTileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                'On-chain Tile',
                'OT',
                '',
                ethers.constants.AddressZero,
                anotherTileContentProvider.address,
                mockJbDirectory.address,
                projectId,
                'ipfs://metadata',
            );
    });

    it('Should return contract uri', async () => {
        expect(await tileNFT.contractURI()).to.equal('ipfs://metadata');
    });

    it('Should mint for minimum price', async () => {
        let expectedTokenId = 1;
        let addressIndex = 0;
        await expect(
            tileNFT.connect(accounts[addressIndex]).mint({ value: ethers.utils.parseEther('0.0001') }),
        )
            .to.emit(tileNFT, 'Transfer')
            .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

        expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[addressIndex].address);

        fs.writeFileSync(`tile-${expectedTokenId}.json`, await tileNFT.tokenURI(expectedTokenId));

        expectedTokenId++;
        addressIndex++;
        await expect(
            tileNFT.connect(accounts[addressIndex]).mint({ value: ethers.utils.parseEther('0.0001') }),
        )
            .to.emit(tileNFT, 'Transfer')
            .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

        expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[addressIndex].address);

        fs.writeFileSync(`tile-${expectedTokenId}.json`, await tileNFT.tokenURI(expectedTokenId));
    });

    it('Should mint for different address', async () => {
        let expectedTokenId = Number(await tileNFT.totalSupply()) + 1;
        let addressIndex = 0;
        await expect(
            tileNFT.connect(accounts[addressIndex]).grab('0xa999999999999999999999999999999999999999', {
                value: ethers.utils.parseEther('0.0001'),
            }),
        )
            .to.emit(tileNFT, 'Transfer')
            .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

        expect(await tileNFT.ownerOf(expectedTokenId)).to.equal(accounts[addressIndex].address);

        fs.writeFileSync(`tile-${expectedTokenId}.json`, await tileNFT.tokenURI(expectedTokenId));
    });

    it('Should not mint at incorrect price', async () => {
        let addressIndex = 0;
        await expect(
            tileNFT.connect(accounts[addressIndex]).mint({ value: ethers.utils.parseEther('0.0002') }),
        ).to.be.revertedWith('INCORRECT_PRICE()');
    });

    it('Should get static token URI', async () => {
        let expectedTokenId = 1;
        let addressIndex = 0;
        await expect(
            staticUriTileNFT
                .connect(accounts[addressIndex])
                .mint({ value: ethers.utils.parseEther('0.0001') }),
        )
            .to.emit(staticUriTileNFT, 'Transfer')
            .withArgs(ethers.constants.AddressZero, accounts[addressIndex].address, expectedTokenId);

        expect(await staticUriTileNFT.tokenURI(expectedTokenId)).to.equal('');
    });

    it('Should not mint without price resolver', async () => {
        let addressIndex = 0;
        await expect(
            pricelessTileNFT
                .connect(accounts[addressIndex])
                .mint({ value: ethers.utils.parseEther('0.0001') }),
        ).to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should fail to grab NFT without price resolver', async () => {
        let addressIndex = 0;
        await expect(pricelessTileNFT.connect(accounts[addressIndex]).grab(accounts[addressIndex + 1].address, { value: ethers.utils.parseEther('0.0001') }))
            .to.be.revertedWith('UNSUPPORTED_OPERATION()');
    });

    it('Should mint many', async () => {
        let ownedCount = await tileNFT.balanceOf(accounts[1].address);
        const mintCount = 32;
        for (let i = 0; i < mintCount; i++) {
            const tile = `0x${('9999000099999999999999999999999999999999' + i.toString(16)).slice(-40)}`;
            await tileNFT.connect(accounts[1]).grab(tile, { value: ethers.utils.parseEther('0.0001') });
        }

        expect(Number(await tileNFT.balanceOf(accounts[1].address))).to.equal(Number(ownedCount) + mintCount);
    });
});

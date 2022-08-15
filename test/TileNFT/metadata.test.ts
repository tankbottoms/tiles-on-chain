import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '../../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '../../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

enum PriceFunction {
    LINEAR,
    EXP,
}

describe('TileNFT metadata tests', () => {
    let tileNFT: any;
    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    const basePrice = ethers.utils.parseEther('0.0001');

    before(async () => {
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

        const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();

        const tileNFTFactory = await ethers.getContractFactory('TileNFT', deployer);
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
    });

    it('Mint tile without circles', async () => {
        await tileNFT.connect(accounts[0]).grab('0x03416f1b907C67A11029dfb73BD90c8DB83A0AF1', { value: basePrice });
        const expectedTokenId = 1;

        const metadata = await tileNFT.tokenURI(expectedTokenId);
        const json = JSON.parse(Buffer.from(metadata.slice('data:application/json;base64,'.length), 'base64').toString());
        const circleCount = json['attributes'].filter((a: any) => String(a['trait_type']).startsWith('Circle')).length;

        expect(circleCount).to.equal(0);
    });

    it('Mint tile with three circle', async () => {
        await tileNFT.connect(accounts[0]).grab('0xA4f2cae40B69003B4a172c46Fdfc791489609FB6', { value: basePrice });
        const expectedTokenId = 2;

        const metadata = await tileNFT.tokenURI(expectedTokenId);
        const json = JSON.parse(Buffer.from(metadata.slice('data:application/json;base64,'.length), 'base64').toString());
        const circleCount = json['attributes'].filter((a: any) => String(a['trait_type']).startsWith('Circle')).length;

        expect(circleCount).to.equal(3);
    });

    it('Mint tile with five circles', async () => {
        await tileNFT.connect(accounts[0]).grab('0xAb1273A7a9d52Fc16093354180Cb5625304bc3AD', { value: basePrice });
        const expectedTokenId = 3;

        const metadata = await tileNFT.tokenURI(expectedTokenId);
        const json = JSON.parse(Buffer.from(metadata.slice('data:application/json;base64,'.length), 'base64').toString());
        const circleCount = json['attributes'].filter((a: any) => String(a['trait_type']).startsWith('Circle')).length;

        expect(circleCount).to.equal(5);
    });

    it('Mint tile without rings or circles', async () => {
        await tileNFT.connect(accounts[0]).grab('0x0000888888888888888888888888888888888888', { value: basePrice });
        const expectedTokenId = 3;

        const metadata = await tileNFT.tokenURI(expectedTokenId);
        const json = JSON.parse(Buffer.from(metadata.slice('data:application/json;base64,'.length), 'base64').toString());
        const ringCount = json['attributes'].filter((a: any) => a['trait_type'] === 'Ring Count')[0]['value'];
        const circleCount = json['attributes'].filter((a: any) => String(a['trait_type']).startsWith('Circle')).length;

        expect(ringCount).to.equal(0);
        expect(circleCount).to.equal(0);
    });

    it('tokenUri for non-existent token', async () => {
        const metadata = await tileNFT.tokenURI(99999);
        expect(metadata.length).to.equal(0);
    });

    it('Mint sample tiles', async () => {
        const samples = ['0x53fFc341D2469e394ce0cBa08D8216b743B7eD66'];

        for await (const sample of samples) {
            const tx = await tileNFT.connect(accounts[0]).grab(sample, { value: basePrice });
            const receipt = await tx.wait();
            const tokenId = receipt.events?.filter((f: any) => f.event === 'Transfer')[0]['args']['id'].toString();
            const metadata = await tileNFT.tokenURI(tokenId);

            console.log(`${tokenId} -> ${metadata}`);
        }
    });
});

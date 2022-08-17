import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

describe('TileContentProvider Tests', function () {
    const animationUrl = 'http://animation.url/';
    const previewUrl = 'http://preview.url/';

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let tileContentProvider: any;

    before(async () => {
        [deployer, ...accounts] = await ethers.getSigners();

        const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', deployer);
        const stringHelpersLibrary = await stringHelpersFactory.connect(deployer).deploy();

        const supplyPriceResolverFactory = await ethers.getContractFactory(
            'SupplyPriceResolver',
            deployer,
        );

        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibrary.address },
            signer: deployer,
        });

        tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();
    });

    it('Should set parent from any account when not set', async () => {
        await expect(tileContentProvider.connect(accounts[0]).setParent(accounts[1].address)).to.not.be.reverted;
    });

    it('Should fail to set parent if already set and not owner', async () => {
        await expect(tileContentProvider.connect(accounts[0]).setParent(accounts[1].address)).to.be.revertedWith('PRIVILEGED_OPERATION()');
    });

    it('Should set parent if already set and owner', async () => {
        await expect(tileContentProvider.connect(deployer).setParent(accounts[0].address)).to.not.be.reverted;
    });

    it('Should set parent if already set and owner', async () => {
        await expect(tileContentProvider.connect(deployer).setHttpGateways(animationUrl, previewUrl)).to.not.be.reverted;
    });

    it('Should generate preview URL', async () => {
        for await (const account of accounts) {
            expect(await tileContentProvider.externalPreviewUrl(account.address)).to.equal(`${previewUrl}${account.address}`.toLowerCase());
        }
    });

    it('Should generate some SVG content', async () => {
        for await (const account of accounts) {
            tileContentProvider.getSvgContent(account.address);
        }
    });
});

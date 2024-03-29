import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';
import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

enum PriceFunction {
    LINEAR,
    EXP,
}

describe('InfiniteTiles privileged operations tests', () => {
    let tileNFT: any;
    let balanceTileNFT: any;
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
        await mockJbDirectory.mock.primaryTerminalOf.withArgs(projectId, ethToken).returns(ethTerminal.address);
        await mockJbDirectory.mock.primaryTerminalOf.withArgs(0, ethToken).returns(ethers.constants.AddressZero);
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

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        tileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                'On-chain Tile',
                'OT',
                linearSupplyPriceResolver.address,
                tileContentProvider.address,
                mockJbDirectory.address,
                projectId,
                'ipfs://metadata',
            );

        balanceTileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                'On-chain Tile',
                'OT',
                linearSupplyPriceResolver.address,
                anotherTileContentProvider.address,
                mockJbDirectory.address,
                0,
                'ipfs://metadata',
            );
    });

    it('Should pause minting', async () => {
        await tileNFT.connect(deployer).setPause(true);

        await expect(tileNFT.connect(deployer).superMint(accounts[1].address, accounts[1].address)).to.be.revertedWith('MINT_PAUSED()');
        await expect(tileNFT.connect(accounts[2]).mint()).to.be.revertedWith('MINT_PAUSED()');
        await expect(tileNFT.connect(accounts[2]).grab(accounts[3].address)).to.be.revertedWith('MINT_PAUSED()');

        await tileNFT.connect(deployer).setPause(false);
    });

    it('Should mint to 3rd party address using deployer account', async () => {
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

    it('Should not mint to 3rd party address with a non-deployer account', async () => {
        await expect(
            tileNFT.connect(accounts[0]).superMint(accounts[0].address, accounts[1].address),
        ).to.be.revertedWith('PRIVILEDGED_OPERATION()');
    });

    it('Should register minter with the deployer account', async () => {
        await expect(tileNFT.connect(deployer).registerMinter(accounts[0].address));
    });

    it('Should not register minter with a non-deployer account', async () => {
        await expect(
            tileNFT.connect(accounts[0]).registerMinter(accounts[0].address),
        ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should remove minter with the deployer account', async () => {
        await expect(tileNFT.connect(deployer).removeMinter(accounts[0].address));
    });

    it('Should not remove minter with a non-deployer account', async () => {
        await expect(tileNFT.connect(accounts[0]).removeMinter(accounts[0].address)).to.be.revertedWith(
            'Ownable: caller is not the owner',
        );
    });

    it('Should transfer balance with the deployer account', async () => {
        await expect(
            balanceTileNFT
                .connect(deployer)
                .transferBalance(deployer.address, ethers.utils.parseEther('128')),
        ).to.be.revertedWith('INVALID_AMOUNT()');

        await balanceTileNFT.connect(accounts[0]).mint({ value: basePrice });
        expect(
            await balanceTileNFT
                .connect(deployer)
                .transferBalance(deployer.address, basePrice),
        ).to.changeEtherBalance(balanceTileNFT, ethers.utils.parseEther('-0.0001'));
    });

    it('Should not transfer balance with a non-deployer account', async () => {
        await expect(
            tileNFT
                .connect(accounts[0])
                .transferBalance(accounts[0].address, ethers.utils.parseEther('128')),
        ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not transfer balance to 0-address', async () => {
        await expect(
            tileNFT
                .connect(deployer)
                .transferBalance(ethers.constants.AddressZero, ethers.utils.parseEther('128')),
        ).to.be.revertedWith('INVALID_ADDRESS()');
    });

    it('Should set price resolver with the deployer account', async () => {
        await expect(tileNFT.connect(deployer).setPriceResolver(accounts[0].address));
    });

    it('Should not set price resolver with a non-deployer account', async () => {
        await expect(
            tileNFT.connect(accounts[0]).setPriceResolver(accounts[0].address),
        ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should set contract metadata uri with the deployer account', async () => {
        await expect(tileNFT.connect(deployer).setContractUri('ipfs://...'));
    });

    it('Should not set contract metadata uri with a non-deployer account', async () => {
        await expect(tileNFT.connect(accounts[0]).setContractUri('ipfs://...')).to.be.revertedWith(
            'Ownable: caller is not the owner',
        );
    });

    it('Should set royalties', async () => {
        await expect(tileNFT.connect(accounts[0]).setRoyalties(tileNFT.address, 10_000))
            .to.be.revertedWith('Ownable: caller is not the owner');

        await expect(tileNFT.connect(deployer).setRoyalties(tileNFT.address, 50_000))
            .to.be.revertedWith('INVALID_RATE()');

        await expect(tileNFT.connect(deployer).setRoyalties(tileNFT.address, 500))
            .to.not.be.reverted;

        await expect(tileNFT.connect(deployer).setRoyalties(tileNFT.address, 500))
            .to.not.be.reverted;
    });

    it('Should get royaltyInfo', async () => {
        let royaltyInfo = await tileNFT.royaltyInfo(1, 10_000);
        expect(royaltyInfo['receiver']).to.equal(tileNFT.address);
        expect(royaltyInfo['royaltyAmount'].toString()).to.equal('500');

        royaltyInfo = await tileNFT.royaltyInfo(99999, 10_000);
    });

    it('Should set tokenUriResolver address', async () => {
        await tileNFT.connect(deployer).setTokenUriResolver(ethers.constants.AddressZero);
    });

    it('Should set Juicebox parameters', async () => {
        await expect(tileNFT.connect(deployer).setJuiceboxParams(ethers.constants.AddressZero, 9999)).to.not.be.reverted;
        await expect(tileNFT.connect(accounts[0]).setJuiceboxParams(ethers.constants.AddressZero, 9999)).to.be.reverted;
    });
});

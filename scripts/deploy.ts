import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers } from 'hardhat';
import * as winston from 'winston';

import { PriceFunction, ConfigurationGroup } from './types';

function sleep(ms = 1_000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const config: { [key: string]: ConfigurationGroup } = JSON.parse(fs.readFileSync('./scripts/config.json').toString());

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => { return `${info.timestamp}|${info.level}|${info.message}`; })
    ),
    transports: [
        new winston.transports.Console({
            level: 'info'
        }),
        new winston.transports.File({
            level: 'debug',
            filename: 'log/deploy.log',
            handleExceptions: true,
            maxsize: (5 * 1024 * 1024), // 5 mb
            maxFiles: 5
        })
    ]
});

async function main() {
    if (!Object.keys(config).includes(hre.network.name)) {
        console.log(`network ${hre.network.name} not present in config set.`)
    }

    const activeConfig: ConfigurationGroup = config[hre.network.name];
    const [deployer] = await ethers.getSigners();

    logger.info(`deploying tiles on ${hre.network.name} as ${deployer.address}`);

    let stringHelpersLibraryAddress = activeConfig.stringHelpersLibrary;
    if (!stringHelpersLibraryAddress || stringHelpersLibraryAddress.length === 0) {
        logger.info(`deploying StringHelpers`);

        const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', deployer);
        const stringHelpersLibrary = await stringHelpersFactory.connect(deployer).deploy();
        await stringHelpersLibrary.deployed();

        logger.info(`deployed new StringHelpers contract to ${stringHelpersLibrary.address} in ${stringHelpersLibrary.deployTransaction.hash}`);
        stringHelpersLibraryAddress = stringHelpersLibrary.address;

        config[hre.network.name].stringHelpersLibrary = stringHelpersLibrary.address;
        fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));
    } else {
        logger.info(`StringHelpers contract reported at ${stringHelpersLibraryAddress}`);
    }

    let newProvider = false;
    let tileContentProviderAddress = activeConfig.tileContentProvider;
    let tileContentProvider: any;
    if (!tileContentProviderAddress || tileContentProviderAddress.length === 0) {
        logger.info(`deploying TileContentProvider`);

        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();
        await tileContentProvider.deployed();

        logger.info(`deployed new TileContentProvider contract to ${tileContentProvider.address} in ${tileContentProvider.deployTransaction.hash}`);
        tileContentProviderAddress = tileContentProvider.address;

        config[hre.network.name].tileContentProvider = tileContentProvider.address;
        fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

        newProvider = true;
    } else {
        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        tileContentProvider = await tileContentProviderFactory.attach(tileContentProviderAddress);

        logger.info(`TileContentProvider contract reported at ${tileContentProviderAddress}`);
    }

    let newPricer = false;
    let priceResolverAddress = activeConfig.priceResolver;

    if (!priceResolverAddress || priceResolverAddress.length === 0) {
        if (activeConfig.priceResolverType === 'LegacyOwnershipPriceResolver') {
            logger.debug(`deploying LegacyOwnershipPriceResolver with params: ${activeConfig.legacyTilesContract}, ${activeConfig.basePrice}, ${activeConfig.multiplier}, ${activeConfig.tierSize}, ${activeConfig.priceCap}, ${PriceFunction.LINEAR}`);

            const legacyOwnershipPriceResolverFactory = await ethers.getContractFactory('LegacyOwnershipPriceResolver', deployer);
            const legacyOwnershipPriceResolver = await legacyOwnershipPriceResolverFactory
                .connect(deployer)
                .deploy(
                    activeConfig.legacyTilesContract,
                    ethers.utils.parseEther(activeConfig.basePrice),
                    activeConfig.multiplier,
                    activeConfig.tierSize,
                    ethers.utils.parseEther(activeConfig.priceCap),
                    PriceFunction.LINEAR
                );
            await legacyOwnershipPriceResolver.deployed();

            logger.info(`deployed new LegacyOwnershipPriceResolver contract to ${legacyOwnershipPriceResolver.address} in ${legacyOwnershipPriceResolver.deployTransaction.hash}`);
            priceResolverAddress = legacyOwnershipPriceResolver.address;

            config[hre.network.name].priceResolver = legacyOwnershipPriceResolver.address;
            fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

            newPricer = true;
        } else if (activeConfig.priceResolverType === 'SupplyPriceResolver') {
            logger.debug(`deploying SupplyPriceResolver with params: ${activeConfig.basePrice}, ${activeConfig.multiplier}, ${activeConfig.tierSize}, ${activeConfig.priceCap}, ${PriceFunction.LINEAR}`);

            const supplyPriceResolverFactory = await ethers.getContractFactory('SupplyPriceResolver', deployer);
            const linearSupplyPriceResolver = await supplyPriceResolverFactory
                .connect(deployer)
                .deploy(
                    ethers.utils.parseEther(activeConfig.basePrice),
                    activeConfig.multiplier,
                    activeConfig.tierSize,
                    ethers.utils.parseEther(activeConfig.priceCap),
                    PriceFunction.LINEAR);
            await linearSupplyPriceResolver.deployed();

            logger.info(`deployed new SupplyPriceResolver contract to ${linearSupplyPriceResolver.address} in ${linearSupplyPriceResolver.deployTransaction.hash}`);
            priceResolverAddress = linearSupplyPriceResolver.address;

            config[hre.network.name].priceResolver = linearSupplyPriceResolver.address;
            fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

            newPricer = true;
        } else if (activeConfig.priceResolverType === 'MerkleRootPriceResolver') {
            // TODO
            logger.error('MerkleRootPriceResolver deployment not implemented');
        } else if (activeConfig.priceResolverType === 'PatternPriceResolver') {
            logger.debug(`deploying PatternPriceResolver with params: ${activeConfig.basePrice}, ${activeConfig.pairMultiplier}, ${activeConfig.matchWidth}`);

            const patternPriceResolverFactory = await ethers.getContractFactory('PatternPriceResolver', deployer);
            const patternPriceResolver = await patternPriceResolverFactory
                .connect(deployer)
                .deploy(
                    ethers.utils.parseEther(activeConfig.basePrice),
                    ethers.utils.parseEther(activeConfig.pairMultiplier),
                    activeConfig.matchWidth);
            await patternPriceResolver.deployed();

            logger.info(`deployed new PatternPriceResolver contract to ${patternPriceResolver.address} in ${patternPriceResolver.deployTransaction.hash}`);
            priceResolverAddress = patternPriceResolver.address;

            config[hre.network.name].priceResolver = patternPriceResolver.address;
            fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

            newPricer = true;
        }
    } else {
        logger.info(`${activeConfig.priceResolverType} contract reported at ${priceResolverAddress}`);
    }

    let newToken = false;
    let tokenAddress = activeConfig.token;
    let tileNFT;
    if (!tokenAddress || tokenAddress.length === 0) {
        logger.debug(`deploying InfiniteTiles with params: ${activeConfig.name}, ${activeConfig.symbol}, '', ${priceResolverAddress}, ${tileContentProviderAddress}, ${activeConfig.jbxDirectory}, ${activeConfig.projectId}, ${activeConfig.openSeaMetadata}`);

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        tileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                activeConfig.name,
                activeConfig.symbol,
                priceResolverAddress,
                (newProvider ? tileContentProviderAddress : ethers.constants.AddressZero),
                activeConfig.jbxDirectory,
                activeConfig.projectId,
                activeConfig.openSeaMetadata
            );

        await tileNFT.deployed();

        logger.info(`deployed new InfiniteTiles contract to ${tileNFT.address} in ${tileNFT.deployTransaction.hash}`);
        tokenAddress = tileNFT.address;

        config[hre.network.name].token = tileNFT.address;
        fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

        if(!newProvider) {
            logger.info(`updating TileContentProvider to ${tileContentProviderAddress}`);
            const tx = await tileNFT.connect(deployer).setTokenUriResolver(tileContentProviderAddress);
            await tx.wait();
        }

        newToken = true;
    } else {
        logger.info(`InfiniteTiles contract reported at ${tokenAddress}`);

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        tileNFT = await tileNFTFactory.attach(tokenAddress);

        if (newProvider) {
            logger.info(`updating TileContentProvider to ${tileContentProviderAddress}`);
            const tx = await tileNFT.connect(deployer).setTokenUriResolver(tileContentProviderAddress);
            await tx.wait();
        }

        if (newPricer) {
            logger.info(`updating PriceResolver to ${priceResolverAddress}`);
            const tx = await tileNFT.connect(deployer).setPriceResolver(priceResolverAddress);
            await tx.wait();
        }
    }

    if (newToken || newProvider) {
        try {
            const tx = await tileContentProvider.connect(deployer).setParent(tokenAddress);
            await tx.wait();
            logger.info(`set parent on TileContentProvider at ${tileContentProviderAddress} to ${tokenAddress}`);
        } catch (err) {
            logger.error(`could not set parent on ${tileContentProviderAddress} due to ${err}`);
        }
    }

    try {
        const tx = await tileContentProvider.connect(deployer).setHttpGateways(activeConfig.gatewayAnimationUrl, activeConfig.gatewayPreviewUrl);
        await tx.wait();
        logger.info(`set http gateways on TileContentProvider at ${tileContentProviderAddress} to ${activeConfig.gatewayAnimationUrl}, ${activeConfig.gatewayPreviewUrl}`);
    } catch (err) {
        logger.error(`could not set http gateway on ${tileContentProviderAddress} due to ${err}`);
    }

    for await (const minter of activeConfig.minters) {
        try {
            const tx = await tileNFT.connect(deployer).registerMinter(minter);
            await tx.wait();
            logger.info(`added minter ${minter} to ${tokenAddress}`);
        } catch (err) {
            logger.error(`could not add minter on ${tokenAddress} due to ${err}`);
        }
    }

    try {
        const tx = await tileNFT.connect(deployer).setRoyalties(tokenAddress, activeConfig.royalty);
        await tx.wait();
        logger.info(`set royalties to ${activeConfig.royalty / 10_000}`);

    } catch (err) {
        logger.error(`could set royalties on ${tokenAddress} due to ${err}`);
    }

    for await (const gift of activeConfig.gift) {
        try {
            const tx = await tileNFT.connect(deployer).superMint(gift, gift);
            await tx.wait();
            logger.info(`minted ${gift} to ${gift}`);
        } catch (err) {
            logger.error(`failed to mint ${gift} to ${gift} due to ${err}`);
        }
    }

    if (activeConfig.manager.length != 0) {
        try {
            let tx = await tileNFT.connect(deployer).transferOwnership(activeConfig.manager);
            await tx.wait();
            logger.info(`transferred ownership of InfiniteTiles at ${tokenAddress} to ${activeConfig.manager}`);
        } catch (err) {
            logger.error(`failed to transfer ownership of InfiniteTiles at ${tokenAddress} to ${activeConfig.manager} due to ${err}`);
        }

        try {
            const tx = await tileContentProvider.connect(deployer).transferOwnership(activeConfig.manager);
            await tx.wait();
            logger.info(`transferred ownership of TileContentProvider at ${tileContentProviderAddress} to ${activeConfig.manager}`);
        } catch (err) {
            logger.error(`failed to transfer ownership of TileContentProvider at ${tileContentProviderAddress} to ${activeConfig.manager} due to ${err}`);
        }
    }

    if (newToken) {
        try {
            sleep(10_000);
            await hre.run('verify:verify', {
                address: tokenAddress,
                constructorArguments: [
                    activeConfig.name,
                    activeConfig.symbol,
                    priceResolverAddress,
                    (newProvider ? tileContentProviderAddress : ethers.constants.AddressZero),
                    activeConfig.jbxDirectory,
                    activeConfig.projectId,
                    activeConfig.openSeaMetadata
                ],
            });
        } catch (err) {
            logger.error('Could not register contract code', err);
        }
    }

    if (newProvider) {
        try {
            sleep(10_000);
            await hre.run('verify:verify', {
                address: tileContentProviderAddress,
                constructorArguments: [ ]
            });
        } catch (err) {
            logger.error('Could not register contract code', err);
        }
    }
}

main().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});


// npx hardhat run scripts/deploy.ts --network rinkeby
// npx hardhat run scripts/deploy.ts --network mainnet


// https://rinkeby.looksrare.org/collections/
// https://testnets.opensea.io/assets/rinkeby/
// https://testnet.rarible.com/collection/
// https://gnosis-safe.io/app/rin:0x3dC17b930D586b70AD2Bb7f09465bE455BFA8fE6/home

// grumpy price resolver 0x363245BFe4554Fd57040F2C4695f713c45Fb28c1
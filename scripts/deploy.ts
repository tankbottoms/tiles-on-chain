import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers } from 'hardhat';
import * as winston from 'winston';

enum PriceFunction {
    LINEAR,
    EXP,
}

type ConfigurationGroup = {
    name: string,
    symbol: string,
    openSeaMetadata: string,
    legacyTilesContract: string,
    projectId: number | string,
    basePrice: string,
    priceCap: string,
    multiplier: number | string,
    tierSize: number | string,
    jbxDirectory: string;
    stringHelpersLibrary: string,
    tileContentProvider: string,
    priceResolver: string,
    priceResolverType: 'SupplyPriceResolver' | 'LegacyOwnershipPriceResolver' | 'MerkleRootPriceResolver',
    token: string
}

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
    if (!tileContentProviderAddress || tileContentProviderAddress.length === 0) {
        logger.info(`deploying TileContentProvider`);

        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();
        await tileContentProvider.deployed();

        logger.info(`deployed new TileContentProvider contract to ${tileContentProvider.address} in ${tileContentProvider.deployTransaction.hash}`);
        tileContentProviderAddress = tileContentProvider.address;

        config[hre.network.name].tileContentProvider = tileContentProvider.address;
        fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));

        newProvider = true;
    } else {
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
        } else if (activeConfig.priceResolverType === 'MerkleRootPriceResolver') {
            // TODO
        }
    } else {
        logger.info(`LegacyOwnershipPriceResolver contract reported at ${priceResolverAddress}`);
    }

    let tokenAddress = activeConfig.token;
    if (!tokenAddress || tokenAddress.length === 0) {
        logger.debug(`deploying InfiniteTiles with params: ${activeConfig.name}, ${activeConfig.symbol}, '', ${priceResolverAddress}, ${tileContentProviderAddress}, ${activeConfig.jbxDirectory}, ${activeConfig.projectId}, ${activeConfig.openSeaMetadata}`);

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        const tileNFT = await tileNFTFactory
            .connect(deployer)
            .deploy(
                activeConfig.name,
                activeConfig.symbol,
                '',
                priceResolverAddress,
                tileContentProviderAddress,
                activeConfig.jbxDirectory,
                activeConfig.projectId,
                activeConfig.openSeaMetadata
            );

        await tileNFT.deployed();

        logger.info(`deployed new InfiniteTiles contract to ${tileNFT.address} in ${tileNFT.deployTransaction.hash}`);
        tokenAddress = tileNFT.address;

        config[hre.network.name].token = tileNFT.address;
        fs.writeFileSync('./scripts/config.json', JSON.stringify(config, undefined, 4));
    } else {
        logger.info(`InfiniteTiles contract reported at ${tokenAddress}`);

        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        const tileNFT = await tileNFTFactory.attach(tokenAddress);
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

    try {
        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        const tileContentProvider = await tileContentProviderFactory.attach(tileContentProviderAddress);
        const tx = await tileContentProvider.connect(deployer).setParent(tokenAddress);
        await tx.wait();
        logger.info(`set parent on TileContentProvider at ${tileContentProviderAddress} to ${tokenAddress}`);
    } catch (err) {
        logger.error(`could not set parent on ${tileContentProviderAddress} due to ${err}`);
    }

    try {
        const httpGateway = 'https://ipfs.io/ipfs/bafybeifkqnc5d2jqrotfx4dz3ye3lxgtaasqfh2exnar5incy35nbwlbrm/';
        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        const tileContentProvider = await tileContentProviderFactory.attach(tileContentProviderAddress);
        const tx = await tileContentProvider.connect(deployer).setHttpGateway(httpGateway);
        await tx.wait();
        logger.info(`set http gateway on TileContentProvider at ${tileContentProviderAddress} to ${httpGateway}`);
    } catch (err) {
        logger.error(`could not set http gateway on ${tileContentProviderAddress} due to ${err}`);
    }

    try {
        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        const token = await tileNFTFactory.attach(tokenAddress);
        const minters = [
            '0x63a2368f4b509438ca90186cb1c15156713d5834',
            '0x823b92d6a4b2aed4b15675c7917c9f922ea8adad'
        ];

        for await (const minter of minters) {
            const tx = await token.connect(deployer).registerMinter(minter);
            await tx.wait();
            logger.info(`added minter ${minter} to ${tokenAddress}`);
        }
    } catch (err) {
        logger.error(`could not add minter on ${tokenAddress} due to ${err}`);
    }

    try {
        const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
        const token = await tileNFTFactory.attach(tokenAddress);

        const tx = await token.connect(deployer).setRoyalties(tokenAddress, 500);
        await tx.wait();
        logger.info(`set royalties to ${500/10_000}`);
        
    } catch (err) {
        logger.error(`could set royalties on ${tokenAddress} due to ${err}`);
    }

    const mints = [
        { owner: `${deployer.address}`, tile: `${deployer.address}` }
    ];

    for await (const mint of mints) {
        try {
            const tileNFTFactory = await ethers.getContractFactory('InfiniteTiles', deployer);
            const token = await tileNFTFactory.attach(tokenAddress);

            const tx = await token.connect(deployer).superMint(mint.owner, mint.tile);
            await tx.wait();
            logger.info(`minted ${mint.tile} to ${mint.owner}`);
        } catch (err) {
            logger.error(`failed to mint ${mint.tile} to ${mint.owner} due to ${err}`);
        }
    }

    try {
        sleep(30_000);
        await hre.run('verify:verify', {
            address: tokenAddress,
            constructorArguments: [
                activeConfig.name,
                activeConfig.symbol,
                '',
                priceResolverAddress,
                tileContentProviderAddress,
                activeConfig.jbxDirectory,
                activeConfig.projectId,
                activeConfig.openSeaMetadata
            ],
        });
    } catch (err) {
        logger.error('Could not register contract code', err);
    }
}

main().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});

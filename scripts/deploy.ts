import * as hre from 'hardhat';
import { ethers } from 'hardhat';
import * as winston from 'winston';

enum PriceFunction {
    LINEAR,
    EXP,
}

function sleep(ms = 1_000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const config: any = {
    rinkeby: {
        name: 'Infinite Tiles 2.0',
        symbol: 'TILES2',
        openSeaMetadata: 'ipfs://QmShnESruGc1tUAEStzULuFHGcCZV1RXepBGbFKjGBiC2z',
        legacyTilesContract: '0x64931F06d3266049Bf0195346973762E6996D764',
        projectId: '4471',
        basePrice: '100000000000000',
        priceCap: '128000000000000000000',
        multiplier: 2,
        tierSize: 16,
        jbxDirectory: '0x1A9b04A9617ba5C9b7EBfF9668C30F41db6fC21a',
        stringHelpersLibrary: '0x761ae59025436edaa6496f76A63822DF9D0AF836',
        tileContentProvider: '0x211bc00B9C0d69956701329705Da5281F475f996',
        priceResolver: '0x396d3a1bE8c298893A912eb2ad6cACaB82f360e0',
        token: '0x2DC5372d0ebBDEe29E962bB7a7947A3278822300'
    },
    mainnet: {
        name: 'Infinite Tiles 2.0',
        symbol: 'TILES2',
        openSeaMetadata: 'ipfs://QmShnESruGc1tUAEStzULuFHGcCZV1RXepBGbFKjGBiC2z',
        legacyTilesContract: '0x64931F06d3266049Bf0195346973762E6996D764',
        projectId: '41',
        basePrice: ethers.utils.parseEther('0.0001'),
        priceCap: ethers.utils.parseEther('128'),
        multiplier: 2,
        tierSize: 512,
        jbxDirectory: '0xCc8f7a89d89c2AB3559f484E0C656423E979ac9C',
        stringHelpersLibrary: '0xa8c720adbea12435a7a2678bbeba821c7a94d48d',
        tileContentProvider: '0xe6c34eb2a17e16049c3ada1ae19ef02f94ba1b97',
        priceResolver: '0x30ebbf18cc7286105e0d02cb06ee78684aff722c',
        token: ''
    }
}

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

    const activeConfig: any = config[hre.network.name];
    const [deployer] = await ethers.getSigners();

    logger.info(`deploying tiles on ${hre.network.name} as ${deployer.address}`);

    let stringHelpersLibraryAddress = activeConfig.stringHelpersLibrary;
    if (!stringHelpersLibraryAddress || stringHelpersLibraryAddress.length === 0) {
        logger.info(`deploying StringHelpers`);

        const stringHelpersFactory = await ethers.getContractFactory('StringHelpers', deployer);
        const stringHelpersLibrary = await stringHelpersFactory.connect(deployer).deploy();
        await stringHelpersLibrary.deployed();

        logger.info(`deployed new StringHelpers contract to ${stringHelpersLibrary.address}`);
        stringHelpersLibraryAddress = stringHelpersLibrary.address;
    } else {
        logger.info(`StringHelpers contract reported at ${stringHelpersLibraryAddress}`);
    }

    let tileContentProviderAddress = activeConfig.tileContentProvider;
    if (!tileContentProviderAddress || tileContentProviderAddress.length === 0) {
        logger.info(`deploying TileContentProvider`);

        const tileContentProviderFactory = await ethers.getContractFactory('TileContentProvider', {
            libraries: { StringHelpers: stringHelpersLibraryAddress },
            signer: deployer,
        });
        const tileContentProvider = await tileContentProviderFactory.connect(deployer).deploy();
        await tileContentProvider.deployed();

        logger.info(`deployed new TileContentProvider contract to ${tileContentProvider.address}`);
        tileContentProviderAddress = tileContentProvider.address;
    } else {
        logger.info(`TileContentProvider contract reported at ${tileContentProviderAddress}`);
    }

    let priceResolverAddress = activeConfig.priceResolver;
    if (!priceResolverAddress || priceResolverAddress.length === 0) {
        logger.debug(`deploying LegacyOwnershipPriceResolver with params: ${activeConfig.legacyTilesContract}, ${activeConfig.basePrice}, ${activeConfig.multiplier}, ${activeConfig.tierSize}, ${activeConfig.priceCap}, ${PriceFunction.LINEAR}`);

        const legacyOwnershipPriceResolverFactory = await ethers.getContractFactory('LegacyOwnershipPriceResolver', deployer);
        const legacyOwnershipPriceResolver = await legacyOwnershipPriceResolverFactory
            .connect(deployer)
            .deploy(
                activeConfig.legacyTilesContract,
                activeConfig.basePrice,
                activeConfig.multiplier,
                activeConfig.tierSize,
                activeConfig.priceCap,
                PriceFunction.LINEAR
            );
        await legacyOwnershipPriceResolver.deployed();

        logger.info(`deployed new LegacyOwnershipPriceResolver contract to ${legacyOwnershipPriceResolver.address}`);
        priceResolverAddress = legacyOwnershipPriceResolver.address;
    } else {
        logger.info(`LegacyOwnershipPriceResolver contract reported at ${priceResolverAddress}`);
    }

    let tokenAddress = activeConfig.token;
    if (!tokenAddress || tokenAddress.length === 0) {
        logger.debug(`deploying TileNFT with params: ${activeConfig.name}, ${activeConfig.symbol}, '', ${priceResolverAddress}, ${tileContentProviderAddress}, ${activeConfig.jbxDirectory}, ${activeConfig.projectId}, ${activeConfig.openSeaMetadata}`);

        const tileNFTFactory = await ethers.getContractFactory('TileNFT', deployer);
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

        logger.info(`deployed new TileNFT contract to ${tileNFT.address}`);
        tokenAddress = tileNFT.address;
    } else {
        logger.info(`TileNFT contract reported at ${tokenAddress}`);
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

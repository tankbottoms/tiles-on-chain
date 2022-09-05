import * as dotenv from "dotenv";
import { ethers } from 'hardhat';
import fetch from 'node-fetch';
import * as winston from 'winston';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

dotenv.config();

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
            filename: 'log/og-mint.log',
            handleExceptions: true,
            maxsize: (5 * 1024 * 1024), // 5 mb
            maxFiles: 5
        })
    ]
});

const provider = ethers.provider;

async function getAbiForAddress(contractAddress: string, network = 'mainnet') {
    const etherscanKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api${network != 'mainnet' ? `-${network}`: ''}.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`;

    const abi = await fetch(url)
        .then((response) => response.json())
        .then((data) => JSON.parse(data['result']));

    return abi;
}

async function getGasPrice(network = 'mainnet') {
    const etherscanKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api${network != 'mainnet' ? `-${network}`: ''}.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${etherscanKey}`;

    const result = await fetch(url)
        .then((response) => response.json())
        .then((data) => data['result']);

    return result;
}

async function waitForGasPrice(gasPriceLimit: number, network = 'mainnet') {
    const startTime = Date.now();
    let checkpoint = Date.now();

    let gasSummary = await getGasPrice(network);
    let gasFloor = Number(gasSummary['SafeGasPrice']);
    let currentGas = gasFloor;
    while (currentGas > gasPriceLimit) {
        await sleep(30_000);

        if (Date.now() - checkpoint > 5 * 60 * 1000) {
            logger.info(`ran for ${Math.floor((Date.now() - startTime) / (60 * 1000))} min, lowest gas: ${gasFloor}, current: ${currentGas}`);
            checkpoint = Date.now();
        }

        try {
            currentGas = Number((await getGasPrice())['SafeGasPrice']);
        } catch {
            currentGas = 999_999;
        }

        if (currentGas < gasFloor) {
            gasFloor = currentGas;
        }
    }
}

function sleep(ms = 1_000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function legacyTiles() {
    const oldTokenAddress = '0x64931F06d3266049Bf0195346973762E6996D764';
    const newTokenAddress = '0x4ddeF8Fc8EEE89848b4A802CEF9FC9E72B8674A4';

    let deployer: SignerWithAddress;
    let newTileNFT: any;
    let oldTileNFT: any;

    [deployer] = await ethers.getSigners();

    const oldTokenAbi = await getAbiForAddress(oldTokenAddress);
    oldTileNFT = new ethers.Contract(oldTokenAddress, oldTokenAbi);

    const newTokenAbi = await getAbiForAddress(newTokenAddress);
    newTileNFT = new ethers.Contract(newTokenAddress, newTokenAbi);

    const oldTileCount = (await oldTileNFT.connect(deployer).totalSupply()).toNumber();

    logger.info(`connected as ${deployer.address}`);
    let mintPairs: any[] = [];
    for (let i = 1; i <= oldTileCount; i++) {
        const tileAddress = await oldTileNFT.connect(deployer).tileAddressOf(i);
        const oldOwner = await oldTileNFT.connect(deployer).ownerOf(i);
        if (oldOwner === '0x000000000000000000000000000000000000dEaD') { continue; }

        const newTileIndex = (await newTileNFT.connect(deployer).idForAddress(tileAddress)).toNumber();

        if (newTileIndex === 0) {
            mintPairs.push({ owner: oldOwner, tile: tileAddress });
        } else {
            const newOwner = await newTileNFT.connect(deployer).ownerOf(newTileIndex);
            if (newOwner == oldOwner) {
                logger.info(`${tileAddress} already owned by ${oldOwner}`);
            } else {
                logger.info(`${tileAddress} owned by ${newOwner}, not ${oldOwner}, CANNOT mint`);
            }
        }
    }

    logger.info(`found ${mintPairs.length} mintable tiles from ${oldTokenAddress}`);
    mintPairs = mintPairs.slice(0, 2);
    logger.info(`reduce to ${mintPairs.length} mintable tiles`);

    const desiredGas = 6; // in gwei
    for await (const pair of mintPairs) {
        await waitForGasPrice(desiredGas);

        const nonce = await provider.getTransactionCount(deployer.address);

        logger.info(`minting ${pair.tile} to OG ${pair.owner} on ${newTokenAddress}`);
        try {
            const gasOptions = { nonce, type: 2, maxFeePerGas: desiredGas * 1_000_000_000, maxPriorityFeePerGas: 2_000_000_000, gasLimit: 300_000 };
            const tx = await newTileNFT.connect(deployer).superMint(pair.owner, pair.tile, gasOptions);

            const receipt = await tx.wait();
            logger.info(`minted ${pair.tile} to OG ${pair.owner}}`);
        } catch (err) {
            logger.error(`failed to mint ${pair.tile} to OG ${pair.owner}`);
            logger.error(err);
        }
    }
}

async function veeTwoTiles() {
    const network = 'rinkeby';
    const oldTokenAddress = '0x3A31414dFbA8B20D3bDa767092984db9d98a2da1';
    const newTokenAddress = '0x08214180E91b03340e759f98f8AC8dc92C0bf2de';

    // const network = 'mainnet';
    // const oldTokenAddress = '0x4ddeF8Fc8EEE89848b4A802CEF9FC9E72B8674A4';
    // const newTokenAddress = '';

    let deployer: SignerWithAddress;
    let newTileNFT: any;
    let oldTileNFT: any;

    [deployer] = await ethers.getSigners();

    const oldTokenAbi = await getAbiForAddress(oldTokenAddress, network);
    oldTileNFT = new ethers.Contract(oldTokenAddress, oldTokenAbi);

    const newTokenAbi = await getAbiForAddress(newTokenAddress, network);
    newTileNFT = new ethers.Contract(newTokenAddress, newTokenAbi);

    const oldTileCount = (await oldTileNFT.connect(deployer).totalSupply()).toNumber();

    logger.info(`connected as ${deployer.address}`);
    let mintPairs: any[] = [];
    for (let i = 1; i <= oldTileCount; i++) {
        const tileAddress = await oldTileNFT.connect(deployer).addressForId(i);
        const oldOwner = await oldTileNFT.connect(deployer).ownerOf(i);
        if (oldOwner === '0x000000000000000000000000000000000000dEaD') { continue; }

        const newTileIndex = (await newTileNFT.connect(deployer).idForAddress(tileAddress)).toNumber();

        if (newTileIndex === 0) {
            mintPairs.push({ owner: oldOwner, tile: tileAddress });
        } else {
            const newOwner = await newTileNFT.connect(deployer).ownerOf(newTileIndex);
            if (newOwner == oldOwner) {
                logger.info(`${tileAddress} already owned by ${oldOwner}`);
            } else {
                logger.info(`${tileAddress} owned by ${newOwner}, not ${oldOwner}, CANNOT mint`);
            }
        }
    }

    logger.info(`found ${mintPairs.length} mintable tiles from ${oldTokenAddress}`);
    mintPairs = mintPairs.slice(0, 2);
    logger.info(`reduce to ${mintPairs.length} mintable tiles`);

    const desiredGas = 6; // in gwei
    for await (const pair of mintPairs) {
        await waitForGasPrice(desiredGas, network);

        const nonce = await provider.getTransactionCount(deployer.address);

        logger.info(`minting ${pair.tile} to v2.0 owner ${pair.owner} on ${newTokenAddress}`);
        try {
            const gasOptions = { nonce, type: 2, maxFeePerGas: desiredGas * 1_000_000_000, maxPriorityFeePerGas: 2_000_000_000, gasLimit: 300_000 };
            const tx = await newTileNFT.connect(deployer).superMint(pair.owner, pair.tile, gasOptions);

            const receipt = await tx.wait();
            logger.info(`minted ${pair.tile} to ${pair.owner}}`);
        } catch (err) {
            logger.error(`failed to mint ${pair.tile} to v2.0 owner ${pair.owner}`);
            logger.error(err);
        }
    }
}

async function main() {
    // await legacyTiles();
    // await veeTwoTiles();
}

main().catch((error) => {
    logger.error(error);
    logger.close();
    process.exitCode = 1;
});

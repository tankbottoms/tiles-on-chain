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

async function getAbiForAddress(contractAddress: string) {
    const etherscanKey = process.env.ETHERSCAN_API_KEY || '';

    const abi = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`,
    )
        .then((response) => response.json())
        .then((data) => JSON.parse(data['result']));

    return abi;
}

async function getGasPrice() {
    const etherscanKey = process.env.ETHERSCAN_API_KEY || '';

    const result = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${etherscanKey}`)
        .then((response) => response.json())
        .then((data) => data['result']);

    return result;
}

function sleep(ms = 1_000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
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

    logger.info(`found ${mintPairs.length} mintable tiles`);

    const startTime = Date.now();
    let checkpoint = Date.now();
    let minted = 0;
    let failed = 0;
    for await (const pair of mintPairs) {
        let gasSummary = await getGasPrice();
        logger.info(`gas ${gasSummary['SafeGasPrice']}`)
        while (Number((await getGasPrice())['SafeGasPrice']) !== 2) {
            await sleep(30_000);

            if (Date.now() - checkpoint > 30 * 60 * 1000) {
                logger.info(`ran for ${(Date.now() - startTime) / (60 * 1000)}min, minted ${minted}, failed ${failed}`);
                checkpoint = Date.now();
            }
        }

        logger.info(`minting ${pair.tile} to OG ${pair.owner}`);
        try {
            const tx = await newTileNFT.connect(deployer).superMint(pair.owner, pair.tile, { gasPrice: 2_000_000_000, gasLimit: 300_000 });
            const receipt = await tx.wait();
            minted++;
            logger.info(`minted ${pair.tile} to OG ${pair.owner}}`);
        } catch (err) {
            logger.error(`failed to mint ${pair.tile} to OG ${pair.owner}`);
            logger.error(err);
            failed++;
        }
    }    
}

main().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});

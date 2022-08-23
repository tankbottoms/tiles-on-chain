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

    for (let i = 1; i <= oldTileCount; i++) {
        const tileAddress = await oldTileNFT.connect(deployer).tileAddressOf(i);
        const oldOwner = await oldTileNFT.connect(deployer).ownerOf(i);
        if (oldOwner === '0x000000000000000000000000000000000000dEaD') { continue; }

        const newTileIndex = (await newTileNFT.connect(deployer).idForAddress(tileAddress)).toNumber();

        if (newTileIndex === 0) {
            logger.info(`minting ${tileAddress} to OG ${oldOwner}`);
            let tries = 0;
            while (tries < 10) {
                try {
                    const tx = await newTileNFT.connect(deployer).superMint(oldOwner, tileAddress, { gasPrice: 7_000_000_000, gasLimit: 300_000 });
                    const receipt = await tx.wait();
                    tries = 11;
                } catch (err) {
                    logger.info(err);
                    await sleep(10_000);
                    tries++;
                }
            }
        } else {
            const newOwner = await newTileNFT.connect(deployer).ownerOf(newTileIndex);
            if (newOwner == oldOwner) {
                logger.info(`${tileAddress} already owned by ${oldOwner}`);
            } else {
                logger.info(`${tileAddress} owned by ${newOwner}, not ${oldOwner}, CANNOT mint`);
            }
        }
    }

}

main().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});

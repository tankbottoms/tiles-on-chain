import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

import { task } from 'hardhat/config';
import { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types';
import './type-extensions';

dotenv.config();

const chainIds = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  goerli: 5,
  kovan: 42,
  polygon: 137,
  ganache: 1337,
  hardhat: 31337,
  mumbai: 80001,
};

const VERBOSE = false;

const PRIVATE_KEY =
  process.env.PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001';
const PRIVATE_MNEMONIC = process.env.PRIVATE_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const REPORT_GAS = process.env.REPORT_GAS || false;
const ALCHEMY_MAINNET_URL = process.env.ALCHEMY_MAINNET_URL || '';
const ALCHEMY_MAINNET_KEY = process.env.ALCHEMY_MAINNET_KEY || '';
const ALCHEMY_RINKEBY_URL = process.env.ALCHEMY_RINKEBY_URL || '';
const ALCHEMY_RINKEBY_KEY = process.env.ALCHEMY_RINKEBY_KEY || '';

const ACCOUNT_PATH = "m/44'/60'/0'/0";

if (ALCHEMY_MAINNET_URL == '' && ALCHEMY_MAINNET_KEY == '') {
  console.warn(`Alchemy mainnet URL and key not set.`);
} else {
  console.warn(`Alchemy mainnet ${ALCHEMY_MAINNET_URL}/${ALCHEMY_MAINNET_KEY} set.`);
}

const traverseKeys = (obj: any, results = []) => {
  const r: any = results;
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (typeof value !== 'object' || typeof value !== 'function') {
      console.log(value);
      r.push(value);
    } else if (typeof value === 'object') {
      traverseKeys(value, r);
    }
  });
  return r;
};

task('accounts', 'Prints the list of available ETH accounts:', async (args, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(await account.address);
  }
});

task('networks', 'Prints the configured ETH network settings:', async (args, hre) => {
  if (VERBOSE) {
    console.log(`Available Networks:`);
    console.log(hre['config']['networks']);
  } else {
    Object.keys(chainIds).forEach((k) => {
      console.log(`Network ${k}`);
      console.log(hre['config']['networks'][`${k}`]);
    });
  }
});

export const createInfuraConfig = (
  network: keyof typeof chainIds,
  name = 'eth',
): NetworkUserConfig => {
  const url: string = 'https://' + network + '.infura.io/v3/' + INFURA_API_KEY;
  return {
    accounts: [PRIVATE_KEY],
    chainId: chainIds[network],
    url,
  };
};

const createConfig = (network: keyof typeof chainIds, name = 'eth'): NetworkUserConfig => {
  const url = `https://${name}-${network}.alchemyapi.io/v2/${
    process.env[`${network.toUpperCase()}_ALCHEMY_API_KEY`]
  }`;
  return {
    accounts: [PRIVATE_KEY],
    chainId: chainIds[network],
    url,
  };
};

/* You need to export an object to set up your config
  Go to https://hardhat.org/config/ to learn more */
const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  gasReporter: {
    currency: 'USD',
    enabled: !!REPORT_GAS,
    showTimeSpent: true,
    gasPrice: 100,
    excludeContracts: [],
    src: './contracts',
    coinmarketcap: process?.env?.COINMARKETCAP_API_KEY,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: PRIVATE_MNEMONIC,
      },
      chainId: chainIds.hardhat,
    },
    rinkeby: {
      url: `${ALCHEMY_RINKEBY_URL}/${ALCHEMY_RINKEBY_KEY}`,
      accounts: [`${PRIVATE_KEY}`],
    },
    // mainnet: {
    //   url: `${ALCHEMY_MAINNET_URL}/${ALCHEMY_MAINNET_KEY}`,
    //   accounts: [`${PRIVATE_KEY}`],
    // },
    // mainnet_infura: {
    //   url: 'https://mainnet.infura.io/v3/' + INFURA_API_KEY,
    //   gasPrice: 50000000000,
    //   accounts: [PRIVATE_KEY || ''],
    // },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.6',
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/solidity-template/issues/31
            bytecodeHash: 'none',
          },
          // You should disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: false,
            runs: 800,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
    tests: './test',
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
};

export default config;

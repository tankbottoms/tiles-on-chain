import { BigNumber, utils } from 'ethers';

import BalanceTree from './BalanceTree';

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
interface MerkleDistributorInfo {
  merkleRoot: string;
  claims: {
    [account: string]: {
      index: number;
      data: string;
      proof: string[];
    };
  };
}

export function makeSampleSnapshot(addresses: string[]): { [key: string]: string } {
  const snapshot: { [key: string]: string } = {};

  const verified = addresses.filter((a) => utils.isAddress(a));

  for (let i = 0; i < verified.length / 2; i++) {
    snapshot[verified[i]] = verified[i];
  }

  for (let i = Math.floor(verified.length / 2); i < verified.length; i++) {
    const owner = Math.floor((Math.random() * verified.length) / 2);
    snapshot[verified[i]] = verified[owner];
  }

  return snapshot;
}

export function buildMerkleTree(snapshot: { [key: string]: string }): MerkleDistributorInfo {
  const sortedAddresses = Object.keys(snapshot).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({ account: address, data: snapshot[address] })),
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: { data: string; index: number; proof: string[] };
  }>((memo, address, index) => {
    memo[address] = {
      index,
      data: snapshot[address],
      proof: tree.getProof(index, address, snapshot[address]),
    };
    return memo;
  }, {});

  const tokenTotal: BigNumber = sortedAddresses.reduce<BigNumber>(
    (memo, key) => memo.add(snapshot[key]),
    BigNumber.from(0),
  );

  return {
    merkleRoot: tree.getHexRoot(),
    claims,
  };
}

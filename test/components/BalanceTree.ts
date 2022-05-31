import MerkleTree from './MerkleTree'
import { BigNumber, utils } from 'ethers'

export default class BalanceTree {
    private readonly tree: MerkleTree;

    constructor(balances: { account: string; data: string }[]) {
        this.tree = new MerkleTree(
            balances.map(({ account, data }, index) => {
                return BalanceTree.toNode(index, account, data);
            })
        );
    }

    public static verifyProof(
        index: number | BigNumber,
        account: string,
        data: string,
        proof: Buffer[],
        root: Buffer
    ): boolean {
        let pair = BalanceTree.toNode(index, account, data);

        for (const item of proof) {
            pair = MerkleTree.combinedHash(pair, item);
        }

        return pair.equals(root);
    }

    // keccak256(abi.encode(index, account, data))
    public static toNode(index: number | BigNumber, account: string, data: string): Buffer {
        return Buffer.from(utils.solidityKeccak256(['uint256', 'address', 'address'], [index, account, data]).slice(2), 'hex');
    }

    public getHexRoot(): string {
        return this.tree.getHexRoot();
    }

    // returns the hex bytes32 values of the proof
    public getProof(index: number | BigNumber, account: string, data: string): string[] {
        return this.tree.getHexProof(BalanceTree.toNode(index, account, data));
    }
}
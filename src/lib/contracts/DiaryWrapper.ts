import Web3 from 'web3';
import * as DiaryJSON from '../../../build/contracts/Diary.json';
import { Diary } from '../../types/Diary';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class DiaryWrapper {
    web3: Web3;

    contract: Diary;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(DiaryJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getStoredValue(fromAddress: string, number: number) {
        const data = await this.contract.methods.get(number).call({ from: fromAddress });

        return data;
    }

    async getdPubKey(fromAddress: string) {
        const data = await this.contract.methods.getdPubKey().call({ from: fromAddress });

        return data;
    }

    async getdPrivKey(fromAddress: string) {
        const data = await this.contract.methods.getdPrivKey().call({ from: fromAddress });

        return data;
    }

    async getLatestDiaryNumber(fromAddress: string) {
        const data = await this.contract.methods.getLatestDiaryNumber().call({ from: fromAddress });

        return data;
    }

    async setNewRecord(value: string, fromAddress: string) {
        const tx = await this.contract.methods.setNewRecord(value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            data: value
        });

        return tx;
    }

    async setExistingRecord(diaryNum: number, value: string, fromAddress: string) {
        const tx = await this.contract.methods.setExistingRecord(diaryNum, value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            data: value
        });

        return tx;
    }

    async deploy(fromAddress: string, dPubKey: string, dPrivKey: string) {
        const deployTx = await (this.contract
            .deploy({
                data: DiaryJSON.bytecode,
                arguments: [dPubKey, dPrivKey]
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}

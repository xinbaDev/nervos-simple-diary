/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { DiaryWrapper } from '../lib/contracts/DiaryWrapper';
import { CONFIG } from '../config';

const EthCrypto = require('eth-crypto');



async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<DiaryWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [storedValue, setStoredValue] = useState<number | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [layer2Address, setLayer2Address] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [diary, setDiary] = useState<any | undefined>();
    const [sudtBalance, setSudtBalance] = useState<number | 0>();
    const toastId = React.useRef(null);
    const [newStoredInputValue, setNewStoredInputValue] = useState<
        string | undefined
    >();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];


    async function getLater2Address(account: string, web3: Web3) {
        const addressTranslator = new AddressTranslator();
        const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, account);
        console.log(depositAddress.addressString)
        return depositAddress.addressString
    }

    // we only need the balanceOf
    const CompiledContractArtifact = require(`../abi/ERC20.json`);

    const SUDT_PROXY_CONTRACT_ADDRESS = "0xE674ae36a9242Ca285E1BBcf8e9973B4B72C0333";

    async function getSUDTBalance(account: string, web3: Web3, polyjuiceAddress:string) {
        console.log(polyjuiceAddress);
        const contract = new web3.eth.Contract(CompiledContractArtifact.abi, SUDT_PROXY_CONTRACT_ADDRESS);
        const balance = await contract.methods.balanceOf(polyjuiceAddress).call({
            from: account
        })
        console.log(balance);

        return balance
    }

    async function deployContract() {
        const _contract = new DiaryWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            // create diary pub/priv key for encryption/decryption
            const diary = EthCrypto.createIdentity();
            setDiary(diary);

            const transactionHash = await _contract.deploy(account, diary.publicKey, diary.privateKey);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function getLatestDiary() {
        const num_str = await contract.getLatestDiaryNumber(account);
        const num = parseInt(num_str, 10)
        if (num) await getStoredValue(num - 1);
    }

    async function getStoredValue(diaryNum: number) {
        const encryptedString = await contract.getStoredValue(account, diaryNum);
        console.log(encryptedString);
        if (!encryptedString[0]) return;
        const encryptedObject = EthCrypto.cipher.parse(encryptedString[0]);

        var privKey;
        if (!diary) {
            privKey = await contract.getdPrivKey(account);
        } else {
            privKey = diary.privateKey;
        }
        console.log(diary)
        console.log(privKey)
        const decrypted = await EthCrypto.decryptWithPrivateKey(
            privKey,
            encryptedObject
        );
        const decryptedPayload = JSON.parse(decrypted);
        toast('Successfully get the diary' , { type: 'success' });
        setNewStoredInputValue(decryptedPayload);
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new DiaryWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
    }

    async function setNewStoredValue() {
        try {
            var pubKey;
            if (!diary) {
                pubKey = await contract.getdPubKey(account);
            } else {
                pubKey = diary.publicKey
            }
            setTransactionInProgress(true);
            const encrypted = await EthCrypto.encryptWithPublicKey(
                pubKey, // by encryping with bobs publicKey, only bob can decrypt the payload with his privateKey
                JSON.stringify(newStoredInputValue) // we have to stringify the payload before we can encrypt it
            );
            const encryptedString = EthCrypto.cipher.stringify(encrypted);
            await contract.setNewRecord(encryptedString, account);
            toast(
                'Successfully save.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
                const l2Address = await getLater2Address(_accounts[0], _web3);
                setLayer2Address(l2Address);
                const addressTranslator = new AddressTranslator();
                const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(_accounts[0]);
                const balance = await getSUDTBalance(_accounts[0], _web3, polyjuiceAddress);
                setSudtBalance(balance);
            }

            console.log(_accounts[0])
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            Your Layer 2 Deposit Address on Layer 1: <b>{layer2Address}</b>
            <br />
            use <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos">nervos bridge</a> to transfer token to layer2
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br />
            Your SUDT balance: {sudtBalance}
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            Deploy transaction hash: <b>{deployTxHash || '-'}</b>
            <br />
            <hr />
            <p>
                The button below will deploy a diary smart contract where you can store an encrypted diary.
                For now the encryption key is stored on chain, and only the contract owner can get access to it.
            </p>
            <button onClick={deployContract} disabled={!l2Balance}>
                Deploy diary contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing diary contract address"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />

            <br />
            <br />
            <textarea
                onChange={e => setNewStoredInputValue(e.target.value)}
                value={newStoredInputValue}
            />
            <br/>
            <button onClick={getLatestDiary} disabled={!contract}>
                Get latest diary
            </button>
            <button onClick={setNewStoredValue} disabled={!contract}>
                Save
            </button>
            <br />
            <br />
            <br />
            <br />
            <ToastContainer />
        </div>
    );
}

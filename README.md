# gitcoin7 hackathon

## Start UI:

```
yarn && yarn build && yarn ui
```

## How does it works

The front end generates a public/private key pair using the eth-crypto package and stores those keys on chain when deploying the diary contract. Only the contract owner is allowed to get access to those keys. The diary is encrypted using the public key and decrypted by using the private key.
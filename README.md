# Sticky Contracts

## Deployed Contracts

Contract | Deployed
---------|-----------------
factory |  [0x85f14ebccb8311e8213ad65fbea8a3d3c3acfaae](https://polygonscan.com/address/0x85f14ebccb8311e8213ad65fbea8a3d3c3acfaae)
usdcPool |  [0x9eDC68A520A727076dc8Cc612Fed5018AB9df6BA](https://polygonscan.com/address/0x9eDC68A520A727076dc8Cc612Fed5018AB9df6BA)
usdtPool |  [0x79699bBa3051B246B9C12F1489676b5008fAB180](https://polygonscan.com/address/0x79699bBa3051B246B9C12F1489676b5008fAB180)
usdtHelper |  [0xff7ad69E5F44FD727a139A6CBcf32936051EDbDD](https://polygonscan.com/address/0xff7ad69E5F44FD727a139A6CBcf32936051EDbDD)
daiPool |  [0x00F145D39Ef31db556Ff29E4e343c4081c06C701](https://polygonscan.com/address/0x00F145D39Ef31db556Ff29E4e343c4081c06C701)
daiHelper |  [0x9d178288b6e6a0C36D6961279cA21e1c612a6FBe](https://polygonscan.com/address/0x9d178288b6e6a0C36D6961279cA21e1c612a6FBe)
wmaticPool |  [0xb6a3586F8d51A878dC6d883af73bac2A931eB4fe](https://polygonscan.com/address/0xb6a3586F8d51A878dC6d883af73bac2A931eB4fe)
wmaticHelper |  [0xDd639257817992Ca5167386ACE42b31C11926C93](https://polygonscan.com/address/0xDd639257817992Ca5167386ACE42b31C11926C93)

## Installation

```
$ git clone https://github.com/numtel/sticky-contracts.git
$ cd sticky-contracts
$ npm install
```

Download the `solc` compiler. This is used instead of `solc-js` because it is much faster. Binaries for other systems can be found in the [Ethereum foundation repository](https://github.com/ethereum/solc-bin/).
```
$ curl -o solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.13+commit.abaa5c0e
$ chmod +x solc
```

## Testing Contracts

```
# Build contracts before running tests
$ npm run build-test
$ npm run build-dev

$ npm test
```

## Initiating a new epoch

Coming soon...

## License

MIT


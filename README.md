# Sticky Contracts

## Deployed Contracts

Contract | Deployed
---------|-----------------
factory |  [0xCA36208034a68974224e9942c106828beAb30308](https://polygonscan.com/address/0xCA36208034a68974224e9942c106828beAb30308)
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

Must have `sticky-oracle.json` configuration file in parent directory of repository.

Building the contracts is not required since the `StickyFactory.abi` is included in the `utils` directory.

The epoch data is in a JSON file with an object using the reward recipient as the key and the relative reward share as the value.

```
{
  "0x182dA9ECA9234A4c67E2355534c368e707DF8911": 100, // Receive 1/3 of reward
  "0x10EAa49CA7BE989331fF360EB9C74438393AA7B7": 200  // Receive 2/3 or reward
}
```

Invoke the script:

```
$ npm run epoch utils/exampleEpoch.json
```

## License

MIT


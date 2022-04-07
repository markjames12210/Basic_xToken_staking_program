## Condition
Using Anchor, we'd like you to build a basic xToken staking program. A user should be able to deposit a specific token into a program-controlled vault and receive a proof of staking (PoS) token 1:1, and conversely redeem the PoS token for the locked tokens. Tests must be included.

## Development Environment
- solana version
  solana-cli 1.8.14
- yarn version
  1.22.17

## Run

- set provider wallet (Anchor.toml)
  ```
  [provider]
  cluster = "localnet"
  wallet = "~/.config/solana/id.json"         //<= change this line
  ```

- install packages
  ```
  yarn install
  ```

- set to localhost (local network)
  ```
  solana config set --url localhost
  ```
  
- build
  ```
  anchor build
  ```
- test
  ```
  anchor test
  ```

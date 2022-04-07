import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { BasicXTokenStaking } from "../target/types/basic_x_token_staking";
import * as fs from "fs";
import {Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import utils from "./utils";
import * as assert from "assert";

describe("basic_xToken_staking", () => {
  const provider = anchor.Provider.env();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  let xTokenMintAccount: anchor.web3.Keypair;
  let xTokenMintObject: Token;
  let xTokenMintPubkey: anchor.web3.PublicKey;
  let posTokenMintAccount: anchor.web3.Keypair;
  let posTokenMintObject: Token;
  let posTokenMintPubkey: anchor.web3.PublicKey;
  let poolPubkey: anchor.web3.PublicKey;
  let poolBump: number;

  const program = anchor.workspace.BasicXTokenStaking as Program<BasicXTokenStaking>;

  const xTokenAmount = 100;
  const xTokenSendAmount = 5;
  const airDropAmount = 1;

  it("Is initialized!", async () => {
    program.addEventListener('LogHandler', (e, s) => {
        console.log("Amount: ", e.amount.toString());
    });
    const path = require("path");
    let rawData = fs.readFileSync(path.resolve(__dirname, "./keys/xTokenSecurity.json"), "utf-8");
    let keyData = JSON.parse(rawData);
    xTokenMintAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    xTokenMintObject = await utils.createMint(xTokenMintAccount, provider, provider.wallet.publicKey, null, 0, TOKEN_PROGRAM_ID);
    xTokenMintPubkey = xTokenMintObject.publicKey;
    console.log("xTokenPubKey: ", xTokenMintPubkey.toString());
    [poolPubkey, poolBump] = await anchor.web3.PublicKey.findProgramAddress([xTokenMintPubkey.toBuffer()], program.programId);
    rawData = fs.readFileSync(path.resolve(__dirname, "./keys/posTokenSecurity.json"), "utf-8");
    keyData = JSON.parse(rawData);
    posTokenMintAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    posTokenMintObject = await utils.createMint(posTokenMintAccount, provider, poolPubkey, null, 0, TOKEN_PROGRAM_ID);
    posTokenMintPubkey = posTokenMintObject.publicKey;
    console.log("posTokenPubKey: ", posTokenMintPubkey.toString());
    [poolPubkey, poolBump] = await anchor.web3.PublicKey.findProgramAddress([xTokenMintPubkey.toBuffer()], program.programId);
    console.log("Pool PubKey: ", poolPubkey.toString());
    const tx = await program.rpc.initialize(
        poolBump,
        {
            accounts: {
                xTokenMint: xTokenMintPubkey,
                tokenPool: poolPubkey,
                initializer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }
        }
    );
    console.log("Your transaction signature", tx);
  });

  let walletXTokenAccount: anchor.web3.PublicKey;
  let walletPOSTokenAccount: anchor.web3.PublicKey;
  it('Mint 100 X-Token', async () => {
      walletXTokenAccount = await xTokenMintObject.createAssociatedTokenAccount(provider.wallet.publicKey);
      walletPOSTokenAccount = await posTokenMintObject.createAssociatedTokenAccount(provider.wallet.publicKey);
      await utils.mintToAccount(provider, xTokenMintPubkey, walletXTokenAccount, xTokenAmount);
      assert.strictEqual(await utils.getTokenBalance(provider, walletXTokenAccount), xTokenAmount);
  });

  it('Start Staking: X-Token send to pool', async () => {
      await program.rpc.stake(
          poolBump,
          new anchor.BN(xTokenSendAmount),
          {
              accounts: {
                  xTokenMint: xTokenMintPubkey,
                  posTokenMint: posTokenMintPubkey,
                  sender: walletXTokenAccount,
                  senderAuthority: provider.wallet.publicKey,
                  tokenPool: poolPubkey,
                  receiver: walletPOSTokenAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
              }
          }
      );
      assert.strictEqual(await utils.getTokenBalance(provider, walletXTokenAccount), (xTokenAmount - xTokenSendAmount));
      assert.strictEqual(await utils.getTokenBalance(provider, walletPOSTokenAccount), xTokenSendAmount);
      assert.strictEqual(await utils.getTokenBalance(provider, poolPubkey), xTokenSendAmount);
  });

  it('Airdrop some tokens to the pool', async () => {
      await utils.mintToAccount(provider, xTokenMintPubkey, poolPubkey, airDropAmount);
      assert.strictEqual(await utils.getTokenBalance(provider, walletXTokenAccount), (xTokenAmount - xTokenSendAmount));
      assert.strictEqual(await utils.getTokenBalance(provider, walletPOSTokenAccount), xTokenSendAmount);
      assert.strictEqual(await utils.getTokenBalance(provider, poolPubkey), (xTokenSendAmount + airDropAmount));
  });

  it('Redeem POS-Token for X-Token', async () => {
      await program.rpc.unstake(
          poolBump,
          new anchor.BN(xTokenSendAmount),
          {
              accounts: {
                  xTokenMint: xTokenMintPubkey,
                  posTokenMint: posTokenMintPubkey,
                  withdrawToken: walletPOSTokenAccount,
                  withdrawTokenAuthority: provider.wallet.publicKey,
                  tokenPool: poolPubkey,
                  receiveToken: walletXTokenAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
              }
          }
      );
      assert.strictEqual(await utils.getTokenBalance(provider, walletXTokenAccount), (xTokenAmount + airDropAmount));
      assert.strictEqual(await utils.getTokenBalance(provider, walletPOSTokenAccount), 0);
      assert.strictEqual(await utils.getTokenBalance(provider, poolPubkey), 0);
  });
});

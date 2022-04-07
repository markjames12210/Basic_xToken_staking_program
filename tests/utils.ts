import * as anchor from "@project-serum/anchor";
import {MintLayout, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {CreateAccountParams} from "@solana/web3.js";
import {Provider} from "@project-serum/anchor";

export default class utils {
    static async createMint(
        mintAccount: anchor.web3.Keypair,
        provider: any,
        mintAuthority: anchor.web3.PublicKey,
        freezeAuthority: anchor.web3.PublicKey | null,
        decimals: number,
        programId: anchor.web3.PublicKey,
    ) {
        const token = new Token(
            provider.connection,
            mintAccount.publicKey,
            programId,
            provider.wallet.payer,
        );

        const balancedNeeded = await Token.getMinBalanceRentForExemptMint(provider.connection);

        const transaction = new anchor.web3.Transaction();
        transaction.add(
            anchor.web3.SystemProgram.createAccount(<CreateAccountParams>{
                fromPubkey: provider.wallet.payer.publicKey,
                newAccountPubkey: mintAccount.publicKey,
                lamports: balancedNeeded,
                space: MintLayout.span,
                programId
            }),
        );
        transaction.add(
            Token.createInitMintInstruction(
                programId,
                mintAccount.publicKey,
                decimals,
                mintAuthority,
                freezeAuthority,
            ),
        );

        await provider.send(transaction, [mintAccount]);
        return token;
    }

    static async mintToAccount(
        provider: Provider,
        mint: anchor.web3.PublicKey,
        destination: anchor.web3.PublicKey,
        amount: number,
    ) {
        const tx = new anchor.web3.Transaction();
        tx.add(Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint,
            destination,
            provider.wallet.publicKey,
            [],
            amount,
        ));
        await provider.send(tx);
    }

    static async getTokenBalance(provider: Provider, pubkey: anchor.web3.PublicKey) {
        return parseInt((await provider.connection.getTokenAccountBalance(pubkey)).value.amount);
    }
}

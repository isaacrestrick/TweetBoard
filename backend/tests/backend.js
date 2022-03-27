const { BN } = require('@project-serum/anchor');
const anchor = require('@project-serum/anchor');
const { SystemProgram } = anchor.web3;

const main = async() => {
  console.log("Running Test")

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Backend;
  const baseAccount = anchor.web3.Keypair.generate();
  let tx = await program.rpc.startProgram({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseAccount],
  });
  let tx2 = await program.rpc.registerUser({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
    }
  });
  console.log("📝 Your transaction signature", tx);

  let account = await program.account.baseAccount.fetch(baseAccount.publicKey);
  
  
  /*
  testing

  */

  // You'll need to now pass a tweet link to the function! You'll also need to pass in the user submitting the tweet!
  await program.rpc.submitTweet("123",new BN(3),new BN(3), {
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
    },
  });

  await program.rpc.resubmitTweet("123", {
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
    },
  });
  
  // Call the account.
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);
  // Access tweet_list on the account!
  console.log('👀 Tweet List', account.tweets)
  console.log('👀 monies List', account.tokenRegistry)
}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
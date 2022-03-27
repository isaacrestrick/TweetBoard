import React, { useEffect, useState } from 'react';
import './App.css';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {TwitterTweetEmbed} from 'react-twitter-embed';
import {
  Program, Provider, web3, BN
} from '@project-serum/anchor';

import idl from './idl.json';
import kp from './keypair.json'

function TweetBox(props) {
  return <div>
    <div className='wrapper' color='white'><h1>#{props.rank}</h1></div>
    <div className='wrapper'><TwitterTweetEmbed tweetId={getTweetID(props.link)}/></div>
    <div className='wrapper'><h3>Posted by {props.poster}</h3></div>
  </div>
}

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

function getTweetID(tweetURL) {
  const pathComponents = tweetURL.split("/");
  const idWithQuery = pathComponents[pathComponents.length-1];
  const tweetId = idWithQuery.split("?")[0];
  return tweetId
}

function isResubmission(tweet_id,list_of_tweets) {
  for (const tweet in list_of_tweets) {
    if (tweet['tweetId'] === tweet_id) {
      return true;
    }
  }
  return false;
}

const App = () => {
  // State
const [walletAddress, setWalletAddress] = useState(null);
const [inputValueTweet, setInputValueTweet] = useState('');
const [inputValueEffort, setInputValueEffort] = useState('');
const [inputValueReward, setInputValueReward] = useState('');

const [tweets, setTweets] = useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

        /*
         * The solana object gives us a function that will allow us to
         * connect directly with the user's wallet!
         */
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
  const { solana } = window;

  if (solana) {
    const response = await solana.connect();
    console.log('Connected with Public Key:', response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  }
};

const sendTweet = async () => {
  if (inputValueTweet.length === 0) {
    console.log("not a tweet")
    //could be better
    return
  }
  setInputValueTweet('');
  console.log('Link to tweet:', inputValueTweet);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    
    const tweetID = getTweetID(inputValueTweet)
    const resubmission = isResubmission(tweetID, account.tweets)
    if (!resubmission) {
      if (inputValueEffort.length === 0 || inputValueReward === 0) {
        console.log("need effort & reward for a new tweet")
        return
      }
      setInputValueTweet('');
      setInputValueEffort('');
      setInputValueReward('');
      await program.rpc.submitTweet(new BN((tweetID)),new BN((inputValueEffort)),new BN((inputValueReward)), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
    }
    else {
      await program.rpc.resubmitTweet(new BN((tweetID)), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
    }
    await getTweets();
  } catch (error) {
    console.log("Error sending tweet:", error)
  }
};
  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChangeTweet = (event) => {
  const { value } = event.target;
  setInputValueTweet(value);
  };

  const onInputChangeReward = (event) => {
  const { value } = event.target;
  setInputValueReward(value);
  };

  const onInputChangeEffort = (event) => {
  const { value } = event.target;
  setInputValueEffort(value);
  };

const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new Provider(
    connection, window.solana, opts.preflightCommitment,
  );
	return provider;
}
const createTweetAccount = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    await program.rpc.start({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
    await getTweets();

  } catch(error) {
    console.log("Error creating BaseAccount account:", error)
  }
}

const renderConnectedContainer = () => {
  // If we hit this, it means the program account hasn't been initialized.
    if (tweets === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createTweetAccount}>
            Do One-Time Initialization For Tweet Program Account
          </button>
        </div>
      )
    } 
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendTweet();
            }}
          >
            <input
              type="text"
              placeholder="Enter a link to a tweet"
              value={inputValueTweet}
              onChange={onInputChangeTweet}
            />
            <input
              type="text"
              placeholder="Enter effort (# resubmissions)"
              value={inputValueEffort}
              onChange={onInputChangeEffort}
            />
            <input
              type="text"
              placeholder="Enter reward (# tokens)"
              value={inputValueReward}
              onChange={onInputChangeReward}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {tweets.map((item, index) => (
              <div className="gif-item" key={index}>
                <TwitterTweetEmbed tweetId={(item.tweetId)}/>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }
  //<img src={item.gifLink} />
  //                <TwitterTweetEmbed tweetId={getTweetID(item.gifLink)}/>


  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getTweets = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setTweets(account.tweets)
  
    } catch (error) {
      console.log("Error in getTweets: ", error)
      setTweets(null);
    }
  }
  
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching tweets...');
      getTweets()
    }
  }, [walletAddress]);

  return (
    <div className="App">
			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Something Portal</p>
          <p className="sub-text">
            Something collection
          </p>
          {/* Add the condition to show this only if we don't have a wallet address */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* We just need to add the inverse here! */}
        {walletAddress && renderConnectedContainer()}
        </div>
      </div>
    </div>
  );
};
export default App;
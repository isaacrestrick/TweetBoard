import React, { useEffect, useState } from 'react';
import './App.css';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {TwitterTweetEmbed} from 'react-twitter-embed';
import {
  Program, Provider, web3, BN
} from '@project-serum/anchor';

import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';

import idl from './idl.json';
import kp from './keypair.json'

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the tweet data.
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
  for (let i = 0; i < list_of_tweets.length; i++) { 
    if (list_of_tweets[i]['tweetId'] === tweet_id) {
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
const [tokens, setTokens] = useState(0);

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

    //register User
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    await program.rpc.registerUser({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      }
    });

    console.log('Connected with Public Key:', response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  }
};

const disconnectWallet = async () => {
  console.log('trying to dc')
  const { solana } = window;
  if (solana) {
    const response = await solana.disconnect();
    setWalletAddress(null);
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
    const resubmission = isResubmission(tweetID, tweets)
    if (!resubmission) {
      if (inputValueEffort.length === 0 || inputValueReward === 0) {
        console.log("need effort & reward for a new tweet")
        return
      }
      setInputValueTweet('');
      setInputValueEffort('');
      setInputValueReward('');
      await program.rpc.submitTweet(tweetID,new BN((inputValueEffort)),new BN((inputValueReward)), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
    }
    else {
      await program.rpc.resubmitTweet(tweetID, {
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
    await program.rpc.startProgram({
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

/*function MiningInfo(props) {
  if (props.locked) {
    return <div>
      <p color='green'>current effort: {props.currentEffort}</p>
      <p>tweet mined by: {props.miner}</p>
      </div>;
  }
  else {
    return <div><p color='yellow'>current effort: {props.currentEffort}</p></div>;
  }
}
function AuthorInfo(props) {
  const provider = getProvider();
  if (props.author === provider.wallet.publicKey) {
    return <div>
      <p>required effort: {props.totalEffort}</p>
      <p>reward tokens: {props.reward}</p>
      <p>tweet mined by: {props.author}</p>
      </div>;
  }
  else {
    return <div></div>;
  }
}*/

function TweetBox(props) {
  if (props.locked) {
    return <div className="tweetbox-mined" key={props.id}>
      <TwitterTweetEmbed tweetId={props.id}/>
    </div> 
  }
  else {
    return <div className="tweetbox-unmined" key={props.id}>
    <TwitterTweetEmbed tweetId={props.id}/>
    </div>
  }
}

function Tokens() {
  if (walletAddress === null) {
    return <></>
  }
  if (tokens === 1) {
    return <p className="sub-text">
    You have 1 tweet token.
  </p>
  }
  return <p className="sub-text">
    You have {tokens} tweet tokens.
  </p>
}

function Disconnect() {
  if (tweets === null) {
    return <></>
  }
  else {
    return <button
      className="cta-button connect-wallet-button"
      onClick={disconnectWallet}
    >Disconnect</button>
  }
  
}

const renderConnectedContainer = () => {
  // If we hit this, it means the program account hasn't been initialized.
    if (tweets === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-tweet-button" onClick={createTweetAccount}>
            Initialize the Program Account (Only needs to be done once)
          </button>
        </div>
      )
    } 
    //conver the things
    // Otherwise, we're good! Account exists. User can submit tweets.
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
            <button type="submit" className="cta-button submit-tweet-button">
              Submit
            </button>
          </form>
          <div className="tweet-grid">
            {/* We use index as the key instead, also, the src is now item.tweetLink */}
            {tweets.map(twt => (
              <TweetBox id={twt['tweetId']} locked={twt['locked']}/>
            ))}
          </div>
        </div>
      )
    }
  }

  /*
      <AuthorInfo totalEffort={twt['requiredEffort']} author={twt['author']}/>
                <MiningInfo currentEffort={twt['currentEffort']} reward={twt['reward']} locked={twt['locked']}/>

                <AuthorInfo totalEffort={twt['requiredEffort']['words']} author={twt['author']}/>
                <MiningInfo currentEffort={twt['currentEffort']['words']} reward={twt['reward']} locked={twt['locked']}/>

                <div className="tweet-item" key={twt['tweetId']}>
                <TwitterTweetEmbed tweetId={twt['tweetId']}/>
              </div>
  */

  /* <p>render green or render current effort is {twt['currentEffort']}</p>
                <p>poster of tweet: {twt['author']}</p>
                <p>render if miner != author. mined by: {twt['miner']</p> */

  //<img src={item.tweetLink} />
  //                <TwitterTweetEmbed tweetId={getTweetID(item.tweetLink)}/> <TwitterTweetEmbed tweetId={tweetID}/>


  /*
      background: -webkit-linear-gradient(left, #4e44ce, #35aee2);
  background: -webkit-linear-gradient(left, #60c657, #35aee2);

*/

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
      var twts = []
      console.log('i have ',account.tokenRegistry[0]['tokens']['words'],' tokens')

      for (let i = 0; i < account.tweets.length; i++) { 
        twts.push((account.tweets[i]))
        console.log('required effort',account.tweets[i]['requiredEffort']['words'])
        console.log('current effort',account.tweets[i]['currentEffort']['words'])
        console.log('this tweet is locked: ',account.tweets[i]['locked'])
      }

      setTweets(twts)
      var count = 0;
      for (let i = 0; i < account.tokenRegistry.length; i++) { 
        if (account.tokenRegistry[i]['userAddress'].toString() === walletAddress) {
          count = account.tokenRegistry[i]['tokens'].toNumber();
          break;
        }
      }
      console.log(count);
      setTokens(count);
  
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

<Accordion>
  <Accordion.Item eventKey="0">
    <Accordion.Header>Read rules before posting</Accordion.Header>
    <Accordion.Body>
    <ListGroup>
        <ListGroup.Item><h1 text='white'>Submission rules</h1></ListGroup.Item>
        <ListGroup.Item><p>1. Each wallet is given two tweet tokens (not an actual token on Solana) upon registration.</p></ListGroup.Item>
        <ListGroup.Item><p>2. Submitting a new tweet to the wall requires spending a tweet token. Resubmitting an existing tweet does not</p></ListGroup.Item>
        <ListGroup.Item><p>3. When a new tweet submitted, the submitter must provide a) the amount of resubmissions it takes to mine the tweet (effort) and b) the amount of tweet tokens (reward) awarded to the miner of the tweet</p></ListGroup.Item>
        <ListGroup.Item><p>4. The miner of the tweet is defined as the wallet that provides the final resubmission needed to mine the tweet. The submitter cannot be the miner.</p></ListGroup.Item>
        <ListGroup.Item><p>5. The effort and reward of a tweet are known only to the initial poster of the tweet.</p></ListGroup.Item>
      </ListGroup>
    </Accordion.Body>
  </Accordion.Item>
</Accordion>

      
			{/* This was solely added for some styling fanciness */}
      
      <Disconnect />
      
			<div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Tweet Board</p>
          <p className="sub-text">
            Mined tweets in green. Unmined tweets in yellow. Rules above.
          </p>
          <Tokens />
          
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
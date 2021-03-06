use anchor_lang::prelude::*;

declare_id!("9ibCEh3Fb39Q9cDAjSamePo2bY3BdU6fXRfSWjVLyUqo");

#[program]
pub mod backend {
  use super::*;
  pub fn start_program(ctx: Context<StartProgram>) -> Result<()> {
    //get context
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;

    //check if the user exists
    for i in 0..base_account.token_registry.len() {
      if base_account.token_registry[i].user_address.eq(&*user.to_account_info().key) {
        return Ok(())
      }
    }

    //new user
    let user_balance = TokenBalance {
      tokens: 2,
      user_address: *user.to_account_info().key,
    };
    base_account.token_registry.push(user_balance);

        
    return Ok(())
  }

  pub fn register_user(ctx: Context<RegisterUser>) -> Result<()> {
    //get context
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;

    //check if the user exists
    for i in 0..base_account.token_registry.len() {
      if base_account.token_registry[i].user_address.eq(&*user.to_account_info().key) {
        return Ok(())
      }
    }

    //new user
    let user_balance = TokenBalance {
      tokens: 2,
      user_address: *user.to_account_info().key,
    };
    base_account.token_registry.push(user_balance);
        
    return Ok(())
  }

  //add NEW tweet
  pub fn submit_tweet(ctx: Context<SubmitTweet>, tweet_id: String, required_effort: u64, reward: u64) -> Result<()> {
    //context
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;

    for i in 0..base_account.token_registry.len() {
      if base_account.token_registry[i].user_address.eq(&*user.to_account_info().key) {
        if base_account.token_registry[i].tokens == 0 {
          return Ok(())
        }
        else {
          base_account.token_registry[i].tokens -= 1;
          break;
        }
      }
    }

    // Build the struct.
    let tweet = TweetStruct {
      tweet_id: tweet_id.to_string(),
      author: *user.to_account_info().key,
      miner: *user.to_account_info().key, //None,
      required_effort: required_effort,
      current_effort: 1,
      reward: reward,
      locked: false
    };
		
	  // Add it to the tweet_list vector.
    base_account.tweets.push(tweet);
    return Ok(())
  }

  pub fn resubmit_tweet(ctx: Context<ResubmitTweet>, tweet_id: String) -> Result<()> {
    //context
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;
    //vec len or hashmap down the line maybe

    for idx in 0..base_account.tweets.len() {
      if tweet_id.to_string().eq(&base_account.tweets[idx].tweet_id) {
        if base_account.tweets[idx].locked {
          return Ok(())
        }
        else if base_account.tweets[idx].current_effort + 1 == base_account.tweets[idx].required_effort {
          base_account.tweets[idx].miner = *user.to_account_info().key;//Some(*user.to_account_info().key);
          //easy fix for some.. cant mine your own!
          if base_account.tweets[idx].miner.eq(&base_account.tweets[idx].author) {
            //this doesnt work wait... it does... because uhhh
            return Ok(())
          }
          base_account.tweets[idx].current_effort += 1;
          base_account.tweets[idx].locked = true;
          for idx2 in 0..base_account.token_registry.len() {
            if base_account.token_registry[idx2].user_address.eq(&*user.to_account_info().key) {
              base_account.token_registry[idx2].tokens += base_account.tweets[idx].reward;
              return Ok(())
            }
          }
        }
        else {
          base_account.tweets[idx].current_effort += 1;
          return Ok(())
        }
      }
    }
    Ok(())
  }

}

#[derive(Accounts)]
pub struct StartProgram<'info> {
  #[account(init, payer = user, space = 9000)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program <'info, System>,
}

// Register new wallet
#[derive(Accounts)]
pub struct RegisterUser<'info> {
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
}

// Add the signer who calls the SubmitTweet method to the struct so that we can save it
#[derive(Accounts)]
pub struct SubmitTweet<'info> {
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
}

// Add the signer who calls the ResubmitTweet method to the struct so that we can save it
#[derive(Accounts)]
pub struct ResubmitTweet<'info> {
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
}

// Token balance struct
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TokenBalance {
    pub tokens: u64,
    pub user_address: Pubkey,
}

// Tweet struct
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TweetStruct {
    pub tweet_id: String,
    pub author: Pubkey,
    pub miner: Pubkey,//Option<Pubkey>,
    pub required_effort: u64,
    pub current_effort: u64,
    pub reward: u64,
    pub locked: bool
}

// the base account
#[account]
pub struct BaseAccount {
    pub tweets: Vec<TweetStruct>,
    pub token_registry: Vec<TokenBalance>,
}
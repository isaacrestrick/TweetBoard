use anchor_lang::prelude::*;

declare_id!("9ibCEh3Fb39Q9cDAjSamePo2bY3BdU6fXRfSWjVLyUqo");

#[program]
pub mod backend {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

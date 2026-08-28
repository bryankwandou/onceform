//! Onceform Registry
//!
//! The trust layer behind Onceform. Three things live here, and nothing else:
//!
//!   1. A *pointer* to a person's identity vault. The vault itself never leaves
//!      the user's device. What lands on chain is a 32-byte commitment, so the
//!      user can prove the vault they answered from is the vault they registered
//!      without publishing a single field of it.
//!
//!   2. Attestations. An issuer vouches that a subject satisfies some claim —
//!      unique human, age band, country of residence — by writing the hash of
//!      that claim against the subject's wallet. Survey panels that compete with
//!      each other will never share a respondent database, but they can all read
//!      the same ledger. That is the part a private table cannot do.
//!
//!   3. Consent receipts. Every time a profile answers a form, both sides get a
//!      tamper-evident record of what was disclosed, to whom, and why. Consent
//!      can be withdrawn later, and the withdrawal is just as permanent as the
//!      grant.
//!
//! No personally identifying value is ever stored by this program. Every field
//! that could carry one is a hash supplied by the client.

use anchor_lang::prelude::*;

declare_id!("GiK9msFggXvftThohLKrsHjCTHVtLDiWLFij1whc2oML");

/// Ceiling on how far ahead an attestation may be dated. Two years keeps
/// issuers honest without forcing users to re-verify every few weeks.
const MAX_ATTESTATION_LIFETIME: i64 = 60 * 60 * 24 * 730;

#[program]
pub mod onceform_registry {
    use super::*;

    /// Register a wallet as a Onceform profile.
    ///
    /// `vault_commitment` is the client-side hash of the encrypted identity
    /// vault. The program treats it as an opaque 32 bytes.
    pub fn init_profile(ctx: Context<InitProfile>, vault_commitment: [u8; 32]) -> Result<()> {
        require!(vault_commitment != [0u8; 32], OnceformError::EmptyCommitment);

        let now = Clock::get()?.unix_timestamp;
        let profile = &mut ctx.accounts.profile;

        profile.authority = ctx.accounts.authority.key();
        profile.vault_commitment = vault_commitment;
        profile.created_at = now;
        profile.updated_at = now;
        profile.receipts_issued = 0;
        profile.receipts_revoked = 0;
        profile.bump = ctx.bumps.profile;

        emit!(ProfileCreated {
            authority: profile.authority,
            vault_commitment,
            created_at: now,
        });

        Ok(())
    }

    /// Point the profile at a new vault commitment.
    ///
    /// Called whenever the user edits their identity vault. Rotating on every
    /// edit is what keeps the commitment meaningful — a stale commitment would
    /// prove nothing about the answers being given today.
    pub fn rotate_vault(ctx: Context<RotateVault>, new_commitment: [u8; 32]) -> Result<()> {
        require!(new_commitment != [0u8; 32], OnceformError::EmptyCommitment);

        let profile = &mut ctx.accounts.profile;
        require!(
            new_commitment != profile.vault_commitment,
            OnceformError::CommitmentUnchanged
        );

        let previous = profile.vault_commitment;
        profile.vault_commitment = new_commitment;
        profile.updated_at = Clock::get()?.unix_timestamp;

        emit!(VaultRotated {
            authority: profile.authority,
            previous,
            current: new_commitment,
            rotated_at: profile.updated_at,
        });

        Ok(())
    }

    /// Write an attestation from the signing issuer against a subject wallet.
    ///
    /// The issuer is whoever signs. Onceform does not gatekeep the issuer set —
    /// verifiers decide which issuers they trust, the same way TLS clients
    /// decide which roots they trust. `claim_hash` binds the schema to its
    /// value off chain; the raw value stays with the issuer and the subject.
    pub fn issue_attestation(
        ctx: Context<IssueAttestation>,
        schema: u16,
        claim_hash: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        require!(claim_hash != [0u8; 32], OnceformError::EmptyCommitment);

        let now = Clock::get()?.unix_timestamp;
        require!(expires_at > now, OnceformError::AlreadyExpired);
        require!(
            expires_at - now <= MAX_ATTESTATION_LIFETIME,
            OnceformError::LifetimeTooLong
        );

        let attestation = &mut ctx.accounts.attestation;
        attestation.issuer = ctx.accounts.issuer.key();
        attestation.subject = ctx.accounts.subject.key();
        attestation.schema = schema;
        attestation.claim_hash = claim_hash;
        attestation.issued_at = now;
        attestation.expires_at = expires_at;
        attestation.revoked_at = 0;
        attestation.bump = ctx.bumps.attestation;

        emit!(AttestationIssued {
            issuer: attestation.issuer,
            subject: attestation.subject,
            schema,
            claim_hash,
            expires_at,
        });

        Ok(())
    }

    /// Withdraw an attestation ahead of its expiry.
    ///
    /// Only the original issuer may do this. The account is kept rather than
    /// closed so that anyone holding a historic reference resolves it to an
    /// explicit revocation instead of a missing account.
    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        require!(attestation.revoked_at == 0, OnceformError::AlreadyRevoked);

        attestation.revoked_at = Clock::get()?.unix_timestamp;

        emit!(AttestationRevoked {
            issuer: attestation.issuer,
            subject: attestation.subject,
            schema: attestation.schema,
            revoked_at: attestation.revoked_at,
        });

        Ok(())
    }

    /// Record that a profile disclosed a set of fields to a given origin.
    ///
    /// `origin_hash` is the hash of the requesting site's origin, `fields_mask`
    /// is a bitmap over the vault's field catalogue, and `purpose_hash` pins the
    /// stated reason for collection. Together they are enough for a user to
    /// later prove exactly what they agreed to, and for a site to prove it asked.
    pub fn record_consent(
        ctx: Context<RecordConsent>,
        nonce: u64,
        origin_hash: [u8; 32],
        fields_mask: u64,
        purpose_hash: [u8; 32],
    ) -> Result<()> {
        require!(origin_hash != [0u8; 32], OnceformError::EmptyCommitment);
        require!(fields_mask != 0, OnceformError::NothingDisclosed);

        let now = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.receipt;

        receipt.subject = ctx.accounts.authority.key();
        receipt.origin_hash = origin_hash;
        receipt.fields_mask = fields_mask;
        receipt.purpose_hash = purpose_hash;
        receipt.vault_commitment = ctx.accounts.profile.vault_commitment;
        receipt.nonce = nonce;
        receipt.created_at = now;
        receipt.revoked_at = 0;
        receipt.bump = ctx.bumps.receipt;

        let profile = &mut ctx.accounts.profile;
        profile.receipts_issued = profile.receipts_issued.saturating_add(1);

        emit!(ConsentRecorded {
            subject: receipt.subject,
            origin_hash,
            fields_mask,
            nonce,
            created_at: now,
        });

        Ok(())
    }

    /// Withdraw consent previously granted.
    ///
    /// This is the on-chain half of the GDPR Article 7(3) right to withdraw. The
    /// original grant stays readable — withdrawal is an addition to the record,
    /// never an erasure of it.
    pub fn revoke_consent(ctx: Context<RevokeConsent>) -> Result<()> {
        let receipt = &mut ctx.accounts.receipt;
        require!(receipt.revoked_at == 0, OnceformError::AlreadyRevoked);

        receipt.revoked_at = Clock::get()?.unix_timestamp;

        let profile = &mut ctx.accounts.profile;
        profile.receipts_revoked = profile.receipts_revoked.saturating_add(1);

        emit!(ConsentRevoked {
            subject: receipt.subject,
            nonce: receipt.nonce,
            revoked_at: receipt.revoked_at,
        });

        Ok(())
    }
}

/* ------------------------------- accounts -------------------------------- */

#[account]
#[derive(InitSpace)]
pub struct Profile {
    pub authority: Pubkey,
    pub vault_commitment: [u8; 32],
    pub created_at: i64,
    pub updated_at: i64,
    pub receipts_issued: u64,
    pub receipts_revoked: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Attestation {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub schema: u16,
    pub claim_hash: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    /// Zero while live. Any other value is the revocation timestamp.
    pub revoked_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ConsentReceipt {
    pub subject: Pubkey,
    pub origin_hash: [u8; 32],
    pub fields_mask: u64,
    pub purpose_hash: [u8; 32],
    /// Snapshot of the vault commitment at the moment of disclosure, so a later
    /// vault rotation cannot retroactively change what this receipt refers to.
    pub vault_commitment: [u8; 32],
    pub nonce: u64,
    pub created_at: i64,
    /// Zero while live. Any other value is the withdrawal timestamp.
    pub revoked_at: i64,
    pub bump: u8,
}

/* ------------------------------- contexts -------------------------------- */

#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Profile::INIT_SPACE,
        seeds = [b"profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RotateVault<'info> {
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ OnceformError::WrongAuthority
    )]
    pub profile: Account<'info, Profile>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(schema: u16)]
pub struct IssueAttestation<'info> {
    #[account(
        init_if_needed,
        payer = issuer,
        space = 8 + Attestation::INIT_SPACE,
        seeds = [
            b"attestation",
            issuer.key().as_ref(),
            subject.key().as_ref(),
            &schema.to_le_bytes()
        ],
        bump
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub issuer: Signer<'info>,

    /// CHECK: only used as a seed and stored as the attestation subject. The
    /// subject does not sign — an issuer vouches for a wallet, not with it.
    pub subject: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(
        mut,
        seeds = [
            b"attestation",
            issuer.key().as_ref(),
            attestation.subject.as_ref(),
            &attestation.schema.to_le_bytes()
        ],
        bump = attestation.bump,
        has_one = issuer @ OnceformError::WrongIssuer
    )]
    pub attestation: Account<'info, Attestation>,

    pub issuer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RecordConsent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ConsentReceipt::INIT_SPACE,
        seeds = [b"receipt", authority.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub receipt: Account<'info, ConsentReceipt>,

    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ OnceformError::WrongAuthority
    )]
    pub profile: Account<'info, Profile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeConsent<'info> {
    #[account(
        mut,
        seeds = [b"receipt", authority.key().as_ref(), &receipt.nonce.to_le_bytes()],
        bump = receipt.bump,
        constraint = receipt.subject == authority.key() @ OnceformError::WrongAuthority
    )]
    pub receipt: Account<'info, ConsentReceipt>,

    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ OnceformError::WrongAuthority
    )]
    pub profile: Account<'info, Profile>,

    pub authority: Signer<'info>,
}

/* -------------------------------- events --------------------------------- */

#[event]
pub struct ProfileCreated {
    pub authority: Pubkey,
    pub vault_commitment: [u8; 32],
    pub created_at: i64,
}

#[event]
pub struct VaultRotated {
    pub authority: Pubkey,
    pub previous: [u8; 32],
    pub current: [u8; 32],
    pub rotated_at: i64,
}

#[event]
pub struct AttestationIssued {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub schema: u16,
    pub claim_hash: [u8; 32],
    pub expires_at: i64,
}

#[event]
pub struct AttestationRevoked {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub schema: u16,
    pub revoked_at: i64,
}

#[event]
pub struct ConsentRecorded {
    pub subject: Pubkey,
    pub origin_hash: [u8; 32],
    pub fields_mask: u64,
    pub nonce: u64,
    pub created_at: i64,
}

#[event]
pub struct ConsentRevoked {
    pub subject: Pubkey,
    pub nonce: u64,
    pub revoked_at: i64,
}

/* -------------------------------- errors --------------------------------- */

#[error_code]
pub enum OnceformError {
    #[msg("Commitment or claim hash cannot be all zeroes")]
    EmptyCommitment,
    #[msg("New commitment matches the one already stored")]
    CommitmentUnchanged,
    #[msg("Signer does not own this profile")]
    WrongAuthority,
    #[msg("Signer did not issue this attestation")]
    WrongIssuer,
    #[msg("Expiry is already in the past")]
    AlreadyExpired,
    #[msg("Attestation lifetime exceeds the two year ceiling")]
    LifetimeTooLong,
    #[msg("This record was already revoked")]
    AlreadyRevoked,
    #[msg("A receipt must disclose at least one field")]
    NothingDisclosed,
}

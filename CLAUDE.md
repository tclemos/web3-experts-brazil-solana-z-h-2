# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Anchor (v1.1.2) Solana program: a PDA-based counter (`my_counter`). Rust workspace; the Anchor program lives in `programs/my-counter`. Toolchain pinned to Rust 1.89.0 via `rust-toolchain.toml`.

## Commands

```bash
anchor build                    # compile program → target/deploy/my_counter.so + IDL
cargo test                      # run tests (requires anchor build first — see below)
cargo test test_initialize      # run a single test by name
cargo fmt                       # format
cargo clippy                    # lint
anchor deploy                   # deploy to configured cluster (localnet by default)
```

### Test prerequisite (important)

Tests use **LiteSVM**, not `anchor test`. `tests/test_initialize.rs` loads the compiled program via `include_bytes!(env!("CARGO_TARGET_TMPDIR")/../deploy/my_counter.so)`. That `.so` is produced by `anchor build`. So the order is **`anchor build` then `cargo test`** — running `cargo test` on a clean tree fails because the `.so` does not exist yet. `Anchor.toml` sets `[scripts].test = "cargo test"` and `skip_local_validator = true`; tests run fully in-process against LiteSVM, no validator needed.

## Architecture

Program ID: `DpjHf1gbn11PHxuEocq3u1ejwDobtGbBqK9huVDHkZ1z` (in `lib.rs` `declare_id!` and `Anchor.toml`).

Module layout under `programs/my-counter/src/`:
- `lib.rs` — `#[program]` module; each `pub fn` is a thin shim delegating to `instructions::<name>::handle_<name>`.
- `instructions/` — one file per instruction, each holding both the `#[derive(Accounts)]` context struct and its `handle_*` logic. New instructions: add file, register in `instructions.rs`, add shim in `lib.rs`.
- `state.rs` — `Counter` account (`count: u64`, `authority: Pubkey`), `#[derive(InitSpace)]` so space = `8 + Counter::INIT_SPACE`.
- `constants.rs` — `#[constant]` values: `COUNTER_SEED` (PDA seed), `MAX_COUNT` (increment ceiling = 10), `HELLO_WORLD_LAMPORTS`.
- `error.rs` — `ErrorCode`: `Unauthorized`, `CounterOverflow`.

Behavior:
- `initialize` — creates the counter PDA (seeds `[COUNTER_SEED]`, single global counter), sets `authority = payer`, then CPIs `system_program::transfer` to move `HELLO_WORLD_LAMPORTS` into the PDA.
- `increment` — `require_keys_eq!` authority == signer (else `Unauthorized`), `require!` count < `MAX_COUNT` (else `CounterOverflow`), then `count += 1`.

## Notes

- `app/` exists but is empty — no client/frontend yet.
- `release` profile uses `overflow-checks = true` + fat LTO; build is intentionally strict.

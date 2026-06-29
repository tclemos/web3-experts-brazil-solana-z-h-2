import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const IDL = require("../target/idl/my_counter.json");

async function main() {
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(keypairData)
  );
  const wallet = new anchor.Wallet(keypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(IDL, provider);

  const [counterPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  console.log("Program ID :", program.programId.toBase58());
  console.log("Counter PDA:", counterPDA.toBase58());
  console.log("Wallet     :", wallet.publicKey.toBase58());

  // Check if counter already exists
  const counterInfo = await connection.getAccountInfo(counterPDA);

  if (counterInfo === null) {
    console.log("\n--- initialize ---");
    const initTx = await program.methods
      .initialize()
      .accounts({
        payer: wallet.publicKey,
      })
      .rpc();
    console.log("Tx :", initTx);
    console.log("Explorer: https://explorer.solana.com/tx/" + initTx + "?cluster=devnet");
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    console.log("\nCounter already initialized, skipping initialize.");
  }

  console.log("\n--- increment ---");
  const incrTx = await program.methods
    .increment()
    .accounts({
      authority: wallet.publicKey,
    })
    .rpc();
  console.log("Tx :", incrTx);
  console.log("Explorer: https://explorer.solana.com/tx/" + incrTx + "?cluster=devnet");

  await new Promise((r) => setTimeout(r, 2000));

  const counter = await (program.account as any).counter.fetch(counterPDA);
  console.log("\n--- counter state ---");
  console.log("count    :", counter.count.toString());
  console.log("authority:", counter.authority.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

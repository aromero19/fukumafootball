import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Play for Money | Fukuma Football" };

export default function PlayForMoney() {
  return <div className="money-page form-stack">
    <div><div className="eyebrow">Join the money pool</div><h1>Play for money</h1>
      <p>Want to play for money? Send your payment to Angelo on Venmo, then Angelo will update your entry after confirming it.</p></div>
    <section className="card">
      <h2>Pay Angelo on Venmo</h2>
      <p>Scan this QR code with your phone camera or use the button below to open <strong>@angelo-romero-2</strong>.</p>
      <Image className="venmo-qr" src="/venmo-angelo-romero-2.svg" width={280} height={280} alt="QR code linking to Angelo’s Venmo account: angelo-romero-2" unoptimized />
      <a className="button" href="https://account.venmo.com/u/angelo-romero-2" target="_blank" rel="noopener noreferrer">Open Angelo’s Venmo</a>
      <p className="muted">Check with Angelo for the amount to send. Include your player name and season in the payment note so he can match it to your entry.</p>
    </section>
    <section className="card"><h2>After you pay</h2>
      <p>Angelo checks Venmo and updates entries manually. Your dollar icon will appear on standings once your payment is confirmed. Paying or opening Venmo does not update your status automatically.</p>
      <p>Already paid and still waiting for the icon? Check with Angelo before sending another payment.</p>
      <Link className="text-link" href="/standings">Back to standings</Link>
    </section>
  </div>;
}

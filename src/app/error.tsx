"use client";
export default function ErrorPage({reset}:{reset:()=>void}) { return <section className="card" role="alert"><h1>We couldn’t load this page</h1><p>Your saved picks are unchanged. Please try loading the page again.</p><button className="button" onClick={reset}>Try again</button></section>; }

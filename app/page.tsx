import { ApiContract } from "@/components/site/ApiContract";
import { Capabilities } from "@/components/site/Capabilities";
import { Close } from "@/components/site/Close";
import { Concurrency } from "@/components/site/Concurrency";
import { FlowLab } from "@/components/site/FlowLab";
import { Glossary } from "@/components/site/Glossary";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Journey } from "@/components/site/Journey";
import { Layers } from "@/components/site/Layers";
import { Ledger } from "@/components/site/Ledger";
import { Metrics } from "@/components/site/Metrics";
import { Personas } from "@/components/site/Personas";
import { Principles } from "@/components/site/Principles";
import { Problem } from "@/components/site/Problem";
import { Rules } from "@/components/site/Rules";
import { Scope } from "@/components/site/Scope";
import { States } from "@/components/site/States";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="content">
        <Hero />
        <Problem />
        <Principles />
        <Journey />
        <FlowLab />
        <Ledger />
        <Concurrency />
        <Rules />
        <Capabilities />
        <Layers />
        <States />
        <ApiContract />
        <Metrics />
        <Personas />
        <Scope />
        <Glossary />
        <Close />
      </main>
      <Footer />
    </>
  );
}

import dynamic from "next/dynamic";
import { Capabilities } from "@/components/site/Capabilities";
import { Close } from "@/components/site/Close";
import { Glossary } from "@/components/site/Glossary";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Layers } from "@/components/site/Layers";
import { Ledger } from "@/components/site/Ledger";
import { Personas } from "@/components/site/Personas";
import { Principles } from "@/components/site/Principles";
import { Problem } from "@/components/site/Problem";
import { Scope } from "@/components/site/Scope";

const Journey = dynamic(() => import("@/components/site/Journey").then((module) => module.Journey));
const FlowLab = dynamic(() => import("@/components/site/FlowLab").then((module) => module.FlowLab));
const Concurrency = dynamic(() => import("@/components/site/Concurrency").then((module) => module.Concurrency));
const Rules = dynamic(() => import("@/components/site/Rules").then((module) => module.Rules));
const States = dynamic(() => import("@/components/site/States").then((module) => module.States));
const ApiContract = dynamic(() => import("@/components/site/ApiContract").then((module) => module.ApiContract));
const Metrics = dynamic(() => import("@/components/site/Metrics").then((module) => module.Metrics));

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="content">
        <Hero />
        <Problem />
        <Principles />
        <div className="section-defer">
          <Journey />
        </div>
        <div className="section-defer">
          <FlowLab />
        </div>
        <Ledger />
        <div className="section-defer">
          <Concurrency />
        </div>
        <div className="section-defer">
          <Rules />
        </div>
        <Capabilities />
        <Layers />
        <div className="section-defer">
          <States />
        </div>
        <div className="section-defer">
          <ApiContract />
        </div>
        <div className="section-defer">
          <Metrics />
        </div>
        <Personas />
        <Scope />
        <Glossary />
        <Close />
      </main>
      <Footer />
    </>
  );
}

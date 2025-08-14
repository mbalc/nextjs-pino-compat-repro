import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Logger } from "@/logging";
import { SomeButton } from "@/SomeButton";

const logger = new Logger("App");

logger.info("Starting app server");

export default function App({ Component, pageProps }: AppProps) {
  logger.info("rendering page", {
    component: Component.name,
    pageProps,
  });
  return (
    <div>
      <SomeButton />
      <Component {...pageProps} />
    </div>
  );
}

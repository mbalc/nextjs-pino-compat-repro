import { Logger } from "./logging";

const logger = new Logger("SomeButton");

export const SomeButton = () => {
  logger.info("Rendering component");
  return <button>Click me</button>;
};

const customColors: [number, string][] = [
  [10, "cyan"],
  [20, "magenta"],
  [25, "gray"],
  [30, "blue"],
  [35, "green"],
  [40, "yellow"],
  [50, "red"],
  [60, "bgRed"],
];

export const createPrettyLogStream = () => {
  try {
    console.error("testin", typeof window, process.env.NEXT_PHASE);

      return process.stdout;

    // const pretty = require("pino-pretty");

    // return pretty({
    //   colorize: true,
    //   minimumLevel: "trace",
    //   ignore: "pid,hostname",
    //   customColors,
    //   customPrettifiers: {
    //     level: (inputData: string | object) => {
    //       return pretty.colorizerFactory(true, customColors)(
    //         inputData as string,
    //         {
    //           customLevelNames: {
    //             TRC: 10,
    //             DBG: 20,
    //             DTL: 25,
    //             LOG: 30,
    //             INF: 35,
    //             WRN: 40,
    //             ERR: 50,
    //             CRT: 60,
    //           },
    //           customLevels: {
    //             10: "TRC",
    //             20: "DBG",
    //             25: "DTL",
    //             30: "LOG",
    //             35: "INF",
    //             40: "WRN",
    //             50: "ERR",
    //             60: "CRT",
    //           },
    //         }
    //       );
    //     },
    //   },
    //   colorizeObjects: true,
    //   useOnlyCustomProps: true,
    // });
  } catch (e) {
    console.error(e);
    return process.stdout;
  }
};

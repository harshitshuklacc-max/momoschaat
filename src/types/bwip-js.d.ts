declare module "bwip-js" {
  interface BwipOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
  }

  interface BwipJs {
    toSVG(options: BwipOptions): string;
    toBuffer(options: BwipOptions): Promise<Buffer>;
  }

  const bwipjs: BwipJs;
  export default bwipjs;
}

declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Buffer | Uint8Array;
    format: "PNG" | "JPEG";
    quality?: number;
  };

  const convert: (options: ConvertOptions) => Promise<Buffer | Uint8Array>;
  export default convert;
}

declare module 'mammoth' {
  export interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer;
  }
  export interface ExtractRawTextResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(input: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
}

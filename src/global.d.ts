// Global type augmentations for third-party scripts injected via <script> tags.

interface Window {
  adsbygoogle: unknown[];
}

declare module '*.png' {
  const value: string;
  export default value;
}
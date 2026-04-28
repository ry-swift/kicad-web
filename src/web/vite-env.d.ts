declare module '*.css';

declare module '*.kicad_sym?raw' {
  const source: string;
  export default source;
}

declare module 'autosuggest-highlight/match' {
  function match(text: string, query: string, options?: { insideWords?: boolean; findAllOccurrences?: boolean; requireMatchAll?: boolean }): [number, number][];
  export = match;
}

declare module 'autosuggest-highlight/parse' {
  function parse(text: string, matches: [number, number][]): { text: string; highlight: boolean }[];
  export = parse;
}

declare module 'tz-lookup' {
  function tzLookup(latitude: number, longitude: number): string;
  export = tzLookup;
}

export function inRange (val: number, min: number, max: number): boolean {
  return val >= min && val <= max;
};

export function isHexColor(c: string) {
  const regex = /^#([\da-f]{3}){1,2}$|^#([\da-f]{4}){1,2}$/i;
  return c && regex.test(c);
}
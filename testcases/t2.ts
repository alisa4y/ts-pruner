type A = {
  a: number
  b: string
}
function f1(s: string, n: number, b: boolean, p: A): void {
  console.log(p.a)
}
function f2(s: string, n: number, b: boolean, p: A): void {
  console.log(p.a)
  console.log(p.b)
}

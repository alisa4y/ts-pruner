type A = {
  a: number
  b: string
  c: boolean
}
function f1(p: A): void {
  console.log(p.a)
  console.log(p.b)
  console.log(p.b)
}
function f2(p: A): void {
  const { a, b } = p
  const { a: a1, b: x } = p
}
function f3(p: A): void {
  const { a, b } = p
  console.log(p.a)
  console.log(p.b)
}

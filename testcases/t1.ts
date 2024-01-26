type A = {
  a: number
  b: string
}
function f1(p: A): void {
  console.log(p.a)
}
function f2(p: A): void {
  const { a } = p
}
function f3(p: A): void {
  const { a: num } = p
}

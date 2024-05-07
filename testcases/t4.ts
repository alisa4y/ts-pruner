type A = {
  a: number
  b: string
}
type B = {
  a: number
  b: string
}
function f1(p: A, p2: B): void {
  console.log(p)
  console.log(p2.a)
}
function f2(p: A, p2: B): void {
  const { b } = p
  console.log(p2.a)
}

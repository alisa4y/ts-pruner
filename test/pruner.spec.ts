import { pruneFunction } from "../src/pruner"
import { join } from "path"

describe("pruner", () => {
  it("should prune unused properties", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: InF11): void {
        console.log(p.a);
      }
      type InF11 = {
        a: number;
      };
      function f2(p: A): void {
        const { a } = p;
      }
      function f3(p: A): void {
        const { a: num } = p;
      }`)
    )
  })

  it("should detect destructures", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: A): void {
        console.log(p.a);
      }
      function f2(p: InF21): void {
        const { a } = p;
      }
      type InF21 = {
        a: number;
      };
      function f3(p: A): void {
        const { a: num } = p;
      }`)
    )
  })

  it("should detect destructures with assignment", async () => {
    const filename = join(process.cwd(), "./testcases/t1.ts")

    expect(await format(pruneFunction("f3", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(p: A): void {
        console.log(p.a);
      }
      function f2(p: A): void {
        const { a } = p;
      }
      function f3(p: InF31): void {
        const { a: num } = p;
      }
      type InF31 = {
        a: number;
      };`)
    )
  })

  it("shouldn't touch not object params", async () => {
    const filename = join(process.cwd(), "./testcases/t2.ts")

    expect(await format(pruneFunction("f1", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(s: string, n: number, b: boolean, p: InF14): void {
        console.log(p.a);
      }
      type InF14 = {
        a: number;
      };
      function f2(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
        console.log(p.b);
      }
      `)
    )
  })

  it("shouldn't change anything if there is nothing to change", async () => {
    const filename = join(process.cwd(), "./testcases/t2.ts")

    expect(await format(pruneFunction("f2", filename))).toBe(
      await format(`type A = {
        a: number;
        b: string;
      };
      function f1(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
      }
      function f2(s: string, n: number, b: boolean, p: A): void {
        console.log(p.a);
        console.log(p.b);
      }`)
    )
  })
})

async function format(code: string | null): Promise<string> {
  if (code === null) return ""
  return code.replace(/\s/g, "")
}
